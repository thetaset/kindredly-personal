import { Knex } from "knex";

/**
 * Adds `kinds` to `item`: semantic slot assignments ("health.provider.dentist",
 * "apps.email"). Client-side E2E-encrypted from introduction (like `tags` — see
 * itemPropertiesForSchema in the client), so for encrypted accounts this column holds
 * the blanked placeholder and the real values live in the encrypted blob. No backfill:
 * the field is new. json to match the sibling array columns (categories/tags/useCriteria).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("item", (table) => {
    table.json("kinds");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("item", (table) => {
    table.dropColumn("kinds");
  });
}
