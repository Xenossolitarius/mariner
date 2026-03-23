import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildCargo } from './build-cargo'
import type { MarinerProject } from '../../setup'

vi.mock('vite', () => ({ build: vi.fn() }))
vi.mock('node:fs', () => ({ default: { existsSync: vi.fn() } }))

import { build } from 'vite'
import fs from 'node:fs'

beforeEach(() => vi.clearAllMocks())

function makeProject(mariner: string): MarinerProject {
  return {
    mariner,
    root: `/projects/${mariner}`,
    navigator: 'navigator.ts',
    isJs: false,
    isValid: true,
    packageJson: null,
    configFile: null,
  }
}

describe('buildCargo', () => {
  it('builds cargo.ts when it exists', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('cargo.ts'))

    await buildCargo(makeProject('app1'), '/dist/app1')

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        appType: 'custom',
        configFile: false,
        root: '/projects/app1',
        build: expect.objectContaining({ outDir: '/dist/app1', emptyOutDir: false }),
      }),
    )
  })

  it('builds cargo.js when cargo.ts does not exist', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('cargo.js'))

    await buildCargo(makeProject('app1'), '/dist/app1')

    expect(build).toHaveBeenCalled()
  })

  it('skips build when no cargo file exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await buildCargo(makeProject('app1'), '/dist/app1')

    expect(build).not.toHaveBeenCalled()
  })

  it('sets output entryFileNames to cargo.js', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('cargo.ts'))

    await buildCargo(makeProject('app1'), '/dist/app1')

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    const output = rolldownOptions.output as Record<string, string>
    expect(output.entryFileNames).toBe('cargo.js')
  })
})
