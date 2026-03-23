import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
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

async function createTestServer(project: MarinerProject): Promise<ViteDevServer> {
  const config = project.configFile!.config
  config.build = config.build ?? {}
  config.build.rolldownOptions = config.build.rolldownOptions ?? {}
  const base = `/${project.mariner}`

  return createViteServer({
    ...config,
    appType: 'custom',
    base,
    mode: 'development',
    configFile: false,
    logLevel: 'silent',
    root: project.root,
    plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOptions)],
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  })
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
      const server = await createTestServer(project)

      expect(server).toBeDefined()
      expect(server.middlewares).toBeDefined()

      await server.close()
    }, 30000)

    it('creates a Vite dev server for React app (app3)', async () => {
      const project = allProjects.find((p) => p.mariner === 'app3')!
      const server = await createTestServer(project)

      expect(server).toBeDefined()
      await server.close()
    }, 30000)

    it('middleware transforms navigator.ts to JS on request', async () => {
      const project = allProjects.find((p) => p.mariner === 'shared')!
      const server = await createTestServer(project)

      const result = await server.transformRequest('/navigator.ts')

      expect(result).toBeDefined()
      expect(result!.code).toContain('export')

      await server.close()
    }, 30000)

    it('resolves navigator:shared as external in dev mode', async () => {
      const project = allProjects.find((p) => p.mariner === 'app1')!
      const server = await createTestServer(project)

      const resolved = await server.pluginContainer.resolveId('navigator:shared')
      expect(resolved).toBeDefined()
      expect(resolved!.external).toBe(true)

      await server.close()
    }, 30000)
  })

  describe('multiple apps on same server', () => {
    it('creates middleware for multiple apps without conflicts', async () => {
      const apps = ['shared', 'app3']
      const servers: ViteDevServer[] = []

      for (const appName of apps) {
        const project = allProjects.find((p) => p.mariner === appName)!
        servers.push(await createTestServer(project))
      }

      expect(servers).toHaveLength(2)
      expect(servers.every((s) => s.middlewares)).toBe(true)

      for (const server of servers) {
        await server.close()
      }
    }, 30000)
  })
})
