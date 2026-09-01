import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('passkey_credential', (table) => {
    table.string('_id', 255).primary();
    table.string('userId').notNullable().index();
    table.string('accountId'); // Optional account association
    table.string('credentialId').notNullable().unique();
    table.text('publicKey').notNullable(); // Base64URL encoded COSE public key
    table.specificType('transports', 'text[]'); // Array of transport types ('internal', 'hybrid', 'usb')
    table.boolean('prfSupported').defaultTo(false); // Whether PRF extension is supported
    table.string('deviceName'); // User-friendly name for this passkey (e.g., "MacBook Pro")
    table.integer('signCount').notNullable().defaultTo(0); // Signature counter for replay prevention
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('lastUsedAt', {useTz: true});
    table.boolean('disabled').defaultTo(false); // Soft delete flag

    // Index for looking up passkeys by userId
    table.index(['userId', 'credentialId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('passkey_credential');
}
