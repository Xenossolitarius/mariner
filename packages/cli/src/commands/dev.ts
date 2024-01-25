import { loadConfigFromFile, createServer as createViteServer } from 'vite'
import { program } from '@commander-js/extra-typings'
import { options as serverOptions } from './shared/server'
import { STARTING_DEV_SERVER } from '../messages'
import { configure } from '../steps/configure'

import Koa from 'koa'
import koaConnect from 'koa-connect'

serverOptions(program.command('dev', { isDefault: true }).description('Serve Micro Frontends'))
  .option('-m, --mode <mode>', 'Specify the mariner mode')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (options) => {
    console.log(STARTING_DEV_SERVER)

    const projects = await configure(options.mode)

    const projectRoot = projects[0].root

    const file = await loadConfigFromFile(
      { command: 'serve', mode: 'development' },
      `${projectRoot}/mariner.config.ts`,
      projectRoot,
    )

    if (!file) return

    const viteServer1 = await createViteServer({
      // ...file.config,
      // base: '/app2',
      root: projectRoot,
      configFile: `${projectRoot}/vite.config.ts`,
      server: { middlewareMode: true, origin: 'http://localhost:3000' },
      appType: 'spa',
    })

    // const viteServer2 = await createViteServer({
    //   // ...file.config,
    //   base: '/app1',
    //   root: projects[1].root,
    //   configFile: `${projects[1].root}/mariner.config.ts`,
    //   server: { middlewareMode: true },
    //   appType: 'custom',
    // })

    const app = new Koa()

    // app.use(koaConnect(viteServer2.middlewares))
    app.use(koaConnect(viteServer1.middlewares))

    app.listen(3000, () => {
      console.log('Started')
    })

    // const server = await createServer({ ...file.config, root: projects[0].root, configFile: false })

    // console.log(server.config)

    // await server.listen(3000)
    // server.printUrls()
  })
