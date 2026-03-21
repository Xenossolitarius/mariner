import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTypes, createTypeGeneratorServer } from './generate-types'
import type { ServerOptions } from '../server'
import type { MarinerProject } from '../../setup'

vi.mock('vite', () => ({
  build: vi.fn(),
}))

vi.mock('../../setup', async () => {
  const actual = await vi.importActual<typeof import('../../setup')>('../../setup')
  return { ...actual, loadMarinerConfigFile: vi.fn() }
})

vi.mock('vite-plugin-dts', () => ({ default: vi.fn(() => ({ name: 'dts' })) }))
vi.mock('../plugins/resolve-virtual-navigators', () => ({ resolveVirtualNavigators: vi.fn(() => ({ name: 'nav' })) }))
vi.mock('./combine', () => ({ generateMarinerTypeFile: vi.fn() }))
vi.mock('../worker-pool', () => ({
  default: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined), close: vi.fn() }
  }),
}))

import { build } from 'vite'
import { loadMarinerConfigFile } from '../../setup'

beforeEach(() => vi.clearAllMocks())

function makeProject(mariner = 'shared', navigator = 'navigator.ts'): MarinerProject {
  return {
    mariner,
    root: `/projects/${mariner}`,
    navigator,
    isJs: false,
    isValid: true,
    packageJson: null,
    configFile: null,
  }
}

function makeOpts(): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: [],
    commands: { command: 'build', mode: 'production' } as ServerOptions['commands'],
  } as ServerOptions
}

describe('generateTypes', () => {
  it('calls vite build with lib config and dts plugin', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'shared' } as never,
      dependencies: [],
    })

    await generateTypes(makeOpts(), makeProject())

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        appType: 'custom',
        configFile: false,
        root: '/projects/shared',
      }),
    )

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    expect(buildConfig.lib).toBeDefined()
    expect(buildConfig.copyPublicDir).toBe(false)
  })

  it('returns early when config is not found', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue(null)

    await generateTypes(makeOpts(), makeProject())

    expect(build).not.toHaveBeenCalled()
  })

  it('sets lib entry to navigator path', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'shared' } as never,
      dependencies: [],
    })

    await generateTypes(makeOpts(), makeProject())

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const lib = buildConfig.lib as Record<string, unknown>
    expect(lib.entry).toContain('navigator.ts')
    expect(lib.name).toContain('navigator:shared')
  })
})

describe('createTypeGeneratorServer', () => {
  it('creates a worker pool, runs TS projects, and combines types', async () => {
    const projects = [
      { ...makeProject('app1'), isJs: false },
      { ...makeProject('js-app', 'navigator.js'), isJs: true },
    ] as MarinerProject[]
    const opts = { ...makeOpts(), projects } as ServerOptions

    await createTypeGeneratorServer(opts)

    const WorkerPool = (await import('../worker-pool')).default
    expect(WorkerPool).toHaveBeenCalledWith('server/generate-types/worker.mjs', undefined)

    const pool = vi.mocked(WorkerPool).mock.results[0].value
    // Only TS projects should be run (isJs skipped)
    expect(pool.run).toHaveBeenCalledTimes(1)
    expect(pool.close).toHaveBeenCalled()

    const { generateMarinerTypeFile } = await import('./combine')
    expect(generateMarinerTypeFile).toHaveBeenCalled()
  })
})
