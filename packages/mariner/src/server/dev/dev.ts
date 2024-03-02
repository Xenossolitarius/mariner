import { createServer as createViteServer } from 'vite'
import { ServerOptions } from '../server'
import { DEV_SERVER_DEFAULTS } from '.'

import Koa from 'koa'
import koaConnect from 'koa-connect'
import connect from 'connect'
import koaCors from '@koa/cors'

import { MarinerProject } from '../..'
import { FILES, MARINER_ENV_PREFIX } from '../../constants'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { startHTTPSServer } from './https'

export const getServerUrl = (serverOps: ServerOptions) => ({
  hostname: serverOps.commands.hostname || DEV_SERVER_DEFAULTS.hostname,
  port: serverOps.commands.port || DEV_SERVER_DEFAULTS.port,
  secure: serverOps.commands.https,
})

export const createNavServer = async (
  connector: connect.Server,
  serverOps: ServerOptions,
  project: MarinerProject,
  index = 0,
) => {
  const config = project.configFile!.config // will asume it exists

  const { port, hostname, secure } = getServerUrl(serverOps)

  const base = `/${project.mariner}`

  const rootBasePath = serverOps.commands.rootBase ? `/${serverOps.commands.rootBase}` : ''

  const fullBase = `${rootBasePath}${base}`

  const server = await createViteServer({
    ...config,
    appType: 'custom',
    base: fullBase,
    mode: serverOps.commands.mode,
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: project.root,
    plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOps)],
    server: {
      middlewareMode: true,
      origin: `${secure ? 'https' : 'http'}://${hostname}:${port}`, // TODO: SSL
      hmr: { port: 6001 + index, protocol: secure ? 'wss' : 'ws' },
    },
  })

  connector.use(fullBase, (req, res, next) => {
    // remove base
    req.url = req.url?.replace(fullBase, '')

    console.log(`${fullBase}, ${req.url}`)

    const entry = '/navigator.js'

    if (req.url === entry) {
      req.url = `/${FILES.navigator}`
    }

    server.middlewares(req, res, next)
  })

  return server
}

export const createDevServer = async (options: ServerOptions) => {
  const app = new Koa()
  const router = connect()

  app.use(koaCors())

  await Promise.all(options.projects.map((project, index) => createNavServer(router, options, project, index)))

  router.use((req, res, next) => {
    console.log(req.url)
    next()
  })

  app.use(koaConnect(router))

  const { port, hostname, secure } = getServerUrl(options)

  if (secure) {
    startHTTPSServer(app, { port, hostname, secure })
  } else {
    app.listen(port, hostname, () => {
      console.log(`Started dev on: https://${hostname}:${port}`)
    })
  }
}
