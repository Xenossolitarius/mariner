import { build, type Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { ServerOptions } from '../server'
import { MARINER_ENV_PREFIX } from '../../constants'
import { resolveVirtualNavigatorsShared } from '../plugins/resolve-virtual-navigators'
import { transformBuildAssetsShared } from '../plugins/transform-build-assets'
import { findCommonRoot } from '../utils/common-root'
import { loadMarinerConfigFile } from '../../setup/utils'
import type { ResolvedFleetGroup } from '../../setup/types'
import type { MarinerUserConfig } from '../../config/mariner'
import type { MarinerProject } from '../../setup/setup'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'

const POSTCSS_CONFIG_FILES = ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs', 'postcss.config.ts']

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

const mergeExternals = (configs: MarinerUserConfig[]): (string | RegExp)[] => {
  const seen = new Set<string>()
  const externals: (string | RegExp)[] = []
  for (const config of configs) {
    const ext = config.build?.rolldownOptions?.external
    if (Array.isArray(ext)) {
      for (const e of ext) {
        const key = String(e)
        if (!seen.has(key)) {
          seen.add(key)
          externals.push(e)
        }
      }
    } else if (ext && typeof ext !== 'function' && !seen.has(String(ext))) {
      seen.add(String(ext))
      externals.push(ext)
    }
  }
  return externals
}

export const buildSharedFleet = async (serverOps: ServerOptions, group: ResolvedFleetGroup) => {
  const commonRoot = findCommonRoot(group.projects.map((p) => p.root))

  // Load configs from all projects
  const configs: MarinerUserConfig[] = []
  for (const project of group.projects) {
    const configFile = await loadMarinerConfigFile(serverOps.commands, project.root)
    if (configFile) configs.push(configFile.config)
  }

  const mergedPlugins = mergeFleetPlugins(configs)
  const mergedExternals = mergeExternals(configs)
  const postcssDir = findPostcssConfigDir(group.projects)

  // Build input object: { 'app1/navigator': '/abs/path/to/app1/navigator.ts', ... }
  const input: Record<string, string> = {}
  for (const project of group.projects) {
    input[`${project.mariner}/navigator`] = path.join(project.root, project.navigator!)
  }

  const outDir = path.join(process.cwd(), 'dist', serverOps.commands.rootBase || '')

  await build({
    appType: 'custom',
    mode: serverOps.commands.mode,
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: commonRoot,
    css: postcssDir ? { postcss: postcssDir } : undefined,
    plugins: [
      ...mergedPlugins,
      cssInjectedByJs(),
      resolveVirtualNavigatorsShared(group.projects, serverOps),
      transformBuildAssetsShared(group.projects, serverOps),
    ],
    build: {
      manifest: true,
      modulePreload: { polyfill: false },
      outDir,
      emptyOutDir: false,
      rolldownOptions: {
        input,
        external: mergedExternals,
        preserveEntrySignatures: 'exports-only',
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'chunks/[name]-[hash].[ext]',
        },
      },
    },
  })
}
