#!/usr/bin/env node

import { showStartingLogo } from './messages/start'
// import { help as helpMessage } from './messages/help'
import './commands'

import { program } from './utils/commander'
import { getSails } from '@mariner/config'

showStartingLogo()

console.log(process.argv)
console.log(process.cwd())

await getSails()

// TODO: scan

program.parse()
console.log('finish')
