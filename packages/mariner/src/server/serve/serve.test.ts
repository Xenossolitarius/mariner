import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadAppBundles, createServeHandler, createServeServer, type ServeOptions, type AppBundle } from './serve'
import { tmpdir } from 'node:os'
import path from 'node:path'

const realFs = await vi.importActual<typeof import('node:fs')>('node:fs')

vi.mock('node:fs', () => ({
  default: {
    readdirSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('node:http', () => ({
  default: {
    createServer: vi.fn().mockReturnValue({ listen: vi.fn() }),
  },
}))

import fs from 'node:fs'
import http from 'node:http'

// Create real temp cargo file for integration-style tests
const tempDir = path.join(tmpdir(), `mariner-serve-test-${Date.now()}`)
const tempCargoPath = path.join(tempDir, 'cargo.js')

beforeAll(() => {
  realFs.mkdirSync(tempDir, { recursive: true })
  realFs.writeFileSync(tempCargoPath, 'export const cargo = async () => ({ server: true, count: 42 })')
})

afterAll(() => {
  realFs.rmSync(tempDir, { recursive: true, force: true } as never)
})

beforeEach(() => vi.clearAllMocks())

function makeOptions(overrides: Partial<ServeOptions> = {}): ServeOptions {
  return { distDir: '/dist', rootBase: '', port: 3000, hostname: 'localhost', ...overrides }
}

function mockReq(url: string, method = 'GET'): IncomingMessage {
  return { url, method } as IncomingMessage
}

function mockRes() {
  return {
    setHeader: vi.fn().mockReturnThis(),
    writeHead: vi.fn().mockReturnValue({ end: vi.fn() }),
  } as unknown as ServerResponse & { setHeader: ReturnType<typeof vi.fn>; writeHead: ReturnType<typeof vi.fn> }
}

describe('loadAppBundles', () => {
  it('loads navigator bundles from dist directories', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: 'app1', isDirectory: () => true },
      { name: 'app2', isDirectory: () => true },
    ] as never)
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('export const navigator = {}')

    const bundles = loadAppBundles('/dist')

    expect(bundles).toHaveLength(2)
    expect(bundles[0].name).toBe('app1')
  })

  it('detects cargo.js when present', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([{ name: 'app1', isDirectory: () => true }] as never)
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('code')

    const bundles = loadAppBundles('/dist')
    expect(bundles[0].cargoPath).toBe('/dist/app1/cargo.js')
  })

  it('sets cargoPath to null when no cargo.js', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([{ name: 'app1', isDirectory: () => true }] as never)
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('navigator.js'))
    vi.mocked(fs.readFileSync).mockReturnValue('code')

    const bundles = loadAppBundles('/dist')
    expect(bundles[0].cargoPath).toBeNull()
  })

  it('skips directories without navigator.js', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([{ name: 'chunks', isDirectory: () => true }] as never)
    vi.mocked(fs.existsSync).mockReturnValue(false)

    expect(loadAppBundles('/dist')).toHaveLength(0)
  })
})

