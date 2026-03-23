# Cargo (Server-Side Data)

**Cargo** is Mariner's mechanism for injecting server-side data into microfrontends. A `cargo.ts` file next to your `navigator.ts` exports an async function that runs on the server. The returned data is made available to your app via `useCargo()`.

## Defining Cargo

Create a `cargo.ts` (or `cargo.js`) in your app root, alongside `navigator.ts`:

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

The `cargo` function has full Node.js access -- you can fetch from APIs, query databases, read environment variables, or perform any server-side logic.

## Consuming Cargo with `useCargo()`

Import `useCargo` from `mariner-fe/navigator` and call it anywhere in your app:

```ts
// navigator.ts
import { createVueNavigator, useCargo } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import App from './src/App.vue'

export const cargo = useCargo()

const app = createApp(App)
export const navigator = createVueNavigator(app)
```

`useCargo()` works in any file within the project -- `navigator.ts`, Vue components, nested utility modules. The Mariner build plugin detects the call and transforms it.

### TypeScript Generics

Type the return value with a generic parameter:

```ts
type CargoData = {
  greeting: string
  timestamp: number
  features: { darkMode: boolean; beta: boolean }
}

export const cargo = useCargo<CargoData>()
```

## How It Works Under the Hood

At build time, the `resolve-cargo` Vite plugin:

1. Finds every `useCargo()` call in your source files
2. Determines which project the file belongs to
3. Replaces `useCargo()` with an import from the virtual module `virtual:mariner-cargo`
4. The virtual module resolves to the cargo data (or a runtime reference in SSR mode)

::: info
Each app has its own cargo data. The plugin scopes cargo by project root, so there is no cross-contamination between microfrontends.
:::

## Behavior Across Modes

| Mode                  | When cargo runs                                                                                    | Use case                                                |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Dev**               | Per request -- cargo function is re-executed on each page load with cache busting (`?t=timestamp`) | Development with live data                              |
| **Build**             | Once at build time -- data is baked into the bundle as JSON                                        | Static builds, data known at deploy time                |
| **SSR Build + Serve** | Per request in production -- the serve server runs `cargo.ts` on each request                      | Dynamic production data (user-specific, time-sensitive) |

## SSR Mode

When you build with the `--ssr` flag, `useCargo()` is not replaced with static JSON. Instead, it resolves to a reference to the `__MARINER_CARGO__` constant. At serve time, the server:

1. Imports and executes your `cargo.js` on each request
2. Prepends `const __MARINER_CARGO__ = { ... };` to the navigator response
3. The navigator code reads the constant as a module-scoped variable

```ts
// What the browser receives:
const __MARINER_CARGO__ = { greeting: 'Hello', timestamp: 1711234567890 }
// ... rest of navigator.js
```

::: tip
The cargo constant is **module-scoped**, not placed on `globalThis`. This prevents data from leaking between navigators loaded on the same page.
:::

See [Serve Mode](./serve-mode) for the full production workflow.

## File Structure

```
my-app/
  mariner.config.ts
  navigator.ts       # exports navigator + useCargo()
  cargo.ts           # exports cargo = async () => ({ ... })
  src/
    App.vue
```

::: warning
If `cargo.ts` does not exist or does not export a valid function, `useCargo()` will return `null`. Make sure the file exports either a named `cargo` function or a default export.
:::
