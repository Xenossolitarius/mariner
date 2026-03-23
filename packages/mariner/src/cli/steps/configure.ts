import { mode as showMode } from './mode'
import { setup } from './setup'
import { select } from './select'
import { ServerCommandOptions } from '../commands/shared/server'
import type { ResolvedFleetGroup } from '../../setup/types'
import type { MarinerProject } from '../../setup/setup'
import type { FleetConfig } from '../../setup/fleet'

const resolveFleetGroups = (
  fleetConfig: FleetConfig | null | false,
  selectedProjects: MarinerProject[],
  selectedFleets?: string[],
): ResolvedFleetGroup[] => {
  if (!fleetConfig) {
    return selectedProjects.map((project) => ({
      name: project.mariner!,
      mode: 'isolated',
      projects: [project],
    }))
  }

  const groups: ResolvedFleetGroup[] = []
  const assigned = new Set<string>()

  const entries = selectedFleets
    ? selectedFleets.map((name) => [name, fleetConfig[name]] as const).filter(([, entry]) => entry)
    : Object.entries(fleetConfig)

  for (const [name, entry] of entries) {
    const fleetProjects = selectedProjects.filter((p) => p.mariner && entry.apps.includes(p.mariner))
    if (fleetProjects.length === 0) continue

    groups.push({ name, mode: entry.mode, projects: fleetProjects })
    fleetProjects.forEach((p) => assigned.add(p.mariner!))
  }

  // Projects not in any fleet get their own isolated group
  const unassigned = selectedProjects.filter((p) => p.mariner && !assigned.has(p.mariner))
  for (const project of unassigned) {
    groups.push({ name: project.mariner!, mode: 'isolated', projects: [project] })
  }

  return groups
}

export const configure = async (commands: ServerCommandOptions) => {
  showMode(commands.mode)

  const setupData = await setup(commands)

  const projects = await select(setupData, commands)

  // When --fleet is specified, apply fleet groupings to the selected projects.
  // With --all --fleet, all projects are selected but grouped by the named fleet.
  // Remaining projects not in the fleet become isolated.
  const selectedFleet = typeof commands.fleet === 'string' ? commands.fleet : undefined
  const fleetGroups = selectedFleet ? resolveFleetGroups(setupData.global.fleet, projects, [selectedFleet]) : undefined

  return { setup: setupData, projects, commands, fleetGroups }
}
