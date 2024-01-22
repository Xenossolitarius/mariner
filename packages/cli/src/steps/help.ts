import chalk from 'chalk'
import boxen from 'boxen'

export const help = chalk.cyan(
  '\nUsage: mycli -l <language>  -s <sentence> \n' +
    boxen(chalk.green('\n' + 'Translates a sentence to specific language' + '\n'), {
      padding: 1,
      borderColor: 'green',
      dimBorder: true,
    }) +
    '\n',
)
