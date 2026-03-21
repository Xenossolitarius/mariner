import { createServer as createViteServer, type ViteDevServer } from 'vite'
import http from 'node:http'
import path from 'node:path'
import { ServerOptions } from '../server'
import { DEV_SERVER_DEFAULTS } from '.'
import { MarinerProject } from '../..'
import { MARINER_ENV_PREFIX } from '../../constants'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { startHTTPSServer } from './https'
import { SERVER_READY } from '../../cli/messages'

export const getServerUrl = (serverOps: ServerOptions) => ({
  hostname: serverOps.commands.hostname || DEV_SERVER_DEFAULTS.hostname,
  port: serverOps.commands.port || DEV_SERVER_DEFAULTS.port,
  secure: serverOps.commands.https,
})

export type AppRoute = {
  base: string
  navigator: string
  vite: ViteDevServer
}

export const createNavServer = async (
  serverOps: ServerOptions,
  project: MarinerProject,
  index = 0,
): Promise<AppRoute> => {
  const config = project.configFile!.config

  const { port, hostname, secure } = getServerUrl(serverOps)

  const base = `/${project.mariner}`
  const rootBasePath = serverOps.commands.rootBase ? `/${serverOps.commands.rootBase}` : ''
  const fullBase = `${rootBasePath}${base}`

  const navigatorEntry = path.join(project.root, project.navigator!)

  const vite = await createViteServer({
    ...config,
    appType: 'custom',
    base: fullBase,
    mode: serverOps.commands.mode,
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: project.root,
    plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOps)],
    optimizeDeps: { entries: [navigatorEntry] },
    server: {
      middlewareMode: true,
      origin: `${secure ? 'https' : 'http'}://${hostname}:${port}`,
      hmr: { port: 6001 + index, protocol: secure ? 'wss' : 'ws' },
    },
  })

  return { base: fullBase, navigator: project.navigator!, vite }
}

export const createHandler = (routes: AppRoute[], debug?: boolean): http.RequestListener => {
  return (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    const url = req.url || '/'

    // Match request to an app route
    const route = routes.find((r) => url.startsWith(r.base))
    if (!route) {
      res.writeHead(404).end()
      return
    }

    // Strip base path
    req.url = url.slice(route.base.length) || '/'

    debug && console.log(`${route.base}, ${req.url}`)

    // Rewrite /navigator.js to the actual navigator file
    if (req.url === '/navigator.js') {
      req.url = `/${route.navigator}`
    }

    route.vite.middlewares(req, res)
  }
}

export const createDevServer = async (options: ServerOptions) => {
  const routes = await Promise.all(options.projects.map((project, index) => createNavServer(options, project, index)))

  const { port, hostname, secure } = getServerUrl(options)
  const handler = createHandler(routes, options.commands.debug)

  const printReady = (protocol: string) => {
    console.log(
      SERVER_READY(
        `${protocol}://${hostname}:${port}`,
        routes.map((r) => r.base),
      ),
    )
  }

  if (secure) {
    startHTTPSServer(handler, { port, hostname, secure })
    printReady('https')
  } else {
    http.createServer(handler).listen(port, hostname, () => printReady('http'))
  }
}
