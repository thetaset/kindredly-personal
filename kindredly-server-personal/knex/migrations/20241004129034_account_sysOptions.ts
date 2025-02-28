import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("account", (table) => {
    table.jsonb("sysOptions");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("account", (table) => {
    table.dropColumn("sysOptions");
  });
}
