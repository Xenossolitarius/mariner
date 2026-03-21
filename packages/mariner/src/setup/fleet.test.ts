import { describe, it, expect, vi } from 'vitest'
import { validateFleetSchema, getFleetConfig } from './fleet'

vi.mock('../utils/json', () => ({
  getJSON: vi.fn(),
}))

import { getJSON } from '../utils/json'

describe('validateFleetSchema', () => {
  it('returns true for a valid fleet config', () => {
    expect(validateFleetSchema({ main: ['app1', 'app2'], secondary: ['app3'] })).toBe(true)
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
})

describe('getFleetConfig', () => {
  it('returns fleet config when valid JSON is found', async () => {
    const config = { main: ['app1', 'app2'] }
    vi.mocked(getJSON).mockResolvedValue(config)

    const result = await getFleetConfig()

    expect(result).toEqual(config)
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
