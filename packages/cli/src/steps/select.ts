import { MarinerProjectData } from 'mariner'
import inquirer from 'inquirer'
import { exit } from './exit'
import { INVALID_NAVIGATOR_REASON, NO_SELECTED_NAVIGATORS, SELECT_NAVIGATORS } from '../messages'

export const select = async (projects: MarinerProjectData[]) => {
  const selection = [
    {
      type: 'checkbox',
      message: SELECT_NAVIGATORS,
      name: 'selection',
      choices: projects.map((project) => ({
        name: `${project.name} - ${project.root}`,
        checked: true,
        value: project.root,
        disabled: !project.isValid && INVALID_NAVIGATOR_REASON(project),
      })),
    },
  ]

  const results = (await inquirer.prompt(selection)) as { selection: string[] }

  const selected = projects.filter((project) => results.selection.includes(project.root))

  if (!selected.length) {
    console.log(NO_SELECTED_NAVIGATORS)
    exit()
  }

  return selected
}
