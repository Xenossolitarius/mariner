# Server

Dev server, build system, serve server, and type generation — the runtime core of Mariner.

## Structure

- `dev/` — Development server (raw `node:http` + Vite in middleware mode)
- `build/` — Production build orchestration with worker pool
- `serve/` — Production serve server (raw `node:http`, per-request cargo injection)
- `generate-types/` — Type definition generation with worker pool
- `plugins/` — Vite plugins for Mariner-specific behavior
- `server.ts` — Factory routing to dev or build server
- `worker-pool.ts` — Thread pool manager for parallel builds

## Dev Server (`dev/`)

- Raw `node:http` server (no Koa/Express) with Vite middleware for each microfrontend
- Each app gets its own isolated Vite dev server in middleware mode
- Mounted at `/{appname}/` base path
- `createHandler()` — extracted, testable request handler (CORS, routing, URL rewriting)
- `optimizeDeps.entries` pointed at navigator files for proper Vite 8 pre-bundling
- Supports HTTPS via auto-generated certs (`node:https`)
- `SERVER_READY` message from CLI messages layer (boxed URL + navigator list)

## Build System (`build/`)

- Worker pool for parallel app builds
- Each app built as ESM with Vite using `rolldownOptions`
- Generates manifests and processes assets
- `transformBuildAssets` plugin rewrites asset paths with content hashes
- `cssInjectedByJs` plugin inlines CSS into navigator.js
- Output: `dist/{appname}/navigator.js` + `.vite/manifest.json`
- SSR mode (`--ssr`): builds `cargo.ts` files separately via `build-cargo.ts` for runtime execution by serve server

## Serve Server (`serve/`)

- Production `node:http` server for serving built navigators with per-request cargo injection
- `loadAppBundles()` — scans dist dir for navigator.js + cargo.js files
- `createServeHandler()` — request handler: serves navigator.js with cargo data prepended, static assets, CORS
- `runCargo()` — dynamically imports and executes cargo.js with cache-busting (`?t=timestamp`)
- Cargo data injected as module-scoped `const __MARINER_CARGO__=...` (not on `globalThis`)
- Each navigator gets its own cargo data — no cross-navigator pollution

## Type Generation (`generate-types/`)

- Scans all navigator exports across apps
- Worker pool processes TS apps in parallel (JS apps skipped)
- Outputs combined `mariner.d.ts` in `.mariner/` directory
- `combine.ts` — merges individual type files into `declare module 'navigator:appname'` blocks

## Plugins (`plugins/`)

- `resolve-virtual-navigators` — Resolves `navigator:*` virtual imports to actual app navigator files. Dev: marks as external. Build: rewrites to `/appname/navigator.js`.
- `collection` — Virtual module `virtual:mariner-root` and `virtual:mariner-lighthouse` replacement
- `transform-build-assets` — Post-build asset path transformation with SHA1 content hashing. Handles Vite 8 public dir fallback.
- `resolve-cargo` — Resolves `useCargo()` calls via `virtual:mariner-cargo` virtual module. Finds `cargo.ts/js` in project root, runs it, and exports data as default. Runs after Vue compiler (no `enforce`). In SSR mode, exports `__MARINER_CARGO__` reference instead of data. Accepts `{ projects, ssr? }` options.
