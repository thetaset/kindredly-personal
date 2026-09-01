import {Knex} from 'knex';

/**
 * Records what each AI call actually cost, in USD.
 *
 * Cost is computed and stored at write time rather than derived on read: prices change,
 * and a later price update must not silently rewrite the cost of calls already made.
 *
 * Nullable on purpose — null means "no price configured for this model", which is
 * meaningfully different from 0.00 ("this genuinely cost nothing"). Reporting that
 * conflated the two would show a healthy $0 spend for an unpriced model.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ai_usage_log', (table) => {
    table.decimal('costUsd', 12, 6).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ai_usage_log', (table) => {
    table.dropColumn('costUsd');
  });
}
