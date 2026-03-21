import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Tests the unbuild output: file structure, sizes, exports, types, and CLI bundle.
// Rebuilds the package before running.

const pkgDir = path.resolve(__dirname, '../..')
const distDir = path.join(pkgDir, 'dist')

function fileSize(filePath: string): number {
  return fs.statSync(path.join(distDir, filePath)).size
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(distDir, filePath))
}

function fileContent(filePath: string): string {
  return fs.readFileSync(path.join(distDir, filePath), 'utf-8')
}

function getDirSize(dirPath: string): number {
  let size = 0
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name)
    size += entry.isDirectory() ? getDirSize(full) : fs.statSync(full).size
  }
  return size
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

beforeAll(() => {
  execSync('pnpm build', { cwd: pkgDir, stdio: 'pipe', timeout: 30000 })
}, 30000)

describe('package build — file structure', () => {
  it('produces all expected library entry files', () => {
    expect(fileExists('index.mjs')).toBe(true)
    expect(fileExists('index.d.mts')).toBe(true)
    expect(fileExists('index.d.mts')).toBe(true)
  })

  it('produces navigator entry files', () => {
    expect(fileExists('navigator/index.mjs')).toBe(true)
    expect(fileExists('navigator/index.d.mts')).toBe(true)
    expect(fileExists('navigator/index.d.mts')).toBe(true)
  })

  it('produces plugins entry files', () => {
    expect(fileExists('server/plugins/index.mjs')).toBe(true)
    expect(fileExists('server/plugins/index.d.mts')).toBe(true)
    expect(fileExists('server/plugins/index.d.mts')).toBe(true)
  })

  it('produces CLI bundle', () => {
    expect(fileExists('cli/index.mjs')).toBe(true)
  })

  it('produces worker files without types', () => {
    expect(fileExists('server/build/worker.mjs')).toBe(true)
    expect(fileExists('server/generate-types/worker.mjs')).toBe(true)

    // Workers should NOT have declaration files
    expect(fileExists('server/build/worker.d.ts')).toBe(false)
    expect(fileExists('server/build/worker.d.mts')).toBe(false)
    expect(fileExists('server/generate-types/worker.d.ts')).toBe(false)
    expect(fileExists('server/generate-types/worker.d.mts')).toBe(false)
  })

  it('CLI bundle has no declaration files', () => {
    expect(fileExists('cli/index.d.mts')).toBe(false)
    expect(fileExists('cli/index.d.mts')).toBe(false)
  })

  it('bin/index.mjs exists', () => {
    expect(fs.existsSync(path.join(pkgDir, 'bin/index.mjs'))).toBe(true)
  })
})

describe('package build — bundle sizes', () => {
  it('total dist size under 100 KB', () => {
    const total = getDirSize(distDir)
    console.log(`    📦 Total dist: ${formatKB(total)}`)
    expect(total).toBeLessThan(100 * 1024)
  })

  it('library entries are small (externalized deps)', () => {
    const indexSize = fileSize('index.mjs')
    const navSize = fileSize('navigator/index.mjs')
    const pluginsSize = fileSize('server/plugins/index.mjs')

    console.log(`    📄 index.mjs: ${formatKB(indexSize)}`)
    console.log(`    📄 navigator/index.mjs: ${formatKB(navSize)}`)
    console.log(`    📄 plugins/index.mjs: ${formatKB(pluginsSize)}`)

    expect(indexSize, 'index.mjs').toBeLessThan(10 * 1024)
    expect(navSize, 'navigator should be tiny').toBeLessThan(2 * 1024)
    expect(pluginsSize, 'plugins').toBeLessThan(10 * 1024)
  })

  it('CLI bundle is self-contained but reasonable', () => {
    const size = fileSize('cli/index.mjs')
    console.log(`    📄 cli/index.mjs: ${formatKB(size)}`)
    expect(size).toBeLessThan(50 * 1024)
    expect(size).toBeGreaterThan(10 * 1024) // should have real code
  })

  it('workers are small', () => {
    const buildWorker = fileSize('server/build/worker.mjs')
    const typesWorker = fileSize('server/generate-types/worker.mjs')

    console.log(`    📄 build/worker.mjs: ${formatKB(buildWorker)}`)
    console.log(`    📄 generate-types/worker.mjs: ${formatKB(typesWorker)}`)

    expect(buildWorker).toBeLessThan(10 * 1024)
    expect(typesWorker).toBeLessThan(10 * 1024)
  })
})

