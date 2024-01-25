import { loadConfigFromFile, createServer as createViteServer } from 'vite'
import { program } from '@commander-js/extra-typings'
import { options as serverOptions } from './shared/server'
import { STARTING_DEV_SERVER } from '../messages'
import { configure } from '../steps/configure'

import Koa from 'koa'
import koaConnect from 'koa-connect'
import proxy from 'koa-proxies'

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

    // const viteServer1 = await createViteServer({
    //   // ...file.config,
    //   // base: '/app2',
    //   root: projectRoot,
    //   configFile: `${projectRoot}/vite.config.ts`,
    //   server: { middlewareMode: true, origin: 'http://localhost:3000' },
    //   appType: 'spa',
    // })
    const viteServer1 = await createViteServer({
      // ...file.config,
      base: '/app2',
      root: projectRoot,
      configFile: `${projectRoot}/vite.config.ts`,
      server: { origin: 'http://localhost:3001', port: 3001 },
      appType: 'spa',
    })
    const viteServer2 = await createViteServer({
      // ...file.config,
      base: '/app1',
      root: projects[1].root,
      configFile: `${projects[1].root}/mariner.config.ts`,
      server: { origin: 'http://localhost:3002', port: 3002 },
      appType: 'spa',
    })

    await viteServer1.listen()
    await viteServer2.listen()

    console.log('ran servers?')

    // const viteServer2 = await createViteServer({
    //   // ...file.config,
    //   base: '/app1',
    //   root: projects[1].root,
    //   configFile: `${projects[1].root}/mariner.config.ts`,
    //   server: { middlewareMode: true },
    //   appType: 'custom',
    // })

    const app = new Koa()

    const rewrite = (app: string) => {
      return (path: string) => {
        if (path.includes('navigator.ts')) return path

        return path.replace(new RegExp('/^/' + app + '/'), '')
      }
    }

    app.use(
      proxy('/app2', {
        target: `http://localhost:${viteServer1.config.server.port}`,
        rewrite: rewrite('app2'),
        changeOrigin: true,
        logs: true,
      }),
    )

    app.use(
      proxy('/app1', {
        target: `http://localhost:${viteServer2.config.server.port}`,
        rewrite: rewrite('app1'),
        changeOrigin: true,
        logs: true,
      }),
    )

    // app.use(koaConnect(viteServer2.middlewares))
    // app.use(koaConnect(viteServer1.middlewares))

    app.listen(3000, () => {
      console.log('Started')
    })

    // const server = await createServer({ ...file.config, root: projects[0].root, configFile: false })

    // console.log(server.config)

    // await server.listen(3000)
    // server.printUrls()
  })
