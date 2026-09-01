import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('user_oauth_secret')
  if (exists) return

  await knex.schema.createTable('user_oauth_secret', (t) => {
    t.string('_id').primary()
    t.string('userId').notNullable().index()
    t.string('provider').notNullable().index()
    t.jsonb('secretEnc').notNullable()
    t.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now())

    t.unique(['userId', 'provider'])
  })
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('user_oauth_secret')
  if (!exists) return
  await knex.schema.dropTable('user_oauth_secret')
}
