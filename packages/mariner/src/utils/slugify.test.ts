import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('converts a string to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with dashes', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz')
  })

  it('removes special characters', () => {
    expect(slugify('hello@world!')).toBe('helloworld')
  })

  it('trims whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })

  it('collapses multiple dashes into one', () => {
    expect(slugify('foo---bar')).toBe('foo-bar')
  })

  it('replaces multiple spaces with single dash', () => {
    expect(slugify('foo   bar')).toBe('foo-bar')
  })

  it('handles mixed special chars, spaces, and dashes', () => {
    expect(slugify('My App! -- v2.0')).toBe('my-app-v20')
  })

  it('returns null for null input', () => {
    expect(slugify(null)).toBeNull()
  })

  it('returns undefined for undefined input', () => {
    expect(slugify(undefined)).toBeUndefined()
  })

  it('returns empty string for empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('preserves existing dashes', () => {
    expect(slugify('my-app')).toBe('my-app')
  })

  it('preserves underscores', () => {
    expect(slugify('my_app')).toBe('my_app')
  })
})
