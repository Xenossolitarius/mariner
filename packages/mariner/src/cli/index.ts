#!/usr/bin/env node
import { program } from 'commander'
import { start } from './steps/start'

import './commands'
import { exit } from './steps/exit'
import { WORKING_IN } from './messages'

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

globalThis.marinerCliEntry = globalThis.marinerCliEntry ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const run = async () => {
  WORKING_IN(process.cwd())

  start()

  program.parse()
}

// Force exit child processes like multiple servers
process.on('SIGINT', () => {
  exit()
})
