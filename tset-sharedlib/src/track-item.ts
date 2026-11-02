import type { ItemDetailsInfo } from './types/item.types';
import {
  sanitizeLessonQuestion,
  type LessonMultipleChoiceQuestion,
  type LessonTrueFalseQuestion,
} from './lesson.utils';

// Learning track items (docs/trackers/learning-tracks-tracker.md, TRK-5).
//
// A track item is one short item in a learning track: a markdown body plus labeled fields.
//
// Storage model:
//   - Library item: `info.schemas['kindredly.trackItem.v1']` (E2E-encrypted with the item).
//   - Published item: `data.trackItem`.
//   - Either way `info.value` holds `composeTrackItemMarkdown(item)`: the body with the recap, image
//     credit, passage, answer and sources written in, so a client that does not know these fields
//     still shows all of it. A client that does know them renders the fields from the schema, and
//     falls back to `info.value` when someone has edited it elsewhere (`isTrackItemBodyCurrent`).
//
// Security: `parseTrackItemV1` re-validates on every read and drops what is malformed, as
// `parseLessonSchemaV1` does.

export const TRACK_ITEM_SCHEMA_ID = 'kindredly.trackItem.v1';

export type TrackItemKind = 'page' | 'reading' | 'visual' | 'exercise';

export const TRACK_ITEM_KINDS: TrackItemKind[] = ['page', 'reading', 'visual', 'exercise'];

/** The reader's words for each kind. */
export const TRACK_ITEM_KIND_LABELS: Record<TrackItemKind, string> = {
  page: 'Page',
  reading: 'Reading',
  visual: 'Visual',
  exercise: 'Exercise',
};

export interface TrackItemImage {
  /** A published asset or item attachment copied to Kindredly (TRK-11). */
  assetId?: string;
  /** Only until the image is copied; never a Wikimedia hotlink once saved. */
  src?: string;
  alt?: string;
  /** "Photo: A. Author", as the source gives it. */
  credit: string;
  /** "CC BY-SA 4.0", "Public domain". */
  license: string;
  /** The page the image came from, e.g. its Wikimedia Commons file page. */
  sourceUrl?: string;
}

/** A Reading's passage, exactly as the source has it. */
export interface TrackItemPassage {
  text: string;
  /** Whose words and where from: "Charles Dickens, Great Expectations (1861)". */
  source: string;
  /** Where in the source: "Chapter 1". */
  locator?: string;
  /** The line or two after the passage. */
  after?: string;
}

export interface TrackItemSource {
  title: string;
  /** Absent for a family's own dropped-in file or pasted text. */
  url?: string;
  /** The exact revision fetched (Wikipedia `oldid`), so a claim can be checked later. */
  revisionId?: string;
  /** The section the item was written from ("Uncertainty principle"), so it is checked against the same text. */
  locator?: string;
  license?: string;
  retrievedAt?: string;
}

/** A check is one multiple choice or true/false question. It is never scored. */
export type TrackItemCheck = LessonMultipleChoiceQuestion | LessonTrueFalseQuestion;

/** The critic's six criteria (decision 10). */
export type TrackCriterion =
  | 'keepsReading'
  | 'oneIdea'
  | 'standsAloneOrFollows'
  | 'satisfyingEnd'
  | 'tracedToSource'
  | 'voice';

export const TRACK_CRITERIA: TrackCriterion[] = [
  'keepsReading',
  'oneIdea',
  'standsAloneOrFollows',
  'satisfyingEnd',
  'tracedToSource',
  'voice',
];

export const TRACK_CRITERION_LABELS: Record<TrackCriterion, string> = {
  keepsReading: 'Keeps you reading',
  oneIdea: 'One idea understood',
  standsAloneOrFollows: 'Stands alone or follows on',
  satisfyingEnd: 'Satisfying ending',
  tracedToSource: 'Traced to its source',
  voice: 'Matches the voice',
};

