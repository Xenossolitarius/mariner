import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { getMarinerSetup } from '../setup'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import path from 'node:path'

// Deep validation of build output: manifest content, CSS injection, assets, cross-app imports.
// Requires mariner-fe to be built first.

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

  // Only build if dist doesn't exist yet (may be built by another test file)
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
  // Don't clean dist — other test files may still need it
})

describe('build output deep validation', () => {
  describe('manifest.json content', () => {
    it('manifest entries reference actual files on disk', async () => {
      for (const app of ['app1', 'app3', 'shared']) {
        const manifestPath = path.join(distDir, app, '.vite', 'manifest.json')
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))

        for (const entry of Object.values(manifest) as Array<{ file: string }>) {
          const filePath = path.join(distDir, app, entry.file)
          const stat = await fs.stat(filePath)
          expect(stat.isFile(), `${app}/${entry.file} referenced in manifest should exist`).toBe(true)
        }
      }
    })

    it('manifest has navigator entry as the main input', async () => {
      const manifestPath = path.join(distDir, 'shared', '.vite', 'manifest.json')
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))

      // There should be a navigator entry
      const entries = Object.keys(manifest)
      const navEntry = entries.find((e) => e.includes('navigator'))
      expect(navEntry).toBeDefined()

      const navData = manifest[navEntry!] as { file: string; isEntry: boolean }
      expect(navData.isEntry).toBe(true)
      expect(navData.file).toBe('navigator.js')
    })
  })

  describe('CSS injection', () => {
    it('app1 navigator.js contains injected CSS (no separate CSS files)', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      // cssInjectedByJs inlines CSS via document.head.appendChild
      expect(code).toContain('document.head')
      expect(code).toContain('appendChild')
    })

    it('app2 navigator.js contains injected CSS', async () => {
      const code = await fs.readFile(path.join(distDir, 'app2', 'navigator.js'), 'utf-8')
      expect(code).toContain('document.head')
    })

    it('shared navigator.js contains injected CSS (shared has style.css)', async () => {
      const code = await fs.readFile(path.join(distDir, 'shared', 'navigator.js'), 'utf-8')
      // shared/src/index.ts imports ./style.css
      expect(code).toContain('document.head')
    })
  })

  describe('asset hashing', () => {
    it('app2 has hashed image assets in dist', async () => {
      const files = await fs.readdir(path.join(distDir, 'app2'))
      // app2 imports Mariner.png, vue.svg, vite.svg — transformBuildAssets hashes them as name.HASH.ext
      const assetFiles = files.filter((f) => /\.(png|svg)$/.test(f))
      expect(assetFiles.length).toBeGreaterThan(0)

      // At least some assets should have content-hash (name.HASH.ext pattern)
      const hashedAssets = assetFiles.filter((f) => /\.\w+\.(png|svg)$/.test(f))
      expect(hashedAssets.length).toBeGreaterThan(0)
    })

    it('app3 has hashed SVG assets', async () => {
      const files = await fs.readdir(path.join(distDir, 'app3'))
      const svgFiles = files.filter((f) => f.endsWith('.svg'))
      expect(svgFiles.length).toBeGreaterThan(0)
    })

    it('asset references in navigator.js use import.meta.resolve', async () => {
      const code = await fs.readFile(path.join(distDir, 'app2', 'navigator.js'), 'utf-8')
      // transformBuildAssets rewrites asset imports to import.meta.resolve(...)
      expect(code).toContain('import.meta.resolve')
    })
  })

  describe('cross-app import externalization', () => {
    it('app1 externalizes navigator:shared and navigator:lazy', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      expect(code).toContain('/shared/navigator.js')
      // app1's HelloWorld.vue has dynamic import('navigator:lazy')
      expect(code).toContain('/lazy/navigator.js')
    })

    it('app2 externalizes navigator:shared and navigator:js-test', async () => {
      const code = await fs.readFile(path.join(distDir, 'app2', 'navigator.js'), 'utf-8')
      expect(code).toContain('/shared/navigator.js')
      expect(code).toContain('/js-test/navigator.js')
    })

    it('shared has no navigator imports (leaf node)', async () => {
      const code = await fs.readFile(path.join(distDir, 'shared', 'navigator.js'), 'utf-8')
      expect(code).not.toContain('/navigator.js')
    })

    it('js-test has no navigator imports (leaf node)', async () => {
      const code = await fs.readFile(path.join(distDir, 'js-test', 'navigator.js'), 'utf-8')
      expect(code).not.toContain('/navigator.js')
    })
  })

  describe('rootBase build', () => {
    const rootBase = 'my-cdn'

    beforeAll(async () => {
      const project = allProjects.find((p) => p.mariner === 'app1')!
      const opts = makeServerOptions(allProjects, rootBase)
      await buildNavigator(opts, project)
    }, 30000)

    it('outputs to dist/{rootBase}/{appname}/', async () => {
      const stat = await fs.stat(path.join(distDir, rootBase, 'app1'))
      expect(stat.isDirectory()).toBe(true)
    })

    it('navigator imports include rootBase prefix', async () => {
      const code = await fs.readFile(path.join(distDir, rootBase, 'app1', 'navigator.js'), 'utf-8')
      expect(code).toContain(`/${rootBase}/shared/navigator.js`)
    })

    it('asset URLs include rootBase prefix', async () => {
      const code = await fs.readFile(path.join(distDir, rootBase, 'app1', 'navigator.js'), 'utf-8')
      expect(code).toContain(`/${rootBase}/app1/`)
    })
  })
})
