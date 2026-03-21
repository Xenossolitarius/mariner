# Mariner

Open-source microfrontend framework built on Vite. Framework-agnostic, supports Vue, React, and plain JS microfrontends with backend template integration and app islands.

## Monorepo Structure

- `packages/mariner` — Core framework library & CLI (`mariner-fe` on npm)
- `playground/` — Example apps and test environment
- `fleet.config.json` — Fleet mode app grouping config

**Package manager**: pnpm (workspaces defined in `pnpm-workspace.yaml`)

## Key Concepts

- **Navigator**: Each microfrontend exports a `navigator` object via `navigator.ts/js` — the entry point for the app
- **Mariner Config**: Each microfrontend has a `mariner.config.ts/js` defining its settings via `defineMarinerConfig()`
- **Virtual Modules**: Apps import from other apps using `navigator:<appname>` syntax (e.g., `import { pinia } from 'navigator:shared'`)
- **Fleet**: Groups of apps configured together in `fleet.config.json`

## Commands

```bash
# Root scripts
pnpm client:index          # Serve static test client on default port
pnpm client:build          # Serve built playground on port 3000

# Core package (from packages/mariner)
pnpm start                 # Run CLI via tsx
pnpm start:build           # Run build command
pnpm start:generate        # Run type generation
pnpm dev                   # Dev mode with nodemon
pnpm build                 # Build the framework with unbuild
```

## Code Style

- Prettier: 120 char width, single quotes, no semicolons
- ESLint: `prettier/prettier` enforced, no unused vars, prefer `type` over `interface`
- 2-space indentation (`.editorconfig`)
- TypeScript with `ESNext` target, `Bundler` module resolution, strict mode

## Environment

- Node version specified in `.nvmrc`
- Env vars prefixed with `MARINER_` are framework-level
- App env vars prefixed with `VITE_` are exposed to client code

## Generated Files

- `.mariner/` directories contain generated type definitions — do not edit manually
- `playground/client/files/` contains built navigator assets
