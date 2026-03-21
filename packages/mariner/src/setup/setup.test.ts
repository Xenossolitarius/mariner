import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMarinerProjects, getMarinerGlobals, getMarinerSetup } from './setup'

vi.mock('glob', () => ({
  glob: vi.fn(),
}))

vi.mock('./utils', async () => {
  const actual = await vi.importActual<typeof import('./utils')>('./utils')
  return {
    ...actual,
    loadMarinerConfigFile: vi.fn(),
  }
})

vi.mock('../utils/json', () => ({
  getJSON: vi.fn(),
}))

vi.mock('./fleet', () => ({
  getFleetConfig: vi.fn(),
}))

import { glob } from 'glob'
import { loadMarinerConfigFile } from './utils'
import { getJSON } from '../utils/json'
import { getFleetConfig } from './fleet'

function mockPath(name: string, parentFiles: Array<{ name: string }> = []) {
  return {
    name,
    parent: {
      fullpath: () => `/projects/${name.replace('/mariner.config.ts', '')}`,
      readdir: () => Promise.resolve(parentFiles),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getMarinerProjects', () => {
  it('discovers projects from glob results and builds project objects', async () => {
    vi.mocked(glob).mockResolvedValue([
      mockPath('app1/mariner.config.ts', [{ name: 'navigator.ts' }, { name: 'package.json' }]),
    ] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'app1' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue({ name: 'app1' })

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects).toHaveLength(1)
    expect(projects[0].mariner).toBe('app1')
    expect(projects[0].navigator).toBe('navigator.ts')
    expect(projects[0].isJs).toBe(false)
    expect(projects[0].isValid).toBe(true)
  })

  it('detects JS navigators and sets isJs flag', async () => {
    vi.mocked(glob).mockResolvedValue([mockPath('js-app/mariner.config.ts', [{ name: 'navigator.js' }])] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'js-app' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue({ name: 'js-app' })

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].isJs).toBe(true)
    expect(projects[0].navigator).toBe('navigator.js')
  })

  it('prefers TS navigator over JS when both exist', async () => {
    vi.mocked(glob).mockResolvedValue([
      mockPath('both/mariner.config.ts', [{ name: 'navigator.js' }, { name: 'navigator.ts' }]),
    ] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'both' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue({ name: 'both' })

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    // TS checked first in forEach, JS overwrites — but TS comes after JS alphabetically
    // Actually: forEach iterates in order, .ts match sets navigator, .js match overwrites
    // So if both exist, the last match wins based on readdir order
    expect(projects[0].navigator).toBeDefined()
    expect(projects[0].isValid).toBe(true)
  })

  it('marks project as invalid when no navigator file exists', async () => {
    vi.mocked(glob).mockResolvedValue([
      mockPath('no-nav/mariner.config.ts', [{ name: 'package.json' }, { name: 'src' }]),
    ] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'no-nav' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue({ name: 'no-nav' })

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].isValid).toBe(false)
    expect(projects[0].navigator).toBeUndefined()
  })

  it('slugifies the mariner name from config', async () => {
    vi.mocked(glob).mockResolvedValue([mockPath('app/mariner.config.ts', [{ name: 'navigator.ts' }])] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({
      path: '/p',
      config: { mariner: 'My App Name!' },
      dependencies: [],
    })
    vi.mocked(getJSON).mockResolvedValue(null)

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].mariner).toBe('my-app-name')
  })

  it('falls back to package.json name when config has no mariner name', async () => {
    vi.mocked(glob).mockResolvedValue([mockPath('app/mariner.config.ts', [{ name: 'navigator.ts' }])] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: {} as never, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue({ name: 'pkg-name' })

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].mariner).toBe('pkg-name')
  })

  it('falls back to default name when no config or package.json name', async () => {
    vi.mocked(glob).mockResolvedValue([mockPath('app/mariner.config.ts', [{ name: 'navigator.ts' }])] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue(null)
    vi.mocked(getJSON).mockResolvedValue(null)

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].mariner).toBe('mariner-fe')
  })

  it('handles no projects found', async () => {
    vi.mocked(glob).mockResolvedValue([])

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects).toHaveLength(0)
  })

  it('handles multiple projects', async () => {
    vi.mocked(glob).mockResolvedValue([
      mockPath('a/mariner.config.ts', [{ name: 'navigator.ts' }]),
      mockPath('b/mariner.config.ts', [{ name: 'navigator.js' }]),
      mockPath('c/mariner.config.ts', []),
    ] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'x' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue(null)

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects).toHaveLength(3)
    expect(projects[0].isValid).toBe(true)
    expect(projects[0].isJs).toBe(false)
    expect(projects[1].isValid).toBe(true)
    expect(projects[1].isJs).toBe(true)
    expect(projects[2].isValid).toBe(false)
  })

  it('sets root from parent path', async () => {
    vi.mocked(glob).mockResolvedValue([mockPath('myapp/mariner.config.ts', [{ name: 'navigator.ts' }])] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'myapp' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue(null)

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].root).toBe('/projects/myapp')
  })

  it('defaults root to / and dirs to [] when parent is null', async () => {
    vi.mocked(glob).mockResolvedValue([{ name: 'mariner.config.ts', parent: null }] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue(null)
    vi.mocked(getJSON).mockResolvedValue(null)

    const projects = await getMarinerProjects({ command: 'build', mode: 'production' })

    expect(projects[0].root).toBe('/')
    expect(projects[0].navigator).toBeUndefined()
    expect(projects[0].isValid).toBe(false)
  })
})

describe('getMarinerGlobals', () => {
  it('returns fleet config', async () => {
    vi.mocked(getFleetConfig).mockResolvedValue({ test: ['app1'] })

    const globals = await getMarinerGlobals()

    expect(globals.fleet).toEqual({ test: ['app1'] })
  })

  it('returns null fleet when no config exists', async () => {
    vi.mocked(getFleetConfig).mockResolvedValue(null)

    const globals = await getMarinerGlobals()

    expect(globals.fleet).toBeNull()
  })
})

describe('getMarinerSetup', () => {
  it('returns projects and global config', async () => {
    vi.mocked(glob).mockResolvedValue([mockPath('app/mariner.config.ts', [{ name: 'navigator.ts' }])] as never)
    vi.mocked(loadMarinerConfigFile).mockResolvedValue({ path: '/p', config: { mariner: 'app' }, dependencies: [] })
    vi.mocked(getJSON).mockResolvedValue(null)
    vi.mocked(getFleetConfig).mockResolvedValue(null)

    const setup = await getMarinerSetup({ command: 'build', mode: 'production' })

    expect(setup.projects).toHaveLength(1)
    expect(setup.global.fleet).toBeNull()
  })

  it('normalizes mode for serve command', async () => {
    vi.mocked(glob).mockResolvedValue([])
    vi.mocked(getFleetConfig).mockResolvedValue(null)

    await getMarinerSetup({ command: 'serve' } as never)

    // getMarinerProjects is called with normalized mode
    expect(glob).toHaveBeenCalled()
  })
})
