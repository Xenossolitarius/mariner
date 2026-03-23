import { describe, it, expect, vi } from 'vitest'
import { normalizeMode, loadMarinerConfigFile, loadMarinerEnv } from './utils'

vi.mock('vite', async () => {
  const actual = await vi.importActual<typeof import('vite')>('vite')
  return {
    ...actual,
    loadConfigFromFile: vi.fn().mockResolvedValue({ path: '/root/mariner.config', config: {}, dependencies: [] }),
    loadEnv: vi.fn().mockReturnValue({ MARINER_MODE: 'test' }),
  }
})

import { loadConfigFromFile, loadEnv } from 'vite'

describe('normalizeMode', () => {
  it('returns the explicit mode when provided', () => {
    expect(normalizeMode({ command: 'serve', mode: 'staging' })).toBe('staging')
  })

  it('defaults to development for serve command', () => {
    expect(normalizeMode({ command: 'serve' } as never)).toBe('development')
  })

  it('defaults to production for build command', () => {
    expect(normalizeMode({ command: 'build' } as never)).toBe('production')
  })

  it('returns explicit mode even for build command', () => {
    expect(normalizeMode({ command: 'build', mode: 'test' })).toBe('test')
  })
})

describe('loadMarinerConfigFile', () => {
  it('calls loadConfigFromFile with the correct arguments', async () => {
    const config = { command: 'serve' as const, mode: 'development' }

    await loadMarinerConfigFile(config, '/my/project')

    expect(loadConfigFromFile).toHaveBeenCalledWith(config, '/my/project/mariner.config', '/my/project')
  })

  it('returns the result from loadConfigFromFile', async () => {
    const result = await loadMarinerConfigFile({ command: 'serve', mode: 'development' }, '/root')

    expect(result).toEqual({ path: '/root/mariner.config', config: {}, dependencies: [] })
  })
})

describe('loadMarinerEnv', () => {
  it('calls loadEnv with MARINER_ prefix', () => {
    loadMarinerEnv('development', '/my/project')

    expect(loadEnv).toHaveBeenCalledWith('development', '/my/project', 'MARINER_')
  })

  it('returns the result from loadEnv', () => {
    const result = loadMarinerEnv('development', '/root')

    expect(result).toEqual({ MARINER_MODE: 'test' })
  })
})
