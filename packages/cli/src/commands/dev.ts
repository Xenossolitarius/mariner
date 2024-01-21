import { program } from '../utils/commander'

program
  .command('dev')
  .description('Serve Micro Frontends')
  .action(() => {
    console.log('dev')
  })
