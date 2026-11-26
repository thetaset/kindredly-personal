import type {Knex} from 'knex';

/**
 * CLS-11 (docs/trackers/classifier-loop-tracker.md), decided 2026-11-10: what a page is about is
 * its Topics tree topic, not a topic tag. Each catalog row's subject tags leave `useCriteria` and
 * their tree topic joins `categories`; the podcast and documentary tags become format tags. The
 * row's earlier `useCriteria` and `categories` are kept in `meta.retiredTopicTags`, which is what
 * `down` puts back. The maps are copied here, not imported, so this migration never changes.
 * `down` puts back each moved row's whole earlier lists, so a later edit to that row's tags or
 * topics is undone with it.
 */
const SUBJECT_TOPIC_TREE: Record<string, string> = {
  topic_streaming_tv: 'gen_entertainment_leaf',
  topic_movies: 'gen_entertainment_leaf',
  topic_kids_shows: 'gen_entertainment_leaf',
  topic_anime: 'gen_entertainment_leaf',
  topic_memes_humor: 'gen_entertainment_leaf',
  topic_music_listening: 'gen_music',
  topic_music_creation: 'gen_music',
  topic_video_games: 'gen_gaming',
  topic_sandbox_games: 'gen_gaming',
  topic_homework_help: 'gen_education',
  topic_reference_research: 'gen_education',
  topic_math_practice: 'gen_math',
  topic_language_learning: 'gen_language',
  topic_coding_tutorials: 'gen_coding',
  topic_science_learning: 'gen_science',
  topic_history_civics: 'gen_history',
};
const FORMAT_TAGS: Record<string, string> = {
  topic_podcasts: 'ct_podcast',
  topic_documentaries: 'ct_documentary',
};
const RETIRED = [...Object.keys(SUBJECT_TOPIC_TREE), ...Object.keys(FORMAT_TAGS)];

const asList = (value: unknown): string[] => {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
};
function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
const asObject = (value: unknown): Record<string, any> => {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, any>) : {};
};

/** The row's new tags, or null when it carries no retired tag. */
export function moveRow(row: {useCriteria?: unknown; categories?: unknown}): {useCriteria: string[]; categories: string[]} | null {
  const useCriteria = asList(row.useCriteria);
  if (!useCriteria.some((tag) => RETIRED.includes(tag))) return null;
  const nextCriteria: string[] = [];
  const nextCategories = [...asList(row.categories)];
  for (const tag of useCriteria) {
    const topic = SUBJECT_TOPIC_TREE[tag];
    const next = topic ? null : FORMAT_TAGS[tag] || tag;
    if (topic && !nextCategories.includes(topic)) nextCategories.push(topic);
    if (next && !nextCriteria.includes(next)) nextCriteria.push(next);
  }
  return {useCriteria: nextCriteria, categories: nextCategories};
}

export async function up(knex: Knex): Promise<void> {
  const rows = await knex('published')
    .select('_id', 'useCriteria', 'categories', 'meta')
    .whereRaw(`"useCriteria" \\?| ?::text[]`, [RETIRED]);
  for (const row of rows) {
    const moved = moveRow(row);
    if (!moved) continue;
    const meta = asObject(row.meta);
    // A second run keeps the first copy: that is the row as it was before any move.
    const kept = meta.retiredTopicTags ?? {useCriteria: asList(row.useCriteria), categories: asList(row.categories)};
    await knex('published')
      .where('_id', row._id)
      .update({
        useCriteria: JSON.stringify(moved.useCriteria),
        categories: JSON.stringify(moved.categories),
        meta: JSON.stringify({...meta, retiredTopicTags: kept}),
      });
  }
}

export async function down(knex: Knex): Promise<void> {
  const rows = await knex('published').select('_id', 'meta').whereRaw(`meta \\? 'retiredTopicTags'`);
  for (const row of rows) {
    const {retiredTopicTags, ...meta} = asObject(row.meta);
    if (!retiredTopicTags) continue;
    await knex('published')
      .where('_id', row._id)
      .update({
        useCriteria: JSON.stringify(asList(retiredTopicTags.useCriteria)),
        categories: JSON.stringify(asList(retiredTopicTags.categories)),
        meta: JSON.stringify(meta),
      });
  }
}
