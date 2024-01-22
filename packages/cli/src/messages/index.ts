import chalk from 'chalk'

export const ENLISTING_FRIGATES = 'Enlisting frigates...'

export const NO_FRIGATES_FOUND = chalk.bold.red('No frigates found!')

export const NO_SELECTED_FRIGATES = chalk.bold.cyan('\nNo selected frigates. ')

export const FRIGATES_FOUND = (frigates: unknown[]) =>
  chalk.bold.green(`Found ${frigates.length} ${frigates.length === 1 ? 'frigate' : 'frigates'}`)

export const EXITING = chalk.cyan('Mariner exiting...')
