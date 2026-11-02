import type {Knex} from 'knex';

/**
 * AIM-1 (docs/trackers/ai-made-items-tracker.md): what a connected AI app says it is when it starts a
 * session — the MCP `initialize` request's `clientInfo` (name, version, title) — kept on its
 * connection with the time it was last changed. About the app only: nothing about a call.
 */
export async function up(knex: Knex): Promise<void> {
  const hasInfo = await knex.schema.hasColumn('mcp_relay_channel', 'clientInfo');
  const hasAt = await knex.schema.hasColumn('mcp_relay_channel', 'clientInfoAt');
  if (hasInfo && hasAt) return;
  await knex.schema.alterTable('mcp_relay_channel', (table) => {
    if (!hasInfo) table.jsonb('clientInfo').nullable();
    if (!hasAt) table.timestamp('clientInfoAt', {useTz: true}).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('mcp_relay_channel', (table) => {
    table.dropColumn('clientInfo');
    table.dropColumn('clientInfoAt');
  });
}
