import { describe, it, expect } from 'vitest'
import { findCommonRoot } from './common-root'

describe('findCommonRoot', () => {
  it('returns the single root when only one path given', () => {
    expect(findCommonRoot(['/a/b/c'])).toBe('/a/b/c')
  })

  it('returns common parent for sibling directories', () => {
    expect(findCommonRoot(['/workspace/playground/app1', '/workspace/playground/app2'])).toBe('/workspace/playground')
  })

  it('returns common ancestor for deeply nested paths', () => {
    expect(findCommonRoot(['/a/b/c/d', '/a/b/e/f', '/a/b/g'])).toBe('/a/b')
  })

  it('returns root separator when paths share no common segments', () => {
    expect(findCommonRoot(['/a/b', '/c/d'])).toBe('/')
  })

  it('returns cwd when given empty array', () => {
    expect(findCommonRoot([])).toBe(process.cwd())
  })

  it('handles paths where one is a parent of another', () => {
    expect(findCommonRoot(['/a/b', '/a/b/c/d'])).toBe('/a/b')
  })
})
