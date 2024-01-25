import { defineConfig, splitVendorChunkPlugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import devManifest from 'vite-plugin-dev-manifest'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const examplePlugin = () => {
  let config

  return {
    name: 'read-config',

    configResolved(resolvedConfig) {
      // store the resolved config
      config = resolvedConfig
      console.log(config.resolve.alias)
    },

    // use stored config in other hooks
    transform(code, id) {
      if (config.command === 'serve') {
        // dev: plugin invoked by dev server
      } else {
        // build: plugin invoked by Rollup
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), devManifest(), cssInjectedByJsPlugin(), splitVendorChunkPlugin(), examplePlugin()],
  //  base: '/app',
  build: {
    modulePreload: {
      polyfill: false,
    },
    manifest: true,
    rollupOptions: {
      input: `navigator.ts`,
      preserveEntrySignatures: 'exports-only',
      output: {
        // format: 'esm',
      },
    },
  },
})
