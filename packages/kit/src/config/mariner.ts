import { type UserConfig, defineConfig } from 'vite'
import { SailTypes, type SailType } from '../enums'
import { defu } from 'defu'
import { FILES } from '../constants'

export type MarinerConfig = {
  name: string
  mountId?: string
  type?: SailType
}

export const SAIL_DEFAULTS = {
  mountId: 'app',
  type: SailTypes.VUE, // for now...not really hard to get everything up and going :D
}

const getViteConfig = (/* marinerConfig: MarinerConfig */): UserConfig => {
  return {
    build: {
      manifest: true,
      rollupOptions: {
        input: `./${FILES.entry}`,
      },
    },
  }
}

export const defineMarinerConfig = (options: MarinerConfig, vite: UserConfig = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sailSettings = defu(options, SAIL_DEFAULTS)

  console.log(sailSettings)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return defineConfig(({ command, mode }) => {
    return defu(vite, getViteConfig(), { mariner: sailSettings })
  })
}
