import { build } from 'vite'
import { ServerOptions } from '../server'
import { MarinerProject } from '../..'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { FILES, MARINER_ENV_PREFIX, NAVIGATOR_MODULE_PREFIX } from '../../constants'
import path from 'node:path'
import dts from 'vite-plugin-dts'
import { generateMarinerTypeFile } from './combine'

const generateTypes = async (serverOps: ServerOptions, project: MarinerProject) => {
  const config = project.configFile!.config // will asume it exists
  const base = `/${project.mariner}`

  const buildConfig = {
    outDir: path.join(process.cwd(), FILES.typeDir, project.mariner!),
    lib: {
      entry: path.join(project.root, FILES.navigator),
      name: `${NAVIGATOR_MODULE_PREFIX}${project.mariner}`,
      formats: ['es' as const],
    },
    copyPublicDir: false,
    emptyOutDir: true,
  }

  await build({
    ...config,
    build: buildConfig,
    appType: 'custom',
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: project.root,
    plugins: [
      ...(config.plugins || []),
      resolveVirtualNavigators(base, serverOps),
      dts({
        declarationOnly: true,
        rollupTypes: true,
      }),
    ],
  })
}

export const createTypeGeneratorServer = async (options: ServerOptions) => {
  await Promise.all(options.projects.map((project) => generateTypes(options, project)))
  await generateMarinerTypeFile()
}
