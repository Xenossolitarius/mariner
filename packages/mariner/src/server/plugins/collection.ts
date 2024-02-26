import type { Plugin } from 'vite'

export const virtualRoot: () => Plugin = () => {
  const virtualModuleId = 'virtual:mariner-root'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'mariner:virtual-root', // required, will show up in warnings and errors
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const emitter = "from virtual module"`
      }
    },
  }
}

export function replaceImportsPlugin(): Plugin {
  return {
    name: 'replace-imports',
    transform(code, id) {
      if (id.endsWith('.js') || id.endsWith('.jsx') || id.endsWith('vue')) {
        // Replace imports here as needed
        code = code.replace(/virtual:mariner-lighthouse/g, 'http:localhost:3000')
      }
      return {
        code,
        map: null,
      }
    },
  }
}
