#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

import { run } from '../dist/cli/index.mjs'


globalThis.marinerCliEntry = globalThis.marinerCliEntry ?? dirname(fileURLToPath(import.meta.url))

run()
