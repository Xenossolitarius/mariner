import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { getMarinerSetup } from '../setup'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import path from 'node:path'

// Calls buildNavigator directly (bypasses WorkerPool which needs built .mjs workers).
// Requires mariner-fe to be built first (pnpm --filter mariner-fe build).

const monorepoRoot = path.resolve(__dirname, '../../../..')
const distDir = path.join(monorepoRoot, 'dist')
let originalCwd: string

let allProjects: MarinerProject[]

function makeServerOptions(projects: MarinerProject[], rootBase = ''): ServerOptions {
  return {
    setup: { projects, global: { fleet: null } },
    projects,
    commands: { command: 'build', mode: 'production', rootBase } as ServerOptions['commands'],
  } as ServerOptions
}

beforeAll(async () => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)

  const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
  allProjects = setup.projects.filter((p) => p.isValid)

  // Only build if dist doesn't exist yet
  const distExists = await fs.stat(path.join(distDir, 'shared', 'navigator.js')).catch(() => null)
  if (!distExists) {
    await fs.rm(distDir, { recursive: true, force: true }).catch(() => {})
    const opts = makeServerOptions(allProjects)
    for (const project of allProjects) {
      await buildNavigator(opts, project)
    }
  }
}, 120000)

afterAll(() => {
  process.chdir(originalCwd)
})

describe('build integration', () => {
  describe('output structure', () => {
    it('creates a dist directory for each valid app', async () => {
      const entries = await fs.readdir(distDir)
      expect(entries).toContain('app1')
      expect(entries).toContain('app3')
      expect(entries).toContain('shared')
      expect(entries).toContain('js-test')
    })

    it('each app has navigator.js entry', async () => {
      for (const app of ['app1', 'app3', 'shared', 'js-test']) {
        const stat = await fs.stat(path.join(distDir, app, 'navigator.js'))
        expect(stat.isFile(), `${app}/navigator.js should exist`).toBe(true)
      }
    })

    it('each app has .vite/manifest.json', async () => {
      for (const app of ['app1', 'app3', 'shared']) {
        const manifestPath = path.join(distDir, app, '.vite', 'manifest.json')
        const content = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
        expect(Object.keys(content).length, `${app} manifest should have entries`).toBeGreaterThan(0)
      }
    })
  })

  describe('Vue app (app1) — cross-app imports', () => {
    it('externalizes navigator:shared to /shared/navigator.js', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      expect(code).toContain('/shared/navigator.js')
      expect(code).not.toContain('navigator:shared')
    })

    it('externalizes vue framework', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      expect(code).toContain('"vue"')
    })

    it('produces valid ESM output', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      expect(code).toMatch(/import|export/)
    })
  })

  describe('React app (app3)', () => {
    it('produces non-empty navigator.js', async () => {
      const code = await fs.readFile(path.join(distDir, 'app3', 'navigator.js'), 'utf-8')
      expect(code.length).toBeGreaterThan(100)
    })
  })

  describe('shared (pure TS)', () => {
    it('produces valid ESM navigator.js', async () => {
      const code = await fs.readFile(path.join(distDir, 'shared', 'navigator.js'), 'utf-8')
      expect(code).toMatch(/export/)
    })
  })

  describe('js-test (plain JS)', () => {
    it('produces valid ESM navigator.js', async () => {
      const code = await fs.readFile(path.join(distDir, 'js-test', 'navigator.js'), 'utf-8')
      expect(code).toMatch(/export/)
    })
  })

  describe('naming conventions', () => {
    it('entry files are [name].js, chunks are [name]-[hash].js', async () => {
      for (const app of ['app1', 'shared']) {
        const files = await fs.readdir(path.join(distDir, app))
        const jsFiles = files.filter((f) => f.endsWith('.js'))
        expect(jsFiles).toContain('navigator.js')
        const chunks = jsFiles.filter((f) => f !== 'navigator.js')
        for (const chunk of chunks) {
          expect(chunk).toMatch(/-[a-zA-Z0-9]+\.js$/)
        }
      }
    })
  })
})
