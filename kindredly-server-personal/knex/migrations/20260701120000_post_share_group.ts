import { Knex } from "knex";

/**
 * Adds grouped ("Separate recipients") sharing columns to `post`.
 *
 * `shareGroupId` links the fan-out siblings created for one authoring action: when an
 * admin splits recipients into ad-hoc groups, one post row is created per group, each
 * with its own `sharedWith` (only that group's members) so each group gets an isolated
 * comment thread. `groupLabel` is the author-facing label for the sibling's group.
 * Both nullable; normal (ungrouped) posts leave them empty.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("post", (table) => {
    table.string("shareGroupId").nullable().index();
    table.string("groupLabel").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("post", (table) => {
    table.dropColumn("shareGroupId");
    table.dropColumn("groupLabel");
  });
}
