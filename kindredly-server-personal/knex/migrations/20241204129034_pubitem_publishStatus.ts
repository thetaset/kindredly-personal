import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("published", (table) => {
    table.string("pubStatus")
    table.timestamp("pubStatusUpdated")
    
    // add index
    table.index("publishType");
    table.index("pubStatus");
    table.index("pubStatusUpdated");

  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("published", (table) => {
    table.dropColumn("pubStatus");
    table.dropColumn("pubStatusUpdated");

    // remove index
    table.dropIndex("publishType");
    table.dropIndex("pubStatus");
    table.dropIndex("pubStatusUpdated");

  });
}
