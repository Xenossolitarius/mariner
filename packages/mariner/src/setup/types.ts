import type { MarinerGlobal, MarinerProject } from './setup'

export type MarinerMode = {
  // implement global modes (global envs, configs)
}

export type MarinerOptions = {
  projects: MarinerProject[]
  global: MarinerGlobal
}

export type MarinerEnvs = Record<string, string> | null
