import {Knex} from 'knex';

/**
 * Extra AI usage a Plus family buys, on the same grant table staff grants use.
 *
 * NOTHING READS THESE COLUMNS. Buying extra AI usage was built in b44954bed and removed the next
 * day: the founder deferred it (AIR-15 in docs/trackers/ai-inference-routing-tracker.md). The file
 * stays because that commit reached main, and knex refuses to run against a database that recorded
 * a migration whose file is gone. Restoring the feature reuses both columns as they are.
 *
 * - `externalRef`: the payment a bought grant came from (a Stripe PaymentIntent id). Unique, so
 *   the webhook and the page that confirms the payment can both try to add the grant and only
 *   one row results. Null for staff grants; Postgres allows any number of nulls under a unique
 *   constraint.
 * - `refundedMicroUsd`: how much of the grant refunds have taken back so far, so a refund event
 *   Stripe delivers twice takes nothing the second time.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ai_extra_usage_grant', (table) => {
    table.string('externalRef').nullable().unique();
    table.bigInteger('refundedMicroUsd').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ai_extra_usage_grant', (table) => {
    table.dropUnique(['externalRef']);
    table.dropColumn('externalRef');
    table.dropColumn('refundedMicroUsd');
  });
}
