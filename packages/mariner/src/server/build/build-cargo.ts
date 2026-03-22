import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { MARINER_ENV_PREFIX, FILES } from '../../constants'
import type { MarinerProject } from '../../setup'

const resolveCargoEntry = (project: MarinerProject): string | null => {
  for (const ext of ['.ts', '.js']) {
    const entry = path.join(project.root, `${FILES.cargo}${ext}`)
    if (fs.existsSync(entry)) return entry
  }
  return null
}

export const buildCargo = async (project: MarinerProject, outDir: string) => {
  const entry = resolveCargoEntry(project)
  if (!entry) return

  await build({
    appType: 'custom',
    mode: 'production',
    envPrefix: MARINER_ENV_PREFIX,
    configFile: false,
    root: project.root,
    build: {
      outDir,
      emptyOutDir: false,
      modulePreload: { polyfill: false },
      rolldownOptions: {
        input: entry,
        output: {
          format: 'esm',
          entryFileNames: `${FILES.cargo}.js`,
        },
        preserveEntrySignatures: 'exports-only',
      },
    },
  })
}
