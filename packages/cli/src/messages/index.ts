import chalk from 'chalk'
import { MarinerProjectData } from 'mariner'

export const ENLISTING_NAVIGATORS = 'Enlisting navigators...'

export const NO_NAVIGATORS_FOUND = chalk.bold.red('No navigators found!')

export const NO_SELECTED_NAVIGATORS = chalk.bold.cyan('\nNo selected navigators. ')

export const NAVIGATORS_FOUND = (navigators: unknown[]) =>
  chalk.bold.green(`Found ${navigators.length} ${navigators.length === 1 ? 'navigator' : 'navigators'}`)

export const SELECT_NAVIGATORS = 'Select navigators'

export const EXITING = chalk.cyan('Mariner exiting...')

export const INVALID_NAVIGATOR_REASON = (projectData: MarinerProjectData) =>
  !projectData.hasNavigator ? `Missing navigator` : !projectData.hasPackageJson ? 'Missing package.json' : 'Unknown'

export const MARINER_DESCRIPTION = 'Sail - Mariner CLI tool for building Micro Frontends'

export const STARTING_DEV_SERVER = chalk.cyan.bold('Starting dev server...')

export const STARTING_BUILD = chalk.cyan.bold('Building...')

export const SELECTED_MODE_MESSAGE = (mode?: string) => mode && chalk.cyan(`Selected mode: ${mode}`)
