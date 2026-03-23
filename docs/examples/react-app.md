# React App Example

A React 18 microfrontend with `createReactNavigator`.

## Config

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import react from '@vitejs/plugin-react'

export default defineMarinerConfig({
  mariner: 'app3',
  plugins: [react()],
  build: {
    rolldownOptions: {
      external: ['react', 'react-dom'],
    },
  },
})
```

## Navigator

```ts
// navigator.ts
import { createReactNavigator } from 'mariner-fe/navigator'
import ReactDOM from 'react-dom/client'
import App from './src/App'

export const navigator = createReactNavigator(ReactDOM.createRoot, <App />)
```

## React Component

```tsx
// src/App.tsx
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Vite + React</h1>
      <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
    </div>
  )
}

export default App
```

## Mounting in HTML

React apps need the refresh runtime preamble for HMR in development:

```html
<script type="module">
  import RefreshRuntime from 'http://localhost:3000/app3/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>
<div id="app3"></div>
<script type="module">
  const { navigator } = await import('http://localhost:3000/app3/navigator.js')
  navigator.mount('app3')
</script>
```

::: tip
Note that React's `mount()` takes an element ID without the `#` prefix, unlike Vue which uses a CSS selector.
:::
