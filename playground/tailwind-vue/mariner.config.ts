import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineMarinerConfig({
  mariner: 'tailwind-vue',
  plugins: [vue(), tailwindcss()],
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
