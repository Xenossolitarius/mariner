# CLI

Command-line interface for Mariner, built with Commander.js.

## Entry Point

`main.ts` — Registers all commands and parses args. Binary exposed as `mariner` and `mariner-cli` in package.json.

## Commands (`commands/`)

- `dev` — Start dev server for all discovered microfrontends
- `build` — Build all microfrontends in parallel via worker pool
- `generate-types` — Generate `.mariner/mariner.d.ts` from navigator exports

## Interactive Setup (`steps/`)

The `setup` command walks users through project configuration with interactive prompts (inquirer). Steps include project selection, mode configuration, and config file generation.

## Console Output

Uses `chalk` for colors, `ora` for spinners, `boxen` for terminal boxes.
