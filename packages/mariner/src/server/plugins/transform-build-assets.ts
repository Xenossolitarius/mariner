import type { Plugin } from 'vite'
import fs from 'fs/promises'
import crypto from 'crypto'
import path from 'path'

const HASH_LENGTH = 8

/**
 * Import and process .bin assets.
 */
export default function transformBuildAssets(base: string): Plugin {
  let publicDirPath = ''

  return {
    name: 'mariner-transform-build-assets',
    enforce: 'pre',

    configResolved({ publicDir }) {
      publicDirPath = publicDir
    },

    async load(id) {
      if (!isAssetFile(id)) return null

      // handle public
      if (id.includes('vite:asset:public')) {
        console.log(path.sep, id)
        id = id.replace('vite:asset:public' + path.sep, '')
        id = id.replace('\0', '') // remove virtual path
        id = path.join(publicDirPath, id)
      }

      const asset = await fs.readFile(id)
      const hash = generateHash(asset)
      const extname = path.extname(id)
      const basename = path.basename(id, extname)

      const fileName = `${basename}.${hash}${extname}`

      this.emitFile({
        type: 'asset',
        fileName: fileName,
        source: asset,
      })

      return `export default import.meta.resolve("${base}/${fileName}");`
    },
  }
}

function generateHash(asset: Buffer) {
  const hash = crypto.createHash('sha1')
  hash.update(asset)
  return hash.digest('base64url').substring(0, HASH_LENGTH)
}

function isAssetFile(id: string) {
  // Define a regular expression for asset file extensions
  const assetFileRegex =
    /\.(png|jpe?g|gif|svg|webp|ico|bmp|tiff?|jp2|avif|mp3|ogg|wav|flac|aac|mp4|webm|mkv|mov|avi|woff2?|eot|ttf|otf)$/i // Case-insensitive

  // Check if the file matches the asset file pattern
  return assetFileRegex.test(id)
}
