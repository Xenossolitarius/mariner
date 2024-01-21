import chalk from 'chalk'
import boxen from 'boxen'
import { Options } from 'boxen'
import { fullLogo } from '../utils/logo'

const boxStyle: Options = {
  padding: 1,
  borderColor: 'cyan',
  dimBorder: true,
  borderStyle: 'double',
  textAlignment: 'center',
}

const text = `${chalk.bold(fullLogo)}

${chalk.reset.cyan('Safe voyage in calm waters')}`

export const start = chalk.cyan(`
${boxen(text, boxStyle)}
`)

export const showStartingLogo = () => console.log(start)
