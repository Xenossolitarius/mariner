import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { build } from 'vite'
import { virtualRoot, replaceImportsPlugin } from '../collection'
import { buildConfig, getChunk, type BuildResult } from './helpers'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mariner-collection-'))
  await fs.mkdir(path.join(tmpDir, 'public'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('virtualRoot integration', () => {
  it('resolves virtual:mariner-root and bundles its export', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `import { emitter } from 'virtual:mariner-root'\nconsole.log(emitter)`,
    )

    const result = (await build(buildConfig(tmpDir, [virtualRoot()]))) as BuildResult

    expect(getChunk(result).code).toContain('from virtual module')
  })

  it('bundles virtual module inline (no external file)', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `import { emitter } from 'virtual:mariner-root'\nconsole.log(emitter)`,
    )

    const result = (await build(buildConfig(tmpDir, [virtualRoot()]))) as BuildResult

    const chunks = result.output.filter((o) => o.type === 'chunk')
    expect(chunks).toHaveLength(1)
    expect(getChunk(result).code).toContain('from virtual module')
  })

  it('works alongside other plugins', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `import { emitter } from 'virtual:mariner-root'\nconsole.log(emitter)`,
    )

    const noopPlugin = { name: 'noop' }

    const result = (await build(buildConfig(tmpDir, [noopPlugin, virtualRoot()]))) as BuildResult

    expect(getChunk(result).code).toContain('from virtual module')
  })
})

describe('replaceImportsPlugin integration', () => {
  it('replaces virtual:mariner-lighthouse in .js source files', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `export const url = "virtual:mariner-lighthouse"\nconsole.log(url)`,
    )

    const result = (await build(buildConfig(tmpDir, [replaceImportsPlugin()]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.code).toContain('http:localhost:3000')
    expect(chunk.code).not.toContain('virtual:mariner-lighthouse')
  })

  it('replaces multiple occurrences', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `const a = "virtual:mariner-lighthouse"\nconst b = "virtual:mariner-lighthouse"\nconsole.log(a, b)`,
    )

    const result = (await build(buildConfig(tmpDir, [replaceImportsPlugin()]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.code).not.toContain('virtual:mariner-lighthouse')
    const matches = chunk.code.match(/http:localhost:3000/g)
    expect(matches?.length).toBe(2)
  })

  it('leaves code without lighthouse references untouched', async () => {
    await fs.writeFile(path.join(tmpDir, 'entry.js'), `const x = 42\nconsole.log(x)`)

    const result = (await build(buildConfig(tmpDir, [replaceImportsPlugin()]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.code).toContain('42')
    expect(chunk.code).not.toContain('localhost')
  })
})
