#!/usr/bin/env node
import { program } from '@commander-js/extra-typings'
import { start } from './steps/start'

import './commands'
import { exit } from './steps/exit'

export const run = async () => {
  // just to test the console
  process.chdir('../..')
  console.log(process.cwd())

  start()

  program.parse()
}

// Force exit child processes like multiple servers
process.on('SIGINT', () => {
  exit()
})
