import { createServer as createViteServer, type Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { ServerOptions } from '../server'
import { getServerUrl, type AppRoute } from './dev'
import { MARINER_ENV_PREFIX } from '../../constants'
import { resolveVirtualNavigatorsShared } from '../plugins/resolve-virtual-navigators'
import { findCommonRoot } from '../utils/common-root'
import { loadMarinerConfigFile } from '../../setup/utils'
import type { ResolvedFleetGroup } from '../../setup/types'
import type { MarinerUserConfig } from '../../config/mariner'
import type { MarinerProject } from '../../setup/setup'

/**
 * Resolves absolute public asset imports (e.g. /vite.svg) by searching
 * each app's public directory in the shared fleet.
 */
const resolveSharedPublicAssets = (projects: MarinerProject[], _commonRoot: string): Plugin => {
  const publicDirs = projects.map((p) => path.join(p.root, 'public'))

  return {
    name: 'mariner-resolve-shared-public-assets',
    enforce: 'pre',
    resolveId(id) {
      // Only handle absolute paths that look like public assets
      if (!id.startsWith('/') || id.includes('node_modules') || id.startsWith('/@')) return null

      for (const dir of publicDirs) {
        const filePath = path.join(dir, id)
        if (fs.existsSync(filePath)) {
          return filePath
        }
      }

      return null
    },
  }
}

const POSTCSS_CONFIG_FILES = ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs', 'postcss.config.ts']

/**
 * Finds the first PostCSS config directory among fleet projects.
 * In shared mode the Vite root is the common ancestor, so Vite won't
 * auto-discover PostCSS configs inside individual app directories.
 */
const findPostcssConfigDir = (projects: MarinerProject[]): string | undefined => {
  for (const project of projects) {
    for (const file of POSTCSS_CONFIG_FILES) {
      if (fs.existsSync(path.join(project.root, file))) {
        return project.root
      }
    }
  }
  return undefined
}

const mergeFleetPlugins = (configs: MarinerUserConfig[]): Plugin[] => {
  const seen = new Set<string>()
  const plugins: Plugin[] = []

  for (const config of configs) {
    for (const plugin of (config.plugins || []).flat()) {
      if (!plugin || typeof plugin === 'boolean') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = plugin as any
      if (p.name && seen.has(p.name)) continue
      if (p.name) seen.add(p.name)
      plugins.push(p as Plugin)
    }
  }

  return plugins
}

export const createSharedNavServers = async (
  serverOps: ServerOptions,
  group: ResolvedFleetGroup,
  hmrPortBase: number,
): Promise<AppRoute[]> => {
  const { port, hostname, secure } = getServerUrl(serverOps)
  const rootBasePath = serverOps.commands.rootBase ? `/${serverOps.commands.rootBase}` : ''

  const commonRoot = findCommonRoot(group.projects.map((p) => p.root))

  // Load and merge configs from all projects in the fleet
  const configs: MarinerUserConfig[] = []
  for (const project of group.projects) {
    const configFile = await loadMarinerConfigFile(serverOps.commands, project.root)
    if (configFile) configs.push(configFile.config)
  }

  const mergedPlugins = mergeFleetPlugins(configs)
  const postcssDir = findPostcssConfigDir(group.projects)

  // Collect all navigator entries for optimizeDeps
  const navigatorEntries = group.projects.map((p) => path.join(p.root, p.navigator!))

  const fleetBase = `${rootBasePath}/${group.name}`

  const vite = await createViteServer({
    appType: 'custom',
    base: fleetBase,
    mode: serverOps.commands.mode,
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: commonRoot,
    publicDir: false,
    css: postcssDir ? { postcss: postcssDir } : undefined,
    plugins: [
      ...mergedPlugins,
      resolveVirtualNavigatorsShared(group.projects, serverOps),
      resolveSharedPublicAssets(group.projects, commonRoot),
    ],
    optimizeDeps: { entries: navigatorEntries },
    server: {
      middlewareMode: true,
      origin: `${secure ? 'https' : 'http'}://${hostname}:${port}`,
      hmr: { port: hmrPortBase, protocol: secure ? 'wss' : 'ws' },
    },
  })

  // Create one AppRoute per project, all sharing the same Vite instance
  // Each app is served at /{fleetName}/{appname}/navigator.js
  return group.projects.map((project) => {
    const base = `${fleetBase}/${project.mariner}`
    const relativeRoot = path.relative(commonRoot, project.root)

    return {
      base,
      navigator: project.navigator!,
      vite,
      relativeRoot,
    }
  })
}
