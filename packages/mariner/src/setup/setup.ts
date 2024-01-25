import { FILES, MARINER_PROJ_DEFAULT_NAME } from '../constants'
import { getJSON } from '../utils/json'
import { slugify } from '../utils/slugify'
import path from 'node:path'

import { type Path, glob } from 'glob'
import { type ConfigEnv } from 'vite'
import { MarinerInlineConfig, loadMarinerConfigFile, loadMarinerEnv, normalizeMode } from './utils'
import type { MarinerEnvs, MarinerOptions } from './types'
import { getDirname } from '../utils/dirname'
import { FleetConfig, getFleetConfig } from './fleet'

/**
 * Source of truth for assuming a Mariner project (yea not resolving the json deps)
 */

export const getMarineConfigPaths = () =>
  glob(`**/${FILES.config}`, { ignore: ['node_modules/**', 'dist'], withFileTypes: true })

export type MarinerProject = {
  base: Path
  root: string
  config: MarinerInlineConfig | null
  mariner: string | null
  envs: MarinerEnvs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageJson: any | null
  files: {
    navigator?: boolean
    docs?: boolean
    lighthouse?: boolean
  }
  isValid: boolean
}

const getMarineProject = async (base: Path, configEnv: ConfigEnv): Promise<MarinerProject> => {
  const root = base.parent?.fullpath() || '/' // configs file parent or default to cwd

  const configReadOp = loadMarinerConfigFile(configEnv, root)

  const dirsReadOp = base.parent?.readdir() ?? Promise.resolve([])

  const packageReadOp = getJSON<{ name?: string }>(path.resolve(root, 'package.json'))

  const envs = loadMarinerEnv(configEnv.mode, root)

  const [config, dirs, packageJson] = await Promise.all([configReadOp, dirsReadOp, packageReadOp])

  const files = dirs.reduce(
    (acc, { name }) => {
      switch (name) {
        case FILES.navigator:
          acc.navigator = true
          break
        case FILES.docks:
          acc.docs = true
          break
        case FILES.lighthouse:
          acc.lighthouse = true
          break

        default:
          break
      }
      return acc
    },
    <MarinerProject['files']>{},
  )

  return {
    base,
    root,
    config,
    // document this decision
    mariner: slugify(config?.mariner || packageJson?.name) || MARINER_PROJ_DEFAULT_NAME,
    envs,
    packageJson,
    files,
    isValid: !!files.navigator, // for now this is the only check
  }
}

export const getMarinerProjects = async (config: ConfigEnv): Promise<MarinerProject[]> => {
  const marineConfigPaths = await getMarineConfigPaths()

  return Promise.all(marineConfigPaths.map(async (path) => getMarineProject(path, config)))
}

export type MarinerGlobal = {
  fleet: FleetConfig | null | false
  envs: MarinerEnvs
}

export const getMarinerGlobals = async (mode: string) => {
  const fleet = await getFleetConfig()

  // probably will cause some issues in the future
  const envs = loadMarinerEnv(mode, process.cwd())

  return { fleet, envs }
}

export const getMarinerSetup = async (config: ConfigEnv): Promise<MarinerOptions> => {
  // normalize bcs this function can be used as standalone
  const mode = normalizeMode(config)

  const global = await getMarinerGlobals(mode)

  const projects = await getMarinerProjects({ command: config.command, mode })

  return {
    projects,
    global,
  }
}
