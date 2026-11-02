import {Knex} from 'knex';

/**
 * An AI curates through a narrow MCP endpoint (docs/guides/curation-agent-mcp.md).
 *
 * agent_key: the AI's own sign-in. Only a SHA-256 of the key is stored; the key is shown once,
 * when an admin makes it, and a revoked key stops working on the next call.
 *
 * curation_proposal: what the AI wants changed on a catalog item. Nothing here reaches the item
 * until a curator presses Apply; at most one pending proposal per item (a partial unique index).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agent_key', (table) => {
    table.string('_id', 255).primary();
    table.string('label', 255).notNullable();
    table.string('scope', 60).notNullable();
    table.string('keyHash', 128).notNullable().unique();
    table.string('createdBy', 100).nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('lastUsedAt', {useTz: true}).nullable();
    table.timestamp('revokedAt', {useTz: true}).nullable();
  });

  await knex.schema.createTable('curation_proposal', (table) => {
    table.string('_id', 255).primary();
    table.string('publishedId', 255).notNullable().index();
    table.string('status', 40).notNullable().defaultTo('pending');
    table.jsonb('changes').notNullable().defaultTo('{}');
    table.text('imageSourceUrl').nullable();
    table.text('reason').nullable();
    table.boolean('recommendCurated').notNullable().defaultTo(false);
    table.string('agentKeyId', 255).nullable();
    table.string('proposedBy', 255).nullable();
    table.string('decidedBy', 100).nullable();
    table.timestamp('decidedAt', {useTz: true}).nullable();
    table.text('decisionNote').nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());

    table.index(['status', 'createdAt'], 'idx_curation_proposal_status_created');
  });

  await knex.raw(
    `CREATE UNIQUE INDEX idx_curation_proposal_one_pending ON curation_proposal ("publishedId") WHERE status = 'pending'`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('curation_proposal');
  await knex.schema.dropTableIfExists('agent_key');
}
