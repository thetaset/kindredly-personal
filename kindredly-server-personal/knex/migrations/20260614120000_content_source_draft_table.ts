import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('content_source_draft', (table) => {
    table.string('_id', 255).primary();

    table.string('label', 255).nullable();
    table.string('status', 40).notNullable().defaultTo('open');
    table.jsonb('candidates').notNullable().defaultTo('[]');
    table.string('createdByUserId', 100).nullable().index();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['status', 'updatedAt'], 'idx_content_source_draft_status_updated');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('content_source_draft');
}
