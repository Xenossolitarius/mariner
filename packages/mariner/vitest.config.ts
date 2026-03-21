import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/__integration__/**', '**/__build-integration__/**', '**/index.ts'],
      all: false,
    },
  },
})
