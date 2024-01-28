import type { Plugin, ResolvedConfig } from 'vite'
import { CLIENT_ENTRY, ENV_ENTRY } from './constants'
import { normalizePath, resolveHostname } from '../utils'
import { replaceDefine, serializeDefine } from './define'

// ids in transform are normalized to unix style
const normalizedClientEntry = normalizePath(CLIENT_ENTRY)
const normalizedEnvEntry = normalizePath(ENV_ENTRY)

/**
 * some values used by the client needs to be dynamically injected by the server
 * @server-only
 */
export function clientInjectionsPlugin(config: ResolvedConfig): Plugin {
  let injectConfigValues: (code: string) => string

  return {
    name: 'vite:client-inject',
    async buildStart() {
      const resolvedServerHostname = (await resolveHostname(config.server.host)).name
      const resolvedServerPort = config.server.port!
      const devBase = config.base

      const serverHost = `${resolvedServerHostname}:${resolvedServerPort}${devBase}`

      const userDefine: Record<string, string> = {}
      for (const key in config.define) {
        // import.meta.env.* is handled in `importAnalysis` plugin
        if (!key.startsWith('import.meta.env.')) {
          userDefine[key] = config.define[key]
        }
      }
      const serializedDefines = serializeDefine(userDefine)

      const modeReplacement = escapeReplacement(config.mode)
      const baseReplacement = escapeReplacement(devBase)
      const definesReplacement = () => serializedDefines
      const serverHostReplacement = escapeReplacement(serverHost)

      injectConfigValues = (code: string) => {
        return code
          .replace(`__MODE__`, modeReplacement)
          .replace(/__BASE__/g, baseReplacement)
          .replace(`__DEFINES__`, definesReplacement)
          .replace(`__SERVER_HOST__`, serverHostReplacement)
      }
    },
    async transform(code, id) {
      if (id === normalizedClientEntry || id === normalizedEnvEntry) {
        return injectConfigValues(code)
      } else if (code.includes('process.env.NODE_ENV')) {
        // replace process.env.NODE_ENV instead of defining a global
        // for it to avoid shimming a `process` object during dev,
        // avoiding inconsistencies between dev and build
        const nodeEnv = config.define?.['process.env.NODE_ENV'] || JSON.stringify(process.env.NODE_ENV || config.mode)
        return await replaceDefine(
          code,
          id,
          {
            'process.env.NODE_ENV': nodeEnv,
            'global.process.env.NODE_ENV': nodeEnv,
            'globalThis.process.env.NODE_ENV': nodeEnv,
          },
          config,
        )
      }
    },
  }
}

function escapeReplacement(value: string | number | boolean | null) {
  const jsonValue = JSON.stringify(value)
  return () => jsonValue
}