/** What the critic found, kept with the item for its maker. */
export interface TrackItemReview {
  scores: Partial<Record<TrackCriterion, number>>;
  notes?: string[];
  /** Improve rounds run (at most 2). */
  rounds?: number;
  /** Set when a score is still below 4 after the rounds: one line saying why. */
  flag?: string;
}

export interface TrackItemV1 {
  schemaVersion: 1;
  schemaId: typeof TRACK_ITEM_SCHEMA_ID;
  kind: TrackItemKind;
  /** Markdown. For a Reading, the framing before the passage. For an Exercise, the setup. */
  body: string;
  /** Light courses only: one sentence picking up from the item before. */
  recap?: string;
  image?: TrackItemImage;
  passage?: TrackItemPassage;
  /** Exercises: shown behind Show answer. */
  answer?: string;
  check?: TrackItemCheck;
  sources: TrackItemSource[];
  review?: TrackItemReview;
  /** Made with Copy prompt and Paste: not fetched or checked by Kindredly. */
  pasted?: boolean;
}

// ---------------------------------------------------------------------------
// Parsing (the security boundary)
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function optionalString(v: unknown): string | undefined {
  return isNonEmptyString(v) ? v : undefined;
}

function isHttpUrl(v: unknown): v is string {
  if (!isNonEmptyString(v)) return false;
  return /^https?:\/\//i.test(v.trim());
}

function sanitizeImage(raw: unknown): TrackItemImage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<TrackItemImage>;
  const assetId = optionalString(r.assetId);
  const src = isHttpUrl(r.src) ? r.src : undefined;
  // The image itself is the item's own image once saved (TRK-11); until then only its credit and
  // license are known, which is still worth keeping. A bad link drops the image.
  if (r.src && !src) return undefined;
  if (!assetId && !src && !isNonEmptyString(r.credit) && !isNonEmptyString(r.license)) return undefined;
  return {
    ...(assetId ? { assetId } : {}),
    ...(src ? { src } : {}),
    ...(optionalString(r.alt) ? { alt: r.alt } : {}),
    credit: isNonEmptyString(r.credit) ? r.credit : '',
    license: isNonEmptyString(r.license) ? r.license : '',
    ...(isHttpUrl(r.sourceUrl) ? { sourceUrl: r.sourceUrl } : {}),
  };
}

function sanitizePassage(raw: unknown): TrackItemPassage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<TrackItemPassage>;
  // Verbatim: never trimmed or rewritten, only checked to be present.
  if (typeof r.text !== 'string' || r.text.trim().length === 0) return undefined;
  return {
    text: r.text,
    source: isNonEmptyString(r.source) ? r.source : '',
    ...(optionalString(r.locator) ? { locator: r.locator } : {}),
    ...(optionalString(r.after) ? { after: r.after } : {}),
  };
}

function sanitizeSources(raw: unknown): TrackItemSource[] {
  if (!Array.isArray(raw)) return [];
  const out: TrackItemSource[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const r = s as Partial<TrackItemSource>;
    const url = isHttpUrl(r.url) ? r.url : undefined;
    // A source is a web page, or a named file or text of the family's own; a bad link is dropped.
    if (!url && (r.url || !isNonEmptyString(r.title))) continue;
    out.push({
      title: isNonEmptyString(r.title) ? r.title : (url as string),
      ...(url ? { url } : {}),
      ...(optionalString(r.revisionId) ? { revisionId: r.revisionId } : {}),
      ...(optionalString(r.locator) ? { locator: r.locator } : {}),
      ...(optionalString(r.license) ? { license: r.license } : {}),
      ...(optionalString(r.retrievedAt) ? { retrievedAt: r.retrievedAt } : {}),
    });
  }
  return out;
}

function sanitizeCheck(raw: unknown): TrackItemCheck | undefined {
  const q = sanitizeLessonQuestion(raw);
  if (!q) return undefined;
  if (q.type !== 'multiple_choice' && q.type !== 'true_false') return undefined;
  return q;
}

