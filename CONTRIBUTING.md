# Contributing to Mariner

Thanks for your interest in contributing to Mariner! This guide covers everything you need to get started.

## Prerequisites

- Node.js >= 20.19 (see `.nvmrc`)
- pnpm (latest)
- Git

## Setup

```bash
git clone https://github.com/Xenossolitarius/mariner.git
cd mariner
pnpm install
```

## Development workflow

1. Create a branch from `main`:

```bash
git checkout -b feat/my-feature
```

2. Make your changes in `packages/mariner/src/`.

3. Run the dev server to test against the playground apps:

```bash
pnpm dev
```

4. Run checks before pushing:

```bash
pnpm check          # lint + format + typecheck + unit tests
pnpm test:integration   # build integration tests
pnpm test:e2e           # Playwright E2E tests
```

Or run the full suite at once:

```bash
pnpm check:full     # all of the above
```

5. Push and open a PR against `main`.

## Branch protection

The `main` branch is protected. All changes go through pull requests with:

- Required status checks: lint, typecheck, unit tests, integration tests, E2E tests
- At least one approval required
- Branch must be up to date before merging

## Project structure

```
packages/mariner/     Core framework library & CLI
playground/           Example apps for testing
docs/                 VitePress documentation site
```

Changes to source code go in `packages/mariner/src/`. The playground apps in `playground/` are used for testing and should reflect real-world usage.

## Running tests

| Command | What it runs |
|---|---|
| `pnpm test` | Unit tests (fast, ~343 tests) |
| `pnpm test:coverage` | Unit tests with V8 coverage |
| `pnpm test:integration` | Build integration tests (~136 tests) |
| `pnpm test:e2e` | Playwright E2E tests (~106 tests) |
| `pnpm check` | Lint + format + typecheck + unit tests |
| `pnpm check:full` | Everything above combined |

## Code style

- Single quotes, no semicolons, 120 char width
- 2-space indentation
- Prefer `type` over `interface`
- No unused variables (underscore prefix allowed: `_unused`)
- Format is enforced by oxfmt — run `pnpm format` to fix

## Writing tests

- **Unit tests**: Co-located with source files (`*.test.ts`). Use vitest.
- **Integration tests**: In `src/__build-integration__/`. Test real builds against the playground.
- **E2E tests**: In `e2e/`. Use Playwright. Shared helpers are in `e2e/helpers.ts`.

If you add a new feature, add tests at the appropriate level. If you add a new playground app, update `fleet.config.json` and add E2E coverage.

## Commits

Write concise commit messages that describe what changed and why. No strict format enforced, but prefer:

- `fix: resolve cargo injection in shared fleet mode`
- `feat: add useCargo() support in Vue components`
- `docs: update API reference for serve command`

## Releases

Releases are handled by maintainers. The publish workflow triggers on GitHub release creation:

1. A GitHub release is created with a tag like `v1.2.0`
2. CI runs tests and builds the package
3. The package is published to npm with the version from the tag

## Documentation

Docs live in `docs/` and use VitePress. To preview locally:

```bash
pnpm docs:dev
```

Docs are auto-deployed to GitHub Pages on push to `main` when files in `docs/` change.

## Questions?

Open an issue on GitHub if you have questions or need help getting started.
