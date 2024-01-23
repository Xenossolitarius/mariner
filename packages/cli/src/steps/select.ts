import { MarineSearch } from '@mariner/kit'
import inquirer from 'inquirer'
import { exit } from './exit'
import { NO_SELECTED_NAVIGATORS, SELECT_NAVIGATORS } from '../messages'

export const select = async (configs: MarineSearch[]) => {
  const selection = [
    {
      type: 'checkbox',
      message: SELECT_NAVIGATORS,
      name: 'selection',
      choices: configs.map((config) => ({
        name: `${config.name} - ${config.root}`,
        checked: true,
        value: config.root,
      })),
    },
  ]

  const results = (await inquirer.prompt(selection)) as { selection: string[] }

  const selectedConfigs = configs.filter((config) => results.selection.includes(config.root))

  if (!selectedConfigs.length) {
    console.log(NO_SELECTED_NAVIGATORS)
    exit()
  }

  return selectedConfigs
}
