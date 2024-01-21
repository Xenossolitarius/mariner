import { program } from '../utils/commander'

program
  .command('build')
  .description('Build Micro Frontends')
  .action(() => {
    console.log('build')
  })
