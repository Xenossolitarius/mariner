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

## Vite Config Inheritance

`defineMarinerConfig` accepts all standard Vite configuration options. Mariner deep-merges your config with its defaults using `defu`, so you only need to specify what you want to override.

Commonly used Vite options:

- `plugins` -- add framework plugins, Tailwind, etc.
- `build` -- customize build behavior
- `css` -- CSS preprocessor options
- `resolve` -- path aliases and extensions

## Example: Vue with Tailwind and External Vue

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
Marking `vue` as external is useful when a shared app already provides Vue. This avoids bundling Vue into every microfrontend.
:::

## Deep Merging Behavior

Mariner uses `defu` to merge your configuration with its internal defaults. This means:

- Arrays are concatenated (your plugins are added alongside Mariner's internal plugins)
- Objects are recursively merged
- Explicit values you set always take priority over defaults

::: warning
The config file must be named exactly `mariner.config.ts` or `mariner.config.js`. Other names (e.g., `vite.config.ts`) are not recognized by Mariner.
:::
