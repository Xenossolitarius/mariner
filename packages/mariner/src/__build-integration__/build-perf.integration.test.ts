import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { getMarinerSetup } from '../setup'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import fss from 'node:fs'
import path from 'node:path'

// Build performance tests — measures build times and output sizes.
// Requires mariner-fe to be built first (pnpm --filter mariner-fe build).
// Thresholds are generous to avoid flaky CI — adjust if the codebase grows.

const monorepoRoot = path.resolve(__dirname, '../../../..')
const distDir = path.join(monorepoRoot, 'dist-perf')
let originalCwd: string
let allProjects: MarinerProject[]
let serverOptions: ServerOptions

function makeServerOptions(projects: MarinerProject[]): ServerOptions {
  return {
    setup: { projects, global: { fleet: null } },
    projects,
    commands: { command: 'build', mode: 'production', rootBase: '' } as ServerOptions['commands'],
  } as ServerOptions
}

async function buildWithTiming(project: MarinerProject): Promise<{ durationMs: number }> {
  const start = performance.now()
  // buildNavigator uses path.join(process.cwd(), 'dist', appname) for outDir
  // so we point cwd to the parent of our desired dist location
  const origCwd = process.cwd
  process.cwd = () => distDir
  try {
    await buildNavigator(serverOptions, project)
  } finally {
    process.cwd = origCwd
  }
  return { durationMs: performance.now() - start }
}

// Build output goes to distDir/dist/{appname}/
const outputDir = path.join(distDir, 'dist')

function getDirSize(dirPath: string): number {
  let size = 0
  if (!fss.existsSync(dirPath)) return 0
  const entries = fss.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      size += getDirSize(fullPath)
    } else {
      size += fss.statSync(fullPath).size
    }
  }
  return size
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

beforeAll(async () => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)

  await fs.rm(distDir, { recursive: true, force: true }).catch(() => {})
  await fs.mkdir(distDir, { recursive: true })

  const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
  allProjects = setup.projects.filter((p) => p.isValid)
  serverOptions = makeServerOptions(allProjects)
}, 30000)

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(distDir, { recursive: true, force: true }).catch(() => {})
})

describe('build performance — individual app build times', () => {
  const TIME_LIMITS: Record<string, number> = {
    shared: 5000,
    lazy: 3000,
    'js-test': 3000,
    envs: 3000,
    app1: 10000,
    app2: 15000,
    app3: 15000,
  }

  for (const [appName, limit] of Object.entries(TIME_LIMITS)) {
    it(
      `${appName} builds within ${limit / 1000}s`,
      async () => {
        const project = allProjects.find((p) => p.mariner === appName)!
        expect(project).toBeDefined()

        const { durationMs } = await buildWithTiming(project)
        console.log(`    ⏱ ${appName}: ${(durationMs / 1000).toFixed(2)}s`)
        expect(durationMs, `${appName} build took ${(durationMs / 1000).toFixed(2)}s`).toBeLessThan(limit)
      },
      limit + 5000,
    )
  }
})

describe('build performance — output sizes', () => {
  const SIZE_LIMITS: Record<string, number> = {
    shared: 50 * 1024, // 50 KB
    lazy: 10 * 1024, // 10 KB
    'js-test': 10 * 1024, // 10 KB
    envs: 10 * 1024, // 10 KB
    app1: 100 * 1024, // 100 KB (Vue externalized)
    app2: 100 * 1024, // 100 KB (Vue externalized + assets)
    app3: 500 * 1024, // 500 KB (React bundled inline)
  }

  for (const [appName, limit] of Object.entries(SIZE_LIMITS)) {
    it(`${appName} output under ${formatBytes(limit)}`, () => {
      const size = getDirSize(path.join(outputDir, appName))
      console.log(`    📦 ${appName}: ${formatBytes(size)}`)
      expect(size, `${appName} output is ${formatBytes(size)}`).toBeLessThan(limit)
      expect(size, `${appName} should not be empty`).toBeGreaterThan(0)
    })
  }

  it('navigator.js entry sizes: leaf nodes < 1KB, framework apps > 1KB', () => {
    const sizes: Record<string, number> = {}
    for (const app of Object.keys(SIZE_LIMITS)) {
      const navPath = path.join(outputDir, app, 'navigator.js')
      if (fss.existsSync(navPath)) {
        sizes[app] = fss.statSync(navPath).size
      }
    }

    console.log('    📄 navigator.js sizes:')
    for (const [app, size] of Object.entries(sizes)) {
      console.log(`       ${app}: ${formatBytes(size)}`)
    }

    // Leaf nodes should be tiny
    expect(sizes['lazy']).toBeLessThan(1024)
    expect(sizes['js-test']).toBeLessThan(1024)
    expect(sizes['envs']).toBeLessThan(1024)

    // Framework apps should be bigger
    expect(sizes['shared']).toBeGreaterThan(1024)
    expect(sizes['app3']).toBeGreaterThan(10 * 1024)
  })
})

describe('build performance — full project build', () => {
  it('all 7 apps build sequentially within 60s', async () => {
    await fs.rm(distDir, { recursive: true, force: true })
    await fs.mkdir(distDir, { recursive: true })

    const start = performance.now()
    for (const project of allProjects) {
      await buildWithTiming(project)
    }
    const totalMs = performance.now() - start

    console.log(`    ⏱ Full build (${allProjects.length} apps): ${(totalMs / 1000).toFixed(2)}s`)
    expect(totalMs).toBeLessThan(60000)

    // Verify all outputs exist
    for (const project of allProjects) {
      const navPath = path.join(outputDir, project.mariner!, 'navigator.js')
      const exists = fss.existsSync(navPath)
      expect(exists, `${project.mariner}/navigator.js should exist`).toBe(true)
    }

    const totalSize = getDirSize(outputDir)
    console.log(`    📦 Total output: ${formatBytes(totalSize)}`)
  }, 120000)
})
