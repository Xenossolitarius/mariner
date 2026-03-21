import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHandler, createNavServer, createDevServer, getServerUrl, type AppRoute } from './dev'
import type { ServerOptions } from '../server'
import type { MarinerProject } from '../../setup'

vi.mock('vite', () => ({
  createServer: vi.fn().mockResolvedValue({
    middlewares: vi.fn(),
    config: { base: '/test' },
  }),
}))

vi.mock('node:http', () => ({
  default: {
    createServer: vi.fn().mockReturnValue({
      listen: vi.fn((_p: number, _h: string, cb: () => void) => cb()),
    }),
  },
}))

vi.mock('./https', () => ({
  startHTTPSServer: vi.fn(),
}))

vi.mock('../plugins/resolve-virtual-navigators', () => ({
  resolveVirtualNavigators: vi.fn().mockReturnValue({ name: 'mock-plugin' }),
}))

import { createServer as createViteServer } from 'vite'
import http from 'node:http'
import { startHTTPSServer } from './https'

beforeEach(() => {
  vi.clearAllMocks()
})

function mockReq(url: string, method = 'GET'): IncomingMessage {
  return { url, method } as IncomingMessage
}

function mockRes() {
  const res = {
    setHeader: vi.fn().mockReturnThis(),
    writeHead: vi.fn().mockReturnValue({ end: vi.fn() }),
    end: vi.fn(),
  }
  return res as unknown as ServerResponse & { setHeader: ReturnType<typeof vi.fn>; writeHead: ReturnType<typeof vi.fn> }
}

function mockRoute(base: string, navigator = 'navigator.ts'): AppRoute {
  return {
    base,
    navigator,
    vite: { middlewares: vi.fn() } as unknown as AppRoute['vite'],
  }
}

describe('createHandler', () => {
  describe('CORS', () => {
    it('sets CORS headers on every response', () => {
      const handler = createHandler([mockRoute('/app1')])
      const req = mockReq('/app1/navigator.js')
      const res = mockRes()

      handler(req, res)

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', '*')
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', '*')
    })

    it('responds 204 to OPTIONS preflight requests', () => {
      const handler = createHandler([mockRoute('/app1')])
      const req = mockReq('/app1/foo', 'OPTIONS')
      const res = mockRes()

      handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(204)
    })

    it('does not forward OPTIONS to Vite middleware', () => {
      const route = mockRoute('/app1')
      const handler = createHandler([route])
      const req = mockReq('/app1/foo', 'OPTIONS')

      handler(req, mockRes())

      expect(route.vite.middlewares).not.toHaveBeenCalled()
    })
  })

  describe('routing', () => {
    it('matches request to the correct app route by URL prefix', () => {
      const app1 = mockRoute('/app1')
      const app2 = mockRoute('/app2')
      const handler = createHandler([app1, app2])

      handler(mockReq('/app2/src/main.ts'), mockRes())

      expect(app2.vite.middlewares).toHaveBeenCalled()
      expect(app1.vite.middlewares).not.toHaveBeenCalled()
    })

    it('returns 404 for unmatched routes', () => {
      const handler = createHandler([mockRoute('/app1')])
      const res = mockRes()

      handler(mockReq('/unknown/file.js'), res)

      expect(res.writeHead).toHaveBeenCalledWith(404)
    })

    it('returns 404 for root path', () => {
      const handler = createHandler([mockRoute('/app1')])
      const res = mockRes()

      handler(mockReq('/'), res)

      expect(res.writeHead).toHaveBeenCalledWith(404)
    })

    it('handles missing req.url as /', () => {
      const handler = createHandler([mockRoute('/app1')])
      const res = mockRes()
      const req = { method: 'GET' } as IncomingMessage

      handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(404)
    })
  })

  describe('URL rewriting', () => {
    it('strips the base path from the URL', () => {
      const route = mockRoute('/app1')
      const handler = createHandler([route])
      const req = mockReq('/app1/src/App.vue')

      handler(req, mockRes())

      expect(req.url).toBe('/src/App.vue')
      expect(route.vite.middlewares).toHaveBeenCalled()
    })

    it('rewrites /navigator.js to the actual navigator file', () => {
      const route = mockRoute('/shared', 'navigator.ts')
      const handler = createHandler([route])
      const req = mockReq('/shared/navigator.js')

      handler(req, mockRes())

      expect(req.url).toBe('/navigator.ts')
    })

    it('rewrites navigator.js for JS projects', () => {
      const route = mockRoute('/js-test', 'navigator.js')
      const handler = createHandler([route])
      const req = mockReq('/js-test/navigator.js')

      handler(req, mockRes())

      expect(req.url).toBe('/navigator.js')
    })

    it('does not rewrite non-navigator paths', () => {
      const route = mockRoute('/app1')
      const handler = createHandler([route])
      const req = mockReq('/app1/src/main.ts')

      handler(req, mockRes())

      expect(req.url).toBe('/src/main.ts')
    })

    it('sets url to / when request matches base exactly', () => {
      const route = mockRoute('/app1')
      const handler = createHandler([route])
      const req = mockReq('/app1')

      handler(req, mockRes())

      expect(req.url).toBe('/')
    })
  })

  describe('rootBase routing', () => {
    it('matches routes with rootBase prefix', () => {
      const route = mockRoute('/cdn/app1')
      const handler = createHandler([route])
      const req = mockReq('/cdn/app1/navigator.js')

      handler(req, mockRes())

      expect(req.url).toBe('/navigator.ts')
      expect(route.vite.middlewares).toHaveBeenCalled()
    })
  })

  describe('debug logging', () => {
    it('logs when debug is enabled', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const handler = createHandler([mockRoute('/app1')], true)

      handler(mockReq('/app1/src/main.ts'), mockRes())

      expect(spy).toHaveBeenCalledWith('/app1, /src/main.ts')
      spy.mockRestore()
    })

    it('does not log when debug is disabled', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const handler = createHandler([mockRoute('/app1')])

      handler(mockReq('/app1/src/main.ts'), mockRes())

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})

describe('getServerUrl', () => {
  it('returns defaults when no options specified', () => {
    const result = getServerUrl({ commands: {} } as ServerOptions)
    expect(result).toEqual({ hostname: 'localhost', port: 3000, secure: undefined })
  })

  it('uses custom port and hostname', () => {
    const result = getServerUrl({ commands: { port: 8080, hostname: '0.0.0.0' } } as ServerOptions)
    expect(result.port).toBe(8080)
    expect(result.hostname).toBe('0.0.0.0')
  })

  it('passes through https flag', () => {
    const result = getServerUrl({ commands: { https: true } } as ServerOptions)
    expect(result.secure).toBe(true)
  })
})

function makeProject(mariner: string, navigator = 'navigator.ts'): MarinerProject {
  return {
    mariner,
    root: `/projects/${mariner}`,
    navigator,
    isJs: navigator.endsWith('.js'),
    isValid: true,
    packageJson: null,
    configFile: {
      path: `/projects/${mariner}/mariner.config.ts`,
      config: { mariner, build: { rollupOptions: {} } } as never,
      dependencies: [],
    },
  }
}

function makeOptions(projects: MarinerProject[], overrides = {}): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects,
    commands: { command: 'serve', mode: 'development', ...overrides } as ServerOptions['commands'],
  } as ServerOptions
}

