import { describe, it, expect } from 'vitest'
import { virtualRoot, replaceImportsPlugin } from './collection'

describe('virtualRoot', () => {
  it('returns a plugin with correct name', () => {
    const plugin = virtualRoot()
    expect(plugin.name).toBe('mariner:virtual-root')
  })

  it('resolves the virtual module id', () => {
    const plugin = virtualRoot()
    const resolveId = plugin.resolveId as (id: string) => string | undefined

    expect(resolveId('virtual:mariner-root')).toBe('\0virtual:mariner-root')
  })

  it('does not resolve other module ids', () => {
    const plugin = virtualRoot()
    const resolveId = plugin.resolveId as (id: string) => string | undefined

    expect(resolveId('other-module')).toBeUndefined()
  })

  it('loads the resolved virtual module', () => {
    const plugin = virtualRoot()
    const load = plugin.load as (id: string) => string | undefined

    expect(load('\0virtual:mariner-root')).toBe('export const emitter = "from virtual module"')
  })

  it('does not load other modules', () => {
    const plugin = virtualRoot()
    const load = plugin.load as (id: string) => string | undefined

    expect(load('other-module')).toBeUndefined()
  })
})

describe('replaceImportsPlugin', () => {
  it('returns a plugin with correct name', () => {
    const plugin = replaceImportsPlugin()
    expect(plugin.name).toBe('replace-imports')
  })

  it('replaces virtual:mariner-lighthouse in .js files', () => {
    const plugin = replaceImportsPlugin()
    const transform = plugin.transform as (code: string, id: string) => { code: string; map: null }

    const result = transform('import x from "virtual:mariner-lighthouse"', 'file.js')

    expect(result.code).toBe('import x from "http:localhost:3000"')
    expect(result.map).toBeNull()
  })

  it('replaces virtual:mariner-lighthouse in .jsx files', () => {
    const plugin = replaceImportsPlugin()
    const transform = plugin.transform as (code: string, id: string) => { code: string; map: null }

    const result = transform('import x from "virtual:mariner-lighthouse"', 'file.jsx')

    expect(result.code).toContain('http:localhost:3000')
  })

  it('replaces virtual:mariner-lighthouse in .vue files', () => {
    const plugin = replaceImportsPlugin()
    const transform = plugin.transform as (code: string, id: string) => { code: string; map: null }

    const result = transform('import x from "virtual:mariner-lighthouse"', 'file.vue')

    expect(result.code).toContain('http:localhost:3000')
  })

  it('does not replace in .ts files', () => {
    const plugin = replaceImportsPlugin()
    const transform = plugin.transform as (code: string, id: string) => { code: string; map: null }

    const result = transform('import x from "virtual:mariner-lighthouse"', 'file.ts')

    expect(result.code).toContain('virtual:mariner-lighthouse')
  })

  it('replaces multiple occurrences', () => {
    const plugin = replaceImportsPlugin()
    const transform = plugin.transform as (code: string, id: string) => { code: string; map: null }

    const code = 'const a = "virtual:mariner-lighthouse"; const b = "virtual:mariner-lighthouse";'
    const result = transform(code, 'file.js')

    expect(result.code).not.toContain('virtual:mariner-lighthouse')
    expect(result.code.match(/http:localhost:3000/g)).toHaveLength(2)
  })

  it('leaves code without lighthouse imports unchanged', () => {
    const plugin = replaceImportsPlugin()
    const transform = plugin.transform as (code: string, id: string) => { code: string; map: null }

    const code = 'const x = 1;'
    const result = transform(code, 'file.js')

    expect(result.code).toBe(code)
  })
})
