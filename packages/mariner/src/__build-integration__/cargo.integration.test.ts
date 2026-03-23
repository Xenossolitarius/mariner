import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildNavigator } from '../server/build/build'
import { buildCargo } from '../server/build/build-cargo'
import { getMarinerSetup } from '../setup'
import { createServeHandler, loadAppBundles, type ServeOptions } from '../server/serve'
import type { ServerOptions } from '../server/server'
import type { MarinerProject } from '../setup'
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs/promises'
import realFs from 'node:fs'
import path from 'node:path'

// Integration tests for the cargo system:
// 1. Normal build: useCargo() replaced with baked JSON
// 2. SSR build: useCargo() replaced with __MARINER_CARGO__, cargo.js built separately
// 3. Serve handler: cargo data injected per-request
//
// Uses rootBase 'cargo-test' to isolate from shared dist.

const monorepoRoot = path.resolve(__dirname, '../../../..')
const rootBase = 'cargo-test'
const distDir = path.join(monorepoRoot, 'dist', rootBase)
let originalCwd: string
let app1: MarinerProject
let allProjects: MarinerProject[]

function makeOptions(overrides = {}): ServerOptions {
  return {
    setup: { projects: allProjects, global: { fleet: null } },
    projects: allProjects,
    commands: { command: 'build', mode: 'production', rootBase, ...overrides } as ServerOptions['commands'],
  } as ServerOptions
}

beforeAll(async () => {
  originalCwd = process.cwd()
  process.chdir(monorepoRoot)

  await fs.rm(distDir, { recursive: true, force: true }).catch(() => {})

  const setup = await getMarinerSetup({ command: 'build', mode: 'production' })
  allProjects = setup.projects.filter((p) => p.isValid)
  app1 = allProjects.find((p) => p.mariner === 'app1')!

  // Build app1 with normal cargo plugin (bakes data at build time)
  await buildNavigator(makeOptions(), app1)
}, 120000)

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(distDir, { recursive: true, force: true }).catch(() => {})
})

describe('cargo — normal build', () => {
  it('produces navigator.js in dist', async () => {
    const stat = await fs.stat(path.join(distDir, 'app1', 'navigator.js'))
    expect(stat.isFile()).toBe(true)
  })

  it('does not produce cargo.js in normal build (only SSR does)', async () => {
    const exists = realFs.existsSync(path.join(distDir, 'app1', 'cargo.js'))
    expect(exists).toBe(false)
  })
})

describe('cargo — SSR build', () => {
  const ssrDistDir = path.join(monorepoRoot, 'dist', 'cargo-test-ssr')

  beforeAll(async () => {
    await fs.rm(ssrDistDir, { recursive: true, force: true }).catch(() => {})

    const ssrOpts = makeOptions({ rootBase: 'cargo-test-ssr', ssr: true })
    await buildNavigator(ssrOpts, app1)

    // Build cargo separately (as --ssr does)
    await buildCargo(app1, path.join(ssrDistDir, 'app1'))
  }, 60000)

  afterAll(async () => {
    await fs.rm(ssrDistDir, { recursive: true, force: true }).catch(() => {})
  })

  it('produces cargo.js alongside navigator.js', async () => {
    const navStat = await fs.stat(path.join(ssrDistDir, 'app1', 'navigator.js'))
    const cargoStat = await fs.stat(path.join(ssrDistDir, 'app1', 'cargo.js'))
    expect(navStat.isFile()).toBe(true)
    expect(cargoStat.isFile()).toBe(true)
  })

  it('cargo.js contains the cargo function', async () => {
    const code = await fs.readFile(path.join(ssrDistDir, 'app1', 'cargo.js'), 'utf-8')
    expect(code).toContain('cargo')
    expect(code).toContain('export')
  })

  it('cargo.js is executable and returns data', async () => {
    const cargoPath = path.join(ssrDistDir, 'app1', 'cargo.js')
    const mod = await import(`${cargoPath}?t=${Date.now()}`)
    const cargoFn = mod.cargo ?? mod.default
    expect(typeof cargoFn).toBe('function')

    const data = await cargoFn()
    expect(data).toHaveProperty('greeting')
    expect(data).toHaveProperty('features')
  })
})

