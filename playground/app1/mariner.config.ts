import { defineMarinerConfig } from '@mariner/kit'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig(
  {
    name: 'App1',
  },
  {
    plugins: [vue()],
  },
)
