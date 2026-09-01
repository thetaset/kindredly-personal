import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('published', 'ownerUserId');
  if (!hasColumn) {
    await knex.schema.alterTable('published', (table) => {
      table.string('ownerUserId').nullable();
    });
  }

  // Helpful for friends-only checks and internal lookups
  await knex.raw('CREATE INDEX IF NOT EXISTS published_owneruserid_idx ON published("ownerUserId")');
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('published', 'ownerUserId');
  if (hasColumn) {
    await knex.schema.alterTable('published', (table) => {
      table.dropColumn('ownerUserId');
    });
  }

  await knex.raw('DROP INDEX IF EXISTS published_owneruserid_idx');
}