function sanitizeReview(raw: unknown): TrackItemReview | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<TrackItemReview>;
  const scores: Partial<Record<TrackCriterion, number>> = {};
  for (const c of TRACK_CRITERIA) {
    const v = (r.scores as Record<string, unknown> | undefined)?.[c];
    if (typeof v === 'number' && v >= 1 && v <= 5) scores[c] = Math.round(v);
  }
  const notes = Array.isArray(r.notes) ? r.notes.filter(isNonEmptyString) : undefined;
  return {
    scores,
    ...(notes && notes.length ? { notes } : {}),
    ...(typeof r.rounds === 'number' && r.rounds >= 0 ? { rounds: Math.min(2, Math.floor(r.rounds)) } : {}),
    ...(optionalString(r.flag) ? { flag: r.flag } : {}),
  };
}

/** Re-validates a stored or generated track item; null when it is not one. */
export function parseTrackItemV1(raw: unknown): TrackItemV1 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Partial<TrackItemV1>;
  if (!TRACK_ITEM_KINDS.includes(r.kind as TrackItemKind)) return null;
  if (typeof r.body !== 'string') return null;

  const image = sanitizeImage(r.image);
  const passage = sanitizePassage(r.passage);
  const check = sanitizeCheck(r.check);
  const review = sanitizeReview(r.review);

  return {
    schemaVersion: 1,
    schemaId: TRACK_ITEM_SCHEMA_ID,
    kind: r.kind as TrackItemKind,
    body: r.body,
    ...(optionalString(r.recap) ? { recap: r.recap } : {}),
    ...(image ? { image } : {}),
    ...(passage ? { passage } : {}),
    ...(optionalString(r.answer) ? { answer: r.answer } : {}),
    ...(check ? { check } : {}),
    sources: sanitizeSources(r.sources),
    ...(review ? { review } : {}),
    ...(r.pasted === true ? { pasted: true } : {}),
  };
}

/** A library item (`info.schemas`) or a published item (`data.trackItem`). */
export function getTrackItemV1(
  source:
    | {
        info?: ItemDetailsInfo | null;
        details?: { info?: ItemDetailsInfo | null } | null;
        data?: { trackItem?: unknown } | null;
      }
    | null
    | undefined,
): TrackItemV1 | null {
  const raw =
    source?.info?.schemas?.[TRACK_ITEM_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[TRACK_ITEM_SCHEMA_ID] ||
    source?.data?.trackItem;
  return parseTrackItemV1(raw);
}

/** Writes the item into a library item's info: the schema, and `value` for other clients. */
export function setTrackItemOnInfo(info: ItemDetailsInfo | null | undefined, item: TrackItemV1): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? info.schemas : {};
  return {
    ...(info || {}),
    value: composeTrackItemMarkdown(item),
    schemas: {
      ...schemas,
      [TRACK_ITEM_SCHEMA_ID]: item,
    },
  };
}

// ---------------------------------------------------------------------------
// The body for clients that do not know the fields
// ---------------------------------------------------------------------------

/** Every line of a block quoted, blank lines included, so the quote is one block. */
function blockquote(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => (line.length ? `> ${line}` : '>'))
    .join('\n');
}

export function formatTrackImageCredit(image: TrackItemImage): string {
  const parts = [image.credit, image.license].filter(isNonEmptyString);
  return parts.join(' · ');
}

/** What a source's license allows an item adapted from it: `unknown` when it states none. */
export type TrackLicenseUse = 'open' | 'noncommercial' | 'noderivatives' | 'unknown';

export function licenseUseOf(license: string | undefined): TrackLicenseUse {
  const l = (license || '').toUpperCase();
  if (!l.trim()) return 'unknown';
  if (/\bNC\b|NON-?COMMERCIAL/.test(l)) return 'noncommercial';
  if (/\bND\b|NO-?DERIV/.test(l)) return 'noderivatives';
  if (/PUBLIC DOMAIN|\bCC0\b|\bPD\b|CC BY/.test(l)) return 'open';
  return 'unknown';
}

