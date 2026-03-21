# Config

Configuration schema, defaults, and validation for Mariner.

## Overview

- `defineMarinerConfig()` — Type-safe config helper used in `mariner.config.ts` files
- Merges Mariner defaults with user config using `defu` (first argument wins)
- Returns a Vite `defineConfig()` function

## Mariner Defaults

Applied via `defu` (won't be overwritten by user config):
- `build.manifest: true`
- `build.modulePreload.polyfill: false`
- `build.rolldownOptions.input: 'navigator'`
- `build.rolldownOptions.preserveEntrySignatures: 'exports-only'`

## Config Files

Each microfrontend defines a `mariner.config.ts` (or `.js`) exporting its configuration via `defineMarinerConfig()`. The core package discovers these by scanning workspace directories.

## Fleet Config

`fleet.config.json` at root level groups apps into fleets for coordinated dev/build operations. Validated with AJV schema.
