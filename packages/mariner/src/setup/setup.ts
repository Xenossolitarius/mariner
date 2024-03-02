import { FILES, MARINER_PROJ_DEFAULT_NAME } from '../constants'
import { getJSON } from '../utils/json'
import { slugify } from '../utils/slugify'
import path from 'node:path'

import { type Path, glob } from 'glob'
import { type ConfigEnv } from 'vite'
import { MarinerConfigFile, loadMarinerConfigFile, normalizeMode } from './utils'
import type { MarinerOptions } from './types'
import { FleetConfig, getFleetConfig } from './fleet'

/**
 * Source of truth for assuming a Mariner project (yea not resolving the json deps)
 */

export const getMarineConfigPaths = () =>
  glob(`**/${FILES.config}`, { ignore: ['node_modules/**', 'dist'], withFileTypes: true })

export type MarinerProject = {
  base: Path
  root: string
  configFile: MarinerConfigFile | null
  mariner: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageJson: any | null
  files: {
    navigator?: boolean
    docs?: boolean
  }
  isValid: boolean
}

const getMarineProject = async (base: Path, configEnv: ConfigEnv): Promise<MarinerProject> => {
  const root = base.parent?.fullpath() || '/' // configs file parent or default to cwd

  const configReadOp = loadMarinerConfigFile(configEnv, root)

  const dirsReadOp = base.parent?.readdir() ?? Promise.resolve([])

  const packageReadOp = getJSON<{ name?: string }>(path.resolve(root, 'package.json'))

  const [configFile, dirs, packageJson] = await Promise.all([configReadOp, dirsReadOp, packageReadOp])

  const files = dirs.reduce(
    (acc, { name }) => {
      switch (name) {
        case FILES.navigator:
          acc.navigator = true
          break
        case FILES.docks:
          acc.docs = true
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
    configFile,
    // document this decision
    mariner: slugify(configFile?.config.mariner || packageJson?.name) || MARINER_PROJ_DEFAULT_NAME,
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
}

export const getMarinerGlobals = async () => {
  const fleet = await getFleetConfig()

  return { fleet }
}

export const getMarinerSetup = async (config: ConfigEnv): Promise<MarinerOptions> => {
  // normalize bcs this function can be used as standalone
  const mode = normalizeMode(config)

  const global = await getMarinerGlobals()

  const projects = await getMarinerProjects({ command: config.command, mode })

  return {
    projects,
    global,
  }
}
