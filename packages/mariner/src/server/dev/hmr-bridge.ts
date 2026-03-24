import path from 'node:path'
import type { AppRoute } from './dev'
import type { MarinerProject } from '../../setup'

/**
 * Sets up cross-app HMR: when a navigator file changes in one Vite server,
 * all other Vite servers send a full-reload to their connected clients.
 *
 * This is needed in isolated mode where each app has its own Vite instance.
 * Without this bridge, changing `shared/navigator.ts` would only reload the
 * shared app — consuming apps like app1 would keep stale imports until a
 * manual refresh.
 */
export const setupCrossAppHmr = (routes: AppRoute[], projects: MarinerProject[]) => {
  // Build set of absolute navigator file paths across all projects
  const navigatorPaths = new Set(
    projects.filter((p) => p.navigator).map((p) => path.normalize(path.resolve(p.root, p.navigator!))),
  )

  // Deduplicate Vite instances (shared fleet routes share the same one)
  const uniqueVites = [...new Set(routes.map((r) => r.vite))]

  if (uniqueVites.length < 2) return

  for (const vite of uniqueVites) {
    if (!vite.watcher) continue

    vite.watcher.on('change', (changedFile: string) => {
      if (!navigatorPaths.has(path.normalize(changedFile))) return

      // Notify all OTHER Vite instances to reload their clients
      for (const other of uniqueVites) {
        if (other !== vite) {
          other.ws.send({ type: 'full-reload' })
        }
      }
    })
  }
}
