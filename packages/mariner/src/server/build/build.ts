import { build } from 'vite'
import { ServerOptions } from '../server'
import { MarinerProject } from '../..'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { FILES } from '../../constants'
import path from 'node:path'
import transformBuildAssets from '../plugins/transform-build-assets'

const buildNavigator = async (serverOps: ServerOptions, project: MarinerProject) => {
  const config = project.configFile!.config // will asume it exists
  const base = `/${project.mariner}`

  const buildOptions = config.build!

  buildOptions.rollupOptions!.input = path.join(project.root, FILES.navigator)
  buildOptions.outDir = path.join(process.cwd(), 'dist', project.mariner!)
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
    configFile: false,
    root: project.root,
    plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOps), transformBuildAssets(base)],
  })
}

export const createBuildServer = async (options: ServerOptions) => {
  await Promise.all(options.projects.map((project) => buildNavigator(options, project)))
}
