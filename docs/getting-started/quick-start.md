# Quick Start

This guide walks you through creating a Vue microfrontend with Mariner from scratch.

## 1. Set Up Your Project

Start with a new directory and install the required dependencies:

```bash
mkdir my-app && cd my-app
pnpm init
pnpm add mariner-fe vite vue
```

## 2. Create the Mariner Config

Every Mariner microfrontend needs a `mariner.config.ts` file at its root. This tells Mariner how to build and serve your app.

```ts
// mariner.config.ts
import vue from '@vitejs/plugin-vue'
import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'my-app',
  plugins: [vue()],
})
```

The `mariner` field is your app's unique name. It determines the URL path where your navigator module will be served.

## 3. Create the Navigator

The navigator is the entry point of your microfrontend. It exports the components and functions that other apps (or the host page) can consume.

```ts
// navigator.ts
import { createApp } from 'vue'
import { createVueNavigator } from 'mariner-fe/vue'
import App from './App.vue'

const app = createApp(App)
const navigator = createVueNavigator(app)

export { navigator }
```

Create a minimal Vue component to go with it:

```vue
<!-- App.vue -->
<template>
  <div>
    <h1>Hello from my-app</h1>
  </div>
</template>
```

## 4. Start the Dev Server

Run the Mariner dev server:

```bash
npx mariner dev
```

Your navigator module is now available at:

```
http://localhost:3000/my-app/navigator.js
```

::: tip
The URL pattern is always `/{appname}/navigator.js`, derived from the `mariner` field in your config.
:::

## 5. Mount in a Host Page

To consume the microfrontend, import the navigator module from any HTML page:

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="app"></div>

    <script type="module">
      import { navigator } from 'http://localhost:3000/my-app/navigator.js'

      navigator.mount('#app')
    </script>
  </body>
</html>
```

::: info
In production, you would point to the built navigator asset rather than the dev server URL. Use `mariner build` to generate production-ready output.
:::

## 6. Import from Other Apps

Once you have multiple microfrontends, they can import from each other using the `navigator:` virtual module syntax:

```ts
import { pinia } from 'navigator:shared'
```

This allows explicit, type-safe cross-app communication without global variables or custom events.

## Next Steps

- Learn about [Project Structure](./project-structure) to understand how Mariner organizes your code.
