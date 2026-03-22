export const FILES = {
  config: 'mariner.config',
  navigator: 'navigator',
  fleet: 'fleet.config.json',
  typeDir: '.mariner',
  typeFile: 'mariner.d.ts',
  cargo: 'cargo',
}

export const CARGO_GLOBAL = '__MARINER_CARGO__'
export const CARGO_VIRTUAL_MODULE = 'virtual:mariner-cargo'
export const CARGO_RESOLVED_ID = '\0virtual:mariner-cargo'

export const TEMPLATES = {
  // special characters are not allowed on ids which acts as a light safety measure
  navigator_mount: '<-m@unt->',
}

export const MARINER_ENV_PREFIX = 'MARINER_'

export const NAVIGATOR_MODULE_PREFIX = 'navigator:'

export const MARINER_PROJ_DEFAULT_NAME = 'mariner-fe'
