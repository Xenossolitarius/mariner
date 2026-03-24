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

The `cargo` function has full Node.js access — you can fetch from APIs, query databases, read environment variables, or perform any server-side logic.

### Export Formats

The cargo file supports two export styles:

```ts
// Named export (preferred)
export const cargo = async () => ({ greeting: 'Hello' })

// Default export
export default async () => ({ greeting: 'Hello' })
```

Both are equivalent. If both are present, the named `cargo` export takes precedence.

### Return Value Requirements

The cargo function must return **JSON-serializable data**. The result is serialized with `JSON.stringify` and embedded into the navigator bundle or response.

```ts
// ✅ Valid return values
return { name: 'Alice', age: 30 } // objects
return [1, 2, 3] // arrays
return 'hello' // strings
return { nested: { deep: { value: true } } } // nested objects
return null // null

// ❌ Invalid return values (will fail or lose data)
return { handler: () => {} } // functions are not serializable
return { data: new Map() } // Map/Set are not serializable
return { ref: circularRef } // circular references throw
return { sym: Symbol('x') } // symbols are dropped
return { date: new Date() } // Date becomes a string (may be unexpected)
```

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

`useCargo()` works in any file within the project — `navigator.ts`, Vue components, React components, nested utility modules. The Mariner build plugin detects the call and transforms it.

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

This gives you full type safety when accessing cargo properties. The generic parameter is purely compile-time — it doesn't affect runtime behavior.

### Singleton Behavior

`useCargo()` is a **singleton per app**. No matter how many times or in how many files you call it, every call returns the same data. The cargo function only executes once per request (dev/serve) or once per build.

```ts
// navigator.ts
const cargo1 = useCargo() // same data

// src/App.vue
const cargo2 = useCargo() // same data — same reference
```

## How It Works Under the Hood

At build time, the `resolve-cargo` Vite plugin:

1. Finds every `useCargo()` call in your source files (including generic variants like `useCargo<T>()`)
2. Determines which project the file belongs to (by matching the file path against project roots)
3. Replaces `useCargo()` with an import from the virtual module `virtual:mariner-cargo`
4. The virtual module resolves to the cargo data (or a runtime reference in SSR mode)

### Transform Example

Your source code:

```ts
import { useCargo } from 'mariner-fe/navigator'
const data = useCargo<MyType>()
```

After the plugin transforms it:

```ts
import __mariner_cargo__ from 'virtual:mariner-cargo?root=/path/to/app'
const data = __mariner_cargo__
```

The `useCargo` import is removed and the call is replaced with the virtual module's default export.

::: info
Each app has its own cargo data. The plugin scopes cargo by project root, so there is no cross-contamination between microfrontends. Even when multiple apps are loaded on the same page, each gets its own module-scoped cargo constant.
:::

## Behavior Across Modes

| Mode                  | When cargo runs                                                                                   | Data delivery                                  | Use case                                                |
| --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| **Dev**               | Per request — cargo function is re-executed on each page load with cache busting (`?t=timestamp`) | Virtual module import (Vite transform)         | Development with live data                              |
| **Build**             | Once at build time — data is baked into the bundle as JSON                                        | Inlined in `navigator.js`                      | Static builds, data known at deploy time                |
| **SSR Build + Serve** | Per request in production — the serve server runs `cargo.ts` on each request                      | Prepended as `const __MARINER_CARGO__ = {...}` | Dynamic production data (user-specific, time-sensitive) |

### Dev Mode Details

In dev mode, the cargo plugin:

1. Finds the app's `cargo.ts` or `cargo.js` file
2. Dynamically imports it with a cache-busting timestamp: `import(cargoPath + '?t=' + Date.now())`
3. Calls the exported `cargo` function (or default export)
4. Serializes the result as `export default { ... }`
5. Returns this as the virtual module content

Every page reload triggers a fresh cargo execution, so you see updated data immediately when changing the cargo function.

### Build Mode Details (Non-SSR)

During a regular build:

1. The cargo function runs once at build time
2. The returned data is JSON-stringified
3. The virtual module becomes `export default {"greeting":"Hello",...}`
4. This is inlined into the navigator bundle

The data is **frozen at build time**. Changing the cargo function requires a rebuild.

### SSR Mode Details

With `--ssr`:

1. The `useCargo()` call is replaced with a reference to the `__MARINER_CARGO__` constant
2. The cargo function is **not** executed during the build
3. Instead, `cargo.ts` is built separately to `dist/{appname}/cargo.js`
4. The serve server imports and runs `cargo.js` on each request
5. The result is prepended to the navigator response:

```js
// What the browser receives:
const __MARINER_CARGO__ = { greeting: 'Hello', timestamp: 1711234567890 }
// ... rest of navigator.js bundle
```

::: tip
The cargo constant is **module-scoped**, not placed on `globalThis`. This prevents data from leaking between navigators loaded on the same page.
:::

## Error Handling

### Cargo Function Throws

If the cargo function throws an error, the behavior depends on the mode:

| Mode  | Behavior                                                                                      |
| ----- | --------------------------------------------------------------------------------------------- |
| Dev   | `useCargo()` returns `null`. Error is logged to the terminal.                                 |
| Build | `useCargo()` returns `null`. Build continues without cargo data.                              |
| Serve | Navigator is served without `__MARINER_CARGO__` prepended. `useCargo()` receives `undefined`. |

In all cases, the app continues to function — cargo failures are non-fatal.

### Missing Cargo File

If `cargo.ts` does not exist:

- `useCargo()` returns `null`
- No error is thrown
- The app works normally without server-side data

### Defensive Coding

Always handle the case where cargo data might be missing:

```ts
const cargo = useCargo<MyData>()

// Use optional chaining and defaults
const greeting = cargo?.greeting ?? 'Welcome'
const darkMode = cargo?.features?.darkMode ?? false
```

## Cargo in Cross-App Imports

Cargo data can be exported from the navigator and consumed by other apps:

```ts
// app1/navigator.ts
export const cargo = useCargo<{ apiUrl: string }>()
```

```ts
// app2/navigator.ts
import { cargo } from 'navigator:app1'
console.log(cargo?.apiUrl) // access app1's cargo from app2
```

This is useful for sharing configuration or feature flags across microfrontends without duplicating the cargo function.

## Use Cases

| Scenario                     | Approach                                         |
| ---------------------------- | ------------------------------------------------ |
| Feature flags                | SSR + serve (per-request evaluation)             |
| User-specific config         | SSR + serve (read from auth context/cookies)     |
| API endpoints by environment | Build-time (different `.env` per environment)    |
| Static content (about page)  | Build-time (data doesn't change between deploys) |
| A/B test variants            | SSR + serve (random assignment per request)      |
| Build metadata (git hash)    | Build-time (frozen at deploy)                    |

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
