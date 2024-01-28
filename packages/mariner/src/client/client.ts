// declare const __BASE__: string
// declare const __SERVER_HOST__: string

// import env from './env'

console.debug('[mariner] connecting...')

const importMetaUrl = new URL(import.meta.url)

// console.log(__BASE__)
// console.log(importMetaUrl)
// console.log(__SERVER_HOST__)
// console.log(__DEFINES__)
// console.log(__MODE__)

/* EVENT EMIITER DEMO */

type EventHandler<T> = (data: T) => void

class EventEmitter<T> {
  private events: Map<string, EventHandler<T>[]> = new Map()

  on(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(handler)
  }

  emit(event: string, data: T): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }
}

// Example usage
const emitter = new EventEmitter<number>()

// Subscribe to an event
emitter.on('even', (data) => {
  console.log(`Even number received: ${data}`)
})

// Emit events
for (let i = 1; i <= 5; i++) {
  emitter.emit('even', i * 2)
}

export default { url: importMetaUrl, emitter }
