import { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("notification", (table) => {
    table.timestamp("readAt");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("notification", (table) => {
    table.dropColumn("readAt");
  });
}
