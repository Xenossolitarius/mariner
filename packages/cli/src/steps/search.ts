import ora from 'ora'
import { getFrigates } from '../../../kit/src'
import { ENLISTING_FRIGATES, FRIGATES_FOUND, NO_FRIGATES_FOUND } from '../messages'
import { exit } from './exit'

export const search = async () => {
  const spinner = ora({ text: ENLISTING_FRIGATES }).start()

  const frigates = await getFrigates()

  if (!frigates.length) {
    spinner.fail(NO_FRIGATES_FOUND)
    exit()
  } else {
    spinner.succeed(FRIGATES_FOUND(frigates))
  }

  return frigates
}
