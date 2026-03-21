# Server

Dev server, build system, and type generation — the runtime core of Mariner.

## Structure

- `dev/` — Development server (Koa + Vite in middleware mode)
- `build/` — Production build orchestration with worker pool
- `generate-types/` — Type definition generation with worker pool
- `plugins/` — Vite plugins for Mariner-specific behavior

## Dev Server (`dev/`)

- Koa HTTP server with Vite middleware for each microfrontend
- Each app mounted at `/appname/` base path
- Supports HTTPS via auto-generated certs (node-forge)
- Configurable hostname and port

## Build System (`build/`)

- Worker pool for parallel app builds
- Each app built as ESM with Vite
- Generates manifests and processes assets
- Transform plugin rewrites asset paths in output

## Type Generation (`generate-types/`)

- Scans all navigator exports across apps
- Worker pool processes apps in parallel
- Outputs combined `mariner.d.ts` in `.mariner/` directory

## Plugins (`plugins/`)

- `resolve-virtual-navigators` — Resolves `navigator:*` virtual imports to actual app navigator files
- `collection` — Gathers and registers all discovered projects
- `transform-build-assets` — Post-build asset path transformation
