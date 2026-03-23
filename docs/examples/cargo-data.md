# Cargo Data Example

End-to-end example of server-side data injection using cargo.

## Step 1: Create cargo.ts

Place `cargo.ts` next to your `navigator.ts`. The `cargo` function runs on the server and can do anything Node.js can do.

```ts
// cargo.ts
export const cargo = async () => {
  // Fetch from an API
  const users = await fetch('https://api.example.com/users').then((r) => r.json())

  // Read environment variables
  const apiKey = process.env.API_KEY

  // Return any serializable data
  return {
    users,
    buildTime: new Date().toISOString(),
    features: { darkMode: true, beta: false },
  }
}
```

## Step 2: Use useCargo() in your app

Call `useCargo()` anywhere — in your navigator entry, in components, in nested modules.

```ts
// navigator.ts
import { createVueNavigator, useCargo } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'

export const cargo = useCargo()

const app = createApp(App)
export const navigator = createVueNavigator(app)
```

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { useCargo } from 'mariner-fe/navigator'

const data = useCargo<{
  users: { name: string }[]
  buildTime: string
  features: { darkMode: boolean }
}>()
</script>

<template>
  <div v-if="data?.features.darkMode" class="dark-mode">
    <p>Built at: {{ data.buildTime }}</p>
    <ul>
      <li v-for="user in data.users" :key="user.name">{{ user.name }}</li>
    </ul>
  </div>
</template>
```

## Step 3a: Development

```bash
mariner dev --all
```

In dev mode, cargo runs fresh on every page reload. Change the cargo function and refresh — new data immediately.

## Step 3b: Static build

```bash
mariner build --all
```

Cargo runs once at build time. The data is frozen into the navigator bundle. Good for config that doesn't change between deploys.

## Step 3c: Production serve (live data)

```bash
# Build with SSR flag — keeps cargo as a runtime reference
mariner build --all --ssr

# Start the production server
mariner serve --port 4200
```

The serve server runs your `cargo.ts` on every request and injects fresh data. Your users get up-to-date data without client-side loading spinners.

::: tip
The SSR + serve mode is ideal for data that changes between requests: feature flags, user-specific config, A/B test variants, real-time pricing.
:::

## How the data flows

| Mode                                    | cargo.ts runs      | Data location                      |
| --------------------------------------- | ------------------ | ---------------------------------- |
| `mariner dev`                           | Per page reload    | Virtual module (Vite transform)    |
| `mariner build`                         | Once at build time | Baked into navigator.js            |
| `mariner build --ssr` + `mariner serve` | Per HTTP request   | Prepended to navigator.js response |

In all three modes, `useCargo()` returns the same shape of data. Your app code doesn't need to change.
