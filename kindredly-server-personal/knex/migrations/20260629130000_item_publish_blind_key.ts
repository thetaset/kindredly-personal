import { Knex } from "knex";

/**
 * Adds `publishIdBlindKey` to `item`: a per-account keyed-hash (HMAC) of the published id,
 * used so the server can match a user's imported items by published id WITHOUT being able to
 * read the real `publishId` (which moves into the encrypted blob). Nullable + indexed; stays
 * empty until clients begin writing the new format (gated per account on fleet readiness).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("item", (table) => {
    table.string("publishIdBlindKey").nullable().index();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("item", (table) => {
    table.dropColumn("publishIdBlindKey");
  });
}
