import { defineBuildConfig } from 'obuild/config'

export default defineBuildConfig({
  entries: [
    // Library entries (consumed by user code) — with declarations
    {
      type: 'bundle',
      input: ['src/index.ts', 'src/navigator/index.ts', 'src/server/plugins/index.ts'],
      dts: true,
      rolldown: {
        external: ['vite', 'defu', 'vue', 'react', 'react-dom/client'],
      },
    },
    // Workers (internal, no types needed)
    {
      type: 'bundle',
      input: ['src/server/build/worker.ts', 'src/server/generate-types/worker.ts'],
      dts: false,
      rolldown: {
        external: ['vite', 'vite-plugin-dts', 'defu', 'vue', 'react', 'react-dom/client'],
      },
    },
    // CLI (standalone bundle, inline deps)
    {
      type: 'bundle',
      input: ['src/cli/index.ts'],
      dts: false,
      rolldown: {
        external: [
          'vite',
          'vite-plugin-dts',
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
    },
  ],
})
