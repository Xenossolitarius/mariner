import path from 'node:path'

/**
 * Finds the longest common ancestor directory of a set of absolute paths.
 */
export const findCommonRoot = (roots: string[]): string => {
  if (roots.length === 0) return process.cwd()
  if (roots.length === 1) return roots[0]

  const segments = roots.map((r) => r.split(path.sep))
  const minLength = Math.min(...segments.map((s) => s.length))

  const common: string[] = []
  for (let i = 0; i < minLength; i++) {
    const segment = segments[0][i]
    if (segments.every((s) => s[i] === segment)) {
      common.push(segment)
    } else {
      break
    }
  }

  return common.join(path.sep) || path.sep
}
