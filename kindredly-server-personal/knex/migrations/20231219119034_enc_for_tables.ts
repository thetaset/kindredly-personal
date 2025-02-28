import {Knex} from 'knex';

const tableNames = ['item', 'item_relation', 'post', 'comment', 'notification'];

export async function up(knex: Knex): Promise<void> {
  for (const tableName of tableNames) {
    await knex.schema.alterTable(tableName, (table) => {
      table.boolean('encrypted').defaultTo(false);
      table.json('encInfo');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of tableNames) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn('encrypted');
      table.dropColumn('encInfo');
    });
  }
}
