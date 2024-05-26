import { build } from 'vite'
import { ServerOptions } from '../server'
import { MarinerProject, loadMarinerConfigFile } from '../..'
import { resolveVirtualNavigators } from '../plugins/resolve-virtual-navigators'
import { FILES, MARINER_ENV_PREFIX, NAVIGATOR_MODULE_PREFIX } from '../../constants'
import path from 'node:path'
import dts from 'vite-plugin-dts'
import { generateMarinerTypeFile } from './combine'
import WorkerPool from '../worker-pool'

export const generateTypes = async (serverOps: ServerOptions, project: MarinerProject) => {
  const config = (await loadMarinerConfigFile(serverOps.commands, project.root))?.config
  if (!config) return
  const base = `/${project.mariner}`

  const buildConfig = {
    outDir: path.join(process.cwd(), FILES.typeDir, project.mariner!),
    lib: {
      entry: path.join(project.root, project.navigator!),
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
  const pool = new WorkerPool('server/generate-types/worker.mjs', options.commands.threads)
  await Promise.all(options.projects.map((project) => !project.isJs && pool.run({ options, project })))
  pool.close()
  await generateMarinerTypeFile()
}
