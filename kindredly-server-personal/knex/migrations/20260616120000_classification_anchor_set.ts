import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classification_anchor_set', (table) => {
    table.increments('_id').primary();
    table.string('version', 180).notNullable().unique();
    table.string('label', 300);
    // Anchor phrases keyed by eduValue class: Record<string, string[]>.
    // Kept as jsonb so the shape can evolve without a migration.
    table.jsonb('anchors').notNullable();
    table.jsonb('metrics');
    table.string('datasetId', 180);
    table.boolean('active').notNullable().defaultTo(false);
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index('active');
    table.index('createdAt');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('classification_anchor_set');
}
