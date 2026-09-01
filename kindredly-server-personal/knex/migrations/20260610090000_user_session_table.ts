import { Knex } from 'knex';

// Server-side registry for the sessionId already embedded in every JWT.
// Sessions never expire on their own — rows exist so tokens can be revoked
// (password change, signout, admin action). Legacy tokens are lazily adopted
// on first authenticated request.
// No FK to user: session rows must never block user/account deletion flows.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_session', (table) => {
    table.string('_id', 100).primary(); // sessionId claim from the JWT
    table.string('userId', 100).notNullable();
    table.string('accountId', 100).nullable();
    table.string('appType', 50).nullable();
    table.string('clientId', 150).nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('lastSeenAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('revokedAt', { useTz: true }).nullable();
    table.string('revokedReason', 100).nullable();

    table.index(['userId', 'revokedAt'], 'idx_user_session_user_revoked');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_session');
}
