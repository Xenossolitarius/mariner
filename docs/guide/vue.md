# Vue Guide

Mariner provides first-class support for Vue microfrontends through the `createVueNavigator` helper.

## Creating a Vue Navigator

Use `createVueNavigator` from `mariner-fe/navigator` to wrap your Vue app and export it as a navigator.

```ts
// navigator.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVueNavigator } from 'mariner-fe/navigator'
import App from './App.vue'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

export const navigator = createVueNavigator(app)
export { pinia }
```

The `createVueNavigator(app)` call takes your Vue app instance and returns a navigator object that Mariner uses to mount and unmount the microfrontend.

## Cross-App Imports

You can import exports from other microfrontends using the `navigator:` prefix. For example, to reuse a shared Pinia instance from a `shared` app:

```ts
import { pinia } from 'navigator:shared'

const app = createApp(App)
app.use(pinia)
```

This virtual module syntax is resolved by Mariner at build time and dev time. The imported values are whatever the other app exports from its `navigator.ts`.

::: tip
Cross-app imports work in both dev and build modes. In dev mode, each app runs on its own Vite dev server, and Mariner resolves the virtual modules across servers.
:::

## Using `useCargo()`

The `useCargo()` composable works inside Vue components with `<script setup>`:

```vue
<script setup lang="ts">
import { useCargo } from 'mariner-fe/navigator'

const cargo = useCargo<{ userId: string }>()
</script>

<template>
  <div>User: {{ cargo.userId }}</div>
</template>
```

`useCargo()` provides access to data passed to the microfrontend when it is mounted, enabling communication from the host page to the app.

## CSS Handling

In build mode, styles are automatically injected into the DOM by `vite-plugin-css-injected-by-js`. You do not need to manually link any CSS files -- built navigator bundles include their styles inline.

::: info
In dev mode, Vite handles CSS via its standard HMR mechanism. No extra configuration is needed.
:::

## Tailwind CSS 4

To use Tailwind CSS 4 in a Vue microfrontend, add the `@tailwindcss/vite` plugin to your Mariner config:

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineMarinerConfig({
  mariner: 'my-app',
  plugins: [vue(), tailwindcss()],
})
```

Then import Tailwind in your app's CSS entry point as usual:

```css
@import 'tailwindcss';
```
