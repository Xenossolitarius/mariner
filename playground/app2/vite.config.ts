import { defineConfig, splitVendorChunkPlugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import devManifest from 'vite-plugin-dev-manifest'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), devManifest(), cssInjectedByJsPlugin(), splitVendorChunkPlugin()],
  base: '/app',
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
