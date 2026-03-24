# Constraints & Rules

This page documents all the rules, restrictions, and validation that Mariner enforces. Understanding these constraints will help you avoid common pitfalls.

## File Naming

### Config File

The config file **must** be named exactly `mariner.config.ts` or `mariner.config.js`. No other names are recognized:

```
mariner.config.ts   ✅
mariner.config.js   ✅
vite.config.ts      ❌  (not discovered by Mariner)
mariner.config.mts  ❌  (not supported)
```

Mariner scans the workspace by globbing for `mariner.config.{ts,js}` files (excluding `node_modules` and `dist` directories). If your file uses a different name, the app will not be discovered.

### Navigator File

Every app **must** have a `navigator.ts` or `navigator.js` file in the same directory as `mariner.config.ts`. This is the entry point for the microfrontend.

```
my-app/
  mariner.config.ts
  navigator.ts       ✅  required — app is valid
```

If the navigator file is missing, the app is still discovered but marked as **invalid** (`isValid: false`). Invalid apps appear in the CLI's interactive prompt but are disabled and cannot be selected. The reason shown is `"Missing navigator"`.

### Cargo File

The cargo file must be named `cargo.ts` or `cargo.js` and placed alongside `navigator.ts`. It is optional — apps without a cargo file simply have `useCargo()` return `null`.

## App Naming

### Slugification

The app name (from the `mariner` field in `mariner.config.ts`) is **slugified** before use:

- Converted to lowercase
- Special characters removed
- Spaces replaced with hyphens

This slugified name is used for:

- URL routing: `/{slugified-name}/navigator.js`
- Virtual module imports: `navigator:{slugified-name}`
- Build output: `dist/{slugified-name}/`

### Name Fallback Chain

If the `mariner` field is not set, the framework falls back:

1. `mariner` field in `mariner.config.ts` (preferred)
2. `name` field in `package.json`
3. `mariner-fe` (last resort default)

::: warning
Using the default fallback name `mariner-fe` will cause conflicts if multiple apps omit the `mariner` field. Always set an explicit name.
:::

### Name Uniqueness

App names must be unique across the workspace. If two apps share the same slugified name, URL routing and virtual module resolution will be ambiguous. Mariner does not enforce uniqueness at discovery time — it's your responsibility to ensure names don't collide.

## Navigator Exports

### Required Export

The navigator file **must** export a named `navigator` binding conforming to the `Navigator` type:

```ts
type Navigator = {
  mount: (id: string) => void
  unmount: () => void
}
```

### Additional Exports

Any other named exports from `navigator.ts` become available to other apps via `navigator:appname` imports. These are the only values other apps can consume — nothing from `src/` or other files is directly importable cross-app.

```ts
// shared/navigator.ts
export const pinia = createPinia()       // ✅ importable via navigator:shared
export const useCounter = defineStore()  // ✅ importable via navigator:shared
export const navigator = ...             // ✅ required
```

### Star Re-exports

While `export * from './src'` works, be aware that it exposes your entire module surface. Prefer explicit named exports for a cleaner API contract.

## Virtual Module Imports

### Naming Rules

Virtual module imports follow the pattern `navigator:{appname}` where `appname` matches the slugified Mariner name:

```ts
import { pinia } from 'navigator:shared' // ✅
import { pinia } from 'navigator:Shared' // ❌ case-sensitive
import { pinia } from 'navigator:my app' // ❌ use slugified name
import { pinia } from 'navigator:my-app' // ✅ slugified
```

### No Self-Imports

An app cannot import from its own navigator. The import `navigator:self` has no special meaning — it would try to resolve an app literally named `"self"`.

### No Circular Dependencies

While Mariner doesn't explicitly detect circular dependencies between navigators, they will cause runtime errors. If `app1` imports from `navigator:app2` and `app2` imports from `navigator:app1`, the browser will encounter a circular module dependency.

## Config Constraints

### Immutable Defaults

The following build settings are applied by Mariner and **cannot be overridden**, even if you set them in your config:

| Setting                                         | Value            | Why                                                 |
| ----------------------------------------------- | ---------------- | --------------------------------------------------- |
| `build.manifest`                                | `true`           | Required for asset manifest generation              |
| `build.modulePreload.polyfill`                  | `false`          | Navigators are loaded dynamically, not via `<link>` |
| `build.rolldownOptions.input`                   | `'navigator'`    | Entry point is always the navigator file            |
| `build.rolldownOptions.preserveEntrySignatures` | `'exports-only'` | Preserves the export shape of navigator files       |

### Deep Merge Behavior

User config is merged with Mariner defaults using `defu`:

