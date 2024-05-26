import { defineMarinerConfig } from 'mariner-io'

export default defineMarinerConfig({
  mariner: 'shared',
  plugins: [],
  build: {
    rollupOptions: {
      external: ['vue'],
    },
  },
})
