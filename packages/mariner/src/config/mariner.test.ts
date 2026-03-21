import { describe, it, expect } from 'vitest'
import { defineMarinerConfig } from './mariner'

describe('defineMarinerConfig', () => {
  it('returns a function (vite defineConfig result)', () => {
    const config = defineMarinerConfig({ mariner: 'my-app' })
    expect(typeof config).toBe('function')
  })

  it('produces config with manifest enabled', () => {
    const configFn = defineMarinerConfig({ mariner: 'my-app' }) as (env: {
      command: string
      mode: string
    }) => Record<string, unknown>

    const result = configFn({ command: 'build', mode: 'production' })

    expect((result.build as Record<string, unknown>).manifest).toBe(true)
  })

  it('produces config with navigator as rollup input', () => {
    const configFn = defineMarinerConfig({ mariner: 'my-app' }) as (env: {
      command: string
      mode: string
    }) => Record<string, unknown>

    const result = configFn({ command: 'build', mode: 'production' })
    const build = result.build as Record<string, unknown>
    const rollupOptions = build.rollupOptions as Record<string, unknown>

    expect(rollupOptions.input).toBe('navigator')
  })

  it('preserves user config while merging defaults', () => {
    const configFn = defineMarinerConfig({
      mariner: 'my-app',
      root: '/custom/root',
    }) as (env: { command: string; mode: string }) => Record<string, unknown>

    const result = configFn({ command: 'build', mode: 'production' })

    expect(result.root).toBe('/custom/root')
    expect((result.build as Record<string, unknown>).manifest).toBe(true)
  })

  it('does not overwrite mariner defaults with user build config', () => {
    const configFn = defineMarinerConfig({
      mariner: 'my-app',
      build: { manifest: false },
    }) as (env: { command: string; mode: string }) => Record<string, unknown>

    const result = configFn({ command: 'build', mode: 'production' })

    // defu gives priority to the first argument (mariner defaults), so manifest stays true
    expect((result.build as Record<string, unknown>).manifest).toBe(true)
  })

  it('disables modulePreload polyfill', () => {
    const configFn = defineMarinerConfig({ mariner: 'my-app' }) as (env: {
      command: string
      mode: string
    }) => Record<string, unknown>

    const result = configFn({ command: 'build', mode: 'production' })
    const build = result.build as Record<string, unknown>
    const modulePreload = build.modulePreload as Record<string, unknown>

    expect(modulePreload.polyfill).toBe(false)
  })

  it('sets preserveEntrySignatures to exports-only', () => {
    const configFn = defineMarinerConfig({ mariner: 'my-app' }) as (env: {
      command: string
      mode: string
    }) => Record<string, unknown>

    const result = configFn({ command: 'build', mode: 'production' })
    const build = result.build as Record<string, unknown>
    const rollupOptions = build.rollupOptions as Record<string, unknown>

    expect(rollupOptions.preserveEntrySignatures).toBe('exports-only')
  })
})
