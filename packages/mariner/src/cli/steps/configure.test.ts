import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configure } from './configure'

vi.mock('./mode', () => ({
  mode: vi.fn(),
}))

vi.mock('./setup', () => ({
  setup: vi.fn(),
}))

vi.mock('./select', () => ({
  select: vi.fn(),
}))

import { mode } from './mode'
import { setup } from './setup'
import { select } from './select'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('configure', () => {
  it('calls mode, setup, and select in order', async () => {
    const setupData = { projects: [{ mariner: 'app1' }], global: { fleet: null } }
    const selectedProjects = [{ mariner: 'app1' }]
    const commands = { command: 'serve', mode: 'development' }

    vi.mocked(setup).mockResolvedValue(setupData as never)
    vi.mocked(select).mockResolvedValue(selectedProjects as never)

    const result = await configure(commands as never)

    expect(mode).toHaveBeenCalledWith('development')
    expect(setup).toHaveBeenCalledWith(commands)
    expect(select).toHaveBeenCalledWith(setupData, commands)
    expect(result).toEqual({ setup: setupData, projects: selectedProjects, commands })
  })

  it('passes commands through to the result', async () => {
    const commands = { command: 'build', mode: 'production', all: true }

    vi.mocked(setup).mockResolvedValue({ projects: [], global: { fleet: null } } as never)
    vi.mocked(select).mockResolvedValue([] as never)

    const result = await configure(commands as never)

    expect(result.commands).toBe(commands)
  })
})
