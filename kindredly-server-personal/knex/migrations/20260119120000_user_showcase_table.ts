import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_showcase', (table) => {
    table.string('_id', 255).primary().index();
    table.string('userId', 255).notNullable().unique().index();
    table.jsonb('entries');
    table.jsonb('config');
    table.boolean('publicEnabled').notNullable().defaultTo(false);
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true });

    table.foreign('userId').references('_id').inTable('user');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_showcase');
}
