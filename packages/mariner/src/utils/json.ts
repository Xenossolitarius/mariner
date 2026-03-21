import fs from 'node:fs/promises'

export const getJSON = async <T>(filePath: string, onError?: () => void) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
  } catch {
    onError && onError()
    return null
  }
}
