import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_perm', function (table) {
    table.boolean('notInLibrary').notNullable().defaultTo(false);
  });

  // Backfill from legacy `inLibrary` if it was ever used.
  // - inLibrary=true  => notInLibrary=false
  // - inLibrary=false => notInLibrary=true
  // - inLibrary=null  => leave default (false)
  await knex('user_perm')
    .whereNotNull('inLibrary')
    .update({
      notInLibrary: knex.raw('NOT "inLibrary"'),
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_perm', function (table) {
    table.dropColumn('notInLibrary');
  });
}
