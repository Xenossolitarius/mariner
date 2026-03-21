import { defineConfig } from '@playwright/test'
import path from 'node:path'

const monorepoRoot = path.resolve(import.meta.dirname, '../..')
const cli = path.join(monorepoRoot, 'packages/mariner/src/cli/main.ts')

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  projects: [
    {
      name: 'dev-server',
      testMatch: 'dev-server.e2e.ts',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'built-client',
      testMatch: 'built-client.e2e.ts',
      use: {
        baseURL: 'http://localhost:4173',
      },
    },
    {
      name: 'dev-build-sync',
      testMatch: 'dev-build-sync.e2e.ts',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'html-snapshots',
      testMatch: 'html-snapshots.e2e.ts',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'screenshots',
      testMatch: 'screenshots.e2e.ts',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
  ],
  webServer: [
    {
      command: `npx tsx ${cli} dev --all`,
      cwd: monorepoRoot,
      url: 'http://localhost:3000/shared/navigator.js',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: `npx sirv ${path.join(monorepoRoot, 'dist')} --port 4173 --cors`,
      port: 4173,
      reuseExistingServer: true,
      timeout: 10000,
    },
  ],
})
