import { defineConfig, splitVendorChunkPlugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import devManifest from 'vite-plugin-dev-manifest'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), devManifest(), splitVendorChunkPlugin()],
  build: {
    polyfillModulePreload: false,
    manifest: true,
    rollupOptions: {
      input: `navigator.ts`,
      // output: {
      //   assetFileNames: '[name].[ext]',
      //   entryFileNames: '[name].js',
      // },
    },
  },
})
