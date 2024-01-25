import chalk from 'chalk'
import { MarinerProject } from '../../setup'

export const ENLISTING_NAVIGATORS = 'Enlisting navigators...'

export const NO_NAVIGATORS_FOUND = chalk.bold.red('No navigators found!')

export const NO_SELECTED_NAVIGATORS = chalk.bold.cyan('\nNo selected navigators. ')

export const NAVIGATORS_FOUND = (navigators: unknown[]) =>
  chalk.bold.green(`Found ${navigators.length} ${navigators.length === 1 ? 'navigator' : 'navigators'}`)

export const SELECT_MARINERS = 'Select mariners'

export const EXITING = chalk.cyan('Mariner exiting...')

export const INVALID_NAVIGATOR_REASON = (projectData: MarinerProject) =>
  !projectData.files.navigator ? `Missing navigator` : !projectData.packageJson ? 'Missing package.json' : 'Unknown'

export const MARINER_DESCRIPTION = 'Sail - Mariner CLI tool for building Micro Frontends'

export const STARTING_DEV_SERVER = chalk.cyan.bold('Starting dev server...')

export const STARTING_BUILD = chalk.cyan.bold('Building...')

export const SELECTED_MODE_MESSAGE = (mode?: string) => mode && chalk.cyan(`Selected mode: ${mode}`)

export const FOUND_FLEET_CONFIG = chalk.green.bold('Found fleet config')

export const MARINER_LOADED = chalk.green.bold('Mariner loaded')

export const DISPATCH_ENTIRE_FLEET = chalk.blue.bold('Dispatching entire fleet')

export const USING_ALL_IGNORING_SELECTION = chalk.yellow.bold(`Using 'all'. Ignoring all other selection `)

export const IGNORING_FLEET_NO_CONFIG = chalk.yellow.bold('Ignoring fleet option, no fleet config found')

export const SELECT_FLEET = 'Select fleet'

export const RUN_SINGLE_NAVIGATOR = chalk.cyan.bold('Selecting one navigator')