describe('cargo — serve handler', () => {
  const serveDistDir = path.join(monorepoRoot, 'dist', 'cargo-test-serve')

  beforeAll(async () => {
    await fs.rm(serveDistDir, { recursive: true, force: true }).catch(() => {})

    const ssrOpts = makeOptions({ rootBase: 'cargo-test-serve', ssr: true })
    await buildNavigator(ssrOpts, app1)
    await buildCargo(app1, path.join(serveDistDir, 'app1'))
  }, 60000)

  afterAll(async () => {
    await fs.rm(serveDistDir, { recursive: true, force: true }).catch(() => {})
  })

  function mockReq(url: string): IncomingMessage {
    return { url, method: 'GET' } as IncomingMessage
  }

  it('loads bundles from dist with cargo detection', () => {
    const bundles = loadAppBundles(serveDistDir)
    const app1Bundle = bundles.find((b) => b.name === 'app1')

    expect(app1Bundle).toBeDefined()
    expect(app1Bundle!.cargoPath).toContain('cargo.js')
  })

  it('injects cargo data into navigator.js response', async () => {
    const bundles = loadAppBundles(serveDistDir)
    const opts: ServeOptions = { distDir: serveDistDir, rootBase: '', port: 3000, hostname: 'localhost' }

    // Capture the response
    let responseBody = ''
    let responseStatus = 0
    const handler = createServeHandler(bundles, opts)
    const res = {
      setHeader: () => {},
      writeHead: (status: number) => {
        responseStatus = status
        return {
          end: (body: string) => {
            responseBody = body
          },
        }
      },
    } as unknown as ServerResponse

    await handler(mockReq('/app1/navigator.js'), res)

    expect(responseStatus).toBe(200)
    expect(responseBody).toContain('__MARINER_CARGO__')
    expect(responseBody).toContain('"greeting"')
    expect(responseBody).toContain('Hello from server')
  })

  it('cargo data is valid JSON', async () => {
    const bundles = loadAppBundles(serveDistDir)
    const opts: ServeOptions = { distDir: serveDistDir, rootBase: '', port: 3000, hostname: 'localhost' }

    let responseBody = ''
    const handler = createServeHandler(bundles, opts)
    const res = {
      setHeader: () => {},
      writeHead: () => ({ end: (body: string) => (responseBody = body) }),
    } as unknown as ServerResponse

    await handler(mockReq('/app1/navigator.js'), res)

    // Extract the JSON from the injection line
    const match = responseBody.match(/const __MARINER_CARGO__=(.+);/)
    expect(match).not.toBeNull()

    const data = JSON.parse(match![1])
    expect(data.greeting).toBe('Hello from server')
    expect(data.features).toEqual({ darkMode: true, beta: false })
  })

  it('navigators without cargo are served without injection', async () => {
    const bundles = loadAppBundles(serveDistDir)
    // Find a bundle without cargo (if any non-app1 was built), or test with modified bundle
    const noCargoBundles = bundles.map((b) => (b.name === 'app1' ? { ...b, cargoPath: null } : b))
    const opts: ServeOptions = { distDir: serveDistDir, rootBase: '', port: 3000, hostname: 'localhost' }

    let responseBody = ''
    const handler = createServeHandler(noCargoBundles, opts)
    const res = {
      setHeader: () => {},
      writeHead: () => ({ end: (body: string) => (responseBody = body) }),
    } as unknown as ServerResponse

    await handler(mockReq('/app1/navigator.js'), res)

    // The built code may reference __MARINER_CARGO__ as a variable,
    // but no injection line should be prepended when cargoPath is null
    expect(responseBody).not.toContain('const __MARINER_CARGO__=')
  })
})
