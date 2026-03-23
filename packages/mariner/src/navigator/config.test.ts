import { describe, it, expect } from 'vitest'
import { defineNavigator } from './config'

describe('defineNavigator', () => {
  it('returns the same options passed in', () => {
    const options = { mount: () => {}, unmount: () => {} }
    expect(defineNavigator(options)).toBe(options)
  })

  it('works with any value', () => {
    expect(defineNavigator('hello')).toBe('hello')
    expect(defineNavigator(42)).toBe(42)
    expect(defineNavigator(null)).toBeNull()
  })
})
