import { Command } from '@commander-js/extra-typings'

export const options = (program: Command) => program.option('-m, --mode <mode>', 'Specify the mariner mode')
