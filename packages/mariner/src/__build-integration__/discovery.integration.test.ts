import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getMarinerSetup, getMarineConfigPaths, getMarinerProjects } from '../setup/setup'
import { getFleetConfig, validateFleetSchema } from '../setup/fleet'
import type { MarinerProject } from '../setup'
import path from 'node:path'

// These tests must run from the monorepo root where playground/ and fleet.config.json live
const monorepoRoot = path.resolve(__dirname, '../../../..')
let originalCwd: string

beforeAll(() => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)
})

afterAll(() => {
  process.chdir(originalCwd)
})

describe('project discovery integration', () => {
  describe('getMarineConfigPaths', () => {
    it('discovers mariner.config files in the playground', async () => {
      const paths = await getMarineConfigPaths()

      expect(paths.length).toBeGreaterThan(0)

      const names = paths.map((p) => p.name)
      expect(names.some((n) => n.includes('mariner.config'))).toBe(true)
    })

    it('excludes node_modules and dist', async () => {
      const paths = await getMarineConfigPaths()

      const fullPaths = paths.map((p) => p.fullpath())
      expect(fullPaths.every((p) => !p.includes('node_modules'))).toBe(true)
      expect(fullPaths.every((p) => !p.includes('/dist/'))).toBe(true)
    })
  })

  describe('getMarinerProjects', () => {
    let projects: MarinerProject[]

    it('discovers all playground projects', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      expect(projects.length).toBeGreaterThanOrEqual(5) // app1, app2, app3, shared, lazy, global-env, js-test

      const names = projects.map((p) => p.mariner)
      expect(names).toContain('app1')
      expect(names).toContain('app3')
      expect(names).toContain('shared')
    })

    it('marks projects with navigator files as valid', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      const app1 = projects.find((p) => p.mariner === 'app1')!
      expect(app1.isValid).toBe(true)
      expect(app1.navigator).toBeDefined()
    })

    it('identifies JS projects correctly', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      const jsTest = projects.find((p) => p.mariner === 'js-test')!
      expect(jsTest.isJs).toBe(true)
      expect(jsTest.navigator).toBe('navigator.js')
    })

    it('identifies TS projects correctly', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      const app1 = projects.find((p) => p.mariner === 'app1')!
      expect(app1.isJs).toBe(false)
      expect(app1.navigator).toBe('navigator.ts')
    })

    it('loads package.json for each project', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      const app1 = projects.find((p) => p.mariner === 'app1')!
      expect(app1.packageJson).toBeDefined()
      expect(app1.packageJson.name).toBeDefined()
    })

    it('loads mariner config for each project', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      const app1 = projects.find((p) => p.mariner === 'app1')!
      expect(app1.configFile).toBeDefined()
      expect(app1.configFile!.config).toBeDefined()
    })

    it('slugifies project names from mariner config', async () => {
      projects = await getMarinerProjects({ command: 'build', mode: 'production' })

      // All project names should be slug-safe
      for (const project of projects) {
        if (project.mariner) {
          expect(project.mariner).toMatch(/^[a-z0-9-]+$/)
        }
      }
    })
  })

  describe('getMarinerSetup', () => {
    it('returns projects and global config', async () => {
      const setup = await getMarinerSetup({ command: 'build', mode: 'production' })

      expect(setup.projects).toBeDefined()
      expect(setup.projects.length).toBeGreaterThan(0)
      expect(setup.global).toBeDefined()
    })

    it('loads fleet config from fleet.config.json', async () => {
      const setup = await getMarinerSetup({ command: 'build', mode: 'production' })

      // fleet.config.json exists in the root with {"test": ["app1", "app2"]}
      expect(setup.global.fleet).toBeDefined()
      expect(setup.global.fleet).not.toBe(false)

      if (setup.global.fleet) {
        expect(setup.global.fleet.test).toEqual(['app1', 'app2'])
      }
    })
  })

  describe('fleet filtering', () => {
    it('validates the real fleet.config.json schema', async () => {
      const fleet = await getFleetConfig()

      expect(fleet).toBeTruthy()
      if (fleet) {
        expect(validateFleetSchema(fleet)).toBe(true)
      }
    })

    it('fleet config can filter projects', async () => {
      const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
      const fleet = setup.global.fleet

      expect(fleet).toBeTruthy()
      if (!fleet) return

      const testFleet = fleet.test
      expect(testFleet).toEqual(['app1', 'app2'])

      // Simulate fleet filtering (same logic as select.ts)
      const filtered = setup.projects.filter((p) => p.mariner && testFleet.includes(p.mariner))

      expect(filtered.length).toBe(2)
      expect(filtered.map((p) => p.mariner)).toContain('app1')
      expect(filtered.map((p) => p.mariner)).toContain('app2')
      expect(filtered.map((p) => p.mariner)).not.toContain('app3')
    })
  })
})
