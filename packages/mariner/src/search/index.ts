import { type Path } from 'glob'
import { FILES } from '../constants'
import { getJsonFileSync } from '../utils/json'
import { slugify } from '../utils/slugify'

import { glob } from 'glob'

/**
 * Source of truth for assuming a Mariner project (yea not searching the json deps)
 */

export const getMarineConfigPaths = () =>
  glob(`**/${FILES.config}`, { ignore: ['node_modules/**', 'dist'], withFileTypes: true })

export type MarinerProjectData = {
  path: Path
  root: string
  name: string
  isValid: boolean
  hasNavigator: boolean
  hasPackageJson: boolean
}

const getMarineProjectData = (path: Path): MarinerProjectData => {
  const parent = path.parent?.fullpath() || '/'

  const hasNavigator = !!path.parent?.readdirSync().find(({ name }) => name === FILES.entry)

  const packageJson = getJsonFileSync(`${parent}/package.json`)

  const name = slugify(packageJson?.name || path.parent?.name) || 'app'

  return {
    path,
    root: parent,
    name,
    isValid: hasNavigator, // for now this is the only check
    hasNavigator,
    hasPackageJson: !!packageJson,
  }
}

export const getMarineProjects = async (): Promise<MarinerProjectData[]> => {
  const marineConfigPaths = await getMarineConfigPaths()

  return marineConfigPaths.map(getMarineProjectData)
}

type MarinerMode = {
  // implement global modes (global envs, configs)
}

type MarinerOptions = {
  projects: MarinerProjectData[]
  modes?: MarinerMode[]
}

export const getMarinerOptions = async (): Promise<MarinerOptions> => {
  const projects = await getMarineProjects()

  return {
    projects,
  }
}
