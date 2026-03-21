# Setup

Project discovery and workspace scanning utilities.

## Purpose

Finds all microfrontend projects in the monorepo by scanning for `mariner.config.ts/js` files. Loads and validates each project's configuration, resolves paths, and builds the project registry used by dev server and build system.

## Key Behavior

- Scans directories defined in `pnpm-workspace.yaml`
- Filters projects by fleet config when in fleet mode
- Resolves navigator file paths for each project
- Provides the project list to CLI commands
