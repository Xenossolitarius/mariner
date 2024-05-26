import { parentPort } from 'worker_threads'
import { buildNavigator } from './build'
import type { TaskPayload } from '../worker-pool'

parentPort?.on('message', async ({ options, project }: TaskPayload) => {
  await buildNavigator(options, project)

  parentPort?.postMessage(undefined)
})
