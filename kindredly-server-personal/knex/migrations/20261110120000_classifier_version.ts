import type {Knex} from 'knex';

/**
 * CLS-3 (docs/trackers/classifier-loop-tracker.md): classifier versions on the server.
 *
 * `classifier_version` is one row per saved version. The document itself is written once to the
 * published file store at `fileKey` and never rewritten; `contentHash` is the sha256 of exactly the
 * JSON that was written. 'v1' is bundled in every app and has no row.
 *
 * `classifier_activation` is both the active pointer and the activation log: the active version is
 * the newest row (highest `_id`), so activating is a single insert, and there is never a moment with
 * no active version or two. With no rows the active version is the bundled 'v1'. No foreign key to
 * `classifier_version`, because activating the bundled 'v1' is allowed and it has no row.
 *
 * Nothing deletes from either table: a version is never removed, and the log is the history.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('classifier_version'))) {
    await knex.schema.createTable('classifier_version', (table) => {
      /** 'v2', 'v3', … assigned by the server. */
      table.string('_id', 32).primary();
      table.string('parent', 32).nullable();
      table.integer('schema').notNullable();
      table.string('textModel', 120).notNullable();
      table.text('notes').nullable();
      table.string('fileKey', 255).notNullable();
      table.string('contentHash', 64).notNullable();
      table.string('createdBy', 255).nullable();
      table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
      table.index('createdAt', 'idx_classifier_version_created');
    });
  }

  if (!(await knex.schema.hasTable('classifier_activation'))) {
    await knex.schema.createTable('classifier_activation', (table) => {
      table.increments('_id').primary();
      table.string('versionId', 32).notNullable();
      table.string('activatedBy', 255).nullable();
      table.text('reason').nullable();
      table.timestamp('activatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('classifier_activation');
  await knex.schema.dropTableIfExists('classifier_version');
}
