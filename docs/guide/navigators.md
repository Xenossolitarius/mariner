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

- `mount(id)` -- attaches the app to a DOM element.
- `unmount()` -- removes the app and cleans up.

## Creating a Navigator File

Place a `navigator.ts` (or `navigator.js`) at the root of your microfrontend. It must export a named `navigator` binding:

```ts
// navigator.ts
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'

const app = createApp(App)

export const navigator = createVueNavigator(app)
```

## Framework Adapters

Mariner ships two adapters that wrap framework-specific lifecycle into the standard navigator interface.

### Vue -- `createVueNavigator`

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

### React -- `createReactNavigator`

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

::: warning
Vue uses a CSS selector (`'#app1'`), while React uses a plain element ID (`'app3'`). Passing the wrong format will cause a silent failure.
:::

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

## Exporting Additional Values

A navigator file can export more than just `navigator`. Any named export becomes available to other microfrontends through [virtual modules](./virtual-modules):

```ts
// shared/navigator.ts
import { createPinia } from 'pinia'

export const pinia = createPinia()
export const navigator = createVueNavigator(app)
```

Other apps can then import these exports:

```ts
import { pinia } from 'navigator:shared'
```

::: tip
Keep navigator files lean. Heavy initialization logic should live in your app's components, not at the module top level.
:::
