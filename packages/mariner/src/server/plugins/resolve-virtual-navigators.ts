import type { Plugin } from 'vite'
import path from 'node:path'
import { ServerOptions } from '..'
import { NAVIGATOR_MODULE_PREFIX } from '../../constants'
import type { MarinerProject } from '../../setup/setup'

export function resolveVirtualNavigators(base: string, options: ServerOptions): Plugin {
  const navigators = options.projects.map((proj) => proj.mariner)
  const navigatorTags = navigators.map((nav) => `${NAVIGATOR_MODULE_PREFIX}${nav}`)

  const rootBasePath = options.commands.rootBase ? `/${options.commands.rootBase}` : ''

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

      const navigatorImportsRegex = new RegExp(
        `(${base}${VALID_ID_PREFIX}${NAVIGATOR_MODULE_PREFIX})(${navigators.join('|')})`,
        'g',
      )

      // @ts-expect-error - push actually exists
      resolvedConfig.plugins.push({
        name: 'vite-plugin-resolve-virtual-navigators-replace-idprefix',
        transform: (code: string) => {
          let result = code
          let match: RegExpExecArray | null

          while ((match = navigatorImportsRegex.exec(code)) !== null) {
            result = result.replace(
              new RegExp(`${base}${VALID_ID_PREFIX}${NAVIGATOR_MODULE_PREFIX}${match[2]}`, 'g'),
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

        return { id: `${rootBasePath}/${id.replace(NAVIGATOR_MODULE_PREFIX, '')}/navigator.js`, external: true }
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

/**
 * Shared fleet variant: navigators within the same fleet resolve to actual file paths
 * (so Rolldown can bundle them together and deduplicate), while cross-fleet navigators
 * remain external.
 */
export function resolveVirtualNavigatorsShared(fleetProjects: MarinerProject[], options: ServerOptions): Plugin {
  // Use all discovered projects (not just selected) to handle cross-fleet navigator imports
  const allNavigators = options.setup.projects.map((proj) => proj.mariner)
  const allNavigatorTags = allNavigators.map((nav) => `${NAVIGATOR_MODULE_PREFIX}${nav}`)

  const fleetAppNames = new Set(fleetProjects.map((p) => p.mariner))
  const fleetProjectMap = new Map(fleetProjects.map((p) => [p.mariner, p]))

  const externalNavigators = allNavigators.filter((nav) => !fleetAppNames.has(nav))
  const externalTags = externalNavigators.map((nav) => `${NAVIGATOR_MODULE_PREFIX}${nav}`)

  const rootBasePath = options.commands.rootBase ? `/${options.commands.rootBase}` : ''

  let isBuild = false

  return {
    name: 'vite-plugin-resolve-virtual-navigators-shared',
    enforce: 'pre',
    config(config, { command }) {
      if (command === 'build') {
        isBuild = true
        return
      }
      // Exclude ALL navigator tags from pre-bundling (same-fleet resolved at transform time, cross-fleet are external)
      config.optimizeDeps = {
        ...(config.optimizeDeps ?? {}),
        exclude: [...(config.optimizeDeps?.exclude ?? []), ...allNavigatorTags],
      }
    },
    // Rewrite /@id/navigator:* prefixes injected by vite:import-analysis
    configResolved(resolvedConfig) {
      const VALID_ID_PREFIX = `/@id/`
      // Match with or without base prefix
      const base = resolvedConfig.base?.replace(/\/$/, '') || ''

      const navigatorImportsRegex = new RegExp(
        `(${base}${VALID_ID_PREFIX}${NAVIGATOR_MODULE_PREFIX}|${VALID_ID_PREFIX}${NAVIGATOR_MODULE_PREFIX})(${allNavigators.join('|')})`,
        'g',
      )

      // @ts-expect-error - push actually exists
      resolvedConfig.plugins.push({
        name: 'vite-plugin-resolve-virtual-navigators-shared-replace-idprefix',
        transform: (code: string) => {
          let result = code
          let match: RegExpExecArray | null

          while ((match = navigatorImportsRegex.exec(code)) !== null) {
            const appName = match[2]
            result = result.replace(
              new RegExp(`${match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${appName}`, 'g'),
              `/${appName}/navigator.js`,
            )
          }

          return result
        },
      })
    },
    resolveId: (id) => {
      if (!allNavigatorTags.includes(id)) return null

      const appName = id.replace(NAVIGATOR_MODULE_PREFIX, '')

      // Same-fleet: resolve to actual file path so Rolldown bundles it
      if (fleetAppNames.has(appName)) {
        const project = fleetProjectMap.get(appName)!
        return path.join(project.root, project.navigator!)
      }

      // Cross-fleet: mark as external
      if (!isBuild) {
        return { id, external: true }
      }
      return { id: `${rootBasePath}/${appName}/navigator.js`, external: true }
    },
    load: (id: string) => {
      // Provide stub for cross-fleet navigators
      if (externalTags.includes(id)) {
        return { code: 'export default {}' }
      }
      return null
    },
  }
}
