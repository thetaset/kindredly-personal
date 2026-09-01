/**
 * Collection authoring (the library "Creating with AI" builder).
 *
 * Single source of truth for the JSON the builder's **Paste JSON** method accepts,
 * shared by:
 *  - the copy/paste prompt the builder hands to any chat LLM
 *  - the builder's paste parser + validator
 *  - docs/guides/collection-authoring-prompt.md
 *
 * Deliberately separate from `feed-manifest.utils.ts`: that validator enforces
 * feed-specific rules (a `publishType: "feed"` collection, `information` posts,
 * no markdown headers except `## Sources`). A hand-built library collection has
 * none of those constraints, but it uses the same record shape and the same
 * category / useCriteria vocabularies.
 */
import { tagOptionsWithDetailsMap, typeNameList } from './content.types';
import { CANONICAL_CATEGORIES, CANONICAL_CATEGORY_IDS, mapLegacyCategoryIds } from './publishedCategoryMapping';

/** The canonical envelope — the same manifest the admin Import tab consumes. */
export const COLLECTION_MANIFEST_SCHEMA = 'kindredly.admin-content-loader-manifest.v1';

const KNOWN_TYPE_KEYS: Set<string> = new Set(typeNameList.map((t) => t.key as string));

/**
 * Valid tags that are members of their axis's type union but are deliberately kept
 * out of the pickable option lists (they are fallbacks, not things a curator picks).
 * `ct_other` alone appears ~50 times across `resources/sample-imports/`, so treating
 * the option lists as the whole vocabulary would silently drop real data.
 */
const UNLISTED_VALID_CRITERIA_TAGS = ['ct_other', 'ct_unknown'] as const;

const KNOWN_CRITERIA_TAGS: Set<string> = new Set([
  ...Object.values(tagOptionsWithDetailsMap).flat().map((t: any) => t.key as string),
  ...UNLISTED_VALID_CRITERIA_TAGS,
]);

/** Readable axis names + how many to pick, for the prompt's tag table. */
const CRITERIA_AXES: Array<{ key: keyof typeof tagOptionsWithDetailsMap; label: string; pick: string }> = [
  { key: 'eduValue', label: 'Usage type', pick: 'pick 1' },
  { key: 'minAgeGroup', label: 'Minimum age (appropriateness floor, not difficulty)', pick: 'pick 1' },
  { key: 'targetAudiences', label: 'Target audience (who the writing is framed for)', pick: 'pick all that fit' },
  { key: 'cost', label: 'Cost', pick: 'pick 1' },
  { key: 'ads', label: 'Ad load', pick: 'pick 1' },
  { key: 'costDetails', label: 'Cost details', pick: 'any that apply' },
  { key: 'contentTypes', label: 'Format', pick: 'pick all that fit' },
  { key: 'topics', label: 'Topic', pick: 'pick 1-3' },
  { key: 'intent', label: 'Primary intent', pick: 'pick 1' },
  { key: 'design', label: 'Visual distraction level', pick: 'optional, pick 1' },
  { key: 'designTags', label: 'Design flags', pick: 'optional' },
  { key: 'audienceRoles', label: 'Made for (role)', pick: 'optional' },
  { key: 'freshness', label: "Source's update cadence", pick: 'optional, pick 1' },
];

