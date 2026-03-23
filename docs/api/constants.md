# Constants

Exported from `mariner-fe`.

## FILES

File naming conventions used by Mariner for project discovery and output.

```ts
const FILES = {
  config: 'mariner.config', // Config file name (without extension)
  navigator: 'navigator', // Navigator entry file name
  fleet: 'fleet.config.json', // Fleet configuration file
  typeDir: '.mariner', // Generated types directory
  typeFile: 'mariner.d.ts', // Generated type definitions file
  cargo: 'cargo', // Cargo data file name (without extension)
}
```

## NAVIGATOR_MODULE_PREFIX

The prefix used for cross-app virtual module imports.

```ts
const NAVIGATOR_MODULE_PREFIX = 'navigator:'
```

Apps import from each other using this prefix:

```ts
import { pinia } from 'navigator:shared'
```

## MARINER_ENV_PREFIX

The prefix for framework-level environment variables.

```ts
const MARINER_ENV_PREFIX = 'MARINER_'
```

## CARGO_GLOBAL

The variable name used for cargo data injection in SSR mode.

```ts
const CARGO_GLOBAL = '__MARINER_CARGO__'
```

## CARGO_VIRTUAL_MODULE

The virtual module identifier for cargo data.

```ts
const CARGO_VIRTUAL_MODULE = 'virtual:mariner-cargo'
```

## TEMPLATES

Internal template strings used for DOM mounting.

```ts
const TEMPLATES = {
  navigator_mount: '<-m@unt->', // Mount target placeholder
}
```

## MARINER_PROJ_DEFAULT_NAME

Fallback project name when no `mariner` field or `package.json` name is found.

```ts
const MARINER_PROJ_DEFAULT_NAME = 'mariner-fe'
```
