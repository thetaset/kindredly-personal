import knex from '@/db/knex_config';

import {Knex} from 'knex';

export function listTables(knex: Knex) {
  let query: string;
  let bindings: string[];

  switch (knex.client.constructor.name) {
    case 'Client_PG':
      query =
        'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_catalog = ?';
      bindings = [knex.client.database()];
      break;
    case 'Client_SQLite3':
      query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
      break;
  }

  return knex.raw(query, bindings).then(function (results) {
    return results.rows.map((row) => row.table_name);
  });
}

export async function dropAllTables() {
  console.log('Dropping tables');
  for (const tableName of await listTables(knex)) {
    if (![].includes(tableName)) {
      console.log('Removing table : ', tableName);
      await knex.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }
  }
  console.log('Dropped tables');
}

export async function dropAllData() {
  // Deletes ALL existing entries
  console.log('Dropping data');
  for (const tableName of await listTables(knex)) {
    if (!['knex_migrate', 'knex_migrate_lock'].includes(tableName)) {
      await knex(tableName).del();
    }
  }
}
