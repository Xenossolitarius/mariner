# Virtual Modules

Virtual modules let microfrontends import from each other without knowing file paths. Instead of relative or absolute imports, you use the `navigator:` prefix followed by the app name.

## Syntax

```ts
import { pinia } from 'navigator:shared'
import { navigator } from 'navigator:app1'
```

The prefix `navigator:` is defined by the internal constant `NAVIGATOR_MODULE_PREFIX`. Everything after the colon is the app's Mariner name (from `mariner.config.ts`).

## How It Works

The `resolve-virtual-navigators` Vite plugin intercepts any import that starts with `navigator:` and handles it differently depending on the mode.

### Dev Mode

In development, virtual navigator imports are marked as **external**. The browser fetches them at runtime from:

```
/{appname}/navigator.js
```

Each app has its own Vite dev server mounted at that path, so the import resolves to a live, HMR-capable module.

### Build Mode

During production builds, the import is rewritten to a static path:

```
/appname/navigator.js
```

The import is still marked as external in the bundle output -- the built navigator file is expected to exist at that path on the server.

## Example

Given a shared app that exports a Pinia store:

```ts
// shared/navigator.ts
import { createPinia } from 'pinia'
export const pinia = createPinia()
```

Another app consumes it:

```ts
// app1/navigator.ts
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import { pinia } from 'navigator:shared'
import App from './src/App.vue'

const app = createApp(App)
app.use(pinia)

export const navigator = createVueNavigator(app)
```

::: tip
Virtual modules enable **loose coupling**. Apps only depend on an app name, not on a file path or package version. You can redeploy the shared app independently as long as the export contract stays the same.
:::

## Type Safety

Mariner generates type definitions for virtual modules in each app's `.mariner/mariner.d.ts` file. Run the type generation command to keep them up to date:

```bash
mariner generate-types
```

This produces `declare module 'navigator:appname'` blocks so your editor provides autocompletion and type checking across app boundaries.

::: warning
The `.mariner/` directory is generated code. Do not edit it manually -- it will be overwritten on the next `generate-types` run.
:::

## Lazy Imports

Virtual modules work with dynamic `import()` as well:

```ts
const { shout } = await import('navigator:lazy')
```

This defers loading the other microfrontend until it is actually needed.
