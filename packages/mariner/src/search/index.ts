import { type Path } from 'glob'
import { getMarineConfigPaths } from './glob'
import { FILES } from '../constants'
import { getJsonFileSync } from '../utils/json'
import { slugify } from '../utils/slugify'

export type MarineSearch = {
  path: Path
  root: string
  valid: boolean
  name: string
}

const getMarineConfig = (path: Path): MarineSearch => {
  const parent = path.parent?.fullpath() || '/'

  const hasEntryFile = !!path.readdirSync().find(({ name }) => name === FILES.entry)

  const packageJson = getJsonFileSync(`${parent}/package.json`)

  const name = slugify(packageJson?.name || path.parent?.name) || 'app'

  return {
    path,
    root: parent,
    name,
    valid: hasEntryFile,
  }
}

export const getMarineConfigs = async (): Promise<MarineSearch[]> => {
  const rawMarineConfigs = await getMarineConfigPaths()

  return rawMarineConfigs.map(getMarineConfig)
}
