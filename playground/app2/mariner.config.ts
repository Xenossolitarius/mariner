import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig({
  mariner: 'app2',
  plugins: [vue()],
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
