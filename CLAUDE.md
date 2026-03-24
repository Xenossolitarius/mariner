# Mariner

Open-source microfrontend framework built on Vite 8 (Rolldown). Framework-agnostic, supports Vue, React, and plain JS microfrontends with backend template integration and app islands.

## Monorepo Structure

- `packages/mariner` — Core framework library & CLI (`mariner-fe` on npm)
- `playground/` — Example apps and test environment
- `fleet.config.json` — Fleet mode app grouping config

**Package manager**: pnpm (workspaces defined in `pnpm-workspace.yaml`)
**Root `package.json` is `private: true`** — never published.

## Key Concepts

- **Navigator**: Each microfrontend exports a `navigator` object via `navigator.ts/js` — the entry point for the app
- **Mariner Config**: Each microfrontend has a `mariner.config.ts/js` defining its settings via `defineMarinerConfig()`
- **Virtual Modules**: Apps import from other apps using `navigator:<appname>` syntax (e.g., `import { pinia } from 'navigator:shared'`)
- **Fleet**: Groups of apps configured together in `fleet.config.json`
- **Dep Isolation**: Each app gets its own Vite dev server, isolating dependencies so different apps can use different versions of the same dep
- **Cargo**: Server-side data injection via `useCargo()` and `cargo.ts` files. Data is baked into navigator bundles at dev/build time or injected per-request by the serve server

## Commands

```bash
# Root scripts
pnpm dev                   # Start Mariner dev server with all playground apps
pnpm check                 # lint + typecheck + unit tests
pnpm check:full            # check + integration tests + E2E tests
pnpm lint                  # ESLint across entire project
pnpm typecheck             # tsc --noEmit on mariner-fe
pnpm test                  # Unit tests (fast, 355 tests)
pnpm test:coverage         # Unit tests with V8 coverage
pnpm test:integration      # Build integration tests (needs `pnpm build` first)
pnpm test:e2e              # Playwright E2E tests (auto-starts servers)
pnpm test:all              # All vitest tests
pnpm client:index          # Serve static test client
pnpm client:build          # Serve built playground on port 3000
```

## Code Style

- Prettier: 120 char width, single quotes, no semicolons
- ESLint: flat config (`eslint.config.ts`), `prettier/prettier` enforced, no unused vars (underscore-prefixed allowed), prefer `type` over `interface`
- 2-space indentation (`.editorconfig`)
- TypeScript 5.9+ with `ESNext` target, `Bundler` module resolution, strict mode

## Tech Stack

- **Vite 8** (Rolldown) — build tool and dev server
- **Vitest 4** — unit + integration testing
- **Playwright** — E2E testing
- **unbuild 3** — package bundling (3-stage: library, workers, CLI)
- **Node.js >= 20.19** (specified in `engines` and `.nvmrc`)

## Environment

- Node version specified in `.nvmrc`
- Env vars prefixed with `MARINER_` are framework-level
- App env vars prefixed with `VITE_` are exposed to client code

## Generated Files

- `.mariner/` directories contain generated type definitions — do not edit manually
- `playground/client/files/` contains built navigator assets
- Tests use `.mariner-test-gen/` and `.mariner-test-snap/` as temp dirs (never touch real `.mariner/`)

## Dev Server Architecture

- Raw `node:http` server (no Koa/Express/connect — zero HTTP framework deps)
- One Vite dev server per app in middleware mode (dep isolation)
- URL routing: `/{appname}/navigator.js` → app's navigator entry
- CORS headers set inline, HTTPS via `node:https` with auto-generated certs
- `optimizeDeps.entries` pointed at navigator files for proper pre-bundling

## HMR (Hot Module Replacement)

- Works out of the box for Vue, React, and CSS — no manual setup required
- **Cargo HMR**: `resolve-cargo` plugin has `handleHotUpdate` hook — when `cargo.ts/js` changes, invalidates the virtual module and triggers full page reload to re-execute the cargo function with fresh data
- **Cross-App HMR Bridge** (`src/server/dev/hmr-bridge.ts`): In isolated mode, connects all Vite dev servers via file watchers. When a navigator file changes in one server, all other servers send `full-reload` to their browser clients so consuming apps pick up updated cross-app imports
- Shared fleet mode: Vite's native module graph handles cross-app HMR automatically (navigators resolve to actual file paths within one Vite instance)

## Publishing

Uses GitHub Actions (`.github/workflows/publish.yml`). Triggered by creating a GitHub Release:

1. Create a git tag: `git tag v2.1.0 && git push --tags`
2. Create a GitHub Release from that tag (via UI or `gh release create v2.1.0`)
3. The workflow runs: lint → typecheck → unit tests → integration tests → build → publish
4. Version in `package.json` is overwritten by the release tag (`v2.1.0` → `2.1.0`)
5. Requires `NPM_TOKEN` secret configured in repo settings

## Documentation

- VitePress site in `docs/` — deploy via `.github/workflows/docs.yml`
- Sidebar config: `docs/.vitepress/config.ts`
- Sections: Getting Started, Guide (Core Concepts, Framework Guides, Advanced), API Reference, Examples
