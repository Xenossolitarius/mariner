import type { MarinerOptions, MarinerProject } from '../setup'
import type { ServerCommandOptions } from '../cli/commands/shared/server'
import { createDevServer } from '.'
import { createBuildServer } from './build'

export type ServerOptions = {
  setup: MarinerOptions
  projects: MarinerProject[]
  commands: ServerCommandOptions & DevCommandOptions
}

export type DevCommandOptions = {
  port?: number | undefined
  hostname?: string | undefined
  https?: true | undefined
}

export type BuildCommandOptions = {
  // on build
}

export const createServer = (options: ServerOptions) => {
  if (options.commands.command === 'serve') {
    return createDevServer(options)
  }

  return createBuildServer(options)
}
