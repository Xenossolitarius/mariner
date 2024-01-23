import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: ['src/index'],
  externals: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
})
