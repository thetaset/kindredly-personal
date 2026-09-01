import { Knex } from 'knex';

/**
 * Generic reference-scoped state storage.
 *
 * Supports optional client-side encryption (encrypted + encInfo) and multiple rows per ref.
 *
 * Scoping:
 * - ownerType=user   (per-user state)
 * - ownerType=account (shared state within an account)
 * - ownerType=session (typically local-only; server storage allowed but should be guarded)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ref_state', (table) => {
    table.string('_id', 255).primary();

    table.string('refType', 50).notNullable().index();
    table.string('refId', 255).notNullable().index();

    table.string('ownerType', 50).notNullable().index();
    table.string('ownerId', 255).notNullable().index();

    table.string('stateKey', 255).notNullable().index();
    // Use empty-string as the canonical “no sub-key” to keep uniqueness working in Postgres.
    table.string('stateSubKey', 255).notNullable().defaultTo('');

    // The actual stored state payload (either plaintext or ciphertext blob)
    table.jsonb('data').nullable();

    // Optional client-side encryption metadata
    table.boolean('encrypted').notNullable().defaultTo(false);
    table.json('encInfo').nullable();

    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(
      ['ownerType', 'ownerId', 'refType', 'refId', 'stateKey', 'stateSubKey'],
      'uniq_ref_state_owner_ref_key',
    );
    table.index(
      ['refType', 'refId', 'ownerType', 'ownerId'],
      'idx_ref_state_ref_owner',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ref_state');
}
