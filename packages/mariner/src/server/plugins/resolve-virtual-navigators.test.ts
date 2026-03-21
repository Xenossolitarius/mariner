import { describe, it, expect } from 'vitest'
import type { Plugin, UserConfig, ResolvedConfig } from 'vite'
import { resolveVirtualNavigators } from './resolve-virtual-navigators'
import type { ServerOptions } from '..'

function createOptions(overrides: Partial<ServerOptions> = {}): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: [
      { mariner: 'app1', root: '/app1', configFile: null, packageJson: null, isJs: false, isValid: true },
      { mariner: 'app2', root: '/app2', configFile: null, packageJson: null, isJs: false, isValid: true },
    ],
    commands: { command: 'serve', mode: 'development', rootBase: '' } as ServerOptions['commands'],
    ...overrides,
  } as ServerOptions
}

function getPlugin(base = '/', options = createOptions()): Plugin {
  return resolveVirtualNavigators(base, options)
}

// Helper to invoke plugin hooks with proper typing
function callConfig(plugin: Plugin, config: UserConfig, command: 'serve' | 'build') {
  const hook = plugin.config as (config: UserConfig, env: { command: string }) => void
  return hook(config, { command })
}

function callResolveId(plugin: Plugin, id: string) {
  const hook = plugin.resolveId as (id: string) => { id: string; external: boolean } | null
  return hook(id)
}

function callLoad(plugin: Plugin, id: string) {
  const hook = plugin.load as (id: string) => { code: string } | null
  return hook(id)
}

function callConfigResolved(plugin: Plugin, resolvedConfig: Partial<ResolvedConfig>) {
  const hook = plugin.configResolved as (config: Partial<ResolvedConfig>) => void
  return hook(resolvedConfig)
}