/** The exact JSON shape the builder accepts (and any LLM should produce). */
export const COLLECTION_ITEM_FORMAT_SPEC = [
  'Return ONLY JSON — no markdown fences, no commentary before or after.',
  '',
  'Preferred (canonical) envelope:',
  '{',
  `  "schema": "${COLLECTION_MANIFEST_SCHEMA}",`,
  '  "records": [ <item>, <item>, ... ]',
  '}',
  '',
  'A bare array of <item> and { "items": [ ... ] } are also accepted.',
  '',
  'Each <item>:',
  '{',
  '  "type": "link",                  // link | note | col | information | website | podcast | book | article | video | app | ...',
  '  "name": "Short title",           // REQUIRED (alias: "title")',
  '  "description": "One or two plain sentences — what it is and why it is worth someone\'s time. No marketing language.",',
  '  "url": "https://example.org/",   // required for link-ish items; omit on "col" and plain notes',
  '  "tags": ["lowercase", "short"],  // 1-3 general tags',
  '  "textContent": "Markdown body for note/information items. Omit for plain links.",',
  '  "sources": ["https://en.wikipedia.org/wiki/Example"],  // appended as a "## Sources" section if the body has none',
  '  "categories": ["gen_science"],   // canonical gen_* ids ONLY — see the list below',
  '  "useCriteria": ["eduval_educational", "minage_kids", "ta_kids", "cost_free", "ads_no", "intent_learn"],',
  '  "bannerQuery": "hubble telescope", // optional image search phrase; or "bannerUrl" for a direct https image',
  '  "meta": { "sequenceIndex": 0, "sequenceLabel": "Overview" },  // optional; sequenceIndex sets saved order',
  '  "sourceInfo": { "compiledBy": "…", "compiledAt": "YYYY-MM-DD" }  // optional provenance',
  '}',
  '',
  'Rules:',
  '- "name" is the only required field. Everything else is optional, but "description",',
  '  "categories" and "useCriteria" are what make an item publishable, so fill them in.',
  '- "categories" must use canonical gen_* ids. Legacy cat_* ids are remapped where possible',
  '  and dropped otherwise.',
  '- "useCriteria" is a single flat array of prefixed tags. Be honest and complete — include',
  '  unflattering tags (heavy ads, junk, infinite scroll) where they apply rather than omitting them.',
  '- Only include URLs you actually know to exist. Never invent a link.',
  '- Use "type": "col" for a sub-collection. Give it no "url".',
].join('\n');

/** The canonical category list, rendered for the prompt. */
export function buildCategoryReference(): string {
  return CANONICAL_CATEGORIES.map((c) => `${c.id} (${c.name})`).join(' · ');
}

/** The useCriteria vocabulary, rendered for the prompt. */
export function buildCriteriaReference(): string {
  const lines: string[] = [];
  for (const axis of CRITERIA_AXES) {
    const tags = (tagOptionsWithDetailsMap[axis.key] as any[]).map((t) => t.key);
    if (!tags.length) continue;
    lines.push(`- ${axis.label} (${axis.pick}): ${tags.join(', ')}`);
  }
  return lines.join('\n');
}

export type CollectionPromptRequest = {
  /** What the author wants built. The core instruction. */
  instructions: string;
  /** Name/description of the collection these items are going into, for context. */
  collectionName?: string | null;
  collectionDescription?: string | null;
  /** Roughly how many items to produce. */
  itemCount?: number | string | null;
  /** Names already in the builder, so the model does not repeat them. */
  existingItemNames?: string[] | null;
  /**
   * Overrides the bundled format spec. The builder passes the server-hosted copy
   * when one is available so prompt wording can be tuned without a client release.
   */
  formatSpec?: string | null;
};

