import { build } from 'vite'
import { ServerOptions } from '../server'
import { MarinerProject, loadMarinerConfigFile } from '../..'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { MARINER_ENV_PREFIX } from '../../constants'
import path from 'node:path'
import transformBuildAssets from '../plugins/transform-build-assets'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import WorkerPool from '../worker-pool'

export const buildNavigator = async (serverOps: ServerOptions, project: MarinerProject) => {
  const config = (await loadMarinerConfigFile(serverOps.commands, project.root))?.config
  if (!config) return

  const base = `/${project.mariner}`

  const buildOptions = config.build!

  buildOptions.rollupOptions!.input = path.join(project.root, project.navigator!)
  buildOptions.outDir = path.join(process.cwd(), 'dist', serverOps.commands.rootBase || '', project.mariner!)
  buildOptions.emptyOutDir = true // delete build files
  // config.build!.assetsDir = '.'
  config.build!.rollupOptions!.output = {
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
      transformBuildAssets(base, serverOps),
    ],
  })
}

export const createBuildServer = async (options: ServerOptions) => {
  const pool = new WorkerPool('server/build/worker.mjs', options.commands.threads)
  await Promise.all(options.projects.map((project) => pool.run({ options, project })))
  pool.close()
}
