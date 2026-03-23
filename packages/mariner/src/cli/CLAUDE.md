# CLI

Command-line interface for Mariner, built with Commander.js 14.

## Entry Point

`main.ts` → `index.ts` — Registers all commands, prints logo, parses args. Binary exposed as `mariner` and `mariner-cli` in package.json.

## Commands (`commands/`)

- `dev` — Start dev server for all discovered microfrontends (default command)
- `build` — Build all microfrontends in parallel via worker pool
- `generate-types` — Generate `.mariner/mariner.d.ts` from navigator exports

All commands follow the pattern: `configure()` first (discovery + selection), then action message, then server creation.

## Interactive Setup (`steps/`)

- `configure.ts` — Orchestrates: mode → setup → select
- `setup.ts` — Calls `getMarinerSetup()` with ora spinner
- `select.ts` — Fleet/navigator filtering + inquirer prompts. Supports `--all`, `--navigator`, `--fleet` flags
- `mode.ts` — Prints selected mode
- `start.ts` — Prints ASCII logo
- `exit.ts` — Logs exit message, calls `process.exit()`

## Messages (`messages/`)

All CLI output strings centralized here. Uses chalk for colors, boxen for boxes.
Includes `SERVER_READY()` for the boxed dev server URL with navigator list.

## Console Output

Uses `chalk` 5.x for colors, `ora` 9.x for spinners, `boxen` 8.x for terminal boxes, `inquirer` 13.x for prompts.