describe('resolveVirtualNavigators', () => {
  describe('plugin metadata', () => {
    it('returns a plugin with the correct name', () => {
      const plugin = getPlugin()
      expect(plugin.name).toBe('vite-plugin-resolve-virtual-navigators')
    })

    it('enforces pre ordering', () => {
      const plugin = getPlugin()
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('config hook', () => {
    it('adds navigator tags to optimizeDeps.exclude in dev mode', () => {
      const plugin = getPlugin()
      const config: UserConfig = {}

      callConfig(plugin, config, 'serve')

      expect(config.optimizeDeps?.exclude).toContain('navigator:app1')
      expect(config.optimizeDeps?.exclude).toContain('navigator:app2')
    })

    it('preserves existing optimizeDeps.exclude entries', () => {
      const plugin = getPlugin()
      const config: UserConfig = { optimizeDeps: { exclude: ['existing-dep'] } }

      callConfig(plugin, config, 'serve')

      expect(config.optimizeDeps?.exclude).toContain('existing-dep')
      expect(config.optimizeDeps?.exclude).toContain('navigator:app1')
    })

    it('preserves existing optimizeDeps options', () => {
      const plugin = getPlugin()
      const config: UserConfig = { optimizeDeps: { include: ['some-dep'] } }

      callConfig(plugin, config, 'serve')

      expect(config.optimizeDeps?.include).toEqual(['some-dep'])
      expect(config.optimizeDeps?.exclude).toContain('navigator:app1')
    })

    it('handles missing optimizeDeps gracefully', () => {
      const plugin = getPlugin()
      const config: UserConfig = {}

      callConfig(plugin, config, 'serve')

      expect(config.optimizeDeps?.exclude).toEqual(['navigator:app1', 'navigator:app2'])
    })

    it('does not modify optimizeDeps in build mode', () => {
      const plugin = getPlugin()
      const config: UserConfig = {}

      callConfig(plugin, config, 'build')

      expect(config.optimizeDeps).toBeUndefined()
    })
  })

  describe('resolveId hook', () => {
    describe('dev mode', () => {
      it('marks navigator imports as external', () => {
        const plugin = getPlugin()
        callConfig(plugin, {}, 'serve')

        const result = callResolveId(plugin, 'navigator:app1')

        expect(result).toEqual({ id: 'navigator:app1', external: true })
      })

      it('returns the original id without path rewriting', () => {
        const plugin = getPlugin()
        callConfig(plugin, {}, 'serve')

        const result = callResolveId(plugin, 'navigator:app2')

        expect(result).toEqual({ id: 'navigator:app2', external: true })
      })
    })

    describe('build mode', () => {
      it('rewrites navigator imports to navigator.js paths', () => {
        const plugin = getPlugin()
        callConfig(plugin, {}, 'build')

        const result = callResolveId(plugin, 'navigator:app1')

        expect(result).toEqual({ id: '/app1/navigator.js', external: true })
      })

      it('includes rootBase in the rewritten path', () => {
        const options = createOptions({
          commands: { command: 'build', mode: 'production', rootBase: 'my-base' } as ServerOptions['commands'],
        })
        const plugin = getPlugin('/', options)
        callConfig(plugin, {}, 'build')

        const result = callResolveId(plugin, 'navigator:app1')

        expect(result).toEqual({ id: '/my-base/app1/navigator.js', external: true })
      })

      it('handles empty rootBase', () => {
        const options = createOptions({
          commands: { command: 'build', mode: 'production', rootBase: '' } as ServerOptions['commands'],
        })
        const plugin = getPlugin('/', options)
        callConfig(plugin, {}, 'build')

        const result = callResolveId(plugin, 'navigator:app2')

        expect(result).toEqual({ id: '/app2/navigator.js', external: true })
      })
    })

    it('returns null for non-navigator imports', () => {
      const plugin = getPlugin()

      expect(callResolveId(plugin, 'some-other-module')).toBeNull()
      expect(callResolveId(plugin, 'navigator:')).toBeNull()
      expect(callResolveId(plugin, '@scope/package')).toBeNull()
    })

    it('returns null for navigator prefix with unknown app name', () => {
      const plugin = getPlugin()

      expect(callResolveId(plugin, 'navigator:unknown-app')).toBeNull()
    })
  })

  describe('load hook', () => {
    it('returns empty export for known navigator tags', () => {
      const plugin = getPlugin()

      expect(callLoad(plugin, 'navigator:app1')).toEqual({ code: 'export default {}' })
      expect(callLoad(plugin, 'navigator:app2')).toEqual({ code: 'export default {}' })
    })

    it('returns null for non-navigator ids', () => {
      const plugin = getPlugin()

      expect(callLoad(plugin, 'some-module')).toBeNull()
      expect(callLoad(plugin, '')).toBeNull()
    })

    it('returns null for unknown navigator apps', () => {
      const plugin = getPlugin()

      expect(callLoad(plugin, 'navigator:unknown')).toBeNull()
    })
  })

  describe('configResolved hook', () => {
    it('pushes a sub-plugin to the resolved config', () => {
      const plugin = getPlugin()
      const plugins: Plugin[] = []
      const resolvedConfig = { plugins } as unknown as ResolvedConfig

      callConfigResolved(plugin, resolvedConfig)

      expect(plugins).toHaveLength(1)
      expect(plugins[0].name).toBe('vite-plugin-resolve-virtual-navigators-replace-idprefix')
    })

    it('sub-plugin replaces /@id/ prefixed navigator imports with navigator.js paths', () => {
      const plugin = getPlugin('/base')
      const plugins: Plugin[] = []

      callConfigResolved(plugin, { plugins } as unknown as ResolvedConfig)

      const subPlugin = plugins[0]
      const transform = subPlugin.transform as (code: string) => string

      const code = `import app1 from "/base/@id/navigator:app1";`
      const result = transform(code)

      expect(result).toBe(`import app1 from "/app1/navigator.js";`)
    })

    it('sub-plugin replaces multiple navigator imports in the same code', () => {
      const plugin = getPlugin('/base')
      const plugins: Plugin[] = []

      callConfigResolved(plugin, { plugins } as unknown as ResolvedConfig)

      const transform = plugins[0].transform as (code: string) => string

      const code = `import a from "/base/@id/navigator:app1";\nimport b from "/base/@id/navigator:app2";`

      const result = transform(code)

      expect(result).toContain('/app1/navigator.js')
      expect(result).toContain('/app2/navigator.js')
      expect(result).not.toContain('/@id/navigator:')
    })

    it('sub-plugin leaves non-navigator imports untouched', () => {
      const plugin = getPlugin('/base')
      const plugins: Plugin[] = []

      callConfigResolved(plugin, { plugins } as unknown as ResolvedConfig)

      const transform = plugins[0].transform as (code: string) => string

      const code = `import foo from "/base/@id/some-module";`
      const result = transform(code)

      expect(result).toBe(code)
    })

    it('sub-plugin handles code with no navigator imports', () => {
      const plugin = getPlugin('/base')
      const plugins: Plugin[] = []

      callConfigResolved(plugin, { plugins } as unknown as ResolvedConfig)

      const transform = plugins[0].transform as (code: string) => string

      const code = `const x = 1;`
      expect(transform(code)).toBe(code)
    })

    it('sub-plugin handles root base path /', () => {
      const plugin = getPlugin('/')
      const plugins: Plugin[] = []

      callConfigResolved(plugin, { plugins } as unknown as ResolvedConfig)

      const transform = plugins[0].transform as (code: string) => string

      const code = `import nav from "//@id/navigator:app1";`
      const result = transform(code)

      expect(result).toBe(`import nav from "/app1/navigator.js";`)
    })
  })

  describe('edge cases', () => {
    it('works with a single project', () => {
      const options = createOptions({
        projects: [{ mariner: 'solo', root: '/solo', configFile: null, packageJson: null, isJs: false, isValid: true }],
      })
      const plugin = getPlugin('/', options)

      callConfig(plugin, {}, 'serve')

      expect(callResolveId(plugin, 'navigator:solo')).toEqual({ id: 'navigator:solo', external: true })
      expect(callLoad(plugin, 'navigator:solo')).toEqual({ code: 'export default {}' })
      expect(callResolveId(plugin, 'navigator:app1')).toBeNull()
    })

    it('works with no projects', () => {
      const options = createOptions({ projects: [] })
      const plugin = getPlugin('/', options)

      callConfig(plugin, {}, 'serve')

      expect(callResolveId(plugin, 'navigator:anything')).toBeNull()
      expect(callLoad(plugin, 'navigator:anything')).toBeNull()
    })

    it('handles project names with special characters', () => {
      const options = createOptions({
        projects: [
          {
            mariner: 'my-app',
            root: '/my-app',
            configFile: null,
            packageJson: null,
            isJs: false,
            isValid: true,
          },
        ],
      })
      const plugin = getPlugin('/', options)
      callConfig(plugin, {}, 'build')

      const result = callResolveId(plugin, 'navigator:my-app')

      expect(result).toEqual({ id: '/my-app/navigator.js', external: true })
    })
  })
})
