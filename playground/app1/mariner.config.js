import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig({
  mariner: 'app1',
  plugins: [vue()],
  build: {
    rollupOptions: {
      external: ['vue'],
    },
  },
})
