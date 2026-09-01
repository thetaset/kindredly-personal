import { Knex } from 'knex';

/**
 * Make the (dormant) embedding_vector_cache encryption-ready.
 *
 * Adds `encInfo` (decryption metadata: wrapped key + iv) and an `encrypted` flag. The existing
 * `embedding` jsonb column now holds an opaque encrypted blob ({encryptedData, iv}) instead of a
 * plaintext number[]. The server stays crypto-blind — it never sees the plaintext vector.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('embedding_vector_cache', (table) => {
    table.jsonb('encInfo').nullable();
    table.boolean('encrypted').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('embedding_vector_cache', (table) => {
    table.dropColumn('encInfo');
    table.dropColumn('encrypted');
  });
}
