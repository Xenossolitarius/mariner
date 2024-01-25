import type { MarinerOptions } from '../../setup'
import inquirer from 'inquirer'
import { exit } from './exit'
import { ServerCommandOptions } from '../commands/shared/server'
import {
  USING_ALL_IGNORING_SELECTION,
  IGNORING_FLEET_NO_CONFIG,
  INVALID_NAVIGATOR_REASON,
  NO_SELECTED_NAVIGATORS,
  SELECT_FLEET,
  RUN_SINGLE_NAVIGATOR,
  SELECT_MARINERS,
} from '../messages'

export const select = async ({ projects, global }: MarinerOptions, options: ServerCommandOptions) => {
  if (options.all) {
    if (options.fleet || options.navigator) {
      console.log(USING_ALL_IGNORING_SELECTION)
    }

    return projects
  }

  if (options.navigator || projects.length === 1) {
    console.log(RUN_SINGLE_NAVIGATOR)
    return projects.filter((project) => project.mariner === options.navigator)
  }

  if (options.fleet) {
    if (!global.fleet) {
      console.log(IGNORING_FLEET_NO_CONFIG)
    } else {
      console.log(global.fleet)
      let fleet: string
      if (options.fleet === true) {
        const fleetSelection = [
          {
            type: 'list',
            message: SELECT_FLEET,
            name: 'fleet',
            choices: Object.entries(global.fleet).map(([name, projects]) => ({
              name: `${name} - ${projects[options.command].join(', ')}`,
              value: name,
            })),
          },
        ]

        const results = (await inquirer.prompt(fleetSelection)) as { fleet: string }
        fleet = results.fleet
      } else {
        fleet = options.fleet
      }

      return projects.filter(
        (project) =>
          project.mariner && global.fleet && global.fleet?.[fleet][options.command].includes(project.mariner),
      )
    }
  }

  const projectSelection = [
    {
      type: 'checkbox',
      message: SELECT_MARINERS,
      name: 'projects',
      choices: projects.map((project) => ({
        name: `${project.mariner} - ${project.root}`,
        checked: true,
        value: project.root,
        disabled: !project.isValid && INVALID_NAVIGATOR_REASON(project),
      })),
    },
  ]

  const results = (await inquirer.prompt(projectSelection)) as { projects: string[] }

  const selected = projects.filter((project) => results.projects.includes(project.root))

  if (!selected.length) {
    console.log(NO_SELECTED_NAVIGATORS)
    exit()
  }

  return selected
}
