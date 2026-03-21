# Config

Configuration schema, defaults, and validation for Mariner.

## Overview

- `defineMarinerConfig()` — Type-safe config helper used in `mariner.config.ts` files
- Schema validated with AJV at load time
- Defaults merged using `defu` (deep defaults)

## Config Files

Each microfrontend defines a `mariner.config.ts` (or `.js`) exporting its configuration. The core package discovers these by scanning workspace directories.

## Fleet Config

`fleet.config.json` at root level groups apps into fleets for coordinated dev/build operations.
