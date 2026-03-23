import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setup } from './setup'
import type { MarinerProject } from '../../setup'

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('../../setup', () => ({
  getMarinerSetup: vi.fn(),
}))

vi.mock('./exit', () => ({
  exit: vi.fn(),
}))

import { getMarinerSetup } from '../../setup'
import { exit } from './exit'

const mockProject = (name: string): MarinerProject =>
  ({ mariner: name, isValid: true, root: `/projects/${name}` }) as MarinerProject

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setup', () => {
  it('returns config when projects are found', async () => {
    vi.mocked(getMarinerSetup).mockResolvedValue({
      projects: [mockProject('app1')],
      global: { fleet: null },
    })

    const result = await setup({ command: 'serve', mode: 'development' } as never)

    expect(result.projects).toHaveLength(1)
    expect(exit).not.toHaveBeenCalled()
  })

  it('calls exit when no projects are found', async () => {
    vi.mocked(getMarinerSetup).mockResolvedValue({
      projects: [],
      global: { fleet: null },
    })

    await setup({ command: 'serve', mode: 'development' } as never)

    expect(exit).toHaveBeenCalled()
  })

  it('reports fleet config when present', async () => {
    vi.mocked(getMarinerSetup).mockResolvedValue({
      projects: [mockProject('app1')],
      global: { fleet: { test: { apps: ['app1'], mode: 'isolated' } } },
    })

    const result = await setup({ command: 'build', mode: 'production' } as never)

    expect(result.global.fleet).toEqual({ test: { apps: ['app1'], mode: 'isolated' } })
  })

  it('passes command and mode to getMarinerSetup', async () => {
    vi.mocked(getMarinerSetup).mockResolvedValue({
      projects: [mockProject('app1')],
      global: { fleet: null },
    })

    await setup({ command: 'build', mode: 'staging' } as never)

    expect(getMarinerSetup).toHaveBeenCalledWith({ mode: 'staging', command: 'build' })
  })
})
