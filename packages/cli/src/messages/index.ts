import chalk from 'chalk'

export const ENLISTING_NAVIGATORS = 'Enlisting navigators...'

export const NO_NAVIGATORS_FOUND = chalk.bold.red('No navigators found!')

export const NO_SELECTED_NAVIGATORS = chalk.bold.cyan('\nNo selected navigators. ')

export const NAVIGATORS_FOUND = (navigators: unknown[]) =>
  chalk.bold.green(`Found ${navigators.length} ${navigators.length === 1 ? 'navigator' : 'navigators'}`)

export const SELECT_NAVIGATORS = 'Select navigators'

export const EXITING = chalk.cyan('Mariner exiting...')
