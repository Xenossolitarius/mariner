import { program } from 'commander'
import { MARINER_DESCRIPTION } from '../messages'

import './dev'
import './build'
import './generate-types'

program.name('sail').description(MARINER_DESCRIPTION).version('1.0.0')
