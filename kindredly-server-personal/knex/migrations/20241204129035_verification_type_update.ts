import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("verification", (table) => {
    table.string("type")
    table.string("filterKey")
    table.index(["type", "filterKey"]); 
    
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("published", (table) => {
    table.dropColumn("type");
    table.dropColumn("filterKey");
    table.dropIndex(["type", "filterKey"]);

  });
}