describe('createNavServer', () => {
  it('creates a Vite server in middleware mode and returns AppRoute', async () => {
    const project = makeProject('shared')
    const opts = makeOptions([project])

    const route = await createNavServer(opts, project)

    expect(createViteServer).toHaveBeenCalledWith(
      expect.objectContaining({
        appType: 'custom',
        base: '/shared',
        mode: 'development',
        configFile: false,
        root: '/projects/shared',
        server: expect.objectContaining({ middlewareMode: true }),
      }),
    )
    expect(route.base).toBe('/shared')
    expect(route.navigator).toBe('navigator.ts')
    expect(route.vite).toBeDefined()
  })

  it('includes rootBase in the base path', async () => {
    const project = makeProject('app1')
    const opts = makeOptions([project], { rootBase: 'cdn' })

    const route = await createNavServer(opts, project)

    expect(route.base).toBe('/cdn/app1')
    expect(createViteServer).toHaveBeenCalledWith(expect.objectContaining({ base: '/cdn/app1' }))
  })

  it('assigns unique HMR ports based on index', async () => {
    const project = makeProject('app3')
    const opts = makeOptions([project])

    await createNavServer(opts, project, 5)

    expect(createViteServer).toHaveBeenCalledWith(
      expect.objectContaining({
        server: expect.objectContaining({ hmr: expect.objectContaining({ port: 6006 }) }),
      }),
    )
  })

  it('sets origin based on https flag', async () => {
    const project = makeProject('app1')
    const opts = makeOptions([project], { https: true })

    await createNavServer(opts, project)

    expect(createViteServer).toHaveBeenCalledWith(
      expect.objectContaining({
        server: expect.objectContaining({
          origin: 'https://localhost:3000',
          hmr: expect.objectContaining({ protocol: 'wss' }),
        }),
      }),
    )
  })
})

describe('createDevServer', () => {
  it('creates HTTP server in non-secure mode', async () => {
    const project = makeProject('shared')
    const opts = makeOptions([project])
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await createDevServer(opts)

    expect(http.createServer).toHaveBeenCalled()
    const loggedOutput = logSpy.mock.calls[0][0]
    expect(loggedOutput).toContain('http://localhost:3000')
    expect(loggedOutput).toContain('Mariner Dev')

    logSpy.mockRestore()
  })

  it('calls startHTTPSServer in secure mode', async () => {
    const project = makeProject('shared')
    const opts = makeOptions([project], { https: true })

    await createDevServer(opts)

    expect(startHTTPSServer).toHaveBeenCalledWith(expect.any(Function), {
      port: 3000,
      hostname: 'localhost',
      secure: true,
    })
    expect(http.createServer).not.toHaveBeenCalled()
  })

  it('creates a route for each project', async () => {
    const opts = makeOptions([makeProject('app1'), makeProject('app2'), makeProject('shared')])
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await createDevServer(opts)

    expect(createViteServer).toHaveBeenCalledTimes(3)
  })
})
