import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('family_policy_rule', (table) => {
    table.string('_id', 255).primary();

    table.string('accountId', 100).notNullable().index();
    table.jsonb('data').nullable();
    table.boolean('encrypted').notNullable().defaultTo(false);
    table.jsonb('encInfo').nullable();
    table.string('createdByUserId', 100).nullable().index();
    table.string('updatedByUserId', 100).nullable().index();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('accountId').references('_id').inTable('account');
    table.foreign('createdByUserId').references('_id').inTable('user');
    table.foreign('updatedByUserId').references('_id').inTable('user');
    table.index(
      ['accountId', 'updatedAt'],
      'idx_family_policy_rule_account_updated',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('family_policy_rule');
}