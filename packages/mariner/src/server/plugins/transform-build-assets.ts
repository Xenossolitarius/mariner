import type { Plugin } from 'vite'
import fs from 'fs/promises'
import crypto from 'crypto'
import path from 'node:path'
import { ServerOptions } from '..'

const HASH_LENGTH = 8

/**
 * Import and process .bin assets.
 */
export const transformBuildAssets = (base: string, options: ServerOptions): Plugin => {
  let publicDirPath = ''

  const rootBasePath = options.commands.rootBase ? `/${options.commands.rootBase}` : ''

  return {
    name: 'mariner-transform-build-assets',
    enforce: 'pre',

    configResolved({ publicDir }) {
      publicDirPath = publicDir
    },

    async load(id) {
      if (!isAssetFile(id)) return null

      // handle public dir assets
      if (id.includes('vite:asset:public')) {
        id = id.replace('vite:asset:public' + path.sep, '')
        id = id.replace('\0', '')
        id = path.join(publicDirPath, id)
      }

      // Vite 6 may pass absolute-looking public paths (e.g. /vite.svg)
      // Try resolving from publicDir if the file doesn't exist at the given path
      let asset: Buffer
      try {
        asset = await fs.readFile(id)
      } catch {
        if (publicDirPath) {
          try {
            id = path.join(publicDirPath, id)
            asset = await fs.readFile(id)
          } catch {
            return null // let Vite handle it
          }
        } else {
          return null
        }
      }
      const hash = generateHash(asset)
      const extname = path.extname(id)
      const basename = path.basename(id, extname)

      const fileName = `${basename}.${hash}${extname}`

      this.emitFile({
        type: 'asset',
        fileName: fileName,
        source: asset,
      })

      return `export default import.meta.resolve("${rootBasePath}${base}/${fileName}");`
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
