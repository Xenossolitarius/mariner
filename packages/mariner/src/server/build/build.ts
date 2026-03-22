import { build } from 'vite'
import { ServerOptions } from '../server'
import { MarinerProject, loadMarinerConfigFile } from '../..'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { resolveCargo } from '../plugins/resolve-cargo'
import { MARINER_ENV_PREFIX } from '../../constants'
import path from 'node:path'
import { transformBuildAssets } from '../plugins/transform-build-assets'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import WorkerPool from '../worker-pool'
import { buildSharedFleet } from './shared-build'
import { buildCargo } from './build-cargo'

export const buildNavigator = async (serverOps: ServerOptions, project: MarinerProject) => {
  const config = (await loadMarinerConfigFile(serverOps.commands, project.root))?.config
  if (!config) return

  const base = `/${project.mariner}`

  config.build = config.build ?? {}
  config.build.rolldownOptions = config.build.rolldownOptions ?? {}

  config.build.rolldownOptions.input = path.join(project.root, project.navigator!)
  config.build.outDir = path.join(process.cwd(), 'dist', serverOps.commands.rootBase || '', project.mariner!)
  config.build.emptyOutDir = true
  config.build.rolldownOptions.output = {
    entryFileNames: `[name].js`,
    chunkFileNames: `[name]-[hash].js`,
    assetFileNames: `[name]-[hash].[ext]`,
  }

  await build({
    ...config,
    appType: 'custom',
    mode: serverOps.commands.mode,
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: project.root,
    plugins: [
      ...(config.plugins || []),
      cssInjectedByJs(),
      resolveVirtualNavigators(base, serverOps),
      resolveCargo({ projects: [project], ssr: !!serverOps.commands.ssr }),
      transformBuildAssets(base, serverOps),
    ],
  })
}

export const createBuildServer = async (options: ServerOptions) => {
  if (options.fleetGroups) {
    const pool = new WorkerPool('server/build/worker.mjs', options.commands.threads)

    for (const group of options.fleetGroups) {
      if (group.mode === 'shared') {
        await buildSharedFleet(options, group)
      } else {
        await Promise.all(group.projects.map((project) => pool.run({ options, project })))
      }
    }

    pool.close()
  } else {
    // Backward compat: no fleet groups, all isolated
    const pool = new WorkerPool('server/build/worker.mjs', options.commands.threads)
    await Promise.all(options.projects.map((project) => pool.run({ options, project })))
    pool.close()
  }

  // SSR mode: build cargo files separately for the serve server
  if (options.commands.ssr) {
    const allProjects = options.fleetGroups ? options.fleetGroups.flatMap((g) => g.projects) : options.projects
    for (const project of allProjects) {
      const outDir = path.join(process.cwd(), 'dist', options.commands.rootBase || '', project.mariner!)
      await buildCargo(project, outDir)
    }
  }
}
