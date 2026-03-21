import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { getMarinerSetup } from '../setup'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import path from 'node:path'

// Tests cross-app import chains, lazy loading, and transitive dependencies.
// Requires mariner-fe to be built first.

const monorepoRoot = path.resolve(__dirname, '../../../..')
const distDir = path.join(monorepoRoot, 'dist')
let originalCwd: string
let allProjects: MarinerProject[]

function makeServerOptions(projects: MarinerProject[]): ServerOptions {
  return {
    setup: { projects, global: { fleet: null } },
    projects,
    commands: { command: 'build', mode: 'production' } as ServerOptions['commands'],
  } as ServerOptions
}

beforeAll(async () => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)

  const distExists = await fs.stat(path.join(distDir, 'shared', 'navigator.js')).catch(() => null)
  if (!distExists) {
    await fs.rm(distDir, { recursive: true, force: true }).catch(() => {})
    const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
    allProjects = setup.projects.filter((p) => p.isValid)
    const opts = makeServerOptions(allProjects)
    for (const project of allProjects) {
      await buildNavigator(opts, project)
    }
  } else {
    const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
    allProjects = setup.projects.filter((p) => p.isValid)
  }
}, 120000)

afterAll(() => {
  process.chdir(originalCwd)
})

describe('cross-app import chains', () => {
  describe('app1 → shared (static import)', () => {
    it('app1 imports pinia store from shared', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      // import { pinia } from 'navigator:shared' → /shared/navigator.js
      expect(code).toMatch(/from\s*["']\/?shared\/navigator\.js["']/)
    })

    it('shared exports are available as named imports', async () => {
      const code = await fs.readFile(path.join(distDir, 'shared', 'navigator.js'), 'utf-8')
      // shared exports pinia store and useCounter
      expect(code).toContain('pinia')
      expect(code).toContain('useCounter')
    })
  })

  describe('app1 → lazy (dynamic import)', () => {
    it('app1 contains dynamic import for lazy navigator', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      // HelloWorld.vue does: await import('navigator:lazy')
      // Should be rewritten to dynamic import of /lazy/navigator.js
      expect(code).toContain('/lazy/navigator.js')
    })

    it('lazy module is built and available', async () => {
      const code = await fs.readFile(path.join(distDir, 'lazy', 'navigator.js'), 'utf-8')
      expect(code).toContain('lazy')
      expect(code).toMatch(/export/)
    })
  })

  describe('app2 → shared + js-test (multiple imports)', () => {
    it('app2 imports from both shared and js-test', async () => {
      const code = await fs.readFile(path.join(distDir, 'app2', 'navigator.js'), 'utf-8')
      expect(code).toContain('/shared/navigator.js')
      expect(code).toContain('/js-test/navigator.js')
    })

    it('js-test module is built independently', async () => {
      const code = await fs.readFile(path.join(distDir, 'js-test', 'navigator.js'), 'utf-8')
      expect(code).toMatch(/export/)
    })
  })

  describe('leaf nodes have no navigator dependencies', () => {
    it('shared has zero navigator imports', async () => {
      const code = await fs.readFile(path.join(distDir, 'shared', 'navigator.js'), 'utf-8')
      expect(code).not.toMatch(/\/\w+\/navigator\.js/)
    })

    it('lazy has zero navigator imports', async () => {
      const code = await fs.readFile(path.join(distDir, 'lazy', 'navigator.js'), 'utf-8')
      expect(code).not.toMatch(/\/\w+\/navigator\.js/)
    })

    it('js-test has zero navigator imports', async () => {
      const code = await fs.readFile(path.join(distDir, 'js-test', 'navigator.js'), 'utf-8')
      expect(code).not.toMatch(/\/\w+\/navigator\.js/)
    })

    it('envs has zero navigator imports', async () => {
      const code = await fs.readFile(path.join(distDir, 'envs', 'navigator.js'), 'utf-8')
      expect(code).not.toMatch(/\/\w+\/navigator\.js/)
    })
  })

  describe('all apps produce independent bundles', () => {
    it('every valid app has its own navigator.js', async () => {
      const entries = await fs.readdir(distDir)
      const appDirs = entries.filter((e) => !e.startsWith('.'))

      for (const app of appDirs) {
        const navigatorPath = path.join(distDir, app, 'navigator.js')
        const stat = await fs.stat(navigatorPath).catch(() => null)
        expect(stat?.isFile(), `${app}/navigator.js should exist`).toBe(true)
      }
    })

    it('no app bundles another apps code inline', async () => {
      // app1 should not contain pinia store code — it's externalized
      const app1Code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      expect(app1Code).not.toContain('createPinia')
      expect(app1Code).not.toContain('defineStore')
    })
  })
})
