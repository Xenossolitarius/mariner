import { glob } from 'glob'
import { ignoreList } from './settings/ignore'

export const getSails = async () => {
  const rawSailsConfigs = await glob('**/sail.config.ts', { ignore: ignoreList })

  console.log(rawSailsConfigs)

  return []
}