/**
 * Which licenses a track is warned about, by who it is shared with (founder, 2026-09-24, Q2). A track
 * kept in the family may use any source. Shared wider, it is never refused: the maker is told which
 * items adapt a source whose license does not allow that audience, so they can replace a source or
 * rephrase, and Kindredly looks at public tracks case by case.
 *
 *  - Your family (3): nothing.
 *  - Friends & family (1) or the link (0): NoDerivatives, and a web page that states no license.
 *    NonCommercial allows sharing with them, for free.
 *  - Public (2): anything not openly licensed.
 *
 * A family's own file or pasted text (no `url`) is theirs to share, and is never listed.
 */
export function trackLicenseWarnings(
  items: Array<{ title: string; item: TrackItemV1 }>,
  visibilityCode: number,
): Array<{ title: string; source: string; license: string }> {
  const warned: TrackLicenseUse[] =
    visibilityCode === 2
      ? ['noncommercial', 'noderivatives', 'unknown']
      : visibilityCode === 0 || visibilityCode === 1
        ? ['noderivatives', 'unknown']
        : [];
  if (!warned.length) return [];
  const out: Array<{ title: string; source: string; license: string }> = [];
  for (const { title, item } of items) {
    const source = item.sources.find((s) => s.url && warned.includes(licenseUseOf(s.license)));
    if (source) out.push({ title, source: source.title, license: source.license || 'no license stated' });
  }
  return out;
}

/** What the maker reads about `trackLicenseWarnings`, or '' when nothing is named. */
export function trackLicenseWarningLine(warned: Array<{ title: string; license: string }>): string {
  if (!warned.length) return '';
  const list = warned.map((w) => `“${w.title}” (${w.license})`).join(', ');
  const one = warned.length === 1;
  return `${one ? '1 item comes' : `${warned.length} items come`} from a source whose license doesn't allow sharing it this widely: ${list}. You can still share the feed, or drop ${one ? 'that item' : 'those items'} first.`;
}

/**
 * The whole item as one markdown body: recap, image credit, body, passage, answer, sources. A check
 * is left out; it needs the item page to be answered.
 */
export function composeTrackItemMarkdown(item: TrackItemV1): string {
  const blocks: string[] = [];
  if (item.recap) blocks.push(`*${item.recap.trim()}*`);
  if (item.image) {
    const src = item.image.src;
    const credit = formatTrackImageCredit(item.image);
    if (src) blocks.push(`![${(item.image.alt || '').replace(/[[\]]/g, '')}](${src})`);
    if (credit) blocks.push(`<small>${credit}</small>`);
  }
  if (item.body.trim()) blocks.push(item.body.trim());
  if (item.passage) {
    blocks.push(blockquote(item.passage.text));
    const attribution = [item.passage.source, item.passage.locator].filter(isNonEmptyString).join(', ');
    if (attribution) blocks.push(`— ${attribution}`);
    if (item.passage.after) blocks.push(item.passage.after.trim());
  }
  if (item.answer) {
    blocks.push(`<details><summary>Show answer</summary>\n\n${item.answer.trim()}\n\n</details>`);
  }
  if (item.sources.length) {
    const lines = item.sources.map((s) => {
      const license = s.license ? ` (${s.license})` : '';
      const title = s.title.replace(/[[\]]/g, '');
      return s.url ? `- [${title}](${s.url})${license}` : `- ${title}${license}`;
    });
    blocks.push(`**Sources**\n\n${lines.join('\n')}`);
  }
  return blocks.join('\n\n');
}

/**
 * True while `info.value` is still what the track wrote. When someone edits the text elsewhere,
 * the reader shows their edit rather than the structured fields.
 */
