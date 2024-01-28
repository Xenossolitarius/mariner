import { loadConfigFromFile, createServer as createViteServer, type Plugin, mergeConfig, resolveConfig } from 'vite'

import { ServerOptions } from '../server'

import { DEV_SERVER_DEFAULTS } from '.'

import Koa from 'koa'
import koaConnect from 'koa-connect'
import connect from 'connect'
import { MarinerProject } from '../..'

const middlewarePlugin: () => Plugin = () => ({
  name: 'testing-the-test-to-test',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      //       console.log('yay', req.url)
      next()
    })
  },
})

export const createNavServer = async (
  connector: connect.Server,
  serverOps: ServerOptions,
  project: MarinerProject,
  index = 0,
) => {
  const config = project.configFile!.config // will asume it exists

  const hostname = serverOps.commands.hostname || DEV_SERVER_DEFAULTS.hostname

  const port = serverOps.commands.port || DEV_SERVER_DEFAULTS.port

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
      origin: `http://${hostname}:${port}`,
      hmr: { port: 6001 + index },
    },
  })

  connector.use(base, (req, res, next) => {
    req.url = req.url?.replace(base, '')
    server.middlewares(req, res, next)
  })

  return server
}

export const createDevServer = async (options: ServerOptions) => {
  const app = new Koa()
  const redirect = connect()

  const navServers = await Promise.all(
    options.projects.map((project, index) => createNavServer(redirect, options, project, index)),
  )

  redirect.use((req, res, next) => {
    console.log(req.url)
    next()
  })

  app.use(koaConnect(redirect))

  app.listen(3000, () => {
    console.log('Started')
  })
}
