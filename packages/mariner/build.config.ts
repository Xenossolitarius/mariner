import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([
  // Library entries (consumed by user code)
  {
    declaration: true,
    entries: [{ input: 'src/index' }, { input: 'src/navigator/index' }, { input: 'src/server/plugins/index' }],
    externals: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
  },
  // Workers (internal, no types needed)
  {
    declaration: false,
    entries: [{ input: 'src/server/build/worker' }, { input: 'src/server/generate-types/worker' }],
    externals: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
  },
  // CLI (standalone bundle, inline deps for portability)
  {
    declaration: false,
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
      'node:buffer',
      'node:child_process',
      'node:crypto',
      'node:fs',
      'node:fs/promises',
      'node:http',
      'node:https',
      'node:os',
      'node:path',
      'node:process',
      'node:url',
      'node:worker_threads',
    ],
  },
])
