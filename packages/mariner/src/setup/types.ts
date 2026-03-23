import type { MarinerGlobal, MarinerProject } from './setup'
import type { FleetMode } from './fleet'

export type MarinerMode = {
  // implement global modes (global envs, configs)
}

export type MarinerOptions = {
  projects: MarinerProject[]
  global: MarinerGlobal
}

export type MarinerEnvs = Record<string, string> | null

export type ResolvedFleetGroup = {
  name: string
  mode: FleetMode
  projects: MarinerProject[]
}
