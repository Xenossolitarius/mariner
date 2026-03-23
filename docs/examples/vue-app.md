# Vue App Example

A complete Vue 3 microfrontend with pinia store integration and cargo data.

## Config

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig({
  mariner: 'app1',
  plugins: [vue()],
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
```

::: info
`external: ['vue']` ensures Vue is loaded from the importmap at runtime, not bundled into the navigator. This allows multiple Vue apps to share the same Vue instance.
:::

## Navigator

```ts
// navigator.ts
import { createVueNavigator, useCargo } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'
import { pinia } from 'navigator:shared'

export const cargo = useCargo()

const app = createApp(App)
app.use(pinia)

export const navigator = createVueNavigator(app)
```

## Cargo

```ts
// cargo.ts
export const cargo = async () => {
  return {
    greeting: 'Hello from server',
    timestamp: Date.now(),
    features: { darkMode: true, beta: false },
  }
}
```

## Component using cargo

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { useCargo } from 'mariner-fe/navigator'

const cargo = useCargo<{ greeting: string; features: { darkMode: boolean } }>()
</script>

<template>
  <div>
    <div>{{ cargo?.greeting }}</div>
    <div>darkMode: {{ cargo?.features?.darkMode }}</div>
  </div>
</template>
```

## Mounting in HTML

```html
<script type="importmap">
  { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
</script>
<div id="app1"></div>
<script type="module">
  const { navigator } = await import('http://localhost:3000/app1/navigator.js')
  navigator.mount('#app1')
</script>
```
