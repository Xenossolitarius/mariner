import { type Path } from 'glob'
import { getSailConfigPaths } from './glob'
import { FILES } from '../constants'
import { getJsonFileSync } from '../utils/json'
import { slugify } from '../utils/slugify'

export type FrigateSearch = {
  path: Path
  root: string
  valid: boolean
  name: string
}

const getSailConfig = (path: Path): FrigateSearch => {
  const parent = path.parent?.fullpath() || '/'

  const hasEntryFile = !!path.readdirSync().find(({ name }) => name === FILES.entry)

  const packageJson = getJsonFileSync(`${parent}/package.json`)

  const name = slugify(packageJson?.mariner?.name || packageJson?.name || path.parent?.name) || 'app'

  return {
    path,
    root: parent,
    name,
    valid: hasEntryFile,
  }
}

export const getFrigates = async (): Promise<FrigateSearch[]> => {
  const rawSailsConfigs = await getSailConfigPaths()

  const sailConfigs = rawSailsConfigs.map(getSailConfig)

  return sailConfigs
}
