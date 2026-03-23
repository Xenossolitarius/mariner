import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { build } from 'vite'
import { transformBuildAssets } from '../transform-build-assets'
import { buildConfig, createServerOptions, getChunk, getAssets, type BuildResult } from './helpers'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mariner-assets-'))
  await fs.mkdir(path.join(tmpDir, 'assets'), { recursive: true })
  await fs.mkdir(path.join(tmpDir, 'public'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function expectedHash(content: string) {
  const hash = crypto.createHash('sha1')
  hash.update(content)
  return hash.digest('base64url').substring(0, 8)
}

describe('transform-build-assets integration', () => {
  it('emits an asset with a content-hashed filename during build', async () => {
    const imageContent = 'fake-png-binary-content'
    const imagePath = path.join(tmpDir, 'assets', 'logo.png')
    await fs.writeFile(imagePath, imageContent)

    await fs.writeFile(path.join(tmpDir, 'entry.js'), `import logo from '${imagePath}'\nconsole.log(logo)`)

    const plugin = transformBuildAssets('/app1', createServerOptions([]))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult

    const assets = getAssets(result)
    const logoAsset = assets.find((a) => a.fileName!.startsWith('logo.'))

    expect(logoAsset).toBeDefined()
    expect(logoAsset!.fileName).toMatch(/^logo\..{8}\.png$/)

    const chunk = getChunk(result)
    expect(chunk.code).toContain('import.meta.resolve')
    expect(chunk.code).toContain('/app1/')
  })

  it('produces deterministic hashes for identical content', async () => {
    const content = 'identical-content'
    await fs.writeFile(path.join(tmpDir, 'assets', 'a.png'), content)
    await fs.writeFile(path.join(tmpDir, 'assets', 'b.png'), content)

    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      [
        `import a from '${path.join(tmpDir, 'assets', 'a.png')}'`,
        `import b from '${path.join(tmpDir, 'assets', 'b.png')}'`,
        `console.log(a, b)`,
      ].join('\n'),
    )

    const plugin = transformBuildAssets('/app1', createServerOptions([]))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult

    const assets = getAssets(result)
    const hashes = assets.map((a) => a.fileName!.split('.')[1])

    expect(hashes[0]).toBe(hashes[1])
    expect(hashes[0]).toBe(expectedHash(content))
  })

  it('handles multiple asset types in a single build', async () => {
    await fs.writeFile(path.join(tmpDir, 'assets', 'icon.svg'), '<svg></svg>')
    await fs.writeFile(path.join(tmpDir, 'assets', 'font.woff2'), 'woff2-data')
    await fs.writeFile(path.join(tmpDir, 'assets', 'photo.jpg'), 'jpg-data')

    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      [
        `import icon from '${path.join(tmpDir, 'assets', 'icon.svg')}'`,
        `import font from '${path.join(tmpDir, 'assets', 'font.woff2')}'`,
        `import photo from '${path.join(tmpDir, 'assets', 'photo.jpg')}'`,
        `console.log(icon, font, photo)`,
      ].join('\n'),
    )

    const plugin = transformBuildAssets('/app1', createServerOptions([]))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult

    const assets = getAssets(result)

    expect(assets.find((a) => a.fileName!.endsWith('.svg'))).toBeDefined()
    expect(assets.find((a) => a.fileName!.endsWith('.woff2'))).toBeDefined()
    expect(assets.find((a) => a.fileName!.endsWith('.jpg'))).toBeDefined()
  })

  it('includes rootBase in the resolved asset URL', async () => {
    await fs.writeFile(path.join(tmpDir, 'assets', 'img.png'), 'png-data')

    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `import img from '${path.join(tmpDir, 'assets', 'img.png')}'\nconsole.log(img)`,
    )

    const plugin = transformBuildAssets('/app1', createServerOptions([], 'cdn'))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult

    expect(getChunk(result).code).toContain('/cdn/app1/')
  })

  it('does not interfere with non-asset imports', async () => {
    await fs.writeFile(path.join(tmpDir, 'util.js'), 'export const x = 42')
    await fs.writeFile(path.join(tmpDir, 'entry.js'), `import { x } from './util.js'\nconsole.log(x)`)

    const plugin = transformBuildAssets('/app1', createServerOptions([]))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.code).toContain('42')
    expect(chunk.code).not.toContain('import.meta.resolve')
  })
})
