import { mode as showMode } from './mode'
import { setup } from './setup'
import { select } from './select'
import { ServerCommandOptions } from '../commands/shared/server'

export const configure = async (commands: ServerCommandOptions) => {
  showMode(commands.mode)

  const setupData = await setup(commands)

  const projects = await select(setupData, commands)

  return { setup: setupData, projects, commands }
}
