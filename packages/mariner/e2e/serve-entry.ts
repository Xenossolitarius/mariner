/**
 * E2E helper: builds all navigators with --ssr (cargo as runtime ref),
 * builds cargo files, then starts the serve server on port 4200.
 */
import path from 'node:path'
import { getMarinerSetup } from '../src/setup'
import { buildNavigator } from '../src/server/build/build'
import { buildCargo } from '../src/server/build/build-cargo'
import { createServeServer } from '../src/server/serve'
import type { ServerOptions } from '../src/server/server'

const monorepoRoot = path.resolve(import.meta.dirname, '../../..')
const ssrDistDir = path.join(monorepoRoot, '.mariner-serve-e2e', 'dist')

import fs from 'node:fs'

// Discover projects from monorepo root (before chdir)
const setup = await getMarinerSetup({ command: 'build', mode: 'production' })

// Build into isolated dir
const workDir = path.join(monorepoRoot, '.mariner-serve-e2e')
fs.mkdirSync(workDir, { recursive: true })
process.chdir(workDir)
const projects = setup.projects.filter((p) => p.isValid)

const opts: ServerOptions = {
  setup: { projects, global: { fleet: null } },
  projects,
  commands: { command: 'build', mode: 'production', ssr: true, rootBase: '' } as ServerOptions['commands'],
} as ServerOptions

console.log('Building client bundles (SSR mode)...')
for (const project of projects) {
  await buildNavigator(opts, project)
}

console.log('Building cargo files...')
for (const project of projects) {
  const outDir = path.join(ssrDistDir, project.mariner!)
  await buildCargo(project, outDir)
}

fs.mkdirSync(ssrDistDir, { recursive: true })
console.log('Starting serve server...')
createServeServer({
  distDir: ssrDistDir,
  rootBase: '',
  port: 4200,
  hostname: 'localhost',
})

console.log('Serve server listening on http://localhost:4200')

process.on('SIGINT', () => {
  fs.rmSync(path.join(monorepoRoot, '.mariner-serve-e2e'), { recursive: true, force: true })
  process.exit(0)
})
