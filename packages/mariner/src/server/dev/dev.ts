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

const virtualRoot: () => Plugin = () => {
  const virtualModuleId = 'virtual:mariner-root'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'mariner:virtual-root', // required, will show up in warnings and errors
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const emitter = "from virtual module"`
      }
    },
  }
}

export function replaceImportsPlugin(): Plugin {
  return {
    name: 'replace-imports',
    transform(code, id) {
      console.log(id)
      if (id.endsWith('.js') || id.endsWith('.jsx') || id.endsWith('vue')) {
        // Replace imports here as needed
        code = code.replace(/virtual:mariner-lighthouse/g, 'http:localhost:3000')
      }
      return {
        code,
        map: null,
      }
    },
  }
}

function viteIgnoreStaticImport(base: string, importKeys: string[]): Plugin {
  return {
    name: 'vite-plugin-ignore-static-import',
    enforce: 'pre',
    // 1. insert to optimizeDeps.exclude to prevent pre-transform
    config(config) {
      config.optimizeDeps = {
        ...(config.optimizeDeps ?? {}),
        exclude: [...(config.optimizeDeps?.exclude ?? []), ...importKeys],
      }
    },
    // 2. push a plugin to rewrite the 'vite:import-analysis' prefix
    configResolved(resolvedConfig) {
      const VALID_ID_PREFIX = `/@id/`
      const reg = new RegExp(`${VALID_ID_PREFIX}(${importKeys.join('|')})`, 'g')
      // @ts-expect-error - push actually exists
      resolvedConfig.plugins.push({
        name: 'vite-plugin-ignore-static-import-replace-idprefix',
        transform: (code: string) => {
          if (reg.test(code)) {
            console.log(code)
            //const result = code.replace(reg, (m, s1) => s1)

            const result = code.replace(`${'app1'}${VALID_ID_PREFIX}virtual:root`, '')

            console.log(result)

            return result
          }
          return code
        },
      })
    },
    // 3. rewrite the id before 'vite:resolve' plugin transform to 'node_modules/...'
    resolveId: (id) => {
      if (importKeys.includes(id)) {
        return { id, external: true }
      }
    },
  }
}

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
    plugins: [
      ...(config.plugins || []),
      virtualRoot(),
      replaceImportsPlugin(),
      viteIgnoreStaticImport(base, ['virtual:root']),
    ],
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
