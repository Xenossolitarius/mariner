# Plugins API

Imported from `mariner-fe/plugins`. These are Vite plugins used internally by Mariner's dev server and build system. You typically don't need to use them directly unless building custom tooling.

## resolveVirtualNavigators

Resolves `navigator:appname` virtual module imports.

```ts
function resolveVirtualNavigators(base: string, options: ServerOptions): Plugin
```

- **Dev**: Marks `navigator:*` imports as external. The browser fetches them from `/{appname}/navigator.js`.
- **Build**: Rewrites imports to `/appname/navigator.js` and marks them external in the bundle.

## resolveVirtualNavigatorsShared

Fleet variant for shared Vite server mode.

```ts
function resolveVirtualNavigatorsShared(fleetProjects: MarinerProject[], options: ServerOptions): Plugin
```

- Same-fleet navigators: resolved to actual file paths (bundled together)
- Cross-fleet navigators: marked external (loaded at runtime)

## resolveCargo

Resolves `useCargo()` calls via the `virtual:mariner-cargo` virtual module.

```ts
function resolveCargo(options: ResolveCargoOptions): Plugin
```

### ResolveCargoOptions

```ts
type ResolveCargoOptions = {
  projects: MarinerProject[]
  ssr?: boolean
}
```

| Field      | Type               | Description                                                                                 |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `projects` | `MarinerProject[]` | Projects to scan for `cargo.ts` files                                                       |
| `ssr`      | `boolean`          | When `true`, replaces `useCargo()` with `__MARINER_CARGO__` reference instead of baked data |

### Plugin hooks

- **`resolveId`**: Resolves `virtual:mariner-cargo?root=...` to internal ID
- **`load`**: Runs the cargo function and returns `export default {...data}` (or `__MARINER_CARGO__` in SSR)
- **`transform`**: Replaces `useCargo()` / `useCargo<T>()` calls with an import from the virtual module

::: info
This plugin runs without `enforce` (after framework plugins like `@vitejs/plugin-vue`) so that `<script setup>` is already compiled when the transform runs.
:::

## transformBuildAssets

Post-build asset path transformation with content hashing.

```ts
function transformBuildAssets(base: string, options: ServerOptions): Plugin
```

Rewrites asset paths in built output with SHA1 content hashes. Handles Vite 8's public directory fallback behavior.

## transformBuildAssetsShared

Fleet variant for shared build mode.

```ts
function transformBuildAssetsShared(projects: MarinerProject[], options: ServerOptions): Plugin
```

Determines the correct app base per asset by matching file paths against project roots.
