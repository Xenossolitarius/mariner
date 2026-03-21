import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/__integration__/**',
        '**/__build-integration__/**',
        '**/index.ts',
        'src/cli/main.ts',
        'src/cli/commands/**',
        'src/server/build/worker.ts',
        'src/server/generate-types/worker.ts',
        'src/server/worker-pool.ts',
        'src/setup/types.ts',
      ],
    },
  },
})
