import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    //core
    { input: 'src/index' },
    //navigator
    { input: 'src/navigator/index' },
  ],
  externals: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
})
