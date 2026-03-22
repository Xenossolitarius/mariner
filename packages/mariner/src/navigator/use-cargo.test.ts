import { describe, it, expect } from 'vitest'
import { useCargo } from './use-cargo'

describe('useCargo', () => {
  it('throws when not transformed by the plugin', () => {
    expect(() => useCargo()).toThrow('useCargo() was not transformed')
  })
})
