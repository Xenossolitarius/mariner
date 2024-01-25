import chalk from 'chalk'
import { EXITING } from '../messages'

export const exit = () => {
  console.log(EXITING)
  console.log(chalk.reset('')) // For good measure
  process.exit()
}
