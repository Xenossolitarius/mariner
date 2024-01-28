import { loadConfigFromFile, createServer as createViteServer, type Plugin, mergeConfig, resolveConfig } from 'vite'

import { ServerOptions } from '../server'

import Koa from 'koa'
import koaConnect from 'koa-connect'
import proxy from 'koa-proxies'

export const createDevServer = async ({ options, projects, setup }: ServerOptions) => {
  const rootProject = projects[0]

  console.log(rootProject.configFile?.config)

  const middlewarePlugin: () => Plugin = () => ({
    name: 'testing-the-test-to-test',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        console.log(req, res, next)
      })
    },
  })

  const viteServer1 = await createViteServer({
    ...rootProject.configFile!.config,
    configFile: false,
    root: rootProject.root,
    plugins: [middlewarePlugin()],
    // configFile: `${rootProject.root}/mariner.config.ts`,
    // server: { origin: 'http://localhost:3001', port: 3001 },
    appType: 'custom',
  })

  await viteServer1.listen(3000)
  viteServer1.printUrls()

  // const projectRoot = projects[0].root

  // const file = await loadConfigFromFile(
  //   { command: 'serve', mode: 'development' },
  //   `${projectRoot}/mariner.config.ts`,
  //   projectRoot,
  // )

  // if (!file) return

  // const middlewarePlugin: () => Plugin = () => ({
  //   name: 'testing-the-test-to-test',
  //   configureServer(server) {
  //     server.middlewares.use((req, res, next) => {
  //       console.log(req, res, next)
  //     })
  //   },
  // })

  // // const viteServer1 = await createViteServer({
  // //   // ...file.config,
  // //   // base: '/app2',
  // //   root: projectRoot,
  // //   configFile: `${projectRoot}/vite.config.ts`,
  // //   server: { middlewareMode: true, origin: 'http://localhost:3000' },
  // //   appType: 'spa',
  // // })
  // const viteServer1 = await createViteServer({
  //   // ...file.config,
  //   base: '/app2',
  //   root: projectRoot,
  //   plugins: [middlewarePlugin()],
  //   configFile: `${projectRoot}/vite.config.ts`,
  //   server: { origin: 'http://localhost:3001', port: 3001 },
  //   appType: 'spa',
  // })
  // const viteServer2 = await createViteServer({
  //   // ...file.config,
  //   base: '/app1',
  //   root: projects[1].root,
  //   configFile: `${projects[1].root}/mariner.config.ts`,
  //   server: { origin: 'http://localhost:3002', port: 3002 },
  //   appType: 'spa',
  // })

  // await viteServer1.listen()
  // await viteServer2.listen()

  // console.log('ran servers?')

  // // const viteServer2 = await createViteServer({
  // //   // ...file.config,
  // //   base: '/app1',
  // //   root: projects[1].root,
  // //   configFile: `${projects[1].root}/mariner.config.ts`,
  // //   server: { middlewareMode: true },
  // //   appType: 'custom',
  // // })

  // const app = new Koa()

  // const rewrite = (app: string) => {
  //   return (path: string) => {
  //     if (path.includes('navigator.ts')) return path

  //     return path.replace(new RegExp('/^/' + app + '/'), '')
  //   }
  // }

  // app.use(
  //   proxy('/app2', {
  //     target: `http://localhost:${viteServer1.config.server.port}`,
  //     rewrite: rewrite('app2'),
  //     changeOrigin: true,
  //     logs: true,
  //   }),
  // )

  // app.use(
  //   proxy('/app1', {
  //     target: `http://localhost:${viteServer2.config.server.port}`,
  //     rewrite: rewrite('app1'),
  //     changeOrigin: true,
  //     logs: true,
  //   }),
  // )

  // // app.use(koaConnect(viteServer2.middlewares))
  // // app.use(koaConnect(viteServer1.middlewares))

  // app.listen(3000, () => {
  //   console.log('Started')
  // })

  // const server = await createServer({ ...file.config, root: projects[0].root, configFile: false })

  // console.log(server.config)

  // await server.listen(3000)
  // server.printUrls()
}
