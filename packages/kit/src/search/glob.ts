import { glob } from 'glob'

import { FILES } from '../constants'

export const ignoreList = ['node_modules/**', 'dist']

export const getSailConfigPaths = () => {
  return glob(`../../**/${FILES.config}`, { ignore: ignoreList, withFileTypes: true })
}