export function isTrackItemBodyCurrent(item: TrackItemV1, infoValue: string | null | undefined): boolean {
  if (typeof infoValue !== 'string') return true;
  const normalize = (s: string) => s.replace(/\r\n?/g, '\n').trim();
  return normalize(infoValue) === normalize(composeTrackItemMarkdown(item));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Words in a markdown string, ignoring link targets, images and markup. */
export function countMarkdownWords(markdown: string): number {
  const text = String(markdown || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~|-]/g, ' ');
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu);
  return words ? words.length : 0;
}

/** Target lengths for the body, in words (HAT-058). A Reading's range is its framing. */
export const TRACK_ITEM_WORD_RANGES: Record<TrackItemKind, { min: number; max: number }> = {
  page: { min: 250, max: 450 },
  reading: { min: 100, max: 200 },
  visual: { min: 150, max: 300 },
  exercise: { min: 30, max: 250 },
};

export type TrackItemIssue = {
  /** `error` stops the item being saved; `warning` goes to the critic and the maker. */
  severity: 'error' | 'warning';
  code:
    | 'body_missing'
    | 'length'
    | 'passage_missing'
    | 'passage_source_missing'
    | 'image_missing'
    | 'image_license_missing'
    | 'image_credit_missing'
    | 'answer_missing'
    | 'sources_missing'
    | 'recap_missing'
    | 'recap_in_theme';
  message: string;
};

export type TrackItemValidation = { ok: boolean; issues: TrackItemIssue[]; words: number };

/**
 * Checks an item against its kind (TRK-5): the body's length, a Reading's passage, a license on
 * every image, at least one source unless pasted. `position` is the item's place in the track, from
 * 0; a course item after the first opens with a recap, and a theme item assumes nothing.
 */
export function validateTrackItem(
  item: TrackItemV1,
  options: { trackKind?: 'theme' | 'course'; position?: number } = {},
): TrackItemValidation {
  const issues: TrackItemIssue[] = [];
  const words = countMarkdownWords(item.body);
  const range = TRACK_ITEM_WORD_RANGES[item.kind];

  if (words === 0) {
    issues.push({ severity: 'error', code: 'body_missing', message: 'The item has no text.' });
  } else if (words < range.min || words > range.max) {
    issues.push({
      severity: 'warning',
      code: 'length',
      message: `${words} words; a ${TRACK_ITEM_KIND_LABELS[item.kind]} is ${range.min}–${range.max}.`,
    });
  }

  if (item.kind === 'reading') {
    if (!item.passage) {
      issues.push({ severity: 'error', code: 'passage_missing', message: 'A Reading needs its passage.' });
    } else if (!item.passage.source) {
      issues.push({
        severity: 'error',
        code: 'passage_source_missing',
        message: 'The passage needs to say whose words they are.',
      });
    }
  }

  if (item.kind === 'visual' && !item.image) {
    issues.push({ severity: 'error', code: 'image_missing', message: 'A Visual needs its image.' });
  }
  if (item.kind === 'page' && !item.image) {
    issues.push({ severity: 'warning', code: 'image_missing', message: 'A Page usually has one image.' });
  }
  if (item.image) {
    if (!item.image.license) {
      issues.push({ severity: 'error', code: 'image_license_missing', message: 'The image has no license.' });
    }
    if (!item.image.credit) {
      issues.push({ severity: 'warning', code: 'image_credit_missing', message: 'The image has no credit.' });
    }
  }

  if (item.kind === 'exercise' && !item.answer) {
    issues.push({ severity: 'error', code: 'answer_missing', message: 'An Exercise needs its answer.' });
  }

  if (!item.pasted && item.sources.length === 0) {
    issues.push({ severity: 'error', code: 'sources_missing', message: 'The item names no source.' });
  }

  if (options.trackKind === 'course' && (options.position ?? 0) > 0 && !item.recap) {
    issues.push({ severity: 'warning', code: 'recap_missing', message: 'A course item opens with a recap.' });
  }
  if (options.trackKind === 'theme' && item.recap) {
    issues.push({
      severity: 'warning',
      code: 'recap_in_theme',
      message: 'A theme item stands alone; it has no recap.',
    });
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues, words };
}
