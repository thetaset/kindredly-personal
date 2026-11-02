/**
 * Page notes (HAT-866, PGN): a note about a web page, written while the page is open. The note is an
 * ordinary `type: 'note'` item tagged Page notes; this schema says which page it is about.
 *
 * A page note never grants access. Every `info.additionalLinks` entry, `details.url` and
 * `details.patterns` becomes a URL pattern (`getItemDetailPatterns`), and the URL index those patterns
 * go into is what Library only, Always allowed by item, the Daily Check-in's exceptions and time limits
 * read. So the page lives only in this schema: `buildPageNoteDetails` never sets the three,
 * `withoutPageNoteAccess` takes them off, and `getItemDetailPatterns` ignores any item carrying the
 * schema. Notes are found by page through their own index on the device, which no access check reads.
 */
import { normalizeYouTubeChannelIdentifier } from './meta.utils';
import { cleanURL } from './url.utils';

export const PAGE_NOTE_SCHEMA_ID = 'kindredly.pageNote.v1';

/** The fixed tag every page note carries, so they can all be found in Notes and the library. */
export const PAGE_NOTE_TAG = 'Page notes';

/** The Notes app's own schema on every note it makes (`NOTE_APP_SCHEMA_ID` in the client). */
const NOTE_SCHEMA_ID = 'kindredly.note.v1';

export interface PageNoteSchemaV1 {
  schemaVersion: 1;
  /** The address as the person had it open. */
  sourceUrl: string;
  /** `pageNoteKey(sourceUrl)`: one key for every form of one page. */
  sourceKey: string;
  /** The page's title when the note was started. */
  title?: string;
  /** A YouTube video's id, when the page is one. */
  videoId?: string;
  /** The YouTube channel the video belongs to, when the page said. */
  channelId?: string;
  /**
   * Further pages the note is about (HAT-926): a note a person chose with Add to a note on another
   * page. The first page stays in the fields above, so a note about one page reads as before.
   */
  morePages?: PageNotePage[];
}

/** One page a note is about. */
export type PageNotePage = Omit<PageNoteSchemaV1, 'schemaVersion' | 'morePages'>;

/** How many pages one note can be about; more are not kept. */
const MAX_PAGES_PER_NOTE = 200;

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'youtube-nocookie.com']);
/** Parameters that say where a link came from, not which page it is. */
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid)$/i;

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function parseWebUrl(url: string | null | undefined): URL | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

/** The video id of a YouTube address in any of its forms (watch, youtu.be, embed, Shorts, live). */
export function youTubeVideoIdOf(url: string | null | undefined): string | null {
  const parsed = parseWebUrl(url);
  if (!parsed) return null;
  const host = bareHost(parsed.hostname);
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = parsed.pathname.split('/')[1] || null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else {
      const match = parsed.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/]+)/);
      id = match ? match[1] : null;
    }
  }
  // The id is case-sensitive: never lowercase it.
  return id && YOUTUBE_VIDEO_ID.test(id) ? id : null;
}

/**
 * The key a page's notes are filed under: one key for every form of one page. Every form of a YouTube
 * video gives its watch address; any other page is `cleanURL`'s address without `www.`, the part after
 * `#`, or tracking parameters. Null for anything that is not a web page.
 */
