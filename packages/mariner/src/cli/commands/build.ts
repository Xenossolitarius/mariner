import { program } from 'commander'
import { options as serverOptions } from './shared/server'
import { STARTING_BUILD } from '../messages'
import { configure } from '../steps/configure'
import { createServer } from '../../server'

serverOptions(program.command('build'))
  .description('Build Micro Frontends')
  .option('--ssr', 'Build for SSR mode (cargo runs per-request on the serve server)')
  .action(async (options) => {
    const serverOptions = await configure({
      command: 'build',
      mode: options.mode || 'production',
      ...options,
    })

    console.log(STARTING_BUILD)
    createServer(serverOptions)
  })