/** A complete, standalone prompt an author can paste into any chat LLM. */
export function buildCollectionItemsPrompt(req: CollectionPromptRequest): string {
  const lines: string[] = [];

  lines.push('You are helping build a collection of items for Kindredly, a family digital-wellness library.');
  lines.push('');

  const what = (req.instructions || '').trim();
  lines.push(
    what
      ? `What to build:\n${what}`
      : 'What to build: propose a well-rounded set of items for the collection described below.',
  );

  const name = (req.collectionName || '').trim();
  const desc = (req.collectionDescription || '').trim();
  if (name || desc) {
    lines.push('');
    lines.push('The collection these items go into:');
    if (name) lines.push(`- Name: ${name}`);
    if (desc) lines.push(`- Description: ${desc}`);
  }

  if (req.itemCount != null && String(req.itemCount).trim()) {
    lines.push('');
    lines.push(`How many: about ${String(req.itemCount).trim()} items.`);
  }

  const existing = (req.existingItemNames || []).filter((n) => typeof n === 'string' && n.trim());
  if (existing.length) {
    lines.push('');
    lines.push('Already in the collection — do NOT repeat these:');
    lines.push(existing.map((n) => `- ${n.trim()}`).join('\n'));
  }

  lines.push('');
  lines.push('Quality bar: educational or genuinely edutainment, from a trustworthy source, not');
  lines.push('attention-trapping, and evidence-first over unsupported claims. If something is popular');
  lines.push('but fails one of those, either leave it out or tag the problem honestly.');

  lines.push('');
  lines.push('Categories — use these canonical ids only:');
  lines.push(buildCategoryReference());

  lines.push('');
  lines.push('useCriteria tags — one flat array per item, drawn from these axes:');
  lines.push(buildCriteriaReference());

  lines.push('');
  lines.push((req.formatSpec || '').trim() || COLLECTION_ITEM_FORMAT_SPEC);

  return lines.join('\n');
}

/**
 * Tolerantly extract JSON from pasted text — handles ```json fences, prose
 * wrapped around the payload, and both object and array payloads.
 * Returns the parsed value, or null if nothing parses.
 */
export function parseCollectionImportJson(text: string): unknown {
  const s = (text || '').trim();
  if (!s) return null;

  // Try every fenced block, not just the first — models often show a small
  // example fence before the real payload. Largest first, since the payload is
  // essentially always the biggest block.
  const fences = [...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
    .map((m) => (m[1] || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const fence of fences) {
    try {
      return JSON.parse(fence);
    } catch {
      /* try the next block */
    }
  }

  try {
    return JSON.parse(s);
  } catch {
    /* fall through to bracket extraction */
  }

  const candidates: Array<[number, number]> = [
    [s.indexOf('['), s.lastIndexOf(']')],
    [s.indexOf('{'), s.lastIndexOf('}')],
  ];
  // Prefer whichever delimiter appears first in the text.
  candidates.sort((a, b) => (a[0] < 0 ? 1 : b[0] < 0 ? -1 : a[0] - b[0]));

  for (const [start, end] of candidates) {
    if (start < 0 || end <= start) continue;
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {
      /* try the next shape */
    }
  }

  return null;
}

/** Unwrap the accepted envelopes (bare array, {items}, {records}) into a record list. */
export function extractCollectionRecords(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.records)) return obj.records;
  if (Array.isArray(obj.items)) return obj.items;

  return null;
}

/**
 * One distinct warning, with how many records hit it. Real manifests trip the same
 * warning dozens of times (a legacy category id repeated across every record), so the
 * UI renders these instead of the raw per-record list.
 */
export type CollectionWarningGroup = {
  message: string;
  count: number;
  /** A few record labels, for "…and 24 more". */
  examples: string[];
};

export type CollectionValidation = {
  errors: string[];
  /** Per-record, one string each. Precise but repetitive — prefer `warningGroups` for display. */
  warnings: string[];
  /** The same warnings collapsed by message. This is what the paste modal shows. */
  warningGroups: CollectionWarningGroup[];
  unknownCategories: string[];
  unknownCriteria: string[];
};

const MAX_WARNING_EXAMPLES = 3;

function groupWarnings(entries: Array<{ label: string; message: string }>): CollectionWarningGroup[] {
  const byMessage = new Map<string, CollectionWarningGroup>();

  for (const { label, message } of entries) {
    const existing = byMessage.get(message);
    if (existing) {
      existing.count += 1;
      if (existing.examples.length < MAX_WARNING_EXAMPLES) existing.examples.push(label);
    } else {
      byMessage.set(message, { message, count: 1, examples: [label] });
    }
  }

  // Most-frequent first — the systemic problems are the ones worth acting on.
  return [...byMessage.values()].sort((a, b) => b.count - a.count);
}

function recordLabel(record: any, index: number): string {
  const name = record?.name ?? record?.title ?? record?.localId;
  return typeof name === 'string' && name.trim() ? name.trim() : `item ${index + 1}`;
}

