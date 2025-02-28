import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published', (table) => {
    table.timestamp('availableAt');
    table.jsonb('attachments');
    table.string('subType');
    table.jsonb('info')
    table.integer('statSubCount').defaultTo(0);
    table.integer('statViewCount').defaultTo(0);

  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published', (table) => {
    table.dropColumn('availableAt');
    table.dropColumn('attachments');
    table.dropColumn('subType');
    table.dropColumn('info')
    table.dropColumn('statSubCount');
    table.dropColumn('statViewCount');
  });
}
