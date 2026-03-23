# packages/mariner (mariner-fe)

Core framework package — provides the CLI, dev server, build system, and navigator adapters.

## Architecture

- `src/cli/` — CLI commands using Commander.js (dev, build, serve, generate-types)
- `src/server/` — Raw `node:http` dev server, build system, and serve server
- `src/navigator/` — Framework adapters (Vue, React), navigator config, and `useCargo()`
- `src/config/` — Configuration schema and defaults (merged with `defu`)
- `src/setup/` — Project discovery, scanning for `mariner.config` files
- `src/constants/` — File names, prefixes, and framework constants
- `src/enums/` — Shared enumerations
- `src/utils/` — Shared utility functions
- `bin/index.mjs` — CLI executable entry point

## Build

Uses **unbuild 3** (Rollup-based). Three build stages:

1. **Library entries** (`src/index`, `src/navigator/index`, `src/server/plugins/index`) — with declarations, externals: vite, defu, vue, react
2. **Workers** (`src/server/build/worker`, `src/server/generate-types/worker`) — no declarations
3. **CLI** (`src/cli/index`) — inlined dependencies, no declarations, standalone bundle

Output is ESM via package.json `exports` field. Uses `rolldownOptions` (Vite 8).

## Key Exports

- `mariner-fe` — Config helpers (`defineMarinerConfig`), setup functions
- `mariner-fe/navigator` — `createVueNavigator`, `createReactNavigator`, `useCargo`
- `mariner-fe/plugins` — Vite plugins for virtual module resolution

## Server

- **Dev**: Raw `node:http` + Vite middleware per app, each mounted at `/appname/` base path. Virtual `navigator:*` imports resolved by plugin. `optimizeDeps.entries` used for pre-bundling. No framework deps (Koa/Express removed).
- **Build**: Worker pool for parallel builds. Generates manifests and type defs. Uses `rolldownOptions`. SSR mode (`--ssr`) keeps `useCargo()` as a runtime reference for the serve server.
- **Serve**: Production `node:http` server that serves built navigators with per-request cargo injection. Runs `cargo.ts` on each request and prepends data as a module-scoped `const`.
- **Type Generation**: Worker-based, combines all navigator exports into single `.mariner/mariner.d.ts`.

## Testing

```bash
pnpm test                  # Unit tests (343 tests, 37 files)
pnpm test:coverage         # With V8 coverage
pnpm test:integration      # Build integration tests (136 tests, 11 files)
pnpm test:e2e              # Playwright E2E (94 tests, 7 projects)
pnpm test:all              # All vitest tests combined
```

### Test Structure

- `src/**/*.test.ts` — Unit tests (co-located with source)
- `src/server/plugins/__integration__/` — Vite plugin integration tests (temp dirs + real vite.build)
- `src/__build-integration__/` — Build pipeline integration tests (real playground builds, snapshots, perf)
- `e2e/` — Playwright E2E tests (dev server, built output, screenshots, HTML snapshots, dev/build sync, shared fleet, cargo/serve)

### Coverage Exclusions

Excluded from coverage (untestable without subprocess): CLI commands, workers, worker-pool, type-only files.

## Dependencies

- `vite` — peer dependency (`^5 || ^6 || ^7 || ^8`)
- `defu` — runtime dependency (used in `defineMarinerConfig`)
- CLI deps (commander, chalk, boxen, ora, inquirer) — bundled by unbuild
- No HTTP framework deps (raw `node:http`)

## Dev Workflow

```bash
pnpm dev          # nodemon watches src/ and restarts CLI
pnpm build        # unbuild production build (3 stages)
pnpm start        # run CLI directly via tsx
```
