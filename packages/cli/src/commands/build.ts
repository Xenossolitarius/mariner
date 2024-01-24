import { program } from '@commander-js/extra-typings'
import { options as serverOptions } from './shared/server'
import { STARTING_BUILD } from '../messages'

serverOptions(program.command('build'))
  .description('Build Micro Frontends')
  .action((mode, options) => {
    console.log(STARTING_BUILD)
  })
