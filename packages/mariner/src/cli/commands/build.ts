import { program } from 'commander'
import { options as serverOptions } from './shared/server'
import { STARTING_BUILD } from '../messages'
import { configure } from '../steps/configure'
import { createServer } from '../../server'

serverOptions(program.command('build'))
  .description('Build Micro Frontends')
  .action(async (options) => {
    console.log(STARTING_BUILD)

    const serverOptions = await configure({
      command: 'build',
      mode: options.mode || 'production',
      ...options,
    })

    createServer(serverOptions)
  })
