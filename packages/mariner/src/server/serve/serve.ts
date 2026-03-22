import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { CARGO_GLOBAL, FILES } from '../../constants'

export type AppBundle = {
  name: string
  code: string
  cargoPath: string | null
}

export type ServeOptions = {
  distDir: string
  rootBase: string
  port: number
  hostname: string
}

export const loadAppBundles = (distDir: string): AppBundle[] => {
  const entries = fs.readdirSync(distDir, { withFileTypes: true })
  const bundles: AppBundle[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const navigatorPath = path.join(distDir, entry.name, `${FILES.navigator}.js`)
    if (!fs.existsSync(navigatorPath)) continue

    const code = fs.readFileSync(navigatorPath, 'utf-8')
    const cargoPath = path.join(distDir, entry.name, `${FILES.cargo}.js`)
    bundles.push({
      name: entry.name,
      code,
      cargoPath: fs.existsSync(cargoPath) ? cargoPath : null,
    })
  }

  return bundles
}

const runCargo = async (cargoPath: string): Promise<unknown> => {
  const mod = await import(`${cargoPath}?t=${Date.now()}`)
  const cargoFn = mod.cargo ?? mod.default
  if (typeof cargoFn !== 'function') return null
  return cargoFn()
}

export const createServeHandler = (bundles: AppBundle[], options: ServeOptions): http.RequestListener => {
  const bundleMap = new Map<string, AppBundle>()
  for (const bundle of bundles) {
    const base = options.rootBase ? `/${options.rootBase}/${bundle.name}` : `/${bundle.name}`
    bundleMap.set(base, bundle)
  }

  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    const url = req.url || '/'

    for (const [base, bundle] of bundleMap) {
      if (url === `${base}/navigator.js`) {
        let body = bundle.code

        if (bundle.cargoPath) {
          try {
            const data = await runCargo(bundle.cargoPath)
            if (data != null) {
              body = `const ${CARGO_GLOBAL}=${JSON.stringify(data)};\n` + body
            }
          } catch {
            // Cargo failed — serve navigator without data
          }
        }

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.writeHead(200).end(body)
        return
      }

      if (url.startsWith(`${base}/`)) {
        const filePath = path.join(options.distDir, url.slice(options.rootBase ? options.rootBase.length + 2 : 1))
        try {
          const content = fs.readFileSync(filePath)
          res.writeHead(200).end(content)
        } catch {
          res.writeHead(404).end()
        }
        return
      }
    }

    res.writeHead(404).end()
  }
}

export const createServeServer = (options: ServeOptions) => {
  const bundles = loadAppBundles(options.distDir)
  const handler = createServeHandler(bundles, options)
  const server = http.createServer(handler)
  server.listen(options.port, options.hostname)
  return { server, bundles }
}
