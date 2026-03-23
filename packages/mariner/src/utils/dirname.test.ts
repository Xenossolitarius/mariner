import { describe, it, expect } from 'vitest'
import { getDirname } from './dirname'

describe('getDirname', () => {
  it('returns the directory of a file:// URL', () => {
    const result = getDirname('file:///Users/test/project/src/index.ts')
    expect(result).toBe('/Users/test/project/src')
  })

  it('returns root for a root-level file', () => {
    const result = getDirname('file:///file.ts')
    expect(result).toBe('/')
  })

  it('handles nested paths', () => {
    const result = getDirname('file:///a/b/c/d/e.ts')
    expect(result).toBe('/a/b/c/d')
  })
})
