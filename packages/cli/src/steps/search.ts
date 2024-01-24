import ora from 'ora'
import { getMarinerOptions } from 'mariner'
import { ENLISTING_NAVIGATORS, NAVIGATORS_FOUND, NO_NAVIGATORS_FOUND } from '../messages'
import { exit } from './exit'

export const search = async () => {
  const spinner = ora({ text: ENLISTING_NAVIGATORS }).start()

  const { projects } = await getMarinerOptions()

  if (!projects.length) {
    spinner.fail(NO_NAVIGATORS_FOUND)
    exit()
  } else {
    spinner.succeed(NAVIGATORS_FOUND(projects))
  }

  return projects
}
