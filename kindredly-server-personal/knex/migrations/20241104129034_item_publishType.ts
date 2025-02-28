import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("item", (table) => {
    table.text("publishType");
    table.jsonb("publishConfig")
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("item", (table) => {
    table.dropColumn("publishType");
    table.dropColumn("publishConfig");
  });
}
