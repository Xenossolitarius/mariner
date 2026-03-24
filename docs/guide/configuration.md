# Configuration

Every Mariner microfrontend requires a configuration file named `mariner.config.ts` or `mariner.config.js` in the app root.

## `defineMarinerConfig()`

Use `defineMarinerConfig` to define your app's configuration. It wraps Vite's `defineConfig` and adds Mariner-specific fields.

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'my-app',
})
```

### Required Fields

| Field     | Type     | Description                                                                                                 |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `mariner` | `string` | The app name. Used for URL routing (`/{appname}/navigator.js`) and cross-app imports (`navigator:appname`). |

### Optional Fields

| Field     | Type     | Description                                                   |
| --------- | -------- | ------------------------------------------------------------- |
| `mountId` | `string` | Override the default DOM element ID used as the mount target. |

## App Name Slugification

The `mariner` field is slugified before use in URLs and imports:

- Converted to **lowercase**
- Special characters **removed**
- Spaces replaced with **hyphens**

```
"My App"       → "my-app"
"Dashboard V2" → "dashboard-v2"
"app1"         → "app1"
```

The slugified name is used everywhere:
- URL: `http://localhost:3000/my-app/navigator.js`
- Import: `import { ... } from 'navigator:my-app'`
- Build output: `dist/my-app/navigator.js`

### Name Fallback Chain

If the `mariner` field is empty or missing, Mariner falls back:

1. `mariner` field in config (preferred)
2. `name` field in the app's `package.json`
3. `mariner-fe` (last-resort default)

::: warning
Using the default name will cause conflicts if multiple apps omit the `mariner` field. Always set an explicit, unique name.
:::

## Vite Config Inheritance

`defineMarinerConfig` accepts all standard Vite configuration options. Mariner deep-merges your config with its defaults using `defu`, so you only need to specify what you want to override.

Commonly used Vite options:

- `plugins` — add framework plugins, Tailwind, etc.
- `build` — customize build behavior
- `css` — CSS preprocessor options
- `resolve` — path aliases and extensions

## Mariner Defaults (Immutable)

These settings are applied by Mariner and **cannot be overridden**, even if you set them explicitly:

| Setting                                        | Value            | Purpose                                       |
| ---------------------------------------------- | ---------------- | --------------------------------------------- |
| `build.manifest`                               | `true`           | Always generates `.vite/manifest.json`        |
| `build.modulePreload.polyfill`                 | `false`          | Navigators are loaded dynamically, not via `<link rel="modulepreload">` |
| `build.rolldownOptions.input`                  | `'navigator'`    | Entry point is always the navigator file      |
| `build.rolldownOptions.preserveEntrySignatures` | `'exports-only'` | Preserves the export shape of navigator files |

These defaults ensure that the built output is always a standalone navigator module with a predictable structure.

## Deep Merging Behavior

Mariner uses `defu` to merge your configuration with its internal defaults. This means:

- **Objects** are recursively merged (your values take precedence)
- **Arrays** are concatenated (your plugins are added alongside Mariner's internal plugins)
- **Primitives** you set override defaults (except the immutable settings above)

For example, if Mariner has default plugins `[A, B]` and you specify `plugins: [C]`, the merged result is `[C, A, B]` — your plugin runs first.

## Internal Plugins

Mariner adds these plugins automatically during dev and build. You don't need to include them:

| Plugin                       | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `cssInjectedByJs`           | Inlines CSS into the JS bundle (build only)       |
| `resolveVirtualNavigators`   | Resolves `navigator:*` imports                    |
| `resolveCargo`              | Transforms `useCargo()` calls                     |
| `transformBuildAssets`       | Hashes static assets in production (build only)   |

These run alongside your user plugins. The cargo plugin runs without `enforce`, meaning it executes after framework plugins like `@vitejs/plugin-vue` — this ensures `<script setup>` is already compiled when the `useCargo()` transform runs.

## Config Function Form

`defineMarinerConfig` returns a Vite `defineConfig` callback, which means your config receives `{ command, mode }` context:

```ts
export default defineMarinerConfig({
  mariner: 'my-app',
  plugins: [vue()],
  // The config is passed to Vite's defineConfig internally
  // command: 'serve' | 'build'
  // mode: 'development' | 'production' | custom
})
```

## Examples

### Vue with Tailwind and External Vue

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineMarinerConfig({
  mariner: 'my-app',
  plugins: [vue(), tailwindcss()],
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
```

::: tip
Marking `vue` as external is useful when a shared app already provides Vue. This avoids bundling Vue into every microfrontend, reducing total bundle size and ensuring all apps share the same Vue instance.
:::

### React with External React

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import react from '@vitejs/plugin-react'

export default defineMarinerConfig({
  mariner: 'my-react-app',
  plugins: [react()],
  build: {
    rolldownOptions: {
      external: ['react', 'react-dom'],
    },
  },
})
```

### Shared Utility App (No Framework)

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'shared',
  build: {
    rolldownOptions: {
      external: ['vue'],
    },
  },
})
```

A shared app typically doesn't need framework plugins since it just exports data, stores, or utilities.

### Custom Path Aliases

```ts
// mariner.config.ts
import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineMarinerConfig({
  mariner: 'my-app',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

## File Format

| File                 | Supported | Notes                                    |
| -------------------- | --------- | ---------------------------------------- |
| `mariner.config.ts`  | Yes       | Preferred — full TypeScript support      |
| `mariner.config.js`  | Yes       | Works, but no type inference from IDE    |
| `mariner.config.mts` | No        | Not recognized by Mariner's scanner      |
| `vite.config.ts`     | No        | Mariner ignores standard Vite config names |

::: warning
The config file must be named exactly `mariner.config.ts` or `mariner.config.js`. Other names (e.g., `vite.config.ts`) are not recognized by Mariner.
:::
