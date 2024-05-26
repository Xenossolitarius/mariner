import { program } from 'commander'
import { options as serverOptions } from './shared/server'
import { STARTING_DEV_SERVER } from '../messages'
import { configure } from '../steps/configure'
import { createServer } from '../../server'

import { DEV_SERVER_DEFAULTS } from '../../server/dev'

serverOptions(program.command('dev', { isDefault: true }).description('Serve Micro Frontends'))
  .option('-p, --port <port>', 'Specify a port number', parseInt, DEV_SERVER_DEFAULTS.port)
  .option('-h, --hostname <hostname>', 'Specify a hostname', DEV_SERVER_DEFAULTS.hostname)
  .option('--https', 'Use a HTTPS server')
  .action(async (options) => {
    console.log(STARTING_DEV_SERVER)

    const serverOptions = await configure({
      command: 'serve',
      mode: options.mode || 'development',
      ...options,
    })

    createServer(serverOptions)
  })
