import { build } from 'vite'
import { ServerOptions } from '../server'
import { MarinerProject } from '../..'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { FILES } from '../../constants'
import path from 'node:path'

const buildNavigator = async (serverOps: ServerOptions, project: MarinerProject) => {
  const config = project.configFile!.config // will asume it exists
  const base = `/${project.mariner}`

  config.build!.rollupOptions!.input = path.join(project.root, FILES.navigator)
  config.build!.outDir = path.join(process.cwd(), 'dist')
  // config.build!.assetsDir = '.'
  config.build!.rollupOptions!.output = {
    entryFileNames: `${project.mariner}/[name].js`,
    chunkFileNames: `${project.mariner}/[name]-[hash].js`,
    assetFileNames: `${project.mariner}/[name]-[hash].[ext]`,
  }

  await build({
    ...config,
    appType: 'custom',
    configFile: false,
    root: project.root,
    plugins: [...(config.plugins || []), resolveVirtualNavigators(base, serverOps)],
  })
}

export const createBuildServer = async (options: ServerOptions) => {
  await Promise.all(options.projects.map((project) => buildNavigator(options, project)))
}
