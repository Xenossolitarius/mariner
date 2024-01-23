import ora from 'ora'
import { getMarineConfigs } from '@mariner/kit'
import { ENLISTING_NAVIGATORS, NAVIGATORS_FOUND, NO_NAVIGATORS_FOUND } from '../messages'
import { exit } from './exit'

export const search = async () => {
  const spinner = ora({ text: ENLISTING_NAVIGATORS }).start()

  const configs = await getMarineConfigs()

  if (!configs.length) {
    spinner.fail(NO_NAVIGATORS_FOUND)
    exit()
  } else {
    spinner.succeed(NAVIGATORS_FOUND(configs))
  }

  return configs
}
