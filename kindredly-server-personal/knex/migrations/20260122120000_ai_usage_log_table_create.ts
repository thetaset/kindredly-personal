import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ai_usage_log', (table) => {
    table.string('_id').primary();

    table.string('accountId').notNullable().index();
    table.string('userId').notNullable().index();

    // Where in the product this usage came from (chat, itemSuggest, etc.)
    table.string('feature').notNullable().index();

    // Provider/model metadata (best-effort)
    table.string('provider').notNullable().defaultTo('openai');
    table.string('model');

    // Token usage (best-effort; prefer server-reported provider usage)
    table.integer('promptTokens');
    table.integer('completionTokens');
    table.integer('totalTokens');

    table.json('meta');

    table.timestamp('createdAt').notNullable();
    table.timestamp('updatedAt').notNullable();

    table.index(['accountId', 'createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ai_usage_log');
}