describe('package build — library exports', () => {
  it('index.mjs exports config helpers and setup functions', () => {
    const code = fileContent('index.mjs')
    expect(code).toContain('defineMarinerConfig')
    expect(code).toContain('getMarinerSetup')
  })

  it('navigator/index.mjs exports framework adapters', () => {
    const code = fileContent('navigator/index.mjs')
    expect(code).toContain('createVueNavigator')
    expect(code).toContain('createReactNavigator')
    expect(code).toContain('defineNavigator')
  })

  it('plugins/index.mjs exports Vite plugins', () => {
    const code = fileContent('server/plugins/index.mjs')
    expect(code).toContain('resolveVirtualNavigators')
    expect(code).toContain('transformBuildAssets')
  })

  it('CLI bundle exports run function', () => {
    const code = fileContent('cli/index.mjs')
    expect(code).toContain('export')
    expect(code).toContain('run')
  })
})

describe('package build — externals', () => {
  it('library entries externalize vite and defu', () => {
    const code = fileContent('index.mjs')
    expect(code).toMatch(/from ['"]vite['"]/)
    expect(code).toMatch(/from ['"]defu['"]/)
  })

  it('navigator entry externalizes vue and react', () => {
    // navigator has no runtime imports — just type references
    const code = fileContent('navigator/index.mjs')
    expect(code).not.toContain('createApp')
    expect(code).not.toContain('createElement')
  })

  it('CLI externalizes vite (peer dep)', () => {
    const code = fileContent('cli/index.mjs')
    expect(code).toMatch(/from ['"]vite['"]/)
  })

  it('CLI does NOT bundle removed deps (koa, connect)', () => {
    const code = fileContent('cli/index.mjs')
    expect(code).not.toContain("from 'koa'")
    expect(code).not.toContain("from 'connect'")
    expect(code).not.toContain("from 'koa-connect'")
    expect(code).not.toContain("from '@koa/cors'")
  })

  it('CLI uses node:http and node:https (not http2)', () => {
    const code = fileContent('cli/index.mjs')
    expect(code).toMatch(/from ['"]node:http['"]/)
    expect(code).toMatch(/from ['"]node:https['"]/)
    expect(code).not.toMatch(/from ['"]node:http2['"]/)
  })
})

describe('package build — type declarations', () => {
  it('index.d.mts exports MarinerUserConfig type', () => {
    const dts = fileContent('index.d.mts')
    expect(dts).toContain('MarinerUserConfig')
    expect(dts).toContain('defineMarinerConfig')
  })

  it('navigator types export Navigator type and adapters', () => {
    const dts = fileContent('navigator/index.d.mts')
    expect(dts).toContain('Navigator')
    expect(dts).toContain('createVueNavigator')
    expect(dts).toContain('createReactNavigator')
  })

  it('plugins types export plugin functions', () => {
    const dts = fileContent('server/plugins/index.d.mts')
    expect(dts).toContain('resolveVirtualNavigators')
    expect(dts).toContain('transformBuildAssets')
  })

  it('.d.mts declaration files exist for all entries', () => {
    expect(fileExists('index.d.mts')).toBe(true)
    expect(fileExists('navigator/index.d.mts')).toBe(true)
    expect(fileExists('server/plugins/index.d.mts')).toBe(true)
  })
})

describe('package build — package.json consistency', () => {
  it('every exports entry points to existing files', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'))
    const exports = pkg.exports

    for (const [key, value] of Object.entries(exports)) {
      if (key === './package.json') continue
      const entry = value as Record<string, string>
      for (const [condition, filePath] of Object.entries(entry)) {
        const fullPath = path.join(pkgDir, filePath)
        expect(fs.existsSync(fullPath), `exports["${key}"].${condition} → ${filePath} should exist`).toBe(true)
      }
    }
  })

  it('bin entry points to existing file', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'))
    for (const [name, binPath] of Object.entries(pkg.bin)) {
      const fullPath = path.join(pkgDir, binPath as string)
      expect(fs.existsSync(fullPath), `bin.${name} → ${binPath} should exist`).toBe(true)
    }
  })

  it('types field points to existing file', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'))
    expect(fs.existsSync(path.join(pkgDir, pkg.types))).toBe(true)
  })
})
