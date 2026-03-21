import type { InlineConfig } from 'vite'
import type { ServerOptions } from '../..'
import path from 'node:path'

// Re-use Vite's bundled Rollup types via the build output shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OutputItem = { type: string; code?: string; imports?: string[]; fileName?: string; source?: any }

export type BuildResult = { output: OutputItem[] }

export function getChunk(result: BuildResult) {
  const chunk = result.output.find((o) => o.type === 'chunk')
  if (!chunk) throw new Error('No chunk found in build output')
  return chunk as OutputItem & { code: string; imports: string[] }
}

export function getAssets(result: BuildResult) {
  return result.output.filter((o) => o.type === 'asset')
}

export function createServerOptions(projects: Array<{ mariner: string; root: string }>, rootBase = ''): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: projects.map((p) => ({
      ...p,
      configFile: null,
      packageJson: null,
      isJs: false,
      isValid: true,
    })),
    commands: { command: 'build', mode: 'production', rootBase } as ServerOptions['commands'],
  } as ServerOptions
}

export function buildConfig(tmpDir: string, plugins: InlineConfig['plugins'] = []): InlineConfig {
  return {
    root: tmpDir,
    logLevel: 'silent',
    publicDir: path.join(tmpDir, 'public'),
    plugins,
    build: {
      write: false,
      minify: false,
      outDir: path.join(tmpDir, 'dist'),
      rollupOptions: {
        input: path.join(tmpDir, 'entry.js'),
      },
    },
  }
}
