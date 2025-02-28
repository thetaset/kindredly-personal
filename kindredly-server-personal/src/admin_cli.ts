import {config} from '@/config';

import {dropAllData, dropAllTables} from '@/db/dbadmin.util';

async function main() {
  //check command line arguments

  if (process.argv.length < 3) {
    console.log('Usage: node admin_cli.js <command> [options]');
    console.log('Commands:');
    console.log('  drop_all_tables');
    console.log('  drop_all_data');
    return;
  }

  const command = process.argv[2];
  switch (command) {
    case '--drop_all_tables':
      if (config.env == 'production') {
        console.log('Not allowed in production');
        return;
      }

      await dropAllTables();
      break;
    case '--drop_all_data':
      if (config.env == 'production') {
        console.log('Not allowed in production');
        return;
      }
      await dropAllData();
      break;
    default:
      console.log('Unknown command: ' + command);
  }

  process.exit(0);
}

main();
