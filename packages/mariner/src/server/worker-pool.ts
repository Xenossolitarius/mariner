import { Worker } from 'node:worker_threads'

import { join } from 'node:path'
import os from 'node:os'
import { ServerOptions } from './server'
import { MarinerProject } from '../setup'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const scriptPath = () => globalThis.marinerCliEntry

export type TaskPayload = {
  options: ServerOptions
  project: MarinerProject
}

type Task = {
  taskData: TaskPayload
  resolve: () => void
}

class WorkerPool {
  private workers: Worker[]
  private tasks: Task[] = []
  private availableWorkers: Worker[]

  constructor(path: string, size?: number) {
    this.workers = []
    this.availableWorkers = []

    const workerNum = size ?? Math.min(Math.floor(os.cpus().length / 2), 4) // default half cores or at least 4

    console.log(`Working with ${workerNum} threads`)

    for (let i = 0; i < workerNum; i++) {
      const worker = new Worker(join(scriptPath(), path))
      worker.on('message', () => {
        this.handleWorkerAvailable(worker)
      })
      this.workers.push(worker)
      this.availableWorkers.push(worker)
    }
  }

  private handleWorkerAvailable(worker: Worker) {
    const task = this.tasks.shift()
    if (task) {
      worker.once('message', task.resolve)
      worker.postMessage(task.taskData)
    } else {
      this.availableWorkers.push(worker)
    }
  }

  private next() {
    if (this.availableWorkers.length > 0 && this.tasks.length > 0) {
      const worker = this.availableWorkers.shift()
      if (worker) {
        this.handleWorkerAvailable(worker)
      }
    }
  }

  run(taskData: TaskPayload): Promise<void> {
    return new Promise((resolve) => {
      // remove unserializable data
      this.tasks.push({ taskData: JSON.parse(JSON.stringify(taskData)), resolve })
      this.next()
    })
  }

  async close() {
    await Promise.all(this.workers.map((worker) => worker.terminate()))
  }
}

export default WorkerPool
