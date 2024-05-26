import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    //core
    { input: 'src/index' },
    //navigator
    { input: 'src/navigator/index' },
    { input: 'src/server/build/worker' },
    { input: 'src/server/generate-types/worker' },
  ],
  externals: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
})
