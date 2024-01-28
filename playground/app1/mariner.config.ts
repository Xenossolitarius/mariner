import { defineMarinerConfig } from 'mariner'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig({
  mariner: 'app1',
  plugins: [vue()],
})
