#!/usr/bin/env node

import { start } from './steps/start'
// import { help as helpMessage } from './messages/help'
import './commands'

import { program } from './utils/commander'
import { search } from './steps/search'
import { select } from './steps/select'

export const run = async () => {
  start()

  console.log(process.cwd())

  const frigates = await search()

  const selectedFrigates = await select(frigates)

  console.log(selectedFrigates)

  // TODO: scan

  program.parse()
  console.log('finish')
}
