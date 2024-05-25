import { defineMarinerConfig } from 'mariner'

export default defineMarinerConfig({
  mariner: 'shared',
  plugins: [],
  build: {
    rollupOptions: {
      external: ['vue'],
    },
  },
})
