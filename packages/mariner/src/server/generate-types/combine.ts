import fs from 'node:fs/promises'
import path from 'node:path'
import { FILES, NAVIGATOR_MODULE_PREFIX } from '../../constants'

async function readIndexFileContent(folderPath: string) {
  const indexPath = path.join(folderPath, 'index.d.ts')
  return fs.readFile(indexPath, 'utf-8')
}

async function findFoldersWithIndexDTS(rootDir: string) {
  const foldersWithIndexDTS = []
  const files = await fs.readdir(rootDir, { withFileTypes: true })
  for (const file of files) {
    if (file.isDirectory()) {
      const indexPath = path.join(rootDir, file.name, 'index.d.ts')
      try {
        await fs.access(indexPath)
        foldersWithIndexDTS.push(file.name)
      } catch (error) {
        // No index.d.ts file in this folder
      }
    }
  }
  return foldersWithIndexDTS
}

async function combineIndexDTS(rootDir: string, folders: string[]) {
  const combinedContent = []
  for (const folder of folders) {
    const folderPath = path.join(rootDir, folder)
    const content = await readIndexFileContent(folderPath)
    combinedContent.push(`declare module '${NAVIGATOR_MODULE_PREFIX}${folder}' {\n\n${transformContent(content)}\n}`)
  }
  return combinedContent.join('\n')
}

async function cleanFolders(rootDir: string, folders: string[]) {
  for (const folder of folders) {
    const folderPath = path.join(rootDir, folder)
    await fs.rm(folderPath, { recursive: true })
  }
}

const transformContent = (content: string) =>
  content
    .replaceAll('declare ', '') // remove declare
    .split('\n') // indent
    .map((line) => '  ' + line)
    .join('\n')

export const generateMarinerTypeFile = async () => {
  const rootDir = path.join(process.cwd(), FILES.typeDir)

  const foldersWithIndexDTS = await findFoldersWithIndexDTS(rootDir)
  if (foldersWithIndexDTS.length === 0) {
    console.log('Error: No types generated')
    return
  }
  const combinedContent = await combineIndexDTS(rootDir, foldersWithIndexDTS)
  const outputPath = path.join(rootDir, FILES.typeFile)
  await fs.writeFile(outputPath, combinedContent)
  await cleanFolders(rootDir, foldersWithIndexDTS)
  console.log('Mariner type file generated successfully.')
}
