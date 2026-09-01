import {Knex} from 'knex';

/**
 * Adds the `sourceInfo` (kindredly.provenance.v1) JSON column to `item` and
 * `published`. The code already reads/writes it — content_loader copies manifest
 * provenance onto Published.sourceInfo, import/export round-trips it, and it is a
 * saveable item attribute — but the column was never created (the "sourceInfo
 * import gap" fix shipped code without the migration). Admin feed imports failed
 * with: column "sourceInfo" of relation "published" does not exist.
 *
 * jsonb to match the existing `data`/`meta`/`sysInfo` columns on these tables.
 */
export async function up(knex: Knex): Promise<void> {
  for (const tableName of ['item', 'published']) {
    const exists = await knex.schema.hasColumn(tableName, 'sourceInfo');
    if (!exists) {
      await knex.schema.alterTable(tableName, (table) => {
        table.jsonb('sourceInfo');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of ['item', 'published']) {
    const exists = await knex.schema.hasColumn(tableName, 'sourceInfo');
    if (exists) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('sourceInfo');
      });
    }
  }
}
