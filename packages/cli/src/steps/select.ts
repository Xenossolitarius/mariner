import { FrigateSearch } from '../../../kit/src'
import inquirer from 'inquirer'
import { exit } from './exit'
import { NO_SELECTED_FRIGATES } from '../messages'

export const select = async (frigates: FrigateSearch[]) => {
  const selection = [
    {
      type: 'checkbox',
      message: 'Select frigates',
      name: 'selection',
      choices: frigates.map((frigate) => ({
        name: `${frigate.name} - ${frigate.root}`,
        checked: true,
        value: frigate.root,
      })),
    },
  ]

  const results = (await inquirer.prompt(selection)) as { selection: string[] }

  const selectedFrigates = frigates.filter((frigate) => results.selection.includes(frigate.root))

  if (!selectedFrigates.length) {
    console.log(NO_SELECTED_FRIGATES)
    exit()
  }

  return selectedFrigates
}
