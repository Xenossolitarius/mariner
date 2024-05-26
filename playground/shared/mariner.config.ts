import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'shared',
  plugins: [],
  build: {
    rollupOptions: {
      external: ['vue'],
    },
  },
})
