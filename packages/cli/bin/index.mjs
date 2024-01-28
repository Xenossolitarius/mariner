#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { run } from '../dist/index.mjs'

global.__sail__ = {
  startTime: Date.now(),
  entry: fileURLToPath(import.meta.url),
}

run()
