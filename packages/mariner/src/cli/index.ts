#!/usr/bin/env node
import './setup' // runs first
import { program } from '@commander-js/extra-typings'
import { start } from './steps/start'

import './commands'
import { exit } from './steps/exit'

export const run = async () => {
  console.log(process.cwd())
  // just to test the console
  process.chdir('../../playground')
  console.log(process.cwd())

  start()

  program.parse()
}

// Force exit child processes like multiple servers
process.on('SIGINT', () => {
  exit()
})
