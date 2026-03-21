import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'shared',
  plugins: [],
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
