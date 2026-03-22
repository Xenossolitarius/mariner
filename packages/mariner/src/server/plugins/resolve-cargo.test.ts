import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolveCargo } from './resolve-cargo'
import fs from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { CARGO_VIRTUAL_MODULE, CARGO_RESOLVED_ID } from '../../constants'
import type { MarinerProject } from '../../setup'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPlugin = (plugin: ReturnType<typeof resolveCargo>) => plugin as any

const makeProject = (root: string): MarinerProject => ({
  root,
  configFile: null,
  mariner: path.basename(root),
  packageJson: null,
  navigator: 'navigator.ts',
  isJs: false,
  isValid: true,
})

const baseDir = path.join(tmpdir(), `mariner-cargo-test-${Date.now()}`)
const dirs = {
  normal: path.join(baseDir, 'normal'),
  notFunc: path.join(baseDir, 'not-func'),
  defaultExport: path.join(baseDir, 'default-export'),
  ssr: path.join(baseDir, 'ssr'),
  noCargo: path.join(baseDir, 'no-cargo'),
}

beforeAll(() => {
  for (const dir of Object.values(dirs)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(path.join(dirs.normal, 'cargo.js'), 'export const cargo = async () => ({ hello: "world", num: 42 })')
  fs.writeFileSync(path.join(dirs.notFunc, 'cargo.js'), 'export const cargo = "not a function"')
  fs.writeFileSync(path.join(dirs.defaultExport, 'cargo.js'), 'export default async () => ({ from: "default" })')
  fs.writeFileSync(path.join(dirs.ssr, 'cargo.js'), 'export const cargo = () => { throw new Error("should not run") }')
})

afterAll(() => {
  fs.rmSync(baseDir, { recursive: true, force: true })
})

describe('resolveCargo', () => {
  it('has correct plugin name', () => {
    const plugin = resolveCargo({ projects: [makeProject(dirs.normal)] })
    expect(plugin.name).toBe('mariner-resolve-cargo')
  })

  describe('resolveId', () => {
    it('resolves virtual:mariner-cargo', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      expect(plugin.resolveId(CARGO_VIRTUAL_MODULE)).toBe(CARGO_RESOLVED_ID)
    })

    it('resolves virtual:mariner-cargo with query params', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const id = `${CARGO_VIRTUAL_MODULE}?root=${encodeURIComponent(dirs.normal)}`
      expect(plugin.resolveId(id)).toBe(`${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.normal)}`)
    })

    it('returns undefined for non-cargo ids', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      expect(plugin.resolveId('some-other-module')).toBeUndefined()
    })
  })

  describe('load', () => {
    it('returns null for non-cargo ids', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      expect(await plugin.load('some-id')).toBeNull()
    })

    it('returns null export when no root param', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      expect(await plugin.load(CARGO_RESOLVED_ID)).toBe('export default null')
    })

    it('returns null export when project has no cargo file', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.noCargo)] }))
      const id = `${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.noCargo)}`
      expect(await plugin.load(id)).toBe('export default null')
    })

    it('loads and runs cargo function, exports JSON', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const id = `${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.normal)}`
      const result = await plugin.load(id)
      expect(result).toContain('"hello":"world"')
      expect(result).toContain('"num":42')
      expect(result).toMatch(/^export default /)
    })

    it('uses default export as fallback', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.defaultExport)] }))
      const id = `${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.defaultExport)}`
      const result = await plugin.load(id)
      expect(result).toContain('"from":"default"')
    })

    it('returns null export when cargo is not a function', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.notFunc)] }))
      const id = `${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.notFunc)}`
      expect(await plugin.load(id)).toBe('export default null')
    })

    it('returns __MARINER_CARGO__ reference in SSR mode', async () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.ssr)], ssr: true }))
      const id = `${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.ssr)}`
      const result = await plugin.load(id)
      expect(result).toBe('export default __MARINER_CARGO__')
    })

    it('does not run cargo function in SSR mode', async () => {
      // dirs.ssr has a cargo that throws — should succeed because SSR mode doesn't import it
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.ssr)], ssr: true }))
      const id = `${CARGO_RESOLVED_ID}?root=${encodeURIComponent(dirs.ssr)}`
      const result = await plugin.load(id)
      expect(result).toContain('__MARINER_CARGO__')
    })
  })

  describe('transform', () => {
    it('returns null when code does not contain useCargo', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      expect(plugin.transform('const x = 1', path.join(dirs.normal, 'nav.ts'))).toBeNull()
    })

    it('returns null when file is not in any project root', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      expect(plugin.transform('const data = useCargo()', '/some/other/dir/nav.ts')).toBeNull()
    })

    it('replaces useCargo() with import from virtual module', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const result = plugin.transform('const data = useCargo()', path.join(dirs.normal, 'nav.ts'))

      expect(result.code).toContain('import __mariner_cargo__')
      expect(result.code).toContain(CARGO_VIRTUAL_MODULE)
      expect(result.code).toContain('const data = __mariner_cargo__')
      expect(result.code).not.toContain('useCargo()')
    })

    it('replaces useCargo in nested subdirectory files', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const result = plugin.transform('const data = useCargo()', path.join(dirs.normal, 'src', 'components', 'App.vue'))

      expect(result.code).toContain('import __mariner_cargo__')
      expect(result.code).toContain('const data = __mariner_cargo__')
    })

    it('replaces multiple useCargo() calls', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const code = 'const a = useCargo()\nconst b = useCargo()'
      const result = plugin.transform(code, path.join(dirs.normal, 'nav.ts'))

      expect(result.code).not.toContain('useCargo')
      expect(result.code.match(/__mariner_cargo__/g)!.length).toBeGreaterThanOrEqual(2)
    })

    it('handles useCargo with whitespace inside parens', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const result = plugin.transform('const data = useCargo(  )', path.join(dirs.normal, 'nav.ts'))

      expect(result.code).toContain('const data = __mariner_cargo__')
    })

    it('replaces useCargo with generic type parameter', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const result = plugin.transform('const data = useCargo<{ greeting: string }>()', path.join(dirs.normal, 'nav.ts'))

      expect(result.code).toContain('const data = __mariner_cargo__')
      expect(result.code).not.toContain('useCargo')
    })

    it('does not replace useCargo with arguments', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const result = plugin.transform('const data = useCargo("key")', path.join(dirs.normal, 'nav.ts'))

      expect(result).toBeNull()
    })

    it('preserves surrounding code', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const code = 'import { useCargo } from "mariner-fe/navigator"\nconst data = useCargo()\nconsole.log(data)'
      const result = plugin.transform(code, path.join(dirs.normal, 'nav.ts'))

      expect(result.code).toContain('import { useCargo } from "mariner-fe/navigator"')
      expect(result.code).toContain('__mariner_cargo__')
      expect(result.code).toContain('console.log(data)')
    })

    it('includes project root in virtual module query', () => {
      const plugin = getPlugin(resolveCargo({ projects: [makeProject(dirs.normal)] }))
      const result = plugin.transform('useCargo()', path.join(dirs.normal, 'nav.ts'))

      expect(result.code).toContain(`root=${encodeURIComponent(dirs.normal)}`)
    })
  })
})
