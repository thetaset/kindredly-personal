import type {Knex} from 'knex';

/**
 * CWS-3 (docs/trackers/curator-workspace-tracker.md): every curator action on a catalog item is
 * recorded on the item: who, what, when. The curator page lists them, newest first.
 *
 * Not `audit_log`: that one is a family's own record, purged after 90 days, and skips any request
 * with no account. No foreign key to `published`, so the record outlives a deleted item; a curator
 * deleting an item is exactly the action that most needs to stay on record.
 *
 * `detail` holds field names, states and reasons, never page content.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('published_action_log')) return;
  await knex.schema.createTable('published_action_log', (table) => {
    table.string('_id', 255).primary();
    table.string('publishedId', 255).notNullable();
    /** 'curator' | 'admin' | 'ai' | 'monitor' */
    table.string('actorKind', 20).notNullable();
    /** The curator's public profile id; null for the monitor. */
    table.string('actorPublicId', 255).nullable();
    table.string('actorUserId', 255).nullable();
    table.string('action', 40).notNullable();
    table.jsonb('detail').nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.index(['publishedId', 'createdAt'], 'idx_published_action_log_published_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('published_action_log');
}
