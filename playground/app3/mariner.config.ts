import { defineMarinerConfig } from '@mariner/kit'
import react from '@vitejs/plugin-react'

export default defineMarinerConfig(
  {
    name: 'App3',
  },
  {
    plugins: [react()],
  },
)