/**
 * Shape-check pasted records. Errors block the load; warnings do not — a curator
 * can still import and fix things in the builder.
 */
export function validateCollectionRecords(records: unknown[]): CollectionValidation {
  const errors: string[] = [];
  const warned: Array<{ label: string; message: string }> = [];
  const unknownCategories = new Set<string>();
  const unknownCriteria = new Set<string>();

  if (!Array.isArray(records) || records.length === 0) {
    return {
      errors: ['No items found. Expected a JSON array of items, or an object with a `records` or `items` array.'],
      warnings: [],
      warningGroups: [],
      unknownCategories: [],
      unknownCriteria: [],
    };
  }

  records.forEach((raw, i) => {
    const id = recordLabel(raw, i);
    const warn = (message: string) => warned.push({ label: id, message });

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`${id}: not a JSON object.`);
      return;
    }

    const record = raw as Record<string, any>;

    const name = record.name ?? record.title ?? record.pageTitle ?? record.postTitle;
    if (typeof name !== 'string' || !name.trim()) {
      errors.push(`${id}: missing \`name\` (or \`title\`).`);
    }

    const type = record.type ?? record.typeSecondary ?? record.typePrimary;
    if (type != null && (typeof type !== 'string' || !KNOWN_TYPE_KEYS.has(type))) {
      warn(`unknown type "${type}" — it will be saved as a generic item.`);
    }

    const isCollection = type === 'col';

    if (Array.isArray(record.childLocalIds) && record.childLocalIds.length > 0) {
      if (!isCollection) {
        errors.push(`${id}: \`childLocalIds\` is only valid on a "col" item.`);
      } else {
        warn(
          '`childLocalIds` nesting is not applied here — every item is added to the collection you selected.',
        );
      }
    }

    if (isCollection && typeof record.url === 'string' && record.url.trim()) {
      warn(`collections have no URL — \`url\` will be ignored.`);
    }

    if (record.categories != null) {
      if (!Array.isArray(record.categories)) {
        warn(`\`categories\` must be an array — it will be ignored.`);
      } else {
        for (const c of record.categories) {
          if (typeof c !== 'string' || CANONICAL_CATEGORY_IDS.has(c)) continue;
          const remapped = mapLegacyCategoryIds([c]);
          if (remapped.length) {
            warn(`category "${c}" is a legacy id — using "${remapped[0]}" instead.`);
          } else {
            unknownCategories.add(c);
            warn(`unknown category "${c}" — it will be dropped.`);
          }
        }
      }
    }

    if (record.useCriteria != null) {
      if (!Array.isArray(record.useCriteria)) {
        warn(`\`useCriteria\` must be an array — it will be ignored.`);
      } else {
        for (const t of record.useCriteria) {
          if (typeof t !== 'string' || KNOWN_CRITERIA_TAGS.has(t)) continue;
          unknownCriteria.add(t);
          warn(`unknown useCriteria tag "${t}" — it will be dropped.`);
        }
      }
    }
  });

  return {
    errors,
    warnings: warned.map((w) => `${w.label}: ${w.message}`),
    warningGroups: groupWarnings(warned),
    unknownCategories: [...unknownCategories],
    unknownCriteria: [...unknownCriteria],
  };
}

/**
 * Keep only values the platform recognises, mapping legacy category ids on the way.
 * Mirrors what the server does on publish, so nothing unrecognised is persisted.
 */
export function sanitizeAuthoredTags(input: { categories?: unknown; useCriteria?: unknown }): {
  categories: string[];
  useCriteria: string[];
} {
  const categories = mapLegacyCategoryIds(input.categories);

  const useCriteria = Array.isArray(input.useCriteria)
    ? [...new Set(input.useCriteria.filter((t): t is string => typeof t === 'string' && KNOWN_CRITERIA_TAGS.has(t)))]
    : [];

  return { categories, useCriteria };
}
