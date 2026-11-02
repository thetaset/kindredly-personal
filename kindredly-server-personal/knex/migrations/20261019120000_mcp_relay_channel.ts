import {Knex} from 'knex';

/**
 * Connected AI apps (HAT-616, docs/proposals/connected-ai-apps.md): an outside AI app reaches one of
 * an adult's open devices through the server, which only passes the call along.
 *
 * mcp_relay_channel: one connected AI app. `keyHash` is a SHA-256 of the credential, shown once.
 * `wrappedKey` (end-to-end encrypted connections only) is the channel key encrypted with the adult's
 * own secret key; the server cannot open it. `lastUsedAt` is a date, not a time, and it is the only
 * thing kept about calls: no tool, no arguments, no result.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mcp_relay_channel', (table) => {
    table.string('_id', 255).primary();
    table.string('accountId', 255).notNullable().index();
    table.string('userId', 255).notNullable().index();
    table.string('clientName', 255).notNullable();
    table.boolean('sealed').notNullable().defaultTo(false);
    table.string('keyHash', 128).nullable().unique();
    table.text('wrappedKey').nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.date('lastUsedAt').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mcp_relay_channel');
}
