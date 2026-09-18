import {Knex} from 'knex';

/**
 * Hosted AI limits by 5-hour and weekly window, and extra AI usage granted by Kindredly staff.
 *
 * - `ai_limit_window`: one open window per account and kind. A window starts with the first
 *   request that uses the plan's limits and lasts its length; the row is reused when the next
 *   window starts.
 * - `ai_usage_log.billedTo`: whether a row counts toward the windows (`plan`) or was paid from
 *   extra AI usage (`extra`). Null on rows written before this, which are plan spend.
 * - `ai_extra_usage_grant` / `ai_extra_usage_debit`: a balance a family draws on once a window
 *   is used up, and what drew it down.
 *
 * The monthly budget override this replaces meant "stop" when set to 0; those accounts get the
 * explicit stop flag. Any other override value is dropped: there is no monthly budget to apply
 * it to.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ai_limit_window', (table) => {
    table.string('accountId').notNullable();
    table.string('kind').notNullable();
    table.timestamp('startedAt').notNullable();
    table.timestamp('endsAt').notNullable();
    table.primary(['accountId', 'kind']);
  });

  await knex.schema.alterTable('ai_usage_log', (table) => {
    table.string('billedTo').nullable();
    table.index(['accountId', 'billedTo', 'createdAt']);
  });

  await knex.schema.createTable('ai_extra_usage_grant', (table) => {
    table.string('_id').primary();
    table.string('accountId').notNullable().index();
    table.string('source').notNullable().defaultTo('staff');
    table.bigInteger('amountMicroUsd').notNullable();
    table.bigInteger('remainingMicroUsd').notNullable();
    table.timestamp('expiresAt').nullable();
    table.text('note').nullable();
    table.string('grantedBy').nullable();
    table.timestamp('revokedAt').nullable();
    table.timestamp('createdAt').notNullable();
    table.timestamp('updatedAt').notNullable();
  });

  await knex.schema.createTable('ai_extra_usage_debit', (table) => {
    table.string('_id').primary();
    table.string('grantId').notNullable().index();
    table.string('accountId').notNullable().index();
    table.string('usageLogId').nullable();
    table.bigInteger('amountMicroUsd').notNullable();
    table.timestamp('createdAt').notNullable();
  });

  await knex.raw(`
    UPDATE account
    SET "sysOptions" = COALESCE("sysOptions", '{}'::jsonb) || '{"aiHostedStopped": true}'::jsonb
    WHERE jsonb_typeof("sysOptions"->'aiBudgetUsdMonthly') = 'number'
      AND ("sysOptions"->>'aiBudgetUsdMonthly')::numeric = 0
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_extra_usage_debit');
  await knex.schema.dropTableIfExists('ai_extra_usage_grant');
  await knex.schema.alterTable('ai_usage_log', (table) => {
    table.dropIndex(['accountId', 'billedTo', 'createdAt']);
    table.dropColumn('billedTo');
  });
  await knex.schema.dropTableIfExists('ai_limit_window');
}
