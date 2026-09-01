import knex from '@/db/knex_config';

import {Knex} from 'knex';

/**
 * Dialect-specific admin helpers, used only by `admin_cli --drop_all_tables`
 * and the dev database reset. Never on a request path.
 */

/** Thrown rather than passing an undefined query to knex, which reports it unhelpfully. */
export class UnsupportedDialectError extends Error {
  constructor(client: string) {
    super(`dbadmin.util has no table-listing query for knex client '${client}'`);
    this.name = 'UnsupportedDialectError';
  }
}

export async function listTables(knex: Knex): Promise<string[]> {
  const client = knex.client.constructor.name;
  let query: string;
  let bindings: string[] | undefined;

  switch (client) {
    case 'Client_PG':
      query =
        'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_catalog = ?';
      bindings = [knex.client.database()];
      break;
    case 'Client_SQLite3':
    case 'Client_BetterSQLite3':
      query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
      break;
    default:
      // Previously this fell through with `query` undefined, so an unknown
      // dialect reached knex.raw(undefined) and failed somewhere unrelated.
      throw new UnsupportedDialectError(client);
  }

  const results = await knex.raw(query, bindings as string[]);

  // node-postgres wraps rows in `{rows: [...]}`; the sqlite drivers return a
  // plain array. The SQLite branch above has existed for a while and could
  // never have worked, because this line only ever read `.rows`.
  const rows = Array.isArray(results) ? results : results?.rows;
  return (rows || []).map((row: {table_name: string}) => row.table_name);
}

export async function dropAllTables() {
  console.log('Dropping tables');
  // CASCADE is Postgres-only syntax; SQLite rejects it outright. SQLite has no
  // cross-table dependency to cascade through here anyway - foreign keys are
  // enforced per-connection and the whole schema is going.
  const cascade = knex.client.constructor.name === 'Client_PG' ? ' CASCADE' : '';
  for (const tableName of await listTables(knex)) {
    if (![].includes(tableName)) {
      console.log('Removing table : ', tableName);
      await knex.raw(`DROP TABLE IF EXISTS "${tableName}"${cascade}`);
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
