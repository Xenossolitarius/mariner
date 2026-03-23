import { describe, it, expect, vi } from 'vitest'
import { validateFleetSchema, getFleetConfig, normalizeFleetConfig } from './fleet'

vi.mock('../utils/json', () => ({
  getJSON: vi.fn(),
}))

import { getJSON } from '../utils/json'

describe('validateFleetSchema', () => {
  it('returns true for a valid legacy fleet config (string arrays)', () => {
    expect(validateFleetSchema({ main: ['app1', 'app2'], secondary: ['app3'] })).toBe(true)
  })

  it('returns true for a valid new fleet config (object entries)', () => {
    expect(
      validateFleetSchema({
        'vue-apps': { apps: ['app1', 'app2'], mode: 'shared' },
        'react-apps': { apps: ['app3'], mode: 'isolated' },
      }),
    ).toBe(true)
  })

  it('returns true for mixed legacy and new format', () => {
    expect(
      validateFleetSchema({
        legacy: ['app1'],
        modern: { apps: ['app2'], mode: 'shared' },
      }),
    ).toBe(true)
  })

  it('returns true for an empty object', () => {
    expect(validateFleetSchema({})).toBe(true)
  })

  it('returns true for fleets with empty arrays', () => {
    expect(validateFleetSchema({ main: [] })).toBe(true)
  })

  it('returns false for non-string array values', () => {
    expect(validateFleetSchema({ main: [123] } as never)).toBe(false)
  })

  it('returns false for non-array fleet values', () => {
    expect(validateFleetSchema({ main: 'not-array' } as never)).toBe(false)
  })

  it('returns false for invalid mode', () => {
    expect(validateFleetSchema({ main: { apps: ['app1'], mode: 'invalid' } } as never)).toBe(false)
  })

  it('returns false for missing mode in object entry', () => {
    expect(validateFleetSchema({ main: { apps: ['app1'] } } as never)).toBe(false)
  })

  it('returns false for missing apps in object entry', () => {
    expect(validateFleetSchema({ main: { mode: 'shared' } } as never)).toBe(false)
  })
})

describe('normalizeFleetConfig', () => {
  it('normalizes legacy string[] entries to isolated FleetEntry', () => {
    const result = normalizeFleetConfig({ main: ['app1', 'app2'] })
    expect(result).toEqual({ main: { apps: ['app1', 'app2'], mode: 'isolated' } })
  })

  it('passes through new format entries unchanged', () => {
    const entry = { apps: ['app1'], mode: 'shared' as const }
    const result = normalizeFleetConfig({ main: entry })
    expect(result).toEqual({ main: entry })
  })

  it('handles mixed formats', () => {
    const result = normalizeFleetConfig({
      legacy: ['app1'],
      modern: { apps: ['app2'], mode: 'shared' },
    })
    expect(result).toEqual({
      legacy: { apps: ['app1'], mode: 'isolated' },
      modern: { apps: ['app2'], mode: 'shared' },
    })
  })
})

describe('getFleetConfig', () => {
  it('returns normalized fleet config when valid JSON is found', async () => {
    const config = { main: ['app1', 'app2'] }
    vi.mocked(getJSON).mockResolvedValue(config)

    const result = await getFleetConfig()

    expect(result).toEqual({ main: { apps: ['app1', 'app2'], mode: 'isolated' } })
  })

  it('returns normalized new format config', async () => {
    const config = { main: { apps: ['app1'], mode: 'shared' } }
    vi.mocked(getJSON).mockResolvedValue(config)

    const result = await getFleetConfig()

    expect(result).toEqual({ main: { apps: ['app1'], mode: 'shared' } })
  })

  it('returns null when no fleet config file exists', async () => {
    vi.mocked(getJSON).mockResolvedValue(null)

    const result = await getFleetConfig()

    expect(result).toBeNull()
  })

  it('returns false when fleet config is invalid schema', async () => {
    vi.mocked(getJSON).mockResolvedValue({ main: 'not-array' })

    const result = await getFleetConfig()

    expect(result).toBe(false)
  })
})
