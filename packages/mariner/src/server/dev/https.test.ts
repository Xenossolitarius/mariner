import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCertificate, startHTTPSServer } from './https'

vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}))

vi.mock('node:https', () => ({
  default: {
    createServer: vi.fn().mockReturnValue({
      listen: vi.fn((_port: number, _host: string, cb: () => void) => cb()),
    }),
  },
}))

import fsp from 'node:fs/promises'
import https from 'node:https'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCertificate', () => {
  it('returns a string containing PEM private key and certificate', () => {
    const pem = createCertificate()

    expect(pem).toContain('-----BEGIN RSA PRIVATE KEY-----')
    expect(pem).toContain('-----END RSA PRIVATE KEY-----')
    expect(pem).toContain('-----BEGIN CERTIFICATE-----')
    expect(pem).toContain('-----END CERTIFICATE-----')
  })

  it('generates a valid PEM with default name', () => {
    const pem = createCertificate()
    expect(pem.length).toBeGreaterThan(500)
  })

  it('accepts a custom name', () => {
    const pem = createCertificate('my-domain.com')
    expect(pem).toContain('-----BEGIN CERTIFICATE-----')
  })

  it('accepts additional domains', () => {
    const pem = createCertificate('example.org', ['extra.com', 'another.org'])
    expect(pem).toContain('-----BEGIN CERTIFICATE-----')
  })

  it('generates different certificates on each call', () => {
    const pem1 = createCertificate()
    const pem2 = createCertificate()
    // Serial numbers differ so PEMs should differ
    expect(pem1).not.toBe(pem2)
  })
})

describe('startHTTPSServer', () => {
  it('creates an HTTPS server with the cached certificate and listens', async () => {
    // Mock getCertificate to return a cached cert
    vi.mocked(fsp.stat).mockResolvedValue({ ctime: new Date() } as never)
    vi.mocked(fsp.readFile).mockResolvedValue('FAKE_PEM')

    const handler = vi.fn()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await startHTTPSServer(handler as never, { port: 443, hostname: 'localhost', secure: true })

    expect(https.createServer).toHaveBeenCalledWith({ key: 'FAKE_PEM', cert: 'FAKE_PEM' }, handler)

    const mockServer = vi.mocked(https.createServer).mock.results[0].value
    expect(mockServer.listen).toHaveBeenCalledWith(443, 'localhost', expect.any(Function))
    expect(logSpy).toHaveBeenCalledWith('Started dev (https) on: https://localhost:443')

    logSpy.mockRestore()
  })

  it('generates a new certificate when cache is expired', async () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 60) // 60 days ago
    vi.mocked(fsp.stat).mockResolvedValue({ ctime: oldDate } as never)
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await startHTTPSServer(vi.fn() as never, { port: 443, hostname: 'localhost', secure: true })

    // Should have written a new cert
    expect(fsp.writeFile).toHaveBeenCalled()
    expect(fsp.mkdir).toHaveBeenCalled()

    logSpy.mockRestore()
  })

  it('generates a new certificate when no cache exists', async () => {
    vi.mocked(fsp.stat).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await startHTTPSServer(vi.fn() as never, { port: 443, hostname: 'localhost', secure: true })

    expect(fsp.writeFile).toHaveBeenCalled()

    logSpy.mockRestore()
  })
})
