import { type UserConfig, defineConfig, splitVendorChunkPlugin } from 'vite'
import { defu } from 'defu'
import { FILES } from '../constants'

export type MarinerUserConfig = {
  /**
   * Mariner project actual name, most of the naming is permissive because will be slugified
   */
  mariner: string
  /**
   * Force mount id
   * @default 'some unusable template'
   */
  mountId?: string
} & UserConfig

const getMarinerViteConfig = (): UserConfig => ({
  plugins: [splitVendorChunkPlugin()],
  build: {
    modulePreload: {
      polyfill: false,
    },
    manifest: true,
    rollupOptions: {
      input: FILES.navigator,
      preserveEntrySignatures: 'exports-only',
      output: {
        // format: 'esm',
      },
    },
  },
})

export const defineMarinerConfig = (marinerOptions: MarinerUserConfig) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return defineConfig(({ command, mode }) => {
    // console.log({ command, mode })
    // Mariner default config goes first because we don't want to overwrite it
    return defu(getMarinerViteConfig(), marinerOptions) as UserConfig
  })
}
