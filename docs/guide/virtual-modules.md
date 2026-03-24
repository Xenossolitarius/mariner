# Virtual Modules

Virtual modules let microfrontends import from each other without knowing file paths. Instead of relative or absolute imports, you use the `navigator:` prefix followed by the app name.

## Syntax

```ts
import { pinia } from 'navigator:shared'
import { navigator } from 'navigator:app1'
```

The prefix `navigator:` is defined by the internal constant `NAVIGATOR_MODULE_PREFIX`. Everything after the colon is the app's Mariner name (from `mariner.config.ts`), slugified to lowercase with hyphens.

## How It Works

The `resolve-virtual-navigators` Vite plugin intercepts any import that starts with `navigator:` and handles it differently depending on the mode and fleet configuration.

### Dev Mode (Isolated)

In development with isolated apps, virtual navigator imports are marked as **external**. The browser fetches them at runtime from:

```
/{appname}/navigator.js
```

Each app has its own Vite dev server mounted at that path, so the import resolves to a live, HMR-capable module.

The plugin hooks involved:

1. **`config` hook** — Adds `navigator:*` tags to `optimizeDeps.exclude` so Vite doesn't try to pre-bundle cross-app imports
2. **`configResolved` hook** — Injects a secondary plugin that rewrites `/@id/navigator:*` prefixes added by Vite's import analysis back to clean paths
3. **`resolveId` hook** — Marks the import as external, returning `{ id: '/{appname}/navigator.js', external: true }`
4. **`load` hook** — Returns stub module code for external references to suppress Vite's HMR warnings about missing modules

### Dev Mode (Shared Fleet)

In shared mode, apps in the same fleet share a single Vite server. The `resolveVirtualNavigatorsShared` plugin variant handles this:

- **Same-fleet navigators**: Resolved to the actual file path of the other app's `navigator.ts`. Since they share a Vite server, the import is bundled together — no network request needed.
- **Cross-fleet navigators**: Still marked as external at `/{appname}/navigator.js` — loaded from the other fleet's server at runtime.

```ts
// In app1 (shared-vue fleet), importing shared (same fleet):
import { pinia } from 'navigator:shared'
// → Resolved to /path/to/shared/navigator.ts (direct file import)

// In app1 (shared-vue fleet), importing app3 (standalone fleet):
import { utils } from 'navigator:app3'
// → Resolved to /app3/navigator.js (external, runtime fetch)
```

This gives you the best of both worlds: zero-latency imports within a fleet, and cross-fleet isolation.

### Build Mode (Isolated)

During production builds, the import is rewritten to a static path:

```
/appname/navigator.js
```

The import is still marked as external in the bundle output — the built navigator file is expected to exist at that path on the server.

If a `rootBase` is configured, it is prepended:

```
/rootBase/appname/navigator.js
```

### Build Mode (Shared Fleet)

In shared builds, the `resolveVirtualNavigatorsShared` plugin applies the same logic as in dev:

- **Same-fleet navigators**: Resolved to actual file paths → Rolldown bundles them together, extracting shared code into chunks
- **Cross-fleet navigators**: Rewritten to external `/appname/navigator.js` URLs

This means a shared fleet build produces optimized bundles with deduplication for intra-fleet imports while keeping inter-fleet imports as separate network requests.

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

Mariner generates type definitions for virtual modules in the workspace's `.mariner/mariner.d.ts` file. Run the type generation command to keep them up to date:

```bash
mariner generate-types
```

This produces `declare module 'navigator:appname'` blocks so your editor provides autocompletion and type checking across app boundaries.

See [Type Generation](./type-generation) for the full details.

::: warning
The `.mariner/` directory is generated code. Do not edit it manually — it will be overwritten on the next `generate-types` run.
:::

## Lazy Imports

Virtual modules work with dynamic `import()` as well:

```ts
const { shout } = await import('navigator:lazy')
```

This defers loading the other microfrontend until it is actually needed. The browser only fetches `/lazy/navigator.js` when the `import()` expression is evaluated.

::: tip
Lazy imports are useful for optional features or rarely-used microfrontends. They reduce initial page load time by splitting the dependency graph.
:::

## What Gets Imported

When you import from `navigator:appname`, you receive whatever that app exports from its `navigator.ts` file. This includes:

- The `navigator` object (mount/unmount interface)
- Any additional named exports (stores, utilities, constants)
- Cargo data if exported via `export const cargo = useCargo()`

```ts
// shared/navigator.ts
export const pinia = createPinia()           // ✅ importable
export const useCounter = defineStore(...)    // ✅ importable
export const navigator = createVueNavigator() // ✅ importable

// shared/src/utils.ts
export const helper = () => {}               // ❌ NOT importable cross-app
```

Only top-level exports from `navigator.ts` are available. Files inside `src/` or other directories cannot be imported directly by other apps.

## Dependency Pre-bundling

Mariner configures Vite's `optimizeDeps` to work correctly with virtual modules:

- **`optimizeDeps.entries`**: Pointed at the navigator file so Vite discovers the app's actual npm dependencies for pre-bundling
- **`optimizeDeps.exclude`**: All `navigator:*` imports are excluded from pre-bundling since they're resolved at runtime (not on the filesystem)

This ensures Vite pre-bundles real npm packages (like `vue`, `pinia`) but doesn't try to pre-bundle cross-app virtual imports.

## Constraints

- **Case-sensitive**: `navigator:shared` and `navigator:Shared` are different imports
- **No self-imports**: An app cannot import from its own navigator
- **No circular dependencies**: `app1 → navigator:app2 → navigator:app1` will cause runtime errors
- **Slugified names only**: Use the slugified app name, not the display name (e.g., `navigator:my-app`, not `navigator:My App`)
- **ESM only**: Virtual module imports produce ESM modules — CommonJS `require()` is not supported
