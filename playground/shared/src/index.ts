import './style.css'
import { createPinia, defineStore } from 'pinia'
console.debug('[global pinia] connecting...')

export const pinia = createPinia()

export const useCounter = defineStore('counter', {
  state: () => ({ counter: 0 }),
  actions: {
    update() {
      this.counter += 1
      console.log('update', this)
    },
  },
})

export * from 'pinia'
