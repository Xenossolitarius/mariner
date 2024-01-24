import { loadConfigFromFile, createServer } from 'vite'
import { program } from '@commander-js/extra-typings'
import { options as serverOptions } from './shared/server'
import { STARTING_DEV_SERVER } from '../messages'
import { configure } from '../steps/configure'

serverOptions(program.command('dev', { isDefault: true }).description('Serve Micro Frontends'))
  .option('-m, --mode <mode>', 'Specify the mariner mode')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (options) => {
    console.log(STARTING_DEV_SERVER)

    const projects = await configure(options.mode)

    const file = await loadConfigFromFile(
      { command: 'serve', mode: 'development' },
      `${projects[0].root}/mariner.config.ts`,
      projects[0].root,
    )
    if (!file) return

    console.log(file.config)

    const server = await createServer({ ...file.config, root: projects[0].root, configFile: false })

    console.log(server.config)

    await server.listen(3000)
    server.printUrls()
  })