export function pageNoteKey(url: string | null | undefined): string | null {
  const parsed = parseWebUrl(url);
  if (!parsed) return null;

  const videoId = youTubeVideoIdOf(parsed.toString());
  if (videoId) return `https://youtube.com/watch?v=${videoId}`;

  const cleaned = cleanURL(parsed.toString());
  if (!cleaned) return null;
  try {
    const key = new URL(cleaned);
    key.hash = '';
    key.hostname = bareHost(key.hostname);
    for (const name of [...key.searchParams.keys()]) {
      if (TRACKING_PARAM.test(name)) key.searchParams.delete(name);
    }
    let out = key.toString();
    if (out.endsWith(`${key.hostname}/`)) out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

/** Whether notes can be taken on this address: any web page. */
export function canTakePageNotes(url: string | null | undefined): boolean {
  return pageNoteKey(url) !== null;
}

function cleanString(value: unknown, max = 2000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** The page-note schema for an address, or null when the address is not a web page. */
export function createPageNoteSchemaV1(input: {
  url: string;
  title?: string | null;
  channelId?: string | null;
}): PageNoteSchemaV1 | null {
  const sourceKey = pageNoteKey(input.url);
  if (!sourceKey) return null;
  const schema: PageNoteSchemaV1 = { schemaVersion: 1, sourceUrl: input.url.trim(), sourceKey };
  const title = cleanString(input.title, 300);
  if (title) schema.title = title;
  const videoId = youTubeVideoIdOf(input.url);
  if (videoId) schema.videoId = videoId;
  const channelId = cleanString(input.channelId, 200);
  if (channelId) schema.channelId = channelId;
  return schema;
}

type SchemaSource = {
  info?: { schemas?: Record<string, unknown> | null } | null;
  details?: { info?: { schemas?: Record<string, unknown> | null } | null } | null;
} | null | undefined;

function pageOf(raw: unknown): PageNotePage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const page = raw as Partial<PageNotePage>;
  if (typeof page.sourceUrl !== 'string') return null;
  const rebuilt = createPageNoteSchemaV1({ url: page.sourceUrl, title: page.title, channelId: page.channelId });
  if (!rebuilt) return null;
  const { schemaVersion: _version, ...out } = rebuilt;
  return out;
}

/** The page-note schema an item carries, checked again on read; null when it is not a page note. */
export function getPageNoteSchemaV1(source: SchemaSource): PageNoteSchemaV1 | null {
  const raw = source?.info?.schemas?.[PAGE_NOTE_SCHEMA_ID] ?? source?.details?.info?.schemas?.[PAGE_NOTE_SCHEMA_ID];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const schema = raw as Partial<PageNoteSchemaV1>;
  if (schema.schemaVersion !== 1 || typeof schema.sourceUrl !== 'string') return null;
  // The key is worked out again rather than trusted, so a stored key from an older rule still files right.
  const rebuilt = createPageNoteSchemaV1({ url: schema.sourceUrl, title: schema.title, channelId: schema.channelId });
  if (!rebuilt) return null;
  if (Array.isArray(schema.morePages)) {
    const seen = new Set([rebuilt.sourceKey]);
    const more: PageNotePage[] = [];
    for (const entry of schema.morePages) {
      const page = pageOf(entry);
      if (!page || seen.has(page.sourceKey)) continue;
      seen.add(page.sourceKey);
      more.push(page);
      if (more.length >= MAX_PAGES_PER_NOTE - 1) break;
    }
    if (more.length) rebuilt.morePages = more;
  }
  return rebuilt;
}

/** Every page a note is about, the first one first; empty when it is not a page note. */
export function pageNotePagesOf(source: SchemaSource): PageNotePage[] {
  const schema = getPageNoteSchemaV1(source);
  if (!schema) return [];
  const { schemaVersion: _version, morePages, ...first } = schema;
  return [first, ...(morePages || [])];
}

/** Whether a note has a url, patterns or links: each grants access, so it cannot become a page note. */
export function noteHasLinks(details: { url?: unknown; patterns?: unknown; info?: unknown } | null | undefined): boolean {
  if (!details) return false;
  if (typeof details.url === 'string' && details.url.trim()) return true;
  if (Array.isArray(details.patterns) && details.patterns.length) return true;
  const links = (details.info as { additionalLinks?: unknown } | null | undefined)?.additionalLinks;
  return Array.isArray(links) && links.length > 0;
}

/**
 * A note's `info.schemas` with this page added (HAT-926, Add to a note): the note becomes a page
 * note when it was not one, or gains the page among its others. `added` is false when the note is
 * already about the page; null when the address is not a web page.
 */
export function addPageToNoteSchemas(
  schemas: Record<string, unknown> | null | undefined,
  page: { url: string; title?: string | null; channelId?: string | null },
): { schemas: Record<string, unknown>; added: boolean } | null {
  const fresh = createPageNoteSchemaV1(page);
  if (!fresh) return null;
  const current = schemas || {};
  const existing = getPageNoteSchemaV1({ info: { schemas: current } });
  if (!existing) return { schemas: { ...current, [PAGE_NOTE_SCHEMA_ID]: fresh }, added: true };
  if (pageNotePagesOf({ info: { schemas: current } }).some((p) => p.sourceKey === fresh.sourceKey)) {
    return { schemas: current, added: false };
  }
  const more = existing.morePages || [];
  if (more.length >= MAX_PAGES_PER_NOTE - 1) return { schemas: current, added: false };
  const { schemaVersion: _version, ...added } = fresh;
  return {
    schemas: { ...current, [PAGE_NOTE_SCHEMA_ID]: { ...existing, morePages: [...more, added] } },
    added: true,
  };
}

export function isPageNote(source: SchemaSource): boolean {
  return getPageNoteSchemaV1(source) !== null;
}

/**
 * The details of a new page note, in the shape `/item/save` takes. Never sets `url`, `patterns` or
 * `info.additionalLinks`: any of them would let the note open the page.
 */
export function buildPageNoteDetails(input: {
  url: string;
  title?: string | null;
  channelId?: string | null;
  name?: string | null;
  text?: string | null;
}): { type: 'note'; name: string; tags: string[]; info: { editor: 'txt'; value: string; schemas: Record<string, unknown> } } | null {
  const schema = createPageNoteSchemaV1(input);
  if (!schema) return null;
  return {
    type: 'note',
    name: cleanString(input.name, 300) ?? '',
    tags: [PAGE_NOTE_TAG],
    info: {
      editor: 'txt',
      value: typeof input.text === 'string' ? input.text : '',
      schemas: {
        [NOTE_SCHEMA_ID]: { schemaVersion: 1, autoTitle: !cleanString(input.name) },
        [PAGE_NOTE_SCHEMA_ID]: schema,
      },
    },
  };
}

/**
 * The same details with everything that would grant access taken off: `url`, `patterns` and
 * `info.additionalLinks`. Applied to every page note before it is saved, whoever edited it.
 */
export function withoutPageNoteAccess<T extends Record<string, any>>(details: T): T {
  const out: Record<string, any> = { ...details };
  delete out.url;
  delete out.patterns;
  if (out.info && typeof out.info === 'object' && !Array.isArray(out.info)) {
    const info = { ...out.info };
    delete info.additionalLinks;
    out.info = info;
  }
  return out as T;
}

// ---------- Routes (PGN-2, PGN-9) ----------



/** One of a person's own notes about a page, as the popup and the notes panel list it. */
export interface PageNoteSummary {
  itemId: string;
  title: string;
  /** The start of the text, on one line. */
  preview: string;
  updatedAt: string | null;
}

export interface PageNotesForUrl {
  count: number;
  /** Newest first. */
  notes: PageNoteSummary[];
}

/** Start a page note (no `itemId`), or save the text of one (`itemId`). */
export interface PageNoteSaveRequest {
  url: string;
  itemId?: string | null;
  title?: string | null;
  channelId?: string | null;
  name?: string | null;
  text: string;
  /** The `updatedAt` the text was read at; a newer one on the note means it may have changed. */
  baseUpdatedAt?: string | null;
  /**
   * The text as last read or saved. When `updatedAt` moved, the stored text decides: a save of
   * our own also moves the time once the server's copy arrives (as `noteSession.saveNote`).
   */
  baseText?: string | null;
  /**
   * Add to a note (HAT-926): `itemId` is a note the person chose on this page. With this save it
   * gains the page (and the Page notes tag); it may be an ordinary note, but not one with links.
   */
  addToNote?: boolean;
}

export interface PageNoteSaveResult {
  itemId: string;
  updatedAt: string | null;
  /** Someone else saved the note since `baseUpdatedAt`; nothing was written. */
  conflict?: boolean;
}

/** A page note's whole text, for the iPhone's notes sheet (PGN-6). */
export interface PageNoteReadResult {
  itemId: string;
  title: string;
  text: string;
  updatedAt: string | null;
}

// ---------- Reminders (PGN-9) ----------

export type PageNoteReminderKind = 'youtubeChannel' | 'site';

/** A reminder a person (or a parent, for a child) sets: on this channel or site, offer Take notes. */
export interface PageNoteReminder {
  id: string;
  kind: PageNoteReminderKind;
  /** A YouTube channel id (`UC…`) or handle, or a site's host. */
  value: string;
  /** What the person picked, as they saw it ("Crash Course", "nasa.gov"). */
  label?: string;
}

/** A reminder's value as it is compared: a channel id or lowercase handle, or a host without `www.`. */
export function normalizePageNoteReminderValue(kind: PageNoteReminderKind, value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (kind === 'youtubeChannel') return normalizeYouTubeChannelIdentifier(value.trim()) || null;
  const raw = value.trim();
  const parsed = parseWebUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!parsed) return null;
  const host = bareHost(parsed.hostname);
  return host.includes('.') ? host : null;
}

/**
 * A YouTube channel as people paste it: its page's address (`/@handle` or `/channel/UC…`) or an
 * @handle. `value` is what reminders compare; `label` is what the person sees. Null when it is not one.
 */
export function youTubeChannelFromInput(input: string | null | undefined): { value: string; label: string } | null {
  const trimmed = String(input || '').trim();
  if (/^@[\w.-]+$/.test(trimmed)) return { value: trimmed.slice(1).toLowerCase(), label: trimmed };
  const parsed = parseWebUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (!parsed || !YOUTUBE_HOSTS.has(bareHost(parsed.hostname))) return null;
  const channel = parsed.pathname.match(/^\/channel\/(UC[\w-]{22})(?:\/|$)/);
  if (channel) return { value: channel[1], label: channel[1] };
  const handle = parsed.pathname.match(/^\/@([\w.-]+)(?:\/|$)/);
  if (handle) return { value: handle[1].toLowerCase(), label: `@${handle[1]}` };
  return null;
}

/** The stored list, with anything malformed or repeated left out. */
export function normalizePageNoteReminders(raw: unknown): PageNoteReminder[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PageNoteReminder[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const kind = (entry as PageNoteReminder).kind;
    if (kind !== 'youtubeChannel' && kind !== 'site') continue;
    const value = normalizePageNoteReminderValue(kind, (entry as PageNoteReminder).value);
    const id = cleanString((entry as PageNoteReminder).id, 100);
    if (!value || !id) continue;
    const dedupe = `${kind}:${value}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const reminder: PageNoteReminder = { id, kind, value };
    const label = cleanString((entry as PageNoteReminder).label, 200);
    if (label) reminder.label = label;
    out.push(reminder);
  }
  return out;
}

/**
 * Whether any reminder could cover this page before its channel is known: a site reminder on its
 * host, or a channel reminder on a YouTube video. Decides whether the page script is put on the
 * page at all, so a person without reminders, or a page none can cover, runs nothing.
 */
export function pageNoteRemindersMayCover(reminders: readonly PageNoteReminder[] | null | undefined, url: string | null | undefined): boolean {
  if (!reminders?.length) return false;
  if (pageNoteReminderFor(reminders.filter((r) => r.kind === 'site'), { url })) return true;
  return reminders.some((r) => r.kind === 'youtubeChannel') && youTubeVideoIdOf(url) !== null;
}

/**
 * The first reminder that covers a page: a site reminder covers its host and every subdomain, a
 * channel reminder covers a page whose channel (id or handle) is the one picked.
 */
export function pageNoteReminderFor(
  reminders: readonly PageNoteReminder[] | null | undefined,
  page: { url?: string | null; channelIds?: readonly (string | null | undefined)[] | null },
): PageNoteReminder | null {
  if (!reminders?.length) return null;
  const parsed = parseWebUrl(page.url ?? null);
  const host = parsed ? bareHost(parsed.hostname) : null;
  const channels = new Set(
    (page.channelIds || [])
      .map((id) => normalizeYouTubeChannelIdentifier(id ?? null))
      .filter((id): id is string => !!id),
  );
  for (const reminder of reminders) {
    if (reminder.kind === 'site') {
      const value = normalizePageNoteReminderValue('site', reminder.value);
      if (host && value && (host === value || host.endsWith(`.${value}`))) return reminder;
    } else {
      const value = normalizePageNoteReminderValue('youtubeChannel', reminder.value);
      if (value && channels.has(value)) return reminder;
    }
  }
  return null;
}
