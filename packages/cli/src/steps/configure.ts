import { mode as configureMode } from './mode'
import { search } from './search'
import { select } from './select'
export const configure = async (mode?: string) => {
  configureMode(mode)
  const configs = await search()

  return await select(configs)
}
