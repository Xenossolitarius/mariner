import { transform } from 'esbuild'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getDirname } from '../../utils/dirname'
import { ServerOptions } from '..'
import connect from 'connect'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createClient = async (options: ServerOptions) => {
  const clientPath = path.join(getDirname(import.meta.url), '../../client/client.ts')

  const result = await transform(await fs.readFile(clientPath), {
    loader: 'ts',
    platform: 'browser',
    charset: 'utf8',
    format: 'esm',
  })

  return result.code
}

export const createClientMiddleware = async (options: ServerOptions, connector: connect.Server) => {
  const client = await createClient(options)

  connector.use((req, res, next) => {
    if (req.url !== '/') return next()
    res.setHeader('Content-Type', 'application/javascript')
    res.statusCode = 200
    res.end(client)
  })
}
