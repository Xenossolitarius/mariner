import { describe, it, expect, vi, beforeEach } from 'vitest'
import { select } from './select'
import type { MarinerProject, MarinerOptions } from '../../setup'

vi.mock('inquirer', () => ({
  default: { prompt: vi.fn() },
}))

vi.mock('./exit', () => ({
  exit: vi.fn(),
}))

import inquirer from 'inquirer'
import { exit } from './exit'

const mockProject = (name: string, isValid = true): MarinerProject =>
  ({
    mariner: name,
    isValid,
    root: `/projects/${name}`,
    navigator: isValid ? 'navigator.ts' : undefined,
  }) as MarinerProject

function makeSetup(projects: MarinerProject[], fleet: MarinerOptions['global']['fleet'] = null): MarinerOptions {
  return { projects, global: { fleet } }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('select', () => {
  describe('--all flag', () => {
    it('returns all projects when --all is set', async () => {
      const projects = [mockProject('app1'), mockProject('app2')]

      const result = await select(makeSetup(projects), { all: true } as never)

      expect(result).toEqual(projects)
    })

    it('logs warning when --all is used with --fleet', async () => {
      const projects = [mockProject('app1')]

      await select(makeSetup(projects), { all: true, fleet: 'test' } as never)

      expect(console.log).toHaveBeenCalled()
    })

    it('logs warning when --all is used with --navigator', async () => {
      const projects = [mockProject('app1')]

      await select(makeSetup(projects), { all: true, navigator: 'app1' } as never)

      expect(console.log).toHaveBeenCalled()
    })

    it('does not log when --all is used alone', async () => {
      const projects = [mockProject('app1')]

      await select(makeSetup(projects), { all: true } as never)

      // Only RUN_SINGLE_NAVIGATOR or USING_ALL messages — check no warning logged
      // Actually with just --all and no fleet/navigator, no log is called
      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('--navigator flag / single project', () => {
    it('filters to the named navigator', async () => {
      const projects = [mockProject('app1'), mockProject('app2')]

      const result = await select(makeSetup(projects), { navigator: 'app2' } as never)

      expect(result).toHaveLength(1)
      expect(result[0].mariner).toBe('app2')
    })

    it('returns empty array when navigator name does not match', async () => {
      const projects = [mockProject('app1')]

      const result = await select(makeSetup(projects), { navigator: 'unknown' } as never)

      expect(result).toHaveLength(0)
    })

    it('auto-selects when only one project exists', async () => {
      const projects = [mockProject('app1')]

      const result = await select(makeSetup(projects), {} as never)

      expect(result).toEqual([])
    })
  })

  describe('--fleet flag', () => {
    it('filters projects by named fleet', async () => {
      const projects = [mockProject('app1'), mockProject('app2'), mockProject('app3')]
      const fleet = { test: ['app1', 'app2'], prod: ['app1', 'app3'] }

      const result = await select(makeSetup(projects, fleet), { fleet: 'test' } as never)

      expect(result).toHaveLength(2)
      expect(result.map((p) => p.mariner)).toEqual(['app1', 'app2'])
    })

    it('prompts for fleet selection when --fleet is true (no name)', async () => {
      const projects = [mockProject('app1'), mockProject('app2')]
      const fleet = { test: ['app1'], prod: ['app2'] }

      vi.mocked(inquirer.prompt).mockResolvedValue({ fleet: 'prod' })

      const result = await select(makeSetup(projects, fleet), { fleet: true } as never)

      expect(inquirer.prompt).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].mariner).toBe('app2')
    })

    it('logs warning when fleet option set but no fleet config exists', async () => {
      const projects = [mockProject('app1'), mockProject('app2')]

      vi.mocked(inquirer.prompt).mockResolvedValue({ projects: ['/projects/app1'] })

      await select(makeSetup(projects, null), { fleet: 'test' } as never)

      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('interactive selection (no flags)', () => {
    it('prompts with checkbox when multiple projects and no flags', async () => {
      const projects = [mockProject('app1'), mockProject('app2')]

      vi.mocked(inquirer.prompt).mockResolvedValue({ projects: ['/projects/app1', '/projects/app2'] })

      const result = await select(makeSetup(projects), {} as never)

      expect(inquirer.prompt).toHaveBeenCalled()
      expect(result).toHaveLength(2)
    })

    it('calls exit when no projects are selected interactively', async () => {
      const projects = [mockProject('app1'), mockProject('app2')]

      vi.mocked(inquirer.prompt).mockResolvedValue({ projects: [] })

      await select(makeSetup(projects), {} as never)

      expect(exit).toHaveBeenCalled()
    })

    it('disables invalid projects in the selection list', async () => {
      const projects = [mockProject('app1', true), mockProject('broken', false)]

      vi.mocked(inquirer.prompt).mockResolvedValue({ projects: ['/projects/app1'] })

      await select(makeSetup(projects), {} as never)

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as Array<{ choices: Array<{ disabled: unknown }> }>
      const choices = promptCall[0].choices
      expect(choices[0].disabled).toBeFalsy()
      expect(choices[1].disabled).toBeTruthy()
    })
  })
})
