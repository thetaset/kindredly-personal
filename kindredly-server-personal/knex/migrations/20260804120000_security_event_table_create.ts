import {Knex} from 'knex';

/**
 * Append-only ledger of security-relevant events (failed logins, rate-limit breaches,
 * SSRF rejections, budget stops, privileged config changes).
 *
 * Privacy rules, inherited from `audit_log` and enforced in SecurityEventService:
 *   - No raw IP addresses. `ipHash` is an HMAC keyed with a server secret and is only
 *     comparable to other rows in this table; `ipPrefix` groups a subnet for triage.
 *   - No URLs, titles, message bodies, or any decrypted content. `detail` holds counts,
 *     status codes and IDs only.
 *
 * Rows are coalesced before insert, so one row can represent many occurrences —
 * `detail.count` carries the multiplier. A burst of 4,000 identical 429s becomes a
 * handful of rows, not 4,000.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('security_event', (table) => {
    table.string('_id').primary();

    // Stable dotted key, e.g. `auth.login_failed`. See SECURITY_EVENT_TYPES.
    table.string('eventType').notNullable();

    // 'info' | 'warn' | 'critical'
    table.string('severity').notNullable().defaultTo('info');

    // Null for unauthenticated events — a failed login has no verified actor by definition.
    table.string('actorUserId').nullable();
    table.string('actorAccountId').nullable();
    table.string('clientId').nullable();

    // HMAC of the source IP. Never the address itself.
    table.string('ipHash').nullable();
    // Coarse grouping: /24 for IPv4, /48 for IPv6.
    table.string('ipPrefix').nullable();

    // Normalized route path. Never the query string — it carries tokens and user input.
    table.string('route').nullable();

    // Counts, codes and IDs only.
    table.json('detail');

    table.timestamp('createdAt').notNullable();

    table.index(['createdAt']);
    table.index(['eventType', 'createdAt']);
    table.index(['actorAccountId', 'createdAt']);
    table.index(['ipHash', 'createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('security_event');
}
