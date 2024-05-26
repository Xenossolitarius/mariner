import { parentPort } from 'worker_threads'
import { generateTypes } from './generate-types'
import type { TaskPayload } from '../worker-pool'

parentPort?.on('message', async ({ options, project }: TaskPayload) => {
  await generateTypes(options, project)

  parentPort?.postMessage(undefined)
})
