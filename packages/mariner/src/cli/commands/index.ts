import { program } from '@commander-js/extra-typings'
import { MARINER_DESCRIPTION } from '../messages'

import './dev'
import './build'
import './generate-types'

program.name('sail').description(MARINER_DESCRIPTION).version('1.0.0')
