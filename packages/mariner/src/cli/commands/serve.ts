import { program } from 'commander'
import path from 'node:path'
import { STARTING_SERVE, SERVE_READY } from '../messages'
import { createServeServer } from '../../server/serve'

program
  .command('serve')
  .description('Serve built Micro Frontends with server-side cargo')
  .option('-p, --port <port>', 'Port number', (v: string) => parseInt(v, 10), 3000)
  .option('-h, --hostname <hostname>', 'Hostname', 'localhost')
  .option('-b, --rootBase <base>', 'Base path for serving', '')
  .option('--dist <dir>', 'Dist directory', 'dist')
  .action((options) => {
    console.log(STARTING_SERVE)

    const distDir = path.resolve(options.dist)
    const { bundles } = createServeServer({
      distDir,
      rootBase: options.rootBase,
      port: options.port,
      hostname: options.hostname,
    })

    const url = `http://${options.hostname}:${options.port}`
    const navigators = bundles.map((b) => `/${options.rootBase ? options.rootBase + '/' : ''}${b.name}/navigator.js`)
    console.log(SERVE_READY(url, navigators))
  })
