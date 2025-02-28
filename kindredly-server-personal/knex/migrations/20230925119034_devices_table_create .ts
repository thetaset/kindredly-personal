import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('client_info', (table) => {
    table.string('_id', 255).primary();
    table.string('userId').index();
    table.string('clientId'); // generated on client side
    table.string('clientVersion');

    table.string('appId'); // kindred
    table.string('appType');  // android, webapp, extension, ios
    table.string('appVersion');
    
    table.string('deviceName'); //User specified
    table.string('deviceId'); 
    table.string('deviceType');
    table.string('deviceToken');

    table.string('lastIp');
    table.timestamp('lastLogin', {useTz: true})
    table.timestamp('lastLogout', {useTz: true})
    table.timestamp('lastSeen', {useTz: true})

    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('client_info');
}
