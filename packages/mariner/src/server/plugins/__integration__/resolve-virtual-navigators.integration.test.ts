import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { build } from 'vite'
import { resolveVirtualNavigators } from '../resolve-virtual-navigators'
import { buildConfig, createServerOptions, getChunk, type BuildResult } from './helpers'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let tmpDir: string

const projects = [
  { mariner: 'shared', root: '/shared' },
  { mariner: 'dashboard', root: '/dashboard' },
]

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mariner-nav-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('resolve-virtual-navigators integration', () => {
  it('marks navigator imports as external in build output', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `import shared from 'navigator:shared'\nimport dashboard from 'navigator:dashboard'\nconsole.log(shared, dashboard)`,
    )

    const plugin = resolveVirtualNavigators('/', createServerOptions(projects))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.code).toContain('/shared/navigator.js')
    expect(chunk.code).toContain('/dashboard/navigator.js')
    expect(chunk.code).not.toContain('navigator:shared')
    expect(chunk.code).not.toContain('navigator:dashboard')
  })

  it('includes rootBase in externalized navigator paths', async () => {
    await fs.writeFile(path.join(tmpDir, 'entry.js'), `import shared from 'navigator:shared'\nconsole.log(shared)`)

    const plugin = resolveVirtualNavigators('/', createServerOptions(projects, 'my-base'))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult

    expect(getChunk(result).code).toContain('/my-base/shared/navigator.js')
  })

  it('does not affect non-navigator imports', async () => {
    await fs.writeFile(path.join(tmpDir, 'entry.js'), `const x = 42\nconsole.log(x)`)

    const plugin = resolveVirtualNavigators('/', createServerOptions(projects))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.code).toContain('42')
    expect(chunk.code).not.toContain('navigator')
  })

  it('lists navigators as external imports in chunk metadata', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'entry.js'),
      `import { store } from 'navigator:shared'\nimport { App } from 'navigator:dashboard'\nconsole.log(store, App)`,
    )

    const plugin = resolveVirtualNavigators('/', createServerOptions(projects))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult
    const chunk = getChunk(result)

    expect(chunk.imports).toContain('/shared/navigator.js')
    expect(chunk.imports).toContain('/dashboard/navigator.js')
  })

  it('produces valid ESM output with import statements', async () => {
    await fs.writeFile(path.join(tmpDir, 'entry.js'), `import shared from 'navigator:shared'\nconsole.log(shared)`)

    const plugin = resolveVirtualNavigators('/', createServerOptions(projects))
    const result = (await build(buildConfig(tmpDir, [plugin]))) as BuildResult

    expect(getChunk(result).code).toMatch(/import\s*.*\/shared\/navigator\.js/)
  })
})
