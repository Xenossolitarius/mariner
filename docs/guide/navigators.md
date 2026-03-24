# Navigators

A **navigator** is the entry point of a microfrontend. It exposes a standard `{ mount, unmount }` interface that the host page (or other microfrontends) use to render and tear down the app.

## The Navigator Type

Every navigator must conform to this shape:

```ts
type Navigator = {
  mount: (id: string) => void
  unmount: () => void
}
```

- `mount(id)` — attaches the app to a DOM element.
- `unmount()` — removes the app and cleans up.

## Creating a Navigator File

Place a `navigator.ts` (or `navigator.js`) at the root of your microfrontend, as a sibling of `mariner.config.ts`. It must export a named `navigator` binding:

```ts
// navigator.ts
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'

const app = createApp(App)

export const navigator = createVueNavigator(app)
```

::: warning
The navigator file **must** be in the same directory as `mariner.config.ts`. Mariner uses the config file location to find the navigator. Placing it in a subdirectory won't work.
:::

## Framework Adapters

Mariner ships two adapters that wrap framework-specific lifecycle into the standard navigator interface.

### Vue — `createVueNavigator`

```ts
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'

const app = createApp(App)
export const navigator = createVueNavigator(app)
```

`createVueNavigator(app)` delegates directly to Vue's `app.mount` and `app.unmount` methods. The `mount` argument is a **CSS selector**:

```ts
navigator.mount('#app1')
```

### React — `createReactNavigator`

```ts
import { createReactNavigator } from 'mariner-fe/navigator'
import { createRoot } from 'react-dom/client'
import App from './src/App'

export const navigator = createReactNavigator(createRoot, <App />)
```

`createReactNavigator(createRoot, component)` manages a `ReactDOM.Root` internally. The `mount` argument is an **element ID** (not a selector):

```ts
navigator.mount('app3')
```

It uses `document.getElementById(id)` internally, so the `#` prefix must be omitted.

::: warning
Vue uses a CSS selector (`'#app1'`), while React uses a plain element ID (`'app3'`). Passing the wrong format will cause a silent failure.
:::

### Plain JavaScript — Custom Navigator

For vanilla JavaScript or other frameworks, create a custom navigator object:

```ts
// navigator.ts
export const navigator = {
  mount(id: string) {
    const el = document.querySelector(id) ?? document.getElementById(id)
    if (el) {
      el.innerHTML = '<h1>Hello from vanilla JS</h1>'
    }
  },
  unmount() {
    // cleanup logic
  },
}
```

As long as the object has `mount(id: string)` and `unmount()` methods, it's a valid navigator. You can use any rendering approach — DOM manipulation, lit-html, Svelte, Solid, or anything else.

### `defineNavigator` Helper

For custom navigators, you can use `defineNavigator` for type-safe definitions:

```ts
import { defineNavigator } from 'mariner-fe/navigator'

export const navigator = defineNavigator({
  mount(id) {
    // id is typed as string
    document.getElementById(id)!.innerHTML = '<h1>Hello</h1>'
  },
  unmount() {
    // cleanup
  },
})
```

`defineNavigator` is a simple passthrough that provides TypeScript type inference without any runtime overhead.

## Mounting and Unmounting

The host page provides a container element, then calls `mount`:

```html
<div id="app1"></div>
<script type="module">
  import { navigator } from '/app1/navigator.js'
  navigator.mount('#app1')
</script>
```

When the microfrontend is no longer needed, call `unmount()` to clean up the DOM and release resources:

```ts
navigator.unmount()
```

### Multiple Mounts

You can mount multiple navigators on the same page:

```html
<div id="app1"></div>
<div id="app2"></div>
<div id="app3"></div>

<script type="module">
  const [{ navigator: nav1 }, { navigator: nav2 }, { navigator: nav3 }] = await Promise.all([
    import('/app1/navigator.js'),
    import('/app2/navigator.js'),
    import('/app3/navigator.js'),
  ])

  nav1.mount('#app1')
  nav2.mount('#app2')
  nav3.mount('app3') // React uses ID without #
</script>
```

## Exporting Additional Values

A navigator file can export more than just `navigator`. Any named export becomes available to other microfrontends through [virtual modules](./virtual-modules):

```ts
// shared/navigator.ts
import { createPinia, defineStore } from 'pinia'

export const pinia = createPinia()

export const useCounter = defineStore('counter', {
  state: () => ({ counter: 0 }),
  actions: {
    update() {
      this.counter++
    },
  },
})

export const navigator = createVueNavigator(app)
```

Other apps can then import these exports:

```ts
import { pinia, useCounter } from 'navigator:shared'
```

### Headless Navigators

Not every navigator needs to render UI. A "shared" or "utility" app can export only data, stores, or utilities without a meaningful mount/unmount:

```ts
// shared/navigator.ts
import { createPinia } from 'pinia'

export const pinia = createPinia()
export const API_BASE = 'https://api.example.com'

// Minimal navigator (required but doesn't render anything)
export const navigator = {
  mount() {},
  unmount() {},
}
```

This pattern is common for apps that exist solely to share dependencies across other microfrontends.

### Cargo Exports

You can also export cargo data for other apps to consume:

```ts
// app1/navigator.ts
import { useCargo, createVueNavigator } from 'mariner-fe/navigator'

export const cargo = useCargo<{ apiUrl: string }>()
export const navigator = createVueNavigator(app)
```

```ts
// app2/navigator.ts
import { cargo } from 'navigator:app1'
// cargo?.apiUrl is available here
```

## Star Re-exports

Using `export * from './src'` works but exposes your entire module surface:

```ts
// navigator.ts
export * from './src'
export const navigator = createVueNavigator(app)
```

While convenient, this makes every export from `src/index.ts` part of your public API. Prefer explicit named exports for a cleaner, more intentional API contract. Star re-exports also reduce tree-shaking effectiveness in shared builds.

::: tip
Keep navigator files lean. Heavy initialization logic should live in your app's components, not at the module top level. Code at the top level of `navigator.ts` runs when the module is imported — even if `mount()` is never called.
:::

## Navigator File Formats

| File              | Language   | Type generation | Notes                               |
| ----------------- | ---------- | --------------- | ----------------------------------- |
| `navigator.ts`    | TypeScript | Yes             | Preferred — full type safety        |
| `navigator.js`    | JavaScript | No              | Works but no cross-app type safety  |
| `navigator.tsx`   | —          | —               | Not supported — use `.ts` with JSX  |
| `navigator.mts`   | —          | —               | Not supported                       |

Only `.ts` and `.js` extensions are recognized by Mariner's project scanner.
