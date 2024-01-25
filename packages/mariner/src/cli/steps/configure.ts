import { mode as showMode } from './mode'
import { setup } from './setup'
import { select } from './select'
import { ServerCommandOptions } from '../commands/shared/server'

export const configure = async (options: ServerCommandOptions) => {
  showMode(options.mode)

  const configs = await setup(options)

  const projects = await select(configs, options)

  return projects
}
