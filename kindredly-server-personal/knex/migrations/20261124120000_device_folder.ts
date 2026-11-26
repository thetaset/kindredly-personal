import {Knex} from 'knex';

/**
 * Device folders (HAT-1321, docs/proposals/device-folders.md): a folder on a computer running the
 * Companion, shared with the family or chosen people. The files never reach the server.
 *
 * device_folder: one shared folder. `name` is the display name the guardian typed, never the path;
 * the path stays on the host. `hostName` is the computer's name as the Companion reported it. `hostDeviceId` is the Companion that serves it, and only that device's
 * token may answer for it. `wholeFamilyRole` is set when the whole family may open it.
 *
 * device_folder_member: a named person and their role.
 *
 * device_folder_key: the folder key sealed by the host to one person's public key, for everyone who
 * may open the folder (named or the whole family). The server cannot open it.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('device_folder', (table) => {
    table.string('_id', 255).primary();
    table.string('accountId', 255).notNullable().index();
    table.string('ownerUserId', 255).notNullable();
    table.string('hostDeviceId', 255).notNullable().index();
    table.string('name', 120).notNullable();
    table.string('hostName', 120).nullable();
    table.string('wholeFamilyRole', 16).nullable();
    table.boolean('uploadsAllowed').notNullable().defaultTo(false);
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('stoppedAt', {useTz: true}).nullable();
  });
  await knex.schema.createTable('device_folder_member', (table) => {
    table.string('folderId', 255).notNullable().references('_id').inTable('device_folder').onDelete('CASCADE');
    table.string('userId', 255).notNullable().index();
    table.string('role', 16).notNullable();
    table.primary(['folderId', 'userId']);
  });
  await knex.schema.createTable('device_folder_key', (table) => {
    table.string('folderId', 255).notNullable().references('_id').inTable('device_folder').onDelete('CASCADE');
    table.string('userId', 255).notNullable().index();
    table.text('wrappedKey').notNullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.primary(['folderId', 'userId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('device_folder_key');
  await knex.schema.dropTableIfExists('device_folder_member');
  await knex.schema.dropTableIfExists('device_folder');
}
