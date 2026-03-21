# Setup

Project discovery and workspace scanning utilities.

## Purpose

Finds all microfrontend projects in the monorepo by scanning for `mariner.config.ts/js` files. Loads and validates each project's configuration, resolves paths, and builds the project registry used by dev server and build system.

## Key Behavior

- Scans directories via `glob` for `mariner.config.{ts,js}` (excludes `node_modules`, `dist`)
- Filters projects by fleet config when in fleet mode
- Resolves navigator file paths for each project (TS preferred over JS)
- Identifies JS vs TS projects via `isJs` flag
- Slugifies project names from mariner config, falls back to package.json name, then default `mariner-fe`
- Marks projects as valid only if navigator file exists

## Files

- `setup.ts` — `getMarinerSetup()`, `getMarinerProjects()`, `getMarineConfigPaths()`, `MarinerProject` type
- `fleet.ts` — Fleet config loading and AJV schema validation
- `utils.ts` — `normalizeMode()`, `loadMarinerConfigFile()`, `loadMarinerEnv()`
- `types.ts` — `MarinerOptions`, `MarinerEnvs` types

## Environment Variables

- `loadMarinerEnv(mode, root)` loads vars with `MARINER_` prefix from `.env` files
- Mode-specific overrides (`.env.test` overrides `.env` for test mode)
