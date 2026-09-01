import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_log', (table) => {
    table.string('_id').primary();

    table.string('actorUserId').notNullable().index();
    table.string('actorAccountId').notNullable().index();

    table.string('action').notNullable();
    table.string('entityType').notNullable();
    table.string('entityId').notNullable();

    // IDs only. Do not store names/urls/content.
    table.json('relatedIds');

    table.timestamp('createdAt').notNullable();

    table.index(['actorAccountId', 'createdAt']);
    table.index(['actorUserId', 'createdAt']);
    table.index(['entityType', 'entityId', 'createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('audit_log');
}
