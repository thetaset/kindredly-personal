import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.timestamp('snoozeUntilDate');
    table.timestamp('neverRemindDate');
    table.timestamp('archivedDate');

  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.dropColumn('neverRemindDate');
    table.dropColumn('snoozeUntilDate');
    table.dropColumn('archivedDate');
  });
}
