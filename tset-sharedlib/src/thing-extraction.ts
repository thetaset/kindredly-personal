/**
 * "Save the thing, not the page" — intent-first capture of the real-world
 * things (films, shows, books, podcasts, games, music, places, products) a page
 * is about, as deduplicated canonical library items, and of the dates on it
 * worth keeping (HAT-1055).
 *
 * v1 identity is a provisional `type:name-slug` key, deliberately shaped so a
 * future authoritative id (e.g. a Wikidata QID) can be slotted in without
 * reworking storage. The canonical reference lives in the item's encrypted
 * `info.schemas['kindredly.thing.v1']`, so the server stays schema-agnostic.
 */

import type { ItemTypeSecondary } from './content.types';

/** Addable thing kinds. Places, products, podcasts, games and music joined in HAT-1055. */
export type ThingType = 'movie' | 'tv' | 'book' | 'podcast' | 'game' | 'music' | 'place' | 'product';

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
  podcast: {
    subType: 'podcast',
    keyPrefix: 'podcast',
    defaultListName: 'Podcasts to Try',
    defaultListKey: 'list:podcasts-to-try',
    icon: 'headphones',
    label: 'Podcast',
  },
  game: {
    subType: 'game',
    keyPrefix: 'game',
    defaultListName: 'Games to Play',
    defaultListKey: 'list:games-to-play',
    icon: 'controller',
    label: 'Game',
  },
  music: {
    subType: 'music',
    keyPrefix: 'music',
    defaultListName: 'Music to Listen To',
    defaultListKey: 'list:music-to-listen-to',
    icon: 'music-note-beamed',
    label: 'Music',
  },
  place: {
    subType: 'location',
    keyPrefix: 'place',
    defaultListName: 'Places to Go',
    defaultListKey: 'list:places-to-go',
    icon: 'geo-alt',
    label: 'Place',
  },
  product: {
    subType: 'product',
    keyPrefix: 'product',
    defaultListName: 'Things to Buy',
    defaultListKey: 'list:things-to-buy',
    icon: 'cart',
    label: 'Product',
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
   * The thing's kind (movie/tv/book/…). Named `kind` — NOT `type` — so it never
   * collides with the saved item's `type` (always `'thing'`) or its `subType`
   * (film/video_series/book). The three read cleanly as kind → type → subType.
   */
  kind: ThingType;
  year?: number;
  /** Director (film), author (book), network or creator (TV), host (podcast), studio (game), artist (music). */
  creator?: string;
  /** A place's street address, as the page gives it. */
  address?: string;
  /** A product's price as the page shows it, with its ISO 4217 code. */
  price?: number;
  currency?: string;
  confidence: number; // 0..1
}

/**
 * A date on the page worth keeping (HAT-1055): something a reader could go to or
 * watch (`event`), or the last day to do something (`deadline`). Day and time are
 * the page's own wall-clock values, so "7pm" stays 7pm for whoever saves it.
 */
export type DateKind = 'event' | 'deadline';

export interface ExtractedDate {
  /** What happens, in the page's words: "Spring concert", "Camp sign-up closes". */
  title: string;
  kind: DateKind;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:MM, 24-hour. Absent when the page gives only a day. */
  time?: string;
  /** YYYY-MM-DD, when it runs over several days. */
  endDate?: string;
  /** HH:MM, 24-hour. */
  endTime?: string;
  place?: string;
  confidence: number; // 0..1
}

export const THING_EXTRACT_MAX = 6;
export const DATE_EXTRACT_MAX = 6;
export const THING_EXTRACT_MIN_CONFIDENCE = 0.6;
export const THING_EXTRACT_TEXT_LIMIT = 16000;

export const THING_EXTRACT_INSTRUCTIONS =
  'You find what a reader of this web page would want to save or remember, and return two lists. ' +
  '"dates": upcoming dates the page gives for something the reader could go to, watch or take part in ' +
  '(type "event": a game, concert, class, show, trip, release, a sale ending), or the last day to do something ' +
  '(type "deadline": register by, apply by, order by, due). Title each in the page\'s own words for what happens, ' +
  'without the date. Give the date as YYYY-MM-DD, and a 24-hour time as HH:MM only when the page states one; ' +
  'add an end date or end time when the page gives one, and the place when it names one. ' +
  'Resolve relative dates such as "next Friday" against "today" in the context. ' +
  'Skip dates before today, the page\'s own publication or update date, birthdays and historical dates. ' +
  `Return at most ${DATE_EXTRACT_MAX} dates. ` +
  '"things": specific things the page is about or clearly recommends: movies, TV shows, books, podcasts, ' +
  'video games, music (an album or song), places to visit (type "place"), and products to buy (type "product"). ' +
  'Do NOT include people, companies, generic topics, or things merely mentioned in passing. ' +
  'Give the canonical name (not the page headline), the year if known, and the creator if known ' +
  '(director for a film, author for a book, network or creator for TV, host for a podcast, studio for a game, ' +
  'artist for music); a place\'s street address and a product\'s price with its ISO currency code only when the page shows them. ' +
  `Return at most ${THING_EXTRACT_MAX} things. ` +
  'Strongly prefer precision over recall: either list may be empty. Give every entry a confidence from 0 to 1.';

