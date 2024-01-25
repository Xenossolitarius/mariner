import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

export function getDirname(importMetaUrl: string) {
  const __filename = fileURLToPath(importMetaUrl)
  return dirname(__filename)
}
