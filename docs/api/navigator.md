# Navigator API

Imported from `mariner-fe/navigator`.

## Navigator Type

The standard interface for all microfrontend entry points.

```ts
type Navigator = {
  mount: (id: string) => void
  unmount: () => void
}
```

## createVueNavigator

Wraps a Vue 3 app instance into a Navigator.

```ts
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'

const app = createApp(App)
export const navigator = createVueNavigator(app)
```

### Signature

```ts
function createVueNavigator(app: App<Element>): Navigator
```

Delegates `mount` to Vue's `app.mount()` and `unmount` to `app.unmount()`. The `id` parameter is a CSS selector (e.g., `'#app1'`).

## createReactNavigator

Wraps a React component into a Navigator using `createRoot`.

```ts
import { createReactNavigator } from 'mariner-fe/navigator'
import ReactDOM from 'react-dom/client'
import App from './src/App'

export const navigator = createReactNavigator(ReactDOM.createRoot, <App />)
```

### Signature

```ts
function createReactNavigator(rootFactory: typeof ReactDOM.createRoot, app: React.ReactNode): Navigator
```

Creates a React root on `mount()` using `document.getElementById(id)` (no `#` prefix). Calls `root.unmount()` on `unmount()`.

## useCargo

Returns server-side data from the app's `cargo.ts` file.

```ts
import { useCargo } from 'mariner-fe/navigator'

const data = useCargo<{ greeting: string; features: { darkMode: boolean } }>()
```

### Signature

```ts
function useCargo<T = any>(): T
```

### How it works

`useCargo()` is a compile-time function. It throws at runtime if not transformed by the cargo plugin. The `resolveCargo` Vite plugin replaces `useCargo()` calls with data from the `virtual:mariner-cargo` virtual module.

| Mode      | Replacement                                                                                |
| --------- | ------------------------------------------------------------------------------------------ |
| Dev       | `import __mariner_cargo__ from "virtual:mariner-cargo?root=..."` — data loaded per-request |
| Build     | Same virtual module import — data baked at build time                                      |
| SSR Build | `__MARINER_CARGO__` variable reference — injected by serve server per-request              |

### Usage in Vue components

Works inside `<script setup>` — the plugin runs after the Vue compiler:

```vue
<script setup lang="ts">
import { useCargo } from 'mariner-fe/navigator'

const data = useCargo<{ greeting: string }>()
</script>

<template>
  <div>{{ data?.greeting }}</div>
</template>
```

::: tip
`useCargo()` is a singleton per app. Every call returns the same data — the cargo function only runs once per request/build.
:::

## defineNavigator

Simple passthrough helper for type-safe navigator options.

```ts
function defineNavigator(options: NavigatorOptions): NavigatorOptions
```

This is a utility for custom navigator definitions outside of the Vue/React adapters.
