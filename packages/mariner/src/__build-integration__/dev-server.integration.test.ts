import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer as createViteServer } from 'vite'
import { getMarinerSetup } from '../setup'
import { resolveVirtualNavigators } from '../server/plugins/resolve-virtual-navigators'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import path from 'node:path'

// Tests the dev server Vite middleware setup for individual apps.
// Requires mariner-fe to be built first.

const monorepoRoot = path.resolve(__dirname, '../../../..')
let originalCwd: string
let allProjects: MarinerProject[]
let serverOptions: ServerOptions

function makeServerOptions(projects: MarinerProject[]): ServerOptions {
  return {
    setup: { projects, global: { fleet: null } },
    projects,
    commands: { command: 'serve', mode: 'development' } as ServerOptions['commands'],
  } as ServerOptions
}

beforeAll(async () => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)

  const setup = await getMarinerSetup({ command: 'serve', mode: 'development' })
  allProjects = setup.projects.filter((p) => p.isValid)
  serverOptions = makeServerOptions(allProjects)
}, 30000)

afterAll(() => {
  process.chdir(originalCwd)
})

describe('dev server integration', () => {
  describe('Vite dev server creation per app', () => {
    it('creates a Vite dev server for shared app in middleware mode', async () => {
      const project = allProjects.find((p) => p.mariner === 'shared')!
      const config = project.configFile!.config
      const base = `/${project.mariner}`

      const server = await createViteServer({
        ...config,
        appType: 'custom',
        base,
        mode: 'development',
        configFile: false,
        root: project.root,
        plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOptions)],
        server: { middlewareMode: true },
      })

      expect(server).toBeDefined()
      expect(server.middlewares).toBeDefined()

      await server.close()
    }, 30000)

    it('creates a Vite dev server for React app (app3)', async () => {
      const project = allProjects.find((p) => p.mariner === 'app3')!
      const config = project.configFile!.config
      const base = `/${project.mariner}`

      const server = await createViteServer({
        ...config,
        appType: 'custom',
        base,
        mode: 'development',
        configFile: false,
        root: project.root,
        plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOptions)],
        server: { middlewareMode: true },
      })

      expect(server).toBeDefined()
      await server.close()
    }, 30000)

    it('middleware transforms navigator.ts to JS on request', async () => {
      const project = allProjects.find((p) => p.mariner === 'shared')!
      const config = project.configFile!.config
      const base = `/${project.mariner}`

      const server = await createViteServer({
        ...config,
        appType: 'custom',
        base,
        mode: 'development',
        configFile: false,
        root: project.root,
        plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOptions)],
        server: { middlewareMode: true },
      })

      // Request the navigator entry through the middleware
      const result = await server.transformRequest('/navigator.ts')

      expect(result).toBeDefined()
      expect(result!.code).toContain('export')

      await server.close()
    }, 30000)

    it('resolves navigator:shared as external in dev mode', async () => {
      const project = allProjects.find((p) => p.mariner === 'app1')!
      const config = project.configFile!.config
      const base = `/${project.mariner}`

      const server = await createViteServer({
        ...config,
        appType: 'custom',
        base,
        mode: 'development',
        configFile: false,
        root: project.root,
        plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOptions)],
        server: { middlewareMode: true },
      })

      // In dev mode, navigator:shared should resolve as external
      const resolved = await server.pluginContainer.resolveId('navigator:shared')
      expect(resolved).toBeDefined()
      expect(resolved!.external).toBe(true)

      await server.close()
    }, 30000)
  })

  describe('multiple apps on same server', () => {
    it('creates middleware for multiple apps without conflicts', async () => {
      const apps = ['shared', 'app3']
      const servers = []

      for (const appName of apps) {
        const project = allProjects.find((p) => p.mariner === appName)!
        const config = project.configFile!.config
        const base = `/${project.mariner}`

        const server = await createViteServer({
          ...config,
          appType: 'custom',
          base,
          mode: 'development',
          configFile: false,
          root: project.root,
          plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOptions)],
          server: { middlewareMode: true },
        })

        servers.push(server)
      }

      expect(servers).toHaveLength(2)
      expect(servers.every((s) => s.middlewares)).toBe(true)

      for (const server of servers) {
        await server.close()
      }
    }, 30000)
  })
})
