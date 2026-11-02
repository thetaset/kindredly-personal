import {Knex} from 'knex';

/**
 * One published order (docs/trackers/learning-tracks-tracker.md, TRK-3).
 *
 * A published collection's children are read with the highest `published_relation.order` first:
 * the published page orders by `order desc`, and a family's published collection copies its library
 * order, which is also highest first. The content loader wrote its feeds the other way round
 * (the manifest's first child got 0), so every official feed showed in reverse on its own page.
 *
 * The loader now writes highest first. This flips the collections it wrote before, found by the
 * loader's own marker on the parent (`info.postImportProcessing.source`). Reversing within each
 * parent (max + min - order) keeps the same set of numbers, so running it twice restores the
 * original; `down` is the same statement.
 */
const FLIP_LOADER_ORDER = `
  UPDATE published_relation AS r
  SET "order" = s.max_order + s.min_order - r."order"
  FROM (
    SELECT pr."parentId", MAX(pr."order") AS max_order, MIN(pr."order") AS min_order
    FROM published_relation pr
    JOIN published p ON p._id = pr."parentId"
    WHERE p.info->'postImportProcessing'->>'source' = 'admin_content_loader'
      AND pr."order" IS NOT NULL
    GROUP BY pr."parentId"
  ) s
  WHERE r."parentId" = s."parentId" AND r."order" IS NOT NULL
`;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(FLIP_LOADER_ORDER);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(FLIP_LOADER_ORDER);
}