export const THING_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    dates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['event', 'deadline'] },
          date: { type: 'string' },
          time: { type: 'string' },
          endDate: { type: 'string' },
          endTime: { type: 'string' },
          place: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['title', 'type', 'date', 'confidence'],
      },
    },
    things: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: THING_TYPES },
          year: { type: 'number' },
          creator: { type: 'string' },
          address: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['name', 'type', 'confidence'],
      },
    },
  },
  required: ['dates', 'things'],
};

function toResponseObject(raw: unknown): any {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function confidenceOf(entry: any): number {
  const confidence = Number(entry?.confidence);
  return Number.isFinite(confidence) ? confidence : 0;
}

/**
 * Parse + sanitize the LLM response (object or JSON string): enforce shape,
 * drop low-confidence/invalid entries, dedupe by canonical key, sort by
 * confidence, cap at THING_EXTRACT_MAX.
 */
export function parseExtractedThings(raw: unknown): ExtractedThing[] {
  const data = toResponseObject(raw);
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.things)
      ? data.things
      : [];

  const valid: ExtractedThing[] = [];
  for (const entry of list) {
    const name = cleanString(entry?.name);
    // The AI wire field is `type`; we store it internally as `kind`.
    const kind = entry?.type;
    if (!name || !isThingType(kind)) continue;

    const conf = confidenceOf(entry);
    if (conf < THING_EXTRACT_MIN_CONFIDENCE) continue;

    const slug = normalizeThingSlug(name);
    if (!slug) continue;

    const year = Number(entry?.year);
    const creator = cleanString(entry?.creator);
    const thing: ExtractedThing = {
      name,
      kind,
      year: Number.isFinite(year) && year > 0 ? year : undefined,
      creator: creator || undefined,
      confidence: conf,
    };
    // Only on the kinds they describe, so a film never carries a stray price.
    const address = cleanString(entry?.address);
    if (kind === 'place' && address) thing.address = address;
    const price = Number(entry?.price);
    const currency = cleanString(entry?.currency).toUpperCase();
    if (kind === 'product' && Number.isFinite(price) && price > 0) {
      thing.price = price;
      if (/^[A-Z]{3}$/.test(currency)) thing.currency = currency;
    }
    valid.push(thing);
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

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

/** True for a real YYYY-MM-DD day: `2026-02-30` is not one. */
export function isCalendarDay(value: unknown): value is string {
  const match = typeof value === 'string' ? DAY_PATTERN.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** `7:05` → `07:05`; anything that is not a 24-hour time → undefined. */
function normalizeTime(value: unknown): string | undefined {
  const match = typeof value === 'string' ? TIME_PATTERN.exec(value.trim()) : null;
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

/** A YYYY-MM-DD day, and an optional HH:MM time on it, as a Date on the local clock. */
export function localDayDate(day: string, time?: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(year, month - 1, date, hours, minutes);
}

/** The person's own calendar day, YYYY-MM-DD. */
export function localDayString(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** What the model is told today is: the day and its weekday, so "next Friday" resolves. */
export function todayForExtraction(now: Date = new Date()): string {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  return `${localDayString(now)} (${weekday})`;
}

/** One saved date per day and title, so two pages naming the same concert converge. */
export function buildDateKey(entry: Pick<ExtractedDate, 'date' | 'title'>): string {
  return `date:${entry.date}:${normalizeThingSlug(entry.title)}`;
}

/**
 * The dates half of the response: real days only, nothing that has already ended
 * before `today` (YYYY-MM-DD), deduped, the most certain DATE_EXTRACT_MAX kept,
 * then in calendar order.
 */
export function parseExtractedDates(raw: unknown, today: string): ExtractedDate[] {
  const data = toResponseObject(raw);
  const list: any[] = Array.isArray(data?.dates) ? data.dates : [];

  const valid: ExtractedDate[] = [];
  for (const entry of list) {
    const title = cleanString(entry?.title);
    const kind = entry?.type;
    if (!title || !normalizeThingSlug(title)) continue;
    if (kind !== 'event' && kind !== 'deadline') continue;
    if (!isCalendarDay(entry?.date)) continue;

    const conf = confidenceOf(entry);
    if (conf < THING_EXTRACT_MIN_CONFIDENCE) continue;

    const date: ExtractedDate = { title, kind, date: entry.date, confidence: conf };
    const time = normalizeTime(entry?.time);
    if (time) date.time = time;
    // An end before the start is a misread; the start alone is still right.
    if (isCalendarDay(entry?.endDate) && entry.endDate >= date.date) {
      if (entry.endDate > date.date) date.endDate = entry.endDate;
    }
    const endTime = normalizeTime(entry?.endTime);
    if (time && endTime && (date.endDate || endTime > time)) date.endTime = endTime;
    const place = cleanString(entry?.place);
    if (place) date.place = place;

    // YYYY-MM-DD compares as text.
    if ((date.endDate || date.date) < today) continue;
    valid.push(date);
  }

  valid.sort((a, b) => b.confidence - a.confidence);

  const seen = new Set<string>();
  const out: ExtractedDate[] = [];
  for (const date of valid) {
    const key = buildDateKey(date);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(date);
    if (out.length >= DATE_EXTRACT_MAX) break;
  }
  return out.sort((a, b) =>
    a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date),
  );
}
