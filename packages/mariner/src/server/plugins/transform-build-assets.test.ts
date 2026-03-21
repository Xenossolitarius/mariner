import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Plugin } from 'vite'
import { transformBuildAssets } from './transform-build-assets'
import type { ServerOptions } from '..'

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}))

import fs from 'fs/promises'

function createOptions(rootBase = ''): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: [],
    commands: { command: 'build', mode: 'production', rootBase } as ServerOptions['commands'],
  } as ServerOptions
}

function getPlugin(base = '/app1', options = createOptions()): Plugin {
  return transformBuildAssets(base, options)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

function getLoad(plugin: Plugin) {
  return plugin.load as unknown as AnyFn
}

describe('transformBuildAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('plugin metadata', () => {
    it('has the correct name', () => {
      expect(getPlugin().name).toBe('mariner-transform-build-assets')
    })

    it('enforces pre ordering', () => {
      expect(getPlugin().enforce).toBe('pre')
    })
  })

  describe('configResolved', () => {
    it('stores the publicDir path', () => {
      const plugin = getPlugin()
      const hook = plugin.configResolved as (config: { publicDir: string }) => void

      // Should not throw
      hook({ publicDir: '/my/public' })
    })
  })

  describe('load', () => {
    it('returns null for non-asset files', async () => {
      const load = getLoad(getPlugin())

      expect(await load.call({ emitFile: vi.fn() }, '/src/index.ts')).toBeNull()
      expect(await load.call({ emitFile: vi.fn() }, '/src/utils.js')).toBeNull()
      expect(await load.call({ emitFile: vi.fn() }, '/styles.css')).toBeNull()
    })

    it('processes image files and emits assets', async () => {
      const plugin = getPlugin('/app1', createOptions())
      const buffer = Buffer.from('fake-image-data')
      vi.mocked(fs.readFile).mockResolvedValue(buffer)

      const emitFile = vi.fn()
      const load = getLoad(plugin)

      const result = await load.call({ emitFile }, '/assets/logo.png')

      expect(emitFile).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'asset',
          fileName: expect.stringMatching(/^logo\..{8}\.png$/),
          source: buffer,
        }),
      )
      expect(result).toContain('export default import.meta.resolve')
      expect(result).toContain('/app1/')
      expect(result).toContain('.png')
    })

    it('includes rootBase in the output path', async () => {
      const plugin = getPlugin('/app1', createOptions('my-base'))
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data'))

      const emitFile = vi.fn()
      const load = getLoad(plugin)

      const result = await load.call({ emitFile }, '/assets/icon.svg')

      expect(result).toContain('/my-base/app1/')
    })

    it('handles various asset file extensions', async () => {
      const load = getLoad(getPlugin())
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data'))
      const emitFile = vi.fn()

      const assetExts = [
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.svg',
        '.webp',
        '.ico',
        '.woff',
        '.woff2',
        '.ttf',
        '.mp3',
        '.mp4',
      ]
      for (const ext of assetExts) {
        const result = await load.call({ emitFile }, `/file${ext}`)
        expect(result).not.toBeNull()
      }
    })

    it('generates deterministic hashes for the same content', async () => {
      const load = getLoad(getPlugin())
      const data = Buffer.from('consistent-data')
      vi.mocked(fs.readFile).mockResolvedValue(data)

      const fileNames: string[] = []
      const emitFile = vi.fn().mockImplementation((f: { fileName: string }) => fileNames.push(f.fileName))

      await load.call({ emitFile }, '/a.png')
      await load.call({ emitFile }, '/b.png')

      // Same content = same hash, different base names
      const hashA = fileNames[0].split('.')[1]
      const hashB = fileNames[1].split('.')[1]
      expect(hashA).toBe(hashB)
    })

    it('handles public asset paths', async () => {
      const plugin = getPlugin()
      const configResolved = plugin.configResolved as (config: { publicDir: string }) => void
      configResolved({ publicDir: '/project/public' })

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('public-asset'))
      const emitFile = vi.fn()
      const load = getLoad(plugin)

      const result = await load.call({ emitFile }, '\0vite:asset:public/images/logo.png')

      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('public'))
      expect(result).toContain('export default')
    })

    it('falls back to publicDir when absolute path does not exist', async () => {
      const plugin = getPlugin()
      const configResolved = plugin.configResolved as (config: { publicDir: string }) => void
      configResolved({ publicDir: '/project/public' })

      // First readFile fails (absolute path), second succeeds (publicDir fallback)
      vi.mocked(fs.readFile)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(Buffer.from('fallback-asset'))

      const emitFile = vi.fn()
      const load = getLoad(plugin)

      const result = await load.call({ emitFile }, '/vite.svg')

      expect(fs.readFile).toHaveBeenCalledTimes(2)
      expect(emitFile).toHaveBeenCalled()
      expect(result).toContain('export default')
    })

    it('returns null when file not found in publicDir either', async () => {
      const plugin = getPlugin()
      const configResolved = plugin.configResolved as (config: { publicDir: string }) => void
      configResolved({ publicDir: '/project/public' })

      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))

      const load = getLoad(plugin)
      const result = await load.call({ emitFile: vi.fn() }, '/missing.png')

      expect(result).toBeNull()
    })

    it('returns null when no publicDir and file not found', async () => {
      const plugin = getPlugin()
      // No configResolved called, so publicDirPath is empty

      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))

      const load = getLoad(plugin)
      const result = await load.call({ emitFile: vi.fn() }, '/missing.png')

      expect(result).toBeNull()
    })
  })
})
