import chalk from 'chalk'
import { EXITING } from '../messages'
import { exit as exitProcess } from 'process'

export const exit = () => {
  console.log(EXITING)
  console.log(chalk.reset(''))
  exitProcess()
}
