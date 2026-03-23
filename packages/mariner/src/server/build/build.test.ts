import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildNavigator, createBuildServer } from './build'
import type { ServerOptions } from '../server'
import type { MarinerProject } from '../../setup'

vi.mock('vite', () => ({
  build: vi.fn(),
}))

vi.mock('../../setup', async () => {
  const actual = await vi.importActual<typeof import('../../setup')>('../../setup')
  return { ...actual, loadMarinerConfigFile: vi.fn() }
})

vi.mock('vite-plugin-css-injected-by-js', () => ({ default: vi.fn(() => ({ name: 'css-injected' })) }))
vi.mock('../plugins/resolve-virtual-navigators', () => ({ resolveVirtualNavigators: vi.fn(() => ({ name: 'nav' })) }))
vi.mock('../worker-pool', () => ({
  default: vi.fn().mockImplementation(function () {
    return { run: vi.fn().mockResolvedValue(undefined), close: vi.fn() }
  }),
}))
vi.mock('../plugins/transform-build-assets', () => ({ transformBuildAssets: vi.fn(() => ({ name: 'assets' })) }))

import { build } from 'vite'
import { loadMarinerConfigFile } from '../../setup'

beforeEach(() => vi.clearAllMocks())

function makeProject(mariner = 'app1', navigator = 'navigator.ts'): MarinerProject {
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

function makeOpts(projects: MarinerProject[] = []): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects,
    commands: { command: 'build', mode: 'production', rootBase: '' } as ServerOptions['commands'],
  } as ServerOptions
}

describe('buildNavigator', () => {
  it('calls vite build with correct config', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', build: { rolldownOptions: {} } } as never,
      dependencies: [],
    })

    await buildNavigator(makeOpts(), makeProject())

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        appType: 'custom',
        mode: 'production',
        configFile: false,
        root: '/projects/app1',
      }),
    )
  })

  it('sets outDir to dist/{appname}', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', build: { rolldownOptions: {} } } as never,
      dependencies: [],
    })

    await buildNavigator(makeOpts(), makeProject())

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    expect(buildConfig.outDir).toContain('dist')
    expect(buildConfig.outDir).toContain('app1')
  })

  it('includes rootBase in outDir', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', build: { rolldownOptions: {} } } as never,
      dependencies: [],
    })

    const opts = makeOpts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(opts.commands as any).rootBase = 'cdn'

    await buildNavigator(opts, makeProject())

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    expect(buildConfig.outDir).toContain('cdn')
  })

  it('returns early when config is not found', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue(null)

    await buildNavigator(makeOpts(), makeProject())

    expect(build).not.toHaveBeenCalled()
  })

  it('sets output naming conventions', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', build: { rolldownOptions: {} } } as never,
      dependencies: [],
    })

    await buildNavigator(makeOpts(), makeProject())

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    const output = rolldownOptions.output as Record<string, string>
    expect(output.entryFileNames).toBe('[name].js')
    expect(output.chunkFileNames).toBe('[name]-[hash].js')
  })
})

describe('createBuildServer', () => {
  it('creates a worker pool and runs all projects', async () => {
    const projects = [makeProject('app1'), makeProject('app2')]
    const opts = makeOpts(projects)

    await createBuildServer(opts)

    const WorkerPool = (await import('../worker-pool')).default
    expect(WorkerPool).toHaveBeenCalledWith('server/build/worker.mjs', undefined)

    const pool = vi.mocked(WorkerPool).mock.results[0].value
    expect(pool.run).toHaveBeenCalledTimes(2)
    expect(pool.close).toHaveBeenCalled()
  })
})
