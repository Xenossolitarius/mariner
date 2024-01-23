import { Navigator } from './adapters'

export type NavigatorOptions = {
  navigator: Navigator
}

export const defineNavigator = (options: NavigatorOptions) => options
