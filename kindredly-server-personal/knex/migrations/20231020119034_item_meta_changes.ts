import {Knex} from 'knex';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item', (table) => {
    table.json('meta');
    table.timestamp('metaUpdatedAt', {useTz: true});
  });
  // get cursor for all items in item_meta table
  const count = await knex('item_meta').select("").count().first()
  if (!count) return;
  const totalItems =count.count as number;
  const page = 0;
  const limit = 500;
  const pages = Math.ceil(totalItems/limit);
  for (let i = 0; i < pages; i += limit) {
    const item_metas = await knex('item_meta')
      .select('*')
      .orderBy('_id', 'asc')
      .limit(limit)
      .offset(page * limit);

    //sync meta to item table
    for (const itea_meta of item_metas) {
      console.log('itea_meta', itea_meta._id);
      if (!itea_meta?.meta) continue;
      await knex('item').where({_id: itea_meta._id}).update({meta: itea_meta.meta});
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item', (table) => {
    table.dropColumn('meta');
    table.dropColumn('metaUpdatedAt');

    // table.json('meta');
  });
}
