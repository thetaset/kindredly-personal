import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_feed', (table) => {
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.index(['userId', 'updatedAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_feed', (table) => {
    table.dropIndex(['userId', 'updatedAt']);
    table.dropColumn('updatedAt');
  });
}
