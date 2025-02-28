import {Knex} from 'knex';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notification', (table) => {
    table.index(['targetKey']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notification', (table) => {
    table.dropIndex(['targetKey']);
    
  });
}
