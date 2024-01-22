import fs from 'node:fs'

export const getJsonFileSync = (filePath: string) => {
  try {
    const jsonData = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(jsonData)
  } catch (error) {
    const e = error as Error
    console.error(`Error reading JSON file synchronously: ${e.message}`)
    return null
  }
}
