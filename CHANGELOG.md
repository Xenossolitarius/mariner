# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0]

### Added

- Cargo system: server-side data injection via `useCargo()` and `cargo.ts`
- Serve mode: production Node.js server with per-request cargo injection (`mariner serve`)
- `--ssr` flag for `mariner build` to support serve mode
- Virtual module `virtual:mariner-cargo` for singleton cargo data across app files
- Tailwind CSS 4 support via `@tailwindcss/vite` plugin
- VitePress documentation site with guides, API reference, and examples
- GitHub Actions CI/CD: CI checks, npm publish on release, docs deploy
- E2E test helpers (`e2e/helpers.ts`) to reduce duplication across test files

### Changed

- `resolveCargo` plugin now uses virtual module pattern instead of inline JSON replacement
- `resolveCargo` runs after Vue compiler (removed `enforce: 'pre'`) for `.vue` file support
- Moved CLI deps (`boxen`, `chalk`, `commander`, `inquirer`, `ora`, `node-forge`) to devDependencies
- Moved `vite-plugin-dts` and `vite-plugin-css-injected-by-js` to devDependencies
- Externalized `vite-plugin-dts` from bundle — dist size reduced from 22 MB to 1.9 MB
- Widened `vite` peer dependency to `^5 || ^6 || ^7 || ^8`
- Runtime dependencies reduced from 11 to 3 (`ajv`, `defu`, `glob`)
- Added `sideEffects: false` to package.json
- Removed bogus `require` conditions from package exports (ESM-only)
- Removed redundant `typesVersions` field
- Shared fleet now uses `tailwind-vue` instead of `app2`
- Shared fleet mode: apps share a single Vite dev server

## [1.0.1] - 2025-01-15

### Added

- Fleet config validation with AJV schema

## [1.0.0] - 2025-01-01

### Added

- Initial release
- Dev server with per-app Vite middleware
- Production build with worker pool
- Vue and React navigator adapters
- Virtual module resolution (`navigator:appname`)
- Type generation (`mariner generate-types`)
- Fleet configuration
- CSS injection via `vite-plugin-css-injected-by-js`
