import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { FILES, CARGO_GLOBAL, CARGO_VIRTUAL_MODULE, CARGO_RESOLVED_ID } from '../../constants'
import type { MarinerProject } from '../../setup'

const CARGO_EXTENSIONS = ['.ts', '.js']

const findCargoFile = (root: string): string | null => {
  for (const ext of CARGO_EXTENSIONS) {
    const cargoPath = path.join(root, `${FILES.cargo}${ext}`)
    if (fs.existsSync(cargoPath)) return cargoPath
  }
  return null
}

export type ResolveCargoOptions = {
  projects: MarinerProject[]
  ssr?: boolean
}

export function resolveCargo(options: ResolveCargoOptions): Plugin {
  // Build a map of project root → cargo file path
  const cargoMap = new Map<string, string>()
  for (const project of options.projects) {
    const cargoPath = findCargoFile(project.root)
    if (cargoPath) cargoMap.set(project.root, cargoPath)
  }

  return {
    name: 'mariner-resolve-cargo',

    resolveId(id) {
      if (id === CARGO_VIRTUAL_MODULE || id.startsWith(`${CARGO_VIRTUAL_MODULE}?`)) {
        return `${CARGO_RESOLVED_ID}${id.slice(CARGO_VIRTUAL_MODULE.length)}`
      }
    },

    async load(id) {
      if (!id.startsWith(CARGO_RESOLVED_ID)) return null

      const params = new URLSearchParams(id.slice(CARGO_RESOLVED_ID.length))
      const root = params.get('root')
      if (!root) return 'export default null'

      const cargoPath = cargoMap.get(root)
      if (!cargoPath) return 'export default null'

      if (options.ssr) {
        return `export default ${CARGO_GLOBAL}`
      }

      const timestamp = Date.now()
      const mod = await import(`${cargoPath}?t=${timestamp}`)
      const cargoFn = mod.cargo ?? mod.default
      if (typeof cargoFn !== 'function') return 'export default null'

      const data = await cargoFn()
      return `export default ${JSON.stringify(data)}`
    },

    transform(code, id) {
      if (!code.includes('useCargo')) return null

      // Match useCargo() and useCargo<Type>() — type params are stripped later by TS transform
      const cargoCallPattern = /useCargo\s*(?:<[^>]*>\s*)?\(\s*\)/
      if (!cargoCallPattern.test(code)) return null

      // Find which project this file belongs to (strip ?vue query params for .vue files)
      const filePath = id.split('?')[0]
      const projectRoot = [...cargoMap.keys()].find((root) => filePath.startsWith(root))
      if (!projectRoot) return null

      const importId = `${CARGO_VIRTUAL_MODULE}?root=${encodeURIComponent(projectRoot)}`

      const importName = '__mariner_cargo__'
      const transformed = code.replace(/useCargo\s*(?:<[^>]*>\s*)?\(\s*\)/g, importName)
      const withImport = `import ${importName} from "${importId}";\n${transformed}`

      return { code: withImport, map: null }
    },
  }
}
