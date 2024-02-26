import type { Plugin } from 'vite'
import { ServerOptions } from '..'

export const navigatorPrefix = 'navigator:'

export function resolveVirtualNavigators(base: string, options: ServerOptions): Plugin {
  const navigators = options.projects.map((proj) => proj.mariner)
  const navigatorTags = navigators.map((nav) => `${navigatorPrefix}${nav}`)

  let isBuild = false

  return {
    name: 'vite-plugin-resolve-virtual-navigators',
    enforce: 'pre',
    // 1. insert to optimizeDeps.exclude to prevent pre-transform
    config(config, { command }) {
      if (command === 'build') {
        isBuild = true
        return
      }
      config.optimizeDeps = {
        ...(config.optimizeDeps ?? {}),
        exclude: [...(config.optimizeDeps?.exclude ?? []), ...navigatorTags],
      }
    },
    // 2. push a plugin to rewrite the 'vite:import-analysis' prefix
    configResolved(resolvedConfig) {
      const VALID_ID_PREFIX = `/@id/`
      const reg = new RegExp(`${VALID_ID_PREFIX}(${navigatorTags.join('|')})`, 'g')
      // @ts-expect-error - push actually exists
      resolvedConfig.plugins.push({
        name: 'vite-plugin-resolve-virtual-navigators-replace-idprefix',
        transform: (code: string) => {
          if (!reg.test(code)) {
            return code
          }

          const navigatorImportsRegex = new RegExp(
            `(${base}${VALID_ID_PREFIX}${navigatorPrefix})(${navigators.join('|')})`,
            'g',
          )

          let match: RegExpExecArray | null = null
          let result = code

          while ((match = navigatorImportsRegex.exec(code)) !== null) {
            if (!match) break
            result = result.replace(
              new RegExp(`${base}${VALID_ID_PREFIX}${navigatorPrefix}${match[2]}`, 'g'),
              `/${match[2]}/navigator.js`,
            )
          }

          return result
        },
      })
    },
    // 3. rewrite the id before 'vite:resolve' plugin transform to 'node_modules/...'
    resolveId: (id) => {
      if (navigatorTags.includes(id)) {
        // in dev mark as external
        if (!isBuild) {
          return { id, external: true }
        }

        return { id: `/${id.replace(navigatorPrefix, '')}/navigator.js`, external: true }
      }

      return null
    },
    // 4. suppress HMR and general unresolved errors and warnings
    load: (id: string) => {
      if (navigatorTags.includes(id)) {
        return { code: 'export default {}' }
      }

      return null
    },
  }
}
