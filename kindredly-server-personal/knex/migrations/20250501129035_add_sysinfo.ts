import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  for (const tableName of ["item", 'published']) {
    await knex.schema.alterTable(tableName, (table) => {

      table.jsonb("sysInfo")
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of ["item", 'published']) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn("sysInfo");
    });
  }
}