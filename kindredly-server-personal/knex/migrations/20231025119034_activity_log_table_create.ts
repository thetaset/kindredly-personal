import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable('user_activity_log', (table) => {
    table.string('_id').primary();
    table.string('userId').index();
    table.string('clientId')
    table.string('monitorId')
    table.json("data")
    table.timestamp('createdAt').notNullable();
    table.timestamp('updatedAt').notNullable();
    
    table.boolean('complete').defaultTo(false);

    table.boolean('encrypted').defaultTo(false);
    table.json('encInfo');


    table.index(['userId', 'createdAt', 'updatedAt']);


  });


}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_activity_log');
}
