import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reaction', (table) => {
    table.timestamp('readAt', { useTz: true }).nullable();
    table.index(['refType', 'refId'], 'reaction_refType_refId_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reaction', (table) => {
    table.dropIndex(['refType', 'refId'], 'reaction_refType_refId_idx');
    table.dropColumn('readAt');
  });
}
