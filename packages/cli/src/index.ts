#!/usr/bin/env node

import { loadConfigFromFile, createServer } from 'vite'
import { start } from './steps/start'
import './commands'

// import { program } from './utils/commander'
import { search } from './steps/search'
import { select } from './steps/select'

export const run = async () => {
  start()

  console.log(process.cwd())

  const configs = await search()

  const selectedConfigs = await select(configs)

  console.log(selectedConfigs)

  const file = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    `${selectedConfigs[0].root}/mariner.config.ts`,
    selectedConfigs[0].root,
  )
  if (!file) return

  console.log(file)

  file.config.root = selectedConfigs[0].root

  if (file.config.build?.rollupOptions?.input) {
    file.config.build.rollupOptions.input = `./navigator.ts`
  }

  const server = await createServer(file.config)

  console.log(server)

  await server.listen(3000)
  server.printUrls()
  // program.parse()
  console.log('finish')
}
