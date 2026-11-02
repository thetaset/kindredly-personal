import {Knex} from 'knex';

/**
 * OAuth sign-in for Connected AI apps (HAT-616, MCP-20). Claude on the web, Claude Desktop's
 * connectors and ChatGPT add a remote MCP server by URL and sign in with OAuth.
 *
 * mcp_relay_oauth_client: an AI app that registered itself (Dynamic Client Registration). Apps that
 * use a Client ID Metadata Document are not stored: their metadata is fetched from their URL.
 *
 * mcp_relay_channel gains the refresh token of a connection made by OAuth, as SHA-256 hashes: the
 * current one and the one it replaced, so a replayed old token is recognised and ends the connection.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mcp_relay_oauth_client', (table) => {
    table.string('_id', 255).primary();
    table.string('clientName', 255).notNullable();
    table.jsonb('redirectUris').notNullable().defaultTo('[]');
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('mcp_relay_channel', (table) => {
    table.text('oauthClientId').nullable();
    table.string('refreshHash', 128).nullable().unique();
    table.string('prevRefreshHash', 128).nullable().index();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('mcp_relay_channel', (table) => {
    table.dropColumn('prevRefreshHash');
    table.dropColumn('refreshHash');
    table.dropColumn('oauthClientId');
  });
  await knex.schema.dropTableIfExists('mcp_relay_oauth_client');
}
