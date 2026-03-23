# React Guide

Mariner supports React microfrontends through the `createReactNavigator` helper.

## Creating a React Navigator

Use `createReactNavigator` from `mariner-fe/navigator` to export your React app as a navigator.

```tsx
// navigator.tsx
import ReactDOM from 'react-dom/client'
import { createReactNavigator } from 'mariner-fe/navigator'
import App from './App'

export const navigator = createReactNavigator(ReactDOM.createRoot, <App />)
```

The first argument is the `createRoot` function from `react-dom/client`, and the second is your root JSX element. Mariner handles mounting and unmounting the React root for you.

## Mounting

When mounting a React navigator, pass the element ID without the `#` prefix:

```ts
navigator.mount('app3')
```

This targets the DOM element with `id="app3"`.

::: warning
Pass the plain element ID string, not a CSS selector. Using `'#app3'` will not work.
:::

## HMR and the Refresh Preamble

React apps require the refresh runtime preamble for Hot Module Replacement to work in dev mode. Mariner injects this automatically when it detects a React app, but your Mariner config must include the React plugin:

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import react from '@vitejs/plugin-react'

export default defineMarinerConfig({
  mariner: 'my-react-app',
  plugins: [react()],
})
```

::: tip
If HMR is not working in your React app, verify that `@vitejs/plugin-react` is included in your config's `plugins` array.
:::

## Cross-App Imports

Cross-app imports work identically to Vue apps. Use the `navigator:` prefix to import exports from other microfrontends:

```tsx
import { someUtil } from 'navigator:shared'
```

These virtual modules are resolved by Mariner in both dev and build modes.

## Full Example

```tsx
// navigator.tsx
import ReactDOM from 'react-dom/client'
import { createReactNavigator } from 'mariner-fe/navigator'

function App() {
  return <div>Hello from React</div>
}

export const navigator = createReactNavigator(ReactDOM.createRoot, <App />)
```

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import react from '@vitejs/plugin-react'

export default defineMarinerConfig({
  mariner: 'my-react-app',
  plugins: [react()],
})
```
