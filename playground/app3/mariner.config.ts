import { defineMarinerConfig } from 'mariner'
import react from '@vitejs/plugin-react'

export default defineMarinerConfig({  
    mariner: 'app3',
    plugins: [react()],
})
