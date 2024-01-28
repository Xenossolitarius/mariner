import path, { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CLIENT_PUBLIC_PATH = `/@vite/client`
export const ENV_PUBLIC_PATH = `/@vite/env`
export const MARINER_PACKAGE_DIR = resolve(
  // import.meta.url is `dist/node/constants.js` after bundle
  fileURLToPath(import.meta.url),
  '../../../..',
)

export const CLIENT_ENTRY = resolve(MARINER_PACKAGE_DIR, 'dist/client/client.mjs')
export const ENV_ENTRY = resolve(MARINER_PACKAGE_DIR, 'dist/client/env.mjs')
export const CLIENT_DIR = path.dirname(CLIENT_ENTRY)
