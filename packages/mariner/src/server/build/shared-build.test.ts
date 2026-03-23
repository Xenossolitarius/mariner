import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSharedFleet } from './shared-build'
import type { ServerOptions } from '../server'
import type { ResolvedFleetGroup } from '../../setup/types'
import type { MarinerProject } from '../../setup/setup'

vi.mock('vite', () => ({
  build: vi.fn(),
}))

vi.mock('../../setup/utils', () => ({
  loadMarinerConfigFile: vi.fn().mockResolvedValue({
    path: '/p',
    config: { mariner: 'app', plugins: [], build: { rolldownOptions: {} } },
    dependencies: [],
  }),
}))

vi.mock('vite-plugin-css-injected-by-js', () => ({ default: vi.fn(() => ({ name: 'css-injected' })) }))
vi.mock('../plugins/resolve-virtual-navigators', () => ({
  resolveVirtualNavigatorsShared: vi.fn(() => ({ name: 'shared-nav' })),
}))
vi.mock('../plugins/transform-build-assets', () => ({
  transformBuildAssetsShared: vi.fn(() => ({ name: 'shared-assets' })),
}))

import { build } from 'vite'
import { loadMarinerConfigFile } from '../../setup/utils'

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

function makeGroup(projects: MarinerProject[], name = 'shared-vue'): ResolvedFleetGroup {
  return { name, mode: 'shared', projects }
}

function makeOpts(overrides = {}): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: [],
    commands: { command: 'build', mode: 'production', rootBase: '', ...overrides } as ServerOptions['commands'],
  } as ServerOptions
}

describe('buildSharedFleet', () => {
  it('calls vite build once for the entire fleet', async () => {
    const projects = [makeProject('app1'), makeProject('app2'), makeProject('shared')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    expect(build).toHaveBeenCalledTimes(1)
  })

  it('loads config for each project', async () => {
    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    expect(loadMarinerConfigFile).toHaveBeenCalledTimes(2)
  })

  it('creates input entries for each project navigator', async () => {
    const projects = [makeProject('app1'), makeProject('shared')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    expect(rolldownOptions.input).toEqual({
      'app1/navigator': '/projects/app1/navigator.ts',
      'shared/navigator': '/projects/shared/navigator.ts',
    })
  })

  it('sets outDir to dist/', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    expect(buildConfig.outDir).toContain('dist')
  })

  it('includes rootBase in outDir', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts({ rootBase: 'cdn' }), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    expect(buildConfig.outDir).toContain('cdn')
  })

  it('configures vite build with correct options', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        appType: 'custom',
        mode: 'production',
        configFile: false,
        build: expect.objectContaining({
          manifest: true,
          emptyOutDir: false,
          modulePreload: { polyfill: false },
        }),
      }),
    )
  })

  it('sets output naming conventions', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    const output = rolldownOptions.output as Record<string, string>
    expect(output.entryFileNames).toBe('[name].js')
    expect(output.chunkFileNames).toBe('chunks/[name]-[hash].js')
    expect(output.assetFileNames).toBe('chunks/[name]-[hash].[ext]')
  })

  it('preserves entry signatures as exports-only', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    expect(rolldownOptions.preserveEntrySignatures).toBe('exports-only')
  })

  it('deduplicates plugins by name across configs', async () => {
    vi.mocked(loadMarinerConfigFile)
      .mockResolvedValueOnce({
        path: '/p1',
        config: { mariner: 'app1', plugins: [{ name: 'shared-plugin' }], build: { rolldownOptions: {} } } as never,
        dependencies: [],
      })
      .mockResolvedValueOnce({
        path: '/p2',
        config: {
          mariner: 'app2',
          plugins: [{ name: 'shared-plugin' }, { name: 'unique-plugin' }],
          build: { rolldownOptions: {} },
        } as never,
        dependencies: [],
      })

    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const plugins = callArgs.plugins as { name: string }[]
    const pluginNames = plugins.map((p) => p.name)
    expect(pluginNames.filter((n) => n === 'shared-plugin')).toHaveLength(1)
    expect(pluginNames).toContain('unique-plugin')
  })

  it('merges externals from all configs', async () => {
    vi.mocked(loadMarinerConfigFile)
      .mockResolvedValueOnce({
        path: '/p1',
        config: { mariner: 'app1', plugins: [], build: { rolldownOptions: { external: ['vue'] } } } as never,
        dependencies: [],
      })
      .mockResolvedValueOnce({
        path: '/p2',
        config: { mariner: 'app2', plugins: [], build: { rolldownOptions: { external: ['vue', 'pinia'] } } } as never,
        dependencies: [],
      })

    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    const external = rolldownOptions.external as string[]
    expect(external).toContain('vue')
    expect(external).toContain('pinia')
    expect(external.filter((e) => e === 'vue')).toHaveLength(1)
  })

  it('handles single string external', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', plugins: [], build: { rolldownOptions: { external: 'vue' } } } as never,
      dependencies: [],
    })

    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    expect(rolldownOptions.external).toContain('vue')
  })

  it('handles configs with no externals', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', plugins: [], build: {} } as never,
      dependencies: [],
    })

    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const buildConfig = callArgs.build as Record<string, unknown>
    const rolldownOptions = buildConfig.rolldownOptions as Record<string, unknown>
    expect(rolldownOptions.external).toEqual([])
  })

  it('skips falsy and boolean plugins', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: {
        mariner: 'app1',
        plugins: [null, false, undefined, { name: 'real-plugin' }],
        build: { rolldownOptions: {} },
      } as never,
      dependencies: [],
    })

    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await buildSharedFleet(makeOpts(), group)

    const callArgs = vi.mocked(build).mock.calls[0][0] as Record<string, unknown>
    const plugins = callArgs.plugins as { name: string }[]
    const userPlugins = plugins.filter((p) => p.name === 'real-plugin')
    expect(userPlugins).toHaveLength(1)
  })
})
