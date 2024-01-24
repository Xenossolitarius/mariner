import { defineMarinerConfig } from 'mariner'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig(
  {
    name: 'App2',
  },
  {
    plugins: [vue()],
  },
)