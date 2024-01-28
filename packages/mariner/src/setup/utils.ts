import { type ConfigEnv, type InlineConfig, loadConfigFromFile, loadEnv } from 'vite'
import { FILES, MARINER_ENV_PREFIX } from '../constants'
import { MarinerUserConfig } from '../config'

export const normalizeMode = (config: ConfigEnv) =>
  config.mode ?? (config.command === 'serve' ? 'development' : 'production')

export type MarinerInlineConfig = MarinerUserConfig & InlineConfig

export type MarinerConfigFile = {
  path: string
  config: MarinerUserConfig
  dependencies: string[]
}

export const loadMarinerConfigFile = (config: ConfigEnv, root: string) =>
  // force convert type
  loadConfigFromFile(config, `${root}/${FILES.config}`, root) as Promise<MarinerConfigFile | null>

export const loadMarinerEnv = (mode: string, root: string) => loadEnv(mode, root, MARINER_ENV_PREFIX)
