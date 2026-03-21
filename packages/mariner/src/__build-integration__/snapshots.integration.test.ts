import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { generateTypes } from '../server/generate-types/generate-types'
import { generateMarinerTypeFile } from '../server/generate-types/combine'
import { getMarinerSetup } from '../setup'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import path from 'node:path'

// Snapshot tests for generated files.
// Requires mariner-fe to be built first (pnpm --filter mariner-fe build).
// Run `pnpm test:integration -- -u` to update snapshots.

const monorepoRoot = path.resolve(__dirname, '../../../..')
const distDir = path.join(monorepoRoot, 'dist')
const marinerDir = path.join(monorepoRoot, '.mariner')
let originalCwd: string
let allProjects: MarinerProject[]

function makeServerOptions(projects: MarinerProject[], rootBase = ''): ServerOptions {
  return {
    setup: { projects, global: { fleet: null } },
    projects,
    commands: { command: 'build', mode: 'production', rootBase } as ServerOptions['commands'],
  } as ServerOptions
}

/** Strip content hashes from filenames: `logo.A1b2C3d4.png` → `logo.[hash].png` */
function normalizeHashes(str: string): string {
  return str.replace(/\.[A-Za-z0-9_-]{8}\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot|mp3|mp4)/g, '.[hash].$1')
}

/** Strip chunk hashes: `navigator-A1b2C3d4.js` → `navigator-[hash].js` */
function normalizeChunkHashes(str: string): string {
  return str.replace(/-[A-Za-z0-9_]{8}\.js/g, '-[hash].js')
}

/** Normalize a manifest.json: replace hash values in filenames */
function normalizeManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(manifest)) {
    const entry = value as Record<string, unknown>
    normalized[key] = {
      ...entry,
      file: typeof entry.file === 'string' ? normalizeChunkHashes(normalizeHashes(entry.file)) : entry.file,
      css: Array.isArray(entry.css) ? entry.css.map((c: string) => normalizeHashes(c)) : entry.css,
    }
  }
  return normalized
}

/** Extract import/export lines from bundled JS */
function extractImportExportLines(code: string): string[] {
  return code
    .split('\n')
    .filter((line) => /^(import|export)\s/.test(line.trim()))
    .map((line) => normalizeHashes(normalizeChunkHashes(line.trim())))
}

beforeAll(async () => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)

  // Build if needed
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

  // Generate types if needed
  const dtsExists = await fs.stat(path.join(marinerDir, 'mariner.d.ts')).catch(() => null)
  if (!dtsExists) {
    await fs.rm(marinerDir, { recursive: true, force: true }).catch(() => {})
    const allValid = allProjects
    const tsProjects = allValid.filter((p) => !p.isJs)
    const opts = makeServerOptions(allValid)
    const safeProjects = tsProjects.filter((p) => !['shared', 'lazy'].includes(p.mariner!))
    for (const project of safeProjects) {
      await generateTypes(opts, project)
    }
    await generateMarinerTypeFile()
  }
}, 180000)

afterAll(() => {
  process.chdir(originalCwd)
})

describe('snapshot tests', () => {
  describe('mariner.d.ts type definitions', () => {
    it('matches snapshot', async () => {
      const content = await fs.readFile(path.join(marinerDir, 'mariner.d.ts'), 'utf-8')
      expect(content).toMatchSnapshot()
    })
  })

  describe('manifest.json structure', () => {
    it('shared manifest matches snapshot', async () => {
      const manifest = JSON.parse(await fs.readFile(path.join(distDir, 'shared', '.vite', 'manifest.json'), 'utf-8'))
      expect(normalizeManifest(manifest)).toMatchSnapshot()
    })

    it('app1 manifest matches snapshot', async () => {
      const manifest = JSON.parse(await fs.readFile(path.join(distDir, 'app1', '.vite', 'manifest.json'), 'utf-8'))
      expect(normalizeManifest(manifest)).toMatchSnapshot()
    })

    it('app3 manifest matches snapshot', async () => {
      const manifest = JSON.parse(await fs.readFile(path.join(distDir, 'app3', '.vite', 'manifest.json'), 'utf-8'))
      expect(normalizeManifest(manifest)).toMatchSnapshot()
    })

    it('app2 manifest matches snapshot', async () => {
      const manifest = JSON.parse(await fs.readFile(path.join(distDir, 'app2', '.vite', 'manifest.json'), 'utf-8'))
      expect(normalizeManifest(manifest)).toMatchSnapshot()
    })

    it('lazy manifest matches snapshot', async () => {
      const manifest = JSON.parse(await fs.readFile(path.join(distDir, 'lazy', '.vite', 'manifest.json'), 'utf-8'))
      expect(normalizeManifest(manifest)).toMatchSnapshot()
    })

    it('js-test manifest matches snapshot', async () => {
      const manifest = JSON.parse(await fs.readFile(path.join(distDir, 'js-test', '.vite', 'manifest.json'), 'utf-8'))
      expect(normalizeManifest(manifest)).toMatchSnapshot()
    })
  })

  describe('navigator.js import/export structure', () => {
    it('app1 imports match snapshot (vue + shared + lazy)', async () => {
      const code = await fs.readFile(path.join(distDir, 'app1', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })

    it('app2 imports match snapshot (vue + shared + js-test)', async () => {
      const code = await fs.readFile(path.join(distDir, 'app2', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })

    it('app3 imports match snapshot (React)', async () => {
      const code = await fs.readFile(path.join(distDir, 'app3', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })

    it('shared imports match snapshot (leaf — no navigators)', async () => {
      const code = await fs.readFile(path.join(distDir, 'shared', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })

    it('lazy imports match snapshot (leaf — no navigators)', async () => {
      const code = await fs.readFile(path.join(distDir, 'lazy', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })

    it('js-test imports match snapshot (leaf — no navigators)', async () => {
      const code = await fs.readFile(path.join(distDir, 'js-test', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })

    it('envs imports match snapshot (leaf — no navigators)', async () => {
      const code = await fs.readFile(path.join(distDir, 'envs', 'navigator.js'), 'utf-8')
      expect(extractImportExportLines(code)).toMatchSnapshot()
    })
  })

  describe('dist file listing per app', () => {
    it('shared file listing matches snapshot', async () => {
      const files = (await fs.readdir(path.join(distDir, 'shared')))
        .sort()
        .map(normalizeHashes)
        .map(normalizeChunkHashes)
      expect(files).toMatchSnapshot()
    })

    it('app1 file listing matches snapshot', async () => {
      const files = (await fs.readdir(path.join(distDir, 'app1'))).sort().map(normalizeHashes).map(normalizeChunkHashes)
      expect(files).toMatchSnapshot()
    })

    it('app3 file listing matches snapshot', async () => {
      const files = (await fs.readdir(path.join(distDir, 'app3'))).sort().map(normalizeHashes).map(normalizeChunkHashes)
      expect(files).toMatchSnapshot()
    })

    it('lazy file listing matches snapshot', async () => {
      const files = (await fs.readdir(path.join(distDir, 'lazy'))).sort().map(normalizeHashes).map(normalizeChunkHashes)
      expect(files).toMatchSnapshot()
    })
  })
})
