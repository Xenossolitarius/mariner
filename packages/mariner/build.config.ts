import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([
  {
    declaration: true,
    entries: [
      //core
      { input: 'src/index' },
      //navigator
      { input: 'src/navigator/index' },
      // workers
      { input: 'src/server/build/worker' },
      { input: 'src/server/generate-types/worker' },
    ],
    externals: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
  },
  // cli
  {
    rollup: {
      inlineDependencies: true,
      resolve: {
        exportConditions: ['production', 'node'],
      },
    },
    entries: ['src/cli/index'],
    externals: [
      'vite',
      'fsevents',
      'node:url',
      'node:buffer',
      'node:path',
      'node:child_process',
      'node:process',
      'node:os',
    ],
  },
])
