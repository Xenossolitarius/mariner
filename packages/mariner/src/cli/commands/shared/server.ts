import { Command } from 'commander'
import { ConfigEnv } from 'vite'

// Wrapper function allowing us to retain TS types
export const options = (program: Command) =>
  program
    .option('-f, --fleet [fleet]', 'Specify the fleet')
    .option('-a, --all', 'Select all navigators (overrides fleet)')
    .option('-m, --mode <mode>', 'Specify the mariner mode')
    .option('-n, --navigator <navigator>', 'Specify single navigator')
    .option('-b, --rootBase <base>', 'Specify base path from which the navigators are served')
    .option('-t, --threads <num>', 'Number of parallel threads (only build and generate', parseInt)
    .option('-d, --debug', 'Debug (dev only)')

// I almost went to ask Alice...
export type SharedOptions = Parameters<Parameters<ReturnType<typeof options>['action']>[0]>[0]
export type ServerCommandOptions = ConfigEnv & SharedOptions
