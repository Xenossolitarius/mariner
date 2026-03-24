# Building for Production

Mariner builds each microfrontend into a standalone navigator bundle that can be deployed independently. The build system supports isolated builds, shared fleet builds, and SSR builds with per-request cargo.

## Basic Build

```bash
mariner build --all
```

This builds every discovered app. Each app produces a self-contained output in `dist/{appname}/`.

## Build Modes

### Isolated Build (Default)

Each app is built independently using its own `mariner.config.ts`. Apps are built in parallel using a worker pool.

```bash
mariner build --fleet test
```

```
dist/
  app1/
    navigator.js
    .vite/manifest.json
  app2/
    navigator.js
    .vite/manifest.json
```

**How it works:**

1. Discover and select apps
2. Create a worker pool (default: half of CPU cores, max 4)
3. Send each app to a worker thread
4. Each worker loads the app's `mariner.config.ts` and runs a Vite build
5. Output lands in `dist/{appname}/`

**Plugins applied per app:**

1. User plugins from `mariner.config.ts`
2. `cssInjectedByJs` — inlines CSS into the JS bundle
3. `resolveVirtualNavigators` — rewrites `navigator:*` imports to external URLs
4. `resolveCargo` — resolves `useCargo()` to baked JSON data
5. `transformBuildAssets` — hashes asset filenames and rewrites references

### Shared Fleet Build

When a fleet uses `"mode": "shared"`, all apps in the fleet are built together in a single Vite build with multiple entry points.

```bash
mariner build --fleet shared-vue
```

**How it works:**

1. Find the common root directory of all fleet apps
2. Merge all app configs (plugins deduped by name, externals combined)
3. Build with multiple entries: `{ 'app1/navigator': '...', 'app2/navigator': '...' }`
4. Rolldown automatically deduplicates shared code into chunks

```
dist/
  app1/
    navigator.js
  shared/
    navigator.js
  tailwind-vue/
    navigator.js
  chunks/
    vue-DkE3x9f2.js     # shared Vue chunk
    pinia-Bx7mK1a3.js   # shared Pinia chunk
```

**Benefits of shared builds:**

- Common dependencies are extracted into shared chunks
- Smaller total bundle size across all apps
- Browser caches shared chunks across apps

**Plugins applied:**

1. Merged user plugins (deduped)
2. `cssInjectedByJs`
3. `resolveVirtualNavigatorsShared` — same-fleet navigators resolved to files (bundled together), cross-fleet navigators remain external
4. `resolveCargo`
5. `transformBuildAssetsShared` — per-app base paths for assets

### SSR Build

Build with the `--ssr` flag to keep cargo as a runtime reference instead of baking data at build time:

```bash
mariner build --all --ssr
```

**What changes with `--ssr`:**

1. `useCargo()` is replaced with a `__MARINER_CARGO__` variable reference (not static JSON)
2. After navigator builds complete, `buildCargo()` runs for each app that has a `cargo.ts`
3. Cargo files are built as separate ESM modules to `dist/{appname}/cargo.js`

```
dist/
  app1/
    navigator.js     # references __MARINER_CARGO__
    cargo.js         # exportable cargo function
    .vite/manifest.json
```

The SSR build output is designed to be served by `mariner serve`, which runs `cargo.js` per-request and prepends the data to the navigator response.

::: tip
Use `--ssr` when your cargo data is dynamic (user-specific, time-sensitive, feature flags). Use a regular build when cargo data is static and known at deploy time.
:::

## Worker Pool

Builds (and type generation) use a worker pool for parallelism.

### Defaults

- **Thread count**: `Math.min(Math.floor(os.cpus().length / 2), 4)`
- Half of available CPU cores, capped at 4
- Override with `-t, --threads <n>`

### How It Works

- Workers are `node:worker_threads` running bundled build scripts
- Each worker receives a task (app config + build options) via JSON message
- Tasks are queued FIFO — workers pull the next task when idle
- Task data is JSON-serialized (circular references removed)

```bash
# Use 8 threads for a large workspace
mariner build --all --threads 8
```

## Build Output

### Navigator Bundle

The main output is `navigator.js` — an ESM module that exports the app's navigator and any additional exports.

```js
// dist/app1/navigator.js (simplified)
import { createApp } from '/shared/navigator.js'  // external cross-app import
const app = createApp(App)
export const navigator = { mount(id) { ... }, unmount() { ... } }
export const cargo = { greeting: 'Hello' }  // baked cargo data (non-SSR)
```

### Asset Manifest

Every build produces `.vite/manifest.json` — a standard Vite manifest mapping source files to output files:

```json
{
  "navigator.ts": {
    "file": "navigator.js",
    "isEntry": true
  }
}
```

Use the manifest for server-side rendering or programmatic asset loading.

### CSS Injection

Mariner uses `vite-plugin-css-injected-by-js` to inline all CSS into the navigator bundle. There are **no separate CSS files** in the build output. When the navigator loads, it creates `<style>` elements and appends them to the document.

This design ensures:

- Single-file deployment (one `navigator.js` per app)
- No FOUC (flash of unstyled content) — styles load with the code
- No need to configure CSS loading in the host page

### Asset Hashing

Static assets referenced in your code (images, fonts, audio, video) are processed during the build:

1. File content is hashed using SHA1
2. First 8 characters of the base64url hash are used
3. Files are renamed to `[name]-[hash].[ext]`
4. Import references are rewritten to use the hashed paths

```
src/logo.png  →  dist/app1/logo-x8Kj2mN1.png
```

## Building Individual Apps

Build a single app without touching others:

```bash
mariner build --navigator app1
```

This is useful for:

- Incremental deployments (rebuild only what changed)
- CI pipelines that build apps in separate jobs
- Faster iteration when working on a single app

## Root Base Path

Use `--rootBase` to prefix all output paths:

```bash
mariner build --all --rootBase /microfrontends
```

This affects:

- Cross-app import URLs: `/microfrontends/shared/navigator.js`
- Asset paths in the built output
- Serve server routing expectations

Use this when deploying under a subpath on your server.

## Build + Serve Workflow

For production deployments with dynamic cargo:

```bash
# 1. Build all apps with SSR
mariner build --all --ssr

# 2. Deploy the dist/ directory
# 3. Start the production server
mariner serve --port 4200 --dist ./dist
```

See [Serve Mode](./serve-mode) for details on the production server.
