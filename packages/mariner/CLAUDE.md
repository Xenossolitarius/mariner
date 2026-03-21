# packages/mariner (mariner-fe)

Core framework package — provides the CLI, dev server, build system, and navigator adapters.

## Architecture

- `src/cli/` — CLI commands using Commander.js (dev, build, generate-types, setup)
- `src/server/` — Koa-based dev server & worker-based build system
- `src/navigator/` — Framework adapters (Vue, React) and navigator config
- `src/config/` — Configuration schema and defaults (merged with `defu`)
- `src/setup/` — Project discovery, scanning for `mariner.config` files
- `src/constants/` — File names, prefixes, and framework constants
- `src/enums/` — Shared enumerations
- `src/utils/` — Shared utility functions
- `bin/index.mjs` — CLI executable entry point

## Build

Uses **unbuild** (Rollup-based). Multiple entry points:

1. `src/index` — Main library exports
2. `src/navigator/index` — Navigator adapters
3. `src/server/plugins/index` — Vite plugins
4. CLI and worker entries (inlined deps for standalone execution)

Output is hybrid CJS/ESM via package.json `exports` field.

## Key Exports

- `mariner-fe` — Config helpers (`defineMarinerConfig`)
- `mariner-fe/navigator` — `createVueNavigator`, `createReactNavigator`
- `mariner-fe/plugins` — Vite plugins for virtual module resolution

## Server

- **Dev**: Koa + Vite middleware, each app mounted at `/appname/` base path. Virtual `navigator:*` imports resolved by plugin.
- **Build**: Worker pool for parallel builds. Generates manifests and type defs.
- **Type Generation**: Worker-based, combines all navigator exports into single `.mariner/mariner.d.ts`.

## Dev Workflow

```bash
pnpm dev          # nodemon watches src/ and restarts CLI
pnpm build        # unbuild production build
pnpm start        # run CLI directly via tsx
```

## Dependencies of Note

- `vite` ^5.2 — Core build tool
- `koa` ^2.15 — HTTP server
- `commander` ^12 — CLI parsing
- `ajv` ^8.14 — Config schema validation
- `node-forge` ^1.3 — SSL cert generation for HTTPS dev server
- `inquirer` ^9.2 — Interactive setup prompts
