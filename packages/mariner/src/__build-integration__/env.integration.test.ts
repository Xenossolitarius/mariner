import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { getMarinerSetup } from '../setup'
import { loadMarinerEnv } from '../setup/utils'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import fs from 'node:fs/promises'
import path from 'node:path'

// Tests environment variable loading and substitution.
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

  const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
  allProjects = setup.projects.filter((p) => p.isValid)
}, 30000)

afterAll(() => {
  process.chdir(originalCwd)
})

describe('environment variable integration', () => {
  describe('loadMarinerEnv', () => {
    it('loads MARINER_ prefixed env vars from .env file', () => {
      const app2Root = allProjects.find((p) => p.mariner === 'app2')!.root
      const env = loadMarinerEnv('production', app2Root)

      expect(env.MARINER_LOCAL_KEY).toBe('local_env_variable')
    })

    it('loads env vars for the test mode from .env.test', () => {
      const app2Root = allProjects.find((p) => p.mariner === 'app2')!.root
      const env = loadMarinerEnv('test', app2Root)

      // .env.test overrides .env
      expect(env.MARINER_LOCAL_KEY).toBe('TEST_local_key')
    })

    it('returns empty for apps without .env files', () => {
      const sharedRoot = allProjects.find((p) => p.mariner === 'shared')!.root
      const env = loadMarinerEnv('production', sharedRoot)

      // shared has no .env file, so no MARINER_ vars
      const keys = Object.keys(env).filter((k) => k.startsWith('MARINER_'))
      expect(keys.length).toBe(0)
    })
  })

  describe('env var substitution in build output', () => {
    beforeAll(async () => {
      // Build envs app only if not already built
      const exists = await fs.stat(path.join(distDir, 'envs', 'navigator.js')).catch(() => null)
      if (!exists) {
        const opts = makeServerOptions(allProjects)
        const envsProject = allProjects.find((p) => p.mariner === 'envs')!
        await buildNavigator(opts, envsProject)
      }
    }, 30000)

    it('envs navigator.js has import.meta.env.MARINER_GLOBAL_MODE replaced', async () => {
      const code = await fs.readFile(path.join(distDir, 'envs', 'navigator.js'), 'utf-8')
      // In production build, import.meta.env.MARINER_GLOBAL_MODE should be statically replaced
      // If the env var is not set, it becomes undefined or empty string
      expect(code).not.toContain('import.meta.env.MARINER_GLOBAL_MODE')
    })
  })

  describe('MARINER_ prefix filtering', () => {
    it('only loads vars with MARINER_ prefix, not VITE_ or others', () => {
      const app2Root = allProjects.find((p) => p.mariner === 'app2')!.root
      const env = loadMarinerEnv('production', app2Root)

      // All returned keys should start with MARINER_
      for (const key of Object.keys(env)) {
        expect(key.startsWith('MARINER_'), `${key} should start with MARINER_`).toBe(true)
      }
    })
  })
})
