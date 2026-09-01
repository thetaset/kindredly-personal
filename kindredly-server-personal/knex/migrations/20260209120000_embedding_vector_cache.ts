import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('embedding_vector_cache', (table) => {
    table.string('_id').primary();

    table.string('accountId').notNullable().index();
    table.string('namespace').notNullable().defaultTo('default').index();
    table.string('modelId').notNullable().index();

    // Caller-provided cache key. This may be a sha256 hash, a DJB2 hash, etc.
    table.string('cacheKey').notNullable().index();

    table.integer('dimensions').notNullable();
    table.jsonb('embedding').notNullable();

    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['accountId', 'namespace', 'modelId']);
    table.index(['accountId', 'namespace', 'modelId', 'cacheKey']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('embedding_vector_cache');
}
