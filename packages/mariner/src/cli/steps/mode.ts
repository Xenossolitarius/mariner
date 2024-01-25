import { SELECTED_MODE_MESSAGE } from '../messages'

export const mode = (mode?: string) => {
  mode && console.log(SELECTED_MODE_MESSAGE(mode))
}
