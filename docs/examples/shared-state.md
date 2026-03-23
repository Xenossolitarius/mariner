# Shared State Example

Cross-app state sharing using a pinia store exposed via `navigator:shared`.

## The shared navigator

The `shared` app exports a pinia instance and a counter store for other apps to consume.

```ts
// shared/navigator.ts
import { createPinia } from 'pinia'
import { defineStore } from 'pinia'

export const pinia = createPinia()

export const useCounter = defineStore('counter', {
  state: () => ({ counter: 0 }),
  actions: {
    update() {
      this.counter++
    },
  },
})
```

```ts
// shared/mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'shared',
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
```

::: info
The shared navigator has no `mount`/`unmount` — it only exports data and stores for other apps to import.
:::

## Consuming from another app

```ts
// app1/navigator.ts
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'
import { pinia } from 'navigator:shared'

const app = createApp(App)
app.use(pinia)

export const navigator = createVueNavigator(app)
```

```vue
<!-- app1/src/components/HelloWorld.vue -->
<script setup lang="ts">
import { useCounter } from 'navigator:shared'

const counterStore = useCounter()
</script>

<template>
  <button @click="counterStore.update">Shared count is {{ counterStore.counter }}</button>
</template>
```

## How it works

1. `navigator:shared` resolves to `/shared/navigator.js` at runtime
2. Both apps import the same module URL — the browser caches it as a singleton
3. The pinia instance is shared, so store state is synchronized across all apps on the page

## Multiple apps on one page

When two Vue apps both use `navigator:shared`, they share the same pinia instance. Clicking a counter in one app updates the counter in the other:

```html
<div id="app1"></div>
<div id="tailwind-vue"></div>
<script type="module">
  const [{ navigator: nav1 }, { navigator: navTw }] = await Promise.all([
    import('/app1/navigator.js'),
    import('/tailwind-vue/navigator.js'),
  ])
  nav1.mount('#app1')
  navTw.mount('#tailwind-vue')
</script>
```

Both apps see the same `useCounter()` state because the browser deduplicates the `/shared/navigator.js` import.
