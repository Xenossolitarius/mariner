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
import { createSharedNavServers } from './shared-dev'

export const getServerUrl = (serverOps: ServerOptions) => ({
  hostname: serverOps.commands.hostname || DEV_SERVER_DEFAULTS.hostname,
  port: serverOps.commands.port || DEV_SERVER_DEFAULTS.port,
  secure: serverOps.commands.https,
})

export type AppRoute = {
  base: string
  navigator: string
  vite: ViteDevServer
  /** Relative path from Vite root to app directory (only set for shared fleet routes) */
  relativeRoot?: string
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
      hmr: { port: index, protocol: secure ? 'wss' : 'ws' },
    },
  })

  return { base: fullBase, navigator: project.navigator!, vite }
}

export const createHandler = (routes: AppRoute[], debug?: boolean): http.RequestListener => {
  // Collect shared Vite instances for fleet-level routing (/@vite/, /node_modules/, etc.)
  const fleetVites = new Map<string, ViteDevServer>()
  for (const route of routes) {
    if (route.relativeRoot !== undefined) {
      // Extract fleet base (everything before the app name in route.base)
      const fleetBase = route.base.slice(0, route.base.lastIndexOf('/'))
      if (fleetBase) fleetVites.set(fleetBase, route.vite)
    }
  }

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

    if (route) {
      if (route.relativeRoot !== undefined) {
        // Shared fleet: rewrite /{fleet}/{appname}/... → /{fleet}/{relativeRoot}/...
        const fleetBase = route.base.slice(0, route.base.lastIndexOf('/'))
        const stripped = url.slice(route.base.length) || '/'
        if (stripped === '/navigator.js') {
          req.url = `${fleetBase}/${route.relativeRoot}/${route.navigator}`
        } else {
          req.url = `${fleetBase}/${route.relativeRoot}${stripped}`
        }
      } else {
        // Isolated: strip base path as before
        req.url = url.slice(route.base.length) || '/'
        if (req.url === '/navigator.js') {
          req.url = `/${route.navigator}`
        }
      }

      debug && console.log(`${route.base}, ${req.url}`)
      route.vite.middlewares(req, res)
      return
    }

    // No app route matched — check if this is a fleet-level request (/@vite/, /node_modules/, etc.)
    for (const [fleetBase, vite] of fleetVites) {
      if (url.startsWith(fleetBase)) {
        vite.middlewares(req, res)
        return
      }
    }

    res.writeHead(404).end()
  }
}

export const createDevServer = async (options: ServerOptions) => {
  const routes: AppRoute[] = []
  // Derive HMR base port from server port to avoid conflicts when multiple servers run.
  // Each server gets a block of 100 ports so parallel servers on different ports never collide.
  const serverPort = getServerUrl(options).port || DEV_SERVER_DEFAULTS.port
  let hmrPortCounter = 10001 + (serverPort - DEV_SERVER_DEFAULTS.port) * 100

  if (options.fleetGroups) {
    for (const group of options.fleetGroups) {
      if (group.mode === 'shared') {
        const sharedRoutes = await createSharedNavServers(options, group, hmrPortCounter)
        routes.push(...sharedRoutes)
        hmrPortCounter++ // one HMR port for the shared Vite instance
      } else {
        for (const project of group.projects) {
          routes.push(await createNavServer(options, project, hmrPortCounter++))
        }
      }
    }
  } else {
    // Backward compat: no fleet groups, all isolated
    const isolatedRoutes = await Promise.all(
      options.projects.map((project, index) => createNavServer(options, project, hmrPortCounter + index)),
    )
    routes.push(...isolatedRoutes)
  }

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
