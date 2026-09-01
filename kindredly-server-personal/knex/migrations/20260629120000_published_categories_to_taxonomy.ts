import { Knex } from "knex";
import {
  mapLegacyCategoryIds,
  CANONICAL_CATEGORY_IDS,
} from "../../../tset-sharedlib/dist/publishedCategoryMapping";

// Rewrite published.categories from the old flat `cat_*` vocabulary onto the canonical
// Category Explorer "general" leaf IDs (e.g. cat_science -> gen_science). Also normalises
// the legacy `{ items: [...] }` shape that an earlier migration produced into a plain
// string array, which is what the importer, filteredSearch (`categories @>`/`?|`), and the
// new browse UI all expect. Unmappable IDs (cat_misc/cat_other/cat_kids/cat_parenting) are
// dropped — those items become "uncategorized" for admin reassignment.
export async function up(knex: Knex): Promise<void> {
  const rows = await knex("published").select("_id", "categories");

  for (const row of rows) {
    const raw = row.categories;
    if (raw == null) continue;

    let parsed: any = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const source = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : null;
    if (!source) continue;

    const mapped = mapLegacyCategoryIds(source);

    // Skip rows already in canonical plain-array form to avoid needless writes.
    if (Array.isArray(parsed) && JSON.stringify(parsed) === JSON.stringify(mapped)) continue;

    await knex("published")
      .where("_id", row._id)
      .update({ categories: JSON.stringify(mapped) });
  }

  // Point the /data/categories availability list at the canonical leaves.
  const items = Array.from(CANONICAL_CATEGORY_IDS);
  await knex("sys_info")
    .insert({ _id: "cats", data: JSON.stringify({ items }) })
    .onConflict("_id")
    .merge({ data: JSON.stringify({ items }) });
}

export async function down(_knex: Knex): Promise<void> {
  // Category IDs are rewritten in place and the original legacy IDs are not retained, so
  // this migration is intentionally non-reverting (matches the prior categories migration).
  console.log(
    "published.categories taxonomy migration is not reverted (original IDs not retained)",
  );
}
