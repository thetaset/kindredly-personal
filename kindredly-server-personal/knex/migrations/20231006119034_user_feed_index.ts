import {Knex} from 'knex';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_feed', (table) => {
    table.index(['refId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_feed', (table) => {
    table.dropIndex(['refId']);
    
  });
}
