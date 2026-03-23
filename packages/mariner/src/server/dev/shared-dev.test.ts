import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSharedNavServers } from './shared-dev'
import type { ServerOptions } from '../server'
import type { ResolvedFleetGroup } from '../../setup/types'
import type { MarinerProject } from '../../setup/setup'

vi.mock('vite', () => ({
  createServer: vi.fn().mockResolvedValue({
    middlewares: vi.fn(),
    config: { base: '/test' },
  }),
}))

vi.mock('../plugins/resolve-virtual-navigators', () => ({
  resolveVirtualNavigatorsShared: vi.fn().mockReturnValue({ name: 'mock-shared-nav' }),
}))

vi.mock('../../setup/utils', () => ({
  loadMarinerConfigFile: vi.fn().mockResolvedValue({
    path: '/p',
    config: { mariner: 'app', plugins: [] },
    dependencies: [],
  }),
}))

vi.mock('node:fs', () => ({
  default: { existsSync: vi.fn().mockReturnValue(false) },
}))

import { createServer as createViteServer } from 'vite'
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

function makeOptions(overrides = {}): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: [],
    commands: { command: 'serve', mode: 'development', ...overrides } as ServerOptions['commands'],
  } as ServerOptions
}

describe('createSharedNavServers', () => {
  it('creates a single Vite server for all projects in the group', async () => {
    const projects = [makeProject('app1'), makeProject('app2'), makeProject('shared')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions(), group, 10001)

    expect(createViteServer).toHaveBeenCalledTimes(1)
  })

  it('returns one AppRoute per project, all sharing the same Vite instance', async () => {
    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    const routes = await createSharedNavServers(makeOptions(), group, 10001)

    expect(routes).toHaveLength(2)
    expect(routes[0].vite).toBe(routes[1].vite)
  })

  it('sets base path as /{fleetName}/{appName}', async () => {
    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects, 'my-fleet')

    const routes = await createSharedNavServers(makeOptions(), group, 10001)

    expect(routes[0].base).toBe('/my-fleet/app1')
    expect(routes[1].base).toBe('/my-fleet/app2')
  })

  it('includes rootBase in base path', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    const routes = await createSharedNavServers(makeOptions({ rootBase: 'cdn' }), group, 10001)

    expect(routes[0].base).toBe('/cdn/shared-vue/app1')
  })

  it('sets relativeRoot on each route', async () => {
    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    const routes = await createSharedNavServers(makeOptions(), group, 10001)

    for (const route of routes) {
      expect(route.relativeRoot).toBeDefined()
    }
  })

  it('sets navigator on each route', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    const routes = await createSharedNavServers(makeOptions(), group, 10001)

    expect(routes[0].navigator).toBe('navigator.ts')
  })

  it('configures Vite with correct base, mode, and HMR port', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions(), group, 10101)

    expect(createViteServer).toHaveBeenCalledWith(
      expect.objectContaining({
        appType: 'custom',
        base: '/shared-vue',
        mode: 'development',
        configFile: false,
        publicDir: false,
        server: expect.objectContaining({
          middlewareMode: true,
          origin: 'http://localhost:3000',
          hmr: expect.objectContaining({ port: 10101, protocol: 'ws' }),
        }),
      }),
    )
  })

  it('uses wss protocol when https is enabled', async () => {
    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions({ https: true }), group, 10001)

    expect(createViteServer).toHaveBeenCalledWith(
      expect.objectContaining({
        server: expect.objectContaining({
          origin: 'https://localhost:3000',
          hmr: expect.objectContaining({ protocol: 'wss' }),
        }),
      }),
    )
  })

  it('loads config for each project in the group', async () => {
    const projects = [makeProject('app1'), makeProject('app2'), makeProject('shared')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions(), group, 10001)

    expect(loadMarinerConfigFile).toHaveBeenCalledTimes(3)
  })

  it('collects navigator entries for optimizeDeps', async () => {
    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions(), group, 10001)

    expect(createViteServer).toHaveBeenCalledWith(
      expect.objectContaining({
        optimizeDeps: {
          entries: ['/projects/app1/navigator.ts', '/projects/app2/navigator.ts'],
        },
      }),
    )
  })

  it('deduplicates plugins by name across configs', async () => {
    vi.mocked(loadMarinerConfigFile)
      .mockResolvedValueOnce({
        path: '/p1',
        config: { mariner: 'app1', plugins: [{ name: 'shared-plugin' }] } as never,
        dependencies: [],
      })
      .mockResolvedValueOnce({
        path: '/p2',
        config: { mariner: 'app2', plugins: [{ name: 'shared-plugin' }, { name: 'unique-plugin' }] } as never,
        dependencies: [],
      })

    const projects = [makeProject('app1'), makeProject('app2')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions(), group, 10001)

    const call = vi.mocked(createViteServer).mock.calls[0][0] as Record<string, unknown>
    const plugins = call.plugins as { name: string }[]
    const pluginNames = plugins.map((p) => p.name)
    expect(pluginNames.filter((n) => n === 'shared-plugin')).toHaveLength(1)
    expect(pluginNames).toContain('unique-plugin')
  })

  it('handles configs with no plugins', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1' } as never,
      dependencies: [],
    })

    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    const routes = await createSharedNavServers(makeOptions(), group, 10001)

    expect(routes).toHaveLength(1)
  })

  it('skips falsy and boolean plugins', async () => {
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'app1', plugins: [null, false, undefined, { name: 'real-plugin' }] } as never,
      dependencies: [],
    })

    const projects = [makeProject('app1')]
    const group = makeGroup(projects)

    await createSharedNavServers(makeOptions(), group, 10001)

    const call = vi.mocked(createViteServer).mock.calls[0][0] as Record<string, unknown>
    const plugins = call.plugins as { name: string }[]
    const userPlugins = plugins.filter((p) => p.name === 'real-plugin')
    expect(userPlugins).toHaveLength(1)
  })
})
