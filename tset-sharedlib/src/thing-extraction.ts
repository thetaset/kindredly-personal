/**
 * "Save the thing, not the page" — intent-first capture of the few real-world
 * things (movies / TV / books) a page is primarily about, as deduplicated
 * canonical library items.
 *
 * v1 identity is a provisional `type:name-slug` key, deliberately shaped so a
 * future authoritative id (e.g. a Wikidata QID) can be slotted in without
 * reworking storage. The canonical reference lives in the item's encrypted
 * `info.schemas['kindredly.thing.v1']`, so the server stays schema-agnostic.
 */

import type { ItemTypeSecondary } from './content.types';

/** Addable thing kinds in v1. Widen as more typed providers/lists ship. */
export type ThingType = 'movie' | 'tv' | 'book';

export interface ThingTypeInfo {
  /** Existing item subType this maps to (see content.types typeNameList). */
  subType: ItemTypeSecondary;
  /** Canonical-key namespace prefix, e.g. 'film' → 'film:the-matrix'. */
  keyPrefix: string;
  /** Default list a saved thing of this type lands in (auto-created). */
  defaultListName: string;
  /** Stable canonical key for that default list collection. */
  defaultListKey: string;
  /** Icon name from the shared icon set. */
  icon: string;
  /** Short human label for the type badge. */
  label: string;
}

/** Single routing table: AI thing type → subType, key prefix, default list. */
export const THING_TYPE_MAP: Record<ThingType, ThingTypeInfo> = {
  movie: {
    subType: 'film',
    keyPrefix: 'film',
    defaultListName: 'Films to Watch',
    defaultListKey: 'list:films-to-watch',
    icon: 'film',
    label: 'Film',
  },
  tv: {
    subType: 'video_series',
    keyPrefix: 'tv',
    defaultListName: 'Shows to Watch',
    defaultListKey: 'list:shows-to-watch',
    icon: 'tv',
    label: 'TV / Show',
  },
  book: {
    subType: 'book',
    keyPrefix: 'book',
    defaultListName: 'Reading List',
    defaultListKey: 'list:reading-list',
    icon: 'book',
    label: 'Book',
  },
};

export const THING_TYPES = Object.keys(THING_TYPE_MAP) as ThingType[];

export function isThingType(value: unknown): value is ThingType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THING_TYPE_MAP, value);
}

/**
 * Canonical reference stored on a thing item (or its default list).
 * v1 is `provisional` (slug key) or `list` (default-list marker). Phase 2 adds
 * an authoritative variant, e.g. `{ kind: 'wikidata'; qid; externalIds }`.
 */
export type ThingCanonicalRef =
  | { kind: 'provisional'; key: string; type: ThingType }
  | { kind: 'list'; key: string; type: ThingType };

/** Namespaced schema id under item.info.schemas. */
export const THING_SCHEMA_ID = 'kindredly.thing.v1';

export interface ThingSchemaV1 {
  ref: ThingCanonicalRef;
  year?: number;
  creator?: string;
  savedAt?: number;
}

/**
 * Name-only normalization: lowercase, strip diacritics/punctuation, collapse to
 * a hyphenated slug. Identity is the NAME only — the type prefix namespaces but
 * does not disambiguate (so a film and a show with the same name get distinct
 * prefixed keys, while two pages naming the same film converge).
 */
export function normalizeThingSlug(name: string): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/['’`]/g, '') // drop apostrophes rather than splitting words
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics → single hyphen
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCanonicalKey(type: ThingType, name: string): string {
  return `${THING_TYPE_MAP[type].keyPrefix}:${normalizeThingSlug(name)}`;
}

/** Read the canonical key off an item's info payload (for dedup scans). */
export function getThingCanonicalKey(
  info: { schemas?: Record<string, unknown> | null } | null | undefined,
): string | null {
  const payload = info?.schemas?.[THING_SCHEMA_ID] as ThingSchemaV1 | undefined;
  const key = payload?.ref?.key;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

// ---------------------------------------------------------------------------
// AI extraction (used with the generic /ai/textRequest endpoint)
// ---------------------------------------------------------------------------

export interface ExtractedThing {
  name: string;
  /**
   * The thing's kind (movie/tv/book). Named `kind` — NOT `type` — so it never
   * collides with the saved item's `type` (always `'thing'`) or its `subType`
   * (film/video_series/book). The three read cleanly as kind → type → subType.
   */
  kind: ThingType;
  year?: number;
  /** Director (film), primary author (book), or network/creator (TV). */
  creator?: string;
  confidence: number; // 0..1
}

export const THING_EXTRACT_MAX = 3;
export const THING_EXTRACT_MIN_CONFIDENCE = 0.6;
export const THING_EXTRACT_TEXT_LIMIT = 16000;

export const THING_EXTRACT_INSTRUCTIONS =
  'You identify the specific real-world things a web page is primarily ABOUT or clearly recommends, ' +
  'so a reader can save them to watch or read later. Only include movies, TV shows/series, and books. ' +
  `Return at most ${THING_EXTRACT_MAX} items, and only ones a person would plausibly want to save from this page. ` +
  'Do NOT include people, companies, places, generic topics, or things merely mentioned in passing. ' +
  'Strongly prefer precision over recall: if the page is not clearly about a film, show, or book, return an empty list. ' +
  'For each item give the canonical title (not the page headline), the release year if known, the creator ' +
  '(director for film, primary author for book, network or creator for TV) if known, and a confidence from 0 to 1.';

export const THING_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    things: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: THING_TYPES },
          year: { type: 'number' },
          creator: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['name', 'type', 'confidence'],
      },
    },
  },
  required: ['things'],
};

/**
 * Parse + sanitize the LLM response (object or JSON string): enforce shape,
 * drop low-confidence/invalid entries, dedupe by canonical key, sort by
 * confidence, cap at THING_EXTRACT_MAX.
 */
export function parseExtractedThings(raw: unknown): ExtractedThing[] {
  let data: any = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.things)
      ? data.things
      : [];

  const valid: ExtractedThing[] = [];
  for (const entry of list) {
    const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
    // The AI wire field is `type`; we store it internally as `kind`.
    const kind = entry?.type;
    if (!name || !isThingType(kind)) continue;

    const confidence = Number(entry?.confidence);
    const conf = Number.isFinite(confidence) ? confidence : 0;
    if (conf < THING_EXTRACT_MIN_CONFIDENCE) continue;

    const slug = normalizeThingSlug(name);
    if (!slug) continue;

    const year = Number(entry?.year);
    const creator = typeof entry?.creator === 'string' ? entry.creator.trim() : '';
    valid.push({
      name,
      kind,
      year: Number.isFinite(year) && year > 0 ? year : undefined,
      creator: creator || undefined,
      confidence: conf,
    });
  }

  valid.sort((a, b) => b.confidence - a.confidence);

  const seen = new Set<string>();
  const out: ExtractedThing[] = [];
  for (const thing of valid) {
    const key = buildCanonicalKey(thing.kind, thing.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(thing);
    if (out.length >= THING_EXTRACT_MAX) break;
  }
  return out;
}
