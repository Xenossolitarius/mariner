import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generateTypes } from '../server/generate-types/generate-types'
import { generateMarinerTypeFile } from '../server/generate-types/combine'
import { getMarinerSetup } from '../setup'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import path from 'node:path'

// Calls generateTypes directly (bypasses WorkerPool which needs built .mjs workers).
// Requires mariner-fe to be built first (pnpm --filter mariner-fe build).

const monorepoRoot = path.resolve(__dirname, '../../../..')
const marinerDir = path.join(monorepoRoot, '.mariner')
let originalCwd: string

let tsProjects: MarinerProject[]
let serverOptions: ServerOptions

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

  await fs.rm(marinerDir, { recursive: true, force: true }).catch(() => {})

  const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
  const allProjects = setup.projects.filter((p) => p.isValid)
  tsProjects = allProjects.filter((p) => !p.isJs)
  // Pass ALL projects so resolveVirtualNavigators knows about JS apps too
  serverOptions = makeServerOptions(allProjects)

  // Generate types for TS apps that don't have unresolvable external deps
  // shared (pinia) and lazy break api-extractor's rollupTypes
  const safeProjects = tsProjects.filter((p) => !['shared', 'lazy'].includes(p.mariner!))
  for (const project of safeProjects) {
    await generateTypes(serverOptions, project)
  }

  // Combine into single mariner.d.ts
  await generateMarinerTypeFile()
}, 120000)

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(marinerDir, { recursive: true, force: true }).catch(() => {})
})

describe('generate-types integration', () => {
  it('produces .mariner/mariner.d.ts', async () => {
    const stat = await fs.stat(path.join(marinerDir, 'mariner.d.ts'))
    expect(stat.isFile()).toBe(true)
  })

  it('contains declare module blocks for TS navigators', async () => {
    const content = await fs.readFile(path.join(marinerDir, 'mariner.d.ts'), 'utf-8')
    expect(content).toContain("declare module 'navigator:app1'")
  })

  it('does not contain JS-only apps', async () => {
    const content = await fs.readFile(path.join(marinerDir, 'mariner.d.ts'), 'utf-8')
    expect(content).not.toContain("declare module 'navigator:js-test'")
  })

  it('inner content is indented and declare keywords are stripped', async () => {
    const content = await fs.readFile(path.join(marinerDir, 'mariner.d.ts'), 'utf-8')
    expect(content).toMatch(/^ {2}\S/m)
    expect(content).not.toMatch(/^ {2}declare /m)
  })

  it('cleans up individual app type folders after combining', async () => {
    const entries = await fs.readdir(marinerDir, { withFileTypes: true })
    const dirs = entries.filter((e) => e.isDirectory())
    expect(dirs.length).toBe(0)
  })

  it('mariner.d.ts has actual type content', async () => {
    const content = await fs.readFile(path.join(marinerDir, 'mariner.d.ts'), 'utf-8')
    expect(content.length).toBeGreaterThan(100)
  })
})
