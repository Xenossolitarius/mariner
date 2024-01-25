import ora from 'ora'
import {
  ENLISTING_NAVIGATORS,
  FOUND_FLEET_CONFIG,
  MARINER_LOADED,
  NAVIGATORS_FOUND,
  NO_NAVIGATORS_FOUND,
} from '../messages'
import { exit } from './exit'
import { ServerCommandOptions } from '../commands/shared/server'
import { getMarinerSetup } from '../../setup'

export const setup = async ({ mode, command }: ServerCommandOptions) => {
  const spinner = ora({ text: ENLISTING_NAVIGATORS }).start()

  const config = await getMarinerSetup({ mode, command })

  spinner.succeed(MARINER_LOADED)

  config.global.fleet && spinner.succeed(FOUND_FLEET_CONFIG)

  if (!config.projects.length) {
    spinner.fail(NO_NAVIGATORS_FOUND)
    exit()
  } else {
    spinner.succeed(NAVIGATORS_FOUND(config.projects))
  }

  return config
}
