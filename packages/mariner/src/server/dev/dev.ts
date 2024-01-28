import { createServer as createViteServer, type Plugin } from 'vite'

import { ServerOptions } from '../server'

import { DEV_SERVER_DEFAULTS } from '.'

import Koa from 'koa'
import koaConnect from 'koa-connect'
import connect from 'connect'
import koaCors from '@koa/cors'

import { MarinerProject } from '../..'
import { FILES } from '../../constants'
import { createClientMiddleware } from './client'

const middlewarePlugin: () => Plugin = () => ({
  name: 'testing-the-test-to-test',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      //       console.log('yay', req.url)
      next()
    })
  },
})

export const getServerUrl = (serverOps: ServerOptions) => ({
  hostname: serverOps.commands.hostname || DEV_SERVER_DEFAULTS.hostname,
  port: serverOps.commands.port || DEV_SERVER_DEFAULTS.port,
})

export const createNavServer = async (
  connector: connect.Server,
  serverOps: ServerOptions,
  project: MarinerProject,
  index = 0,
) => {
  const config = project.configFile!.config // will asume it exists

  const { port, hostname } = getServerUrl(serverOps)

  const base = `/${project.mariner}`

  const server = await createViteServer({
    ...config,
    appType: 'custom',
    base,
    configFile: false,
    root: project.root,
    plugins: [...(config.plugins || [])],
    server: {
      middlewareMode: true,
      origin: `http://${hostname}:${port}`, // TODO: SSL
      hmr: { port: 6001 + index },
    },
  })

  connector.use(base, (req, res, next) => {
    // remove base
    req.url = req.url?.replace(base, '')

    console.log(`${base}, ${req.url}`)

    if (req.url === '/') {
      req.url += FILES.navigator
    }

    server.middlewares(req, res, next)
  })

  return server
}

export const createDevServer = async (options: ServerOptions) => {
  const app = new Koa()
  const router = connect()

  app.use(koaCors())

  await createClientMiddleware(options, router)

  /* const navServers = */ await Promise.all(
    options.projects.map((project, index) => createNavServer(router, options, project, index)),
  )

  router.use((req, res, next) => {
    console.log(req.url)
    next()
  })

  app.use(koaConnect(router))

  const { port, hostname } = getServerUrl(options)

  app.listen(port, hostname, () => {
    console.log('Started')
  })
}
