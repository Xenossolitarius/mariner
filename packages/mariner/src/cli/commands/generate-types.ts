import { program } from 'commander'
import { options as serverOptions } from './shared/server'
import { GENERATING_TYPES } from '../messages'
import { configure } from '../steps/configure'
import { createTypeGeneratorServer } from '../../server'

serverOptions(program.command('generate'))
  .description('Generates microfrontend types')
  .action(async (options) => {
    const serverOptions = await configure({
      command: 'serve',
      mode: options.mode || 'development',
      ...options,
    })

    console.log(GENERATING_TYPES)
    await createTypeGeneratorServer(serverOptions)
  })