- **Objects** are recursively merged (your values take precedence)
- **Arrays** are concatenated (your plugins are added alongside Mariner's internal plugins)
- **Primitives** from your config override defaults (except the immutable defaults above)

## Cargo Constraints

### Return Value

The cargo function must return **JSON-serializable data**. Functions, symbols, circular references, `Map`, `Set`, and other non-serializable values will cause errors or be silently dropped.

```ts
// cargo.ts
export const cargo = async () => {
  return {
    greeting: 'Hello', // ✅ string
    count: 42, // ✅ number
    features: { a: true }, // ✅ nested object
    items: [1, 2, 3], // ✅ array
    handler: () => {}, // ❌ functions are not serializable
    users: new Map(), // ❌ Map is not serializable
  }
}
```

### Export Format

The cargo file must export the function as either a named `cargo` export or a default export:

```ts
// Named export
export const cargo = async () => ({ ... })

// Default export
export default async () => ({ ... })
```

### Execution Timing

| Mode             | When it runs       | Node.js APIs available? |
| ---------------- | ------------------ | ----------------------- |
| Dev              | Per page reload    | Yes                     |
| Build (no --ssr) | Once at build time | Yes                     |
| Build (--ssr)    | Not at build time  | N/A                     |
| Serve            | Per HTTP request   | Yes                     |

In dev and non-SSR build modes, the cargo function runs in the Vite build process. In SSR + serve mode, it runs in the serve server's Node.js process.

### Failure Behavior

If the cargo function throws an error:

- **Dev/Build**: The build plugin catches the error and `useCargo()` returns `null`
- **Serve**: The serve server still responds with the navigator code, but without cargo data prepended. `useCargo()` returns `undefined` in the browser.

Design your app to handle missing cargo gracefully:

```ts
const cargo = useCargo<MyData>()
const greeting = cargo?.greeting ?? 'Default greeting'
```

## Project Validity

Mariner uses a validity check to determine which discovered apps can be used:

| Condition                   | Valid? | Behavior                                  |
| --------------------------- | ------ | ----------------------------------------- |
| Has `navigator.ts` or `.js` | Yes    | Available for dev, build, type generation |
| Missing navigator file      | No     | Appears in CLI but disabled for selection |
| Missing `mariner.config`    | —      | Not discovered at all                     |

## Fleet Constraints

### Schema Validation

Fleet config (`fleet.config.json`) is validated using an AJV JSON schema. The config must match:

```json
{
  "fleet-name": {
    "apps": ["app1", "app2"],
    "mode": "isolated" | "shared"
  }
}
```

- `apps` must be an array of strings
- `mode` must be either `"isolated"` or `"shared"`
- Validation errors are logged as warnings but are non-fatal (the fleet is ignored)

### Legacy Format

A legacy shorthand format is auto-normalized:

```json
{
  "fleet-name": ["app1", "app2"]
}
```

This is equivalent to `{ "apps": ["app1", "app2"], "mode": "isolated" }`.

### Shared Mode Compatibility

In shared mode, all apps in the fleet share a single Vite dev server. This means:

- All apps must be compatible with a single Vite configuration
- Conflicting plugins will cause errors
- Different plugin versions for the same purpose will conflict
- Use isolated mode when apps have incompatible configurations

### App Membership

- An app can appear in **multiple fleets** (useful for testing different groupings)
- App names in the fleet must match the slugified Mariner names from each app's config
- Apps not assigned to any fleet get their own isolated group when using `--all`

## TypeScript Constraints

### Type Generation

- Only TypeScript navigators (`navigator.ts`) get type definitions generated
- JavaScript navigators (`navigator.js`) are skipped — they appear in the workspace but produce no `declare module` block
- The `.mariner/` directory is auto-generated and must not be edited manually
- Re-run `mariner generate-types` after adding apps or changing navigator exports

### tsconfig.json

Your `tsconfig.json` must include the generated type file for virtual module imports to have type safety:

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "../.mariner/mariner.d.ts"]
}
```

The relative path depends on your project structure — adjust it to point to the `.mariner/mariner.d.ts` file at the workspace root.

## Build Constraints

### Entry Point

The build entry is always `navigator.ts` or `navigator.js`. You cannot change the entry point — it is hardcoded by Mariner's immutable defaults.

### Output Structure

Builds always output to `dist/{appname}/`:

```
dist/
  app1/
    navigator.js            # Main bundle
    .vite/manifest.json     # Asset manifest
    cargo.js                # Only with --ssr
    assets/                 # Hashed static assets
  app2/
    ...
```

### CSS Handling

In production builds, CSS is injected into the DOM by `vite-plugin-css-injected-by-js`. There are no separate CSS files — styles are embedded in the navigator bundle. This ensures a single-file deployment model.

### Asset Hashing

Static assets (images, fonts, etc.) are renamed with content hashes using SHA1 (8-character, base64url). The format is `[name]-[hash].[ext]`. References in code are rewritten automatically.

## Dev Server Constraints

### Port Allocation

Each app in isolated mode gets its own Vite dev server with a unique HMR WebSocket port. The port is calculated as:

```
hmrPort = basePort + (serverPort - 3000) * 100 + appIndex
```

This prevents HMR port collisions when running multiple apps. In shared mode, all apps share a single HMR port.

### URL Routing

All navigator requests follow the pattern `/{appname}/navigator.js`. You cannot customize the URL structure — it is derived from the slugified app name.

### CORS

The dev server sets CORS headers to allow all origins (`*`), all methods, and all headers. OPTIONS requests return `204 No Content`. This cannot be customized — it ensures microfrontends can be loaded from any host page during development.

## Node.js Version

Mariner requires **Node.js >= 20.19**. This is enforced in `package.json` via the `engines` field and specified in `.nvmrc`. Using an older Node.js version may cause unexpected behavior.
