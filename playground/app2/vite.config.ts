import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const examplePlugin = () => {
  let config

  return {
    name: 'read-config',

    configResolved(resolvedConfig) {
      // store the resolved config
      config = resolvedConfig
      console.log(config)
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
  plugins: [vue(), examplePlugin()],
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