describe('createServeHandler', () => {
  const bundle: AppBundle = { name: 'app1', code: 'export const navigator = {}', cargoPath: null }

  it('sets CORS headers', async () => {
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/app1/navigator.js'), res)

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
  })

  it('responds 204 to OPTIONS', async () => {
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/app1/navigator.js', 'OPTIONS'), res)

    expect(res.writeHead).toHaveBeenCalledWith(204)
  })

  it('serves navigator.js with correct content type', async () => {
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/app1/navigator.js'), res)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8')
    expect(res.writeHead).toHaveBeenCalledWith(200)
    expect(res.writeHead.mock.results[0].value.end).toHaveBeenCalledWith('export const navigator = {}')
  })

  it('serves navigator without cargo injection when no cargo file', async () => {
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/app1/navigator.js'), res)

    const body = res.writeHead.mock.results[0].value.end.mock.calls[0][0] as string
    expect(body).not.toContain('__MARINER_CARGO__')
  })

  it('returns 404 for unknown app', async () => {
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/unknown/navigator.js'), res)

    expect(res.writeHead).toHaveBeenCalledWith(404)
  })

  it('serves under rootBase prefix', async () => {
    const handler = createServeHandler([bundle], makeOptions({ rootBase: 'cdn' }))
    const res = mockRes()
    await handler(mockReq('/cdn/app1/navigator.js'), res)

    expect(res.writeHead).toHaveBeenCalledWith(200)
  })

  it('serves static files from dist', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('<svg/>'))
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/app1/vite.svg'), res)

    expect(res.writeHead).toHaveBeenCalledWith(200)
  })

  it('returns 404 for non-existent static files', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
    const handler = createServeHandler([bundle], makeOptions())
    const res = mockRes()
    await handler(mockReq('/app1/missing.js'), res)

    expect(res.writeHead).toHaveBeenCalledWith(404)
  })

  describe('cargo injection', () => {
    it('prepends cargo data to navigator response when cargo file exists', async () => {
      const bundleWithCargo: AppBundle = { name: 'app1', code: 'const nav = {}', cargoPath: tempCargoPath }
      const handler = createServeHandler([bundleWithCargo], makeOptions())
      const res = mockRes()

      await handler(mockReq('/app1/navigator.js'), res)

      const body = res.writeHead.mock.results[0].value.end.mock.calls[0][0] as string
      expect(body).toContain('__MARINER_CARGO__')
      expect(body).toContain('"server":true')
      expect(body).toContain('"count":42')
      expect(body).toContain('const nav = {}')
    })

    it('serves navigator without prefix when cargo function returns null', async () => {
      const nullCargoDir = path.join(tmpdir(), `mariner-null-cargo-${Date.now()}`)
      const nullCargoPath = path.join(nullCargoDir, 'cargo.js')
      realFs.mkdirSync(nullCargoDir, { recursive: true })
      realFs.writeFileSync(nullCargoPath, 'export const cargo = async () => null')

      const bundleWithCargo: AppBundle = { name: 'app1', code: 'const nav = {}', cargoPath: nullCargoPath }
      const handler = createServeHandler([bundleWithCargo], makeOptions())
      const res = mockRes()

      await handler(mockReq('/app1/navigator.js'), res)

      const body = res.writeHead.mock.results[0].value.end.mock.calls[0][0] as string
      expect(body).not.toContain('__MARINER_CARGO__')
      expect(body).toBe('const nav = {}')

      realFs.rmSync(nullCargoDir, { recursive: true, force: true })
    })

    it('serves navigator without prefix when cargo function throws', async () => {
      const errCargoDir = path.join(tmpdir(), `mariner-err-cargo-${Date.now()}`)
      const errCargoPath = path.join(errCargoDir, 'cargo.js')
      realFs.mkdirSync(errCargoDir, { recursive: true })
      realFs.writeFileSync(errCargoPath, 'export const cargo = async () => { throw new Error("fail") }')

      const bundleWithCargo: AppBundle = { name: 'app1', code: 'const nav = {}', cargoPath: errCargoPath }
      const handler = createServeHandler([bundleWithCargo], makeOptions())
      const res = mockRes()

      await handler(mockReq('/app1/navigator.js'), res)

      const body = res.writeHead.mock.results[0].value.end.mock.calls[0][0] as string
      expect(body).not.toContain('__MARINER_CARGO__')
      expect(body).toBe('const nav = {}')

      realFs.rmSync(errCargoDir, { recursive: true, force: true })
    })
  })
})

describe('createServeServer', () => {
  it('creates HTTP server and listens on specified port', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([{ name: 'app1', isDirectory: () => true }] as never)
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('navigator.js'))
    vi.mocked(fs.readFileSync).mockReturnValue('code')

    const result = createServeServer(makeOptions({ port: 4000, hostname: '0.0.0.0' }))

    expect(http.createServer).toHaveBeenCalled()
    expect(result.server.listen).toHaveBeenCalledWith(4000, '0.0.0.0')
    expect(result.bundles).toHaveLength(1)
    expect(result.bundles[0].name).toBe('app1')
  })
})
