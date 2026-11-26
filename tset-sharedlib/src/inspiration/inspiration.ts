/**
 * Block page inspiration (HAT-1216): a picture, a line from a poet or a well-known writer, or both,
 * where the block page's shield used to be, nudging toward something better to do off the screen.
 *
 * WHERE THE CONTENT LIVES
 *   The library is authored in `library.ts` beside this file, with its pictures in
 *   `resources/inspiration/pictures/`. tset-client's build publishes it as static files on
 *   Kindredly's own server (`/inspiration/catalog.json` plus content-hashed pictures under
 *   `/inspiration/p/`); the extension and the phone apps never carry it. A device fetches the
 *   catalog and the pictures it will show next, and keeps them.
 *
 * THE RULES THIS FILE HOLDS, shared by the build, the block page and the settings page
 *   - which collections a person sees by default, by age;
 *   - which items a person's settings leave in;
 *   - which item shows now: the same one for INSPIRATION_WINDOW_HOURS on every device, chosen from
 *     the person and the time, so nothing is stored and a refresh never brings a new one;
 *   - what a well-formed catalog is, checked at build time and again on the device.
 *
 * Words are always quoted from a real poet or writer, with the work and year; Kindredly writes
 * none. A picture with nothing that fits stands alone.
 */

import type { BlockPageDefaultOnFor } from './blockPageDefaults'

export type InspirationWords = {
  /** The quote. " / " is a line break in a poem. */
  text: string
  who: string
  /** The book, poem or talk it comes from. */
  work: string
  year: string
  /** An English Wikipedia article about the work or the writer, for "find out more". */
  wikipedia?: string
}

export type InspirationPicture = {
  /** Path under `/inspiration/` on the configured server: `p/<name>.<hash>.jpg`. Never changes for the same bytes. */
  path: string
  width: number
  height: number
  /** CSS object-position, so a crop keeps the subject in frame. */
  focus: string
  /** `contain`: shown whole on `mat`, for an object photographed on a plain ground (a statue). */
  fit?: 'contain'
  mat?: string
  title: string
  /** Who made it: the artist, photographer or maker, as the source names them. */
  maker: string
  date: string
  /** The page the picture comes from (museum or Wikimedia Commons). */
  source: string
  licence: string
  /** A line or two about it, shown when someone taps the picture: what it is and why it is known. */
  about?: string
  /** An English Wikipedia article about the picture, or its maker when it has none. */
  wikipedia?: string
  /** A small copy for the settings page's lists, under `/inspiration/` like `path`. */
  thumb?: string
}

export type InspirationItem = {
  id: string
  collection: string
  topics: string[]
  picture?: InspirationPicture
  words?: InspirationWords
  /**
   * Set on an item from a parent's own collection (HAT-1221), made on the device from the library,
   * never in the catalog: its picture is a Kindredly file, its words a note, with no maker or work.
   */
  own?: { collectionId: string; itemId: string; collectionName?: string }
}

export type InspirationTopic = { id: string; name: string }

export type InspirationCollection = {
  id: string
  name: string
  /** One line for the settings page: what is in it. */
  description?: string
  topics: InspirationTopic[]
  /**
   * Who it is on for before anyone chooses, when Kindredly's admin page has chosen the defaults
   * (HAT-1268, blockPageDefaults.ts). Never in the catalog that ships: without it, the age rule in
   * `defaultInspirationCollections`.
   */
  onFor?: BlockPageDefaultOnFor
}

export type InspirationCatalog = {
  revision: string
  collections: InspirationCollection[]
  items: InspirationItem[]
}

/**
 * Saved in `accessControlSettings.inspiration`. Absent means on, with the collections for the
 * person's age (`defaultInspirationCollections`). Topics are not a setting: they are for choosing
 * by the situation (HAT-1217).
 */
export type InspirationSettings = {
  /** True: nothing shows on the block page. */
  off?: boolean
  /** Kindredly's collections a guardian chose. Absent: the defaults for the person's age. */
  collections?: string[]
  /**
   * Collections from the guardian's own library (HAT-1221), by item id only: a collection's name is
   * encrypted, and these settings are not. `shared`: Kindredly shared it with the child for this
   * (not into their library), so removing it here takes that share back.
   */
  library?: InspirationLibraryEntry[]
}

export type InspirationLibraryEntry = { id: string; shared?: boolean }

/** Who the block page is for. `age` is null when no date of birth is known. */
export type InspirationPerson = { id: string; isAdult: boolean; age: number | null }

export const INSPIRATION_COLLECTION_YOUNGER = 'younger'
export const INSPIRATION_COLLECTION_OLDER = 'older'
export const INSPIRATION_COLLECTION_PHOTOGRAPHS = 'photographs'

/** How long one item stays before the next: long enough to land, short enough to stay fresh. */
export const INSPIRATION_WINDOW_HOURS = 3

const HOUR_MS = 60 * 60 * 1000

/**
 * The collections a person sees before anyone chooses: the one for their age, and the famous
 * photographs. A child with no date of birth gets the younger one; a guardian can change it.
 */
export function defaultInspirationCollections(
  person: Pick<InspirationPerson, 'isAdult' | 'age'>,
  catalog?: Pick<InspirationCatalog, 'collections'> | null,
): string[] {
  const younger = !person.isAdult && (person.age === null || person.age < 10)
  // Chosen on Kindredly's admin page (HAT-1268): the collections on for this age, or for everyone.
  const chosen = (catalog?.collections ?? []).filter((c) => c.onFor)
  if (chosen.length) {
    return chosen.filter((c) => c.onFor === 'everyone' || c.onFor === (younger ? 'younger' : 'older')).map((c) => c.id)
  }
  return [younger ? INSPIRATION_COLLECTION_YOUNGER : INSPIRATION_COLLECTION_OLDER, INSPIRATION_COLLECTION_PHOTOGRAPHS]
}

// ── A person setting their own (HAT-1261, HAT-1267) ──────────────────────────────────────────────
// /user/blockPage/setOwn: the server and, in device-only mode, the device apply the same rule.

export type OwnBlockPageChange = { off?: boolean; collections?: string[] }

/** A built-in collection's id, or a published one's (`pub-pub_col-…`, HAT-1268). */
const OWN_COLLECTION_ID = /^[A-Za-z0-9_-]{1,160}$/

/** The request checked, or why it is refused. Nothing is read before this passes. */
export function checkOwnBlockPageChange(input: unknown): { change: OwnBlockPageChange } | { error: string } {
  const raw = (input ?? {}) as { off?: unknown; collections?: unknown }
  if (raw.off !== undefined && typeof raw.off !== 'boolean') return { error: 'off must be true or false' }
  const change: OwnBlockPageChange = {}
  if (raw.off !== undefined) change.off = raw.off as boolean
  if (raw.collections !== undefined) {
    const list = raw.collections
    if (!Array.isArray(list) || list.length > 20 || list.some((id) => typeof id !== 'string' || !OWN_COLLECTION_ID.test(id))) {
      return { error: 'collections must be a list of collection ids' }
    }
    change.collections = Array.from(new Set(list as string[]))
  }
  return { change }
}

/**
 * The person's settings after their own change: only the switch and Kindredly's collections move;
 * the collections a guardian added from their library stay, since adding one shared it and
 * removing it takes the share back, which is the guardian's to do.
 */
export function mergeOwnBlockPageChange(
  stored: InspirationSettings | null | undefined,
  change: OwnBlockPageChange,
): { inspiration: InspirationSettings } | { error: string } {
  const inspiration: InspirationSettings = {}
  if (change.off ?? stored?.off) inspiration.off = true
  const collections = change.collections ?? stored?.collections
  if (collections) inspiration.collections = collections
  if (Array.isArray(stored?.library) && stored!.library!.length) inspiration.library = stored!.library
  if (!inspiration.off && inspiration.collections?.length === 0 && !inspiration.library) {
    return { error: 'Keep one collection on, or turn Block page customization off' }
  }
  return { inspiration }
}

export function isInspirationOn(settings: InspirationSettings | null | undefined): boolean {
  return settings?.off !== true
}

/** The guardian's own collections in these settings, each once, ignoring anything malformed. */
export function inspirationLibraryOf(settings: InspirationSettings | null | undefined): InspirationLibraryEntry[] {
  const raw = Array.isArray(settings?.library) ? settings!.library! : []
  const seen = new Set<string>()
  const out: InspirationLibraryEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id)) continue
    seen.add(entry.id)
    out.push(entry.shared ? { id: entry.id, shared: true } : { id: entry.id })
  }
  return out
}

export function inspirationCollectionsFor(
  settings: InspirationSettings | null | undefined,
  person: Pick<InspirationPerson, 'isAdult' | 'age'>,
  catalog?: Pick<InspirationCatalog, 'collections'> | null,
): string[] {
  return Array.isArray(settings?.collections) ? settings!.collections! : defaultInspirationCollections(person, catalog)
}

/** The items in a person's chosen collections, sorted by id, so every device starts from the same list. */
export function eligibleInspirationItems(
  catalog: InspirationCatalog | null | undefined,
  settings: InspirationSettings | null | undefined,
  person: Pick<InspirationPerson, 'isAdult' | 'age'>,
): InspirationItem[] {
  if (!catalog || !isInspirationOn(settings)) return []
  const collections = new Set(inspirationCollectionsFor(settings, person, catalog))
  return catalog.items
    .filter((item) => collections.has(item.collection))
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/**
 * The window `now` falls in, counted in the device's local time, so windows start at midnight,
 * 3:00, 6:00 … and a child's day changes at the hours a parent would expect.
 */
export function inspirationWindow(now: Date): number {
  const localMs = now.getTime() - now.getTimezoneOffset() * 60 * 1000
  return Math.floor(localMs / (INSPIRATION_WINDOW_HOURS * HOUR_MS))
}

/** FNV-1a: a small, stable string hash. Not for security; only to seed the order. */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32: a seeded generator, so the same person gets the same order on every device. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * This person's order through the items: a shuffle seeded by who they are, so two children in one
 * family see different pictures at the same hour, and each sees every item before any repeats.
 */
function personalOrder(items: InspirationItem[], personId: string): InspirationItem[] {
  const order = items.slice()
  const random = seededRandom(hashString(personId || 'anyone'))
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = order[i]
    order[i] = order[j]
    order[j] = swap
  }
  return order
}

/** The item for one window, or null when nothing is left in. */
export function pickInspirationItem(items: InspirationItem[], personId: string, window: number): InspirationItem | null {
  if (items.length === 0) return null
  const order = personalOrder(items, personId)
  const index = ((window % order.length) + order.length) % order.length
  return order[index]
}

// ── Fitting the situation (HAT-1217) ────────────────────────────────────────────────────────────

/**
 * The topics that fit why a page is blocked: out of time, something to do away from the screen; out
 * of hours, rest and people; a check-in or a task, something hard kept at. Keyed by ReasonCode
 * (tset-sharedlib/src/types/activity.types.ts). A reason not here leans nowhere.
 */
export const INSPIRATION_REASON_TOPICS: Record<string, string[]> = {
  'time-exceeded': ['playing-outside', 'building', 'making', 'nature', 'building-hard'],
  'no-time-given': ['playing-outside', 'building', 'making', 'nature', 'building-hard'],
  'no-matching-rule': ['playing-outside', 'building', 'making', 'nature', 'building-hard'],
  'reqs-not-met': ['building-hard', 'practice', 'building'],
  'checkpoint-pending': ['building-hard', 'practice', 'building'],
  'earn-access-pending': ['building-hard', 'practice', 'building'],
  'out-of-time-range': ['rest', 'reading', 'family'],
  'family-downtime': ['rest', 'reading', 'family'],
  'restrict-all': ['rest', 'reading', 'family'],
  'social-media': ['family', 'rethinking'],
  'short-form-video': ['making', 'reading', 'rest'],
  'custom-blocked-url': ['making', 'reading', 'rest'],
  'not-in-library': ['reading', 'making', 'nature'],
  'adult-content': ['nature', 'making', 'reading'],
  'strong-language': ['nature', 'making', 'reading'],
  'inappropriate-topic': ['nature', 'making', 'reading'],
}

/** An adult blocked by their own rules is asked to think again first. */
const ADULT_TOPICS = ['rethinking']

/** How often the choice leans toward the fitting topics: two windows in three, so it stays varied. */
export const INSPIRATION_LEAN_IN = 2
export const INSPIRATION_LEAN_OF = 3

/** The topics that fit this block, or none: then the choice leans nowhere. */
export function inspirationTopicsFor(reason: string | null | undefined, person: Pick<InspirationPerson, 'isAdult'>): string[] {
  const forReason = (reason && INSPIRATION_REASON_TOPICS[reason]) || []
  return person.isAdult ? [...new Set([...ADULT_TOPICS, ...forReason])] : forReason
}

/**
 * A share of a run of windows: in each block of `of` windows, `take` of them, which ones chosen by
 * the person and the block, so a refresh never changes it. `taken` says whether window `index` is
 * one of them; `turn` counts the windows on the same side before it, so the side's items are taken
 * in turn and each comes round before any repeats. A few hashes, whatever the date.
 */
function shareOfWindows(
  personId: string,
  key: string,
  index: number,
  take: number,
  of: number,
): { taken: boolean; turn: number } {
  const block = Math.floor(index / of)
  const position = ((index % of) + of) % of
  const random = seededRandom(hashString(`${personId || 'anyone'}:${key}:${block}`))
  const positions = Array.from({ length: of }, (_, i) => i)
  for (let i = of - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = positions[i]
    positions[i] = positions[j]
    positions[j] = swap
  }
  const chosen = new Set(positions.slice(0, take))
  const taken = chosen.has(position)
  let before = 0
  for (let p = 0; p < position; p++) if (chosen.has(p) === taken) before++
  return { taken, turn: block * (taken ? take : of - take) + before }
}

/**
 * The item for one window.
 *
 * A guardian's own collections (HAT-1221) get one window in every two when Kindredly's are on too:
 * mixed in item by item, a few family photos among thirty paintings would hardly ever come round.
 * Their items have no topics, so the lean below never reaches them.
 *
 * Otherwise it leans toward `topics` two of every three of Kindredly's windows when any item has
 * one. Both take their items in turn, counted over the windows that went their way, in the same
 * person's own order through them: each comes round once before any repeats. With no topics, or
 * nothing that fits, the plain choice (`pickInspirationItem`). Fixed by the person, the window and
 * the topics (so the reason): a refresh never changes it.
 */
export function pickFittingInspirationItem(
  items: InspirationItem[],
  personId: string,
  window: number,
  topics: string[],
): InspirationItem | null {
  // Which of Kindredly's windows this is: all of them, or only those the own collections leave.
  let index = window
  const own = items.filter((item) => !!item.own)
  if (own.length > 0 && own.length < items.length) {
    const share = shareOfWindows(personId, 'own', window, 1, 2)
    if (share.taken) return pickInspirationItem(own, `${personId}:own`, share.turn)
    items = items.filter((item) => !item.own)
    index = share.turn
  }
  if (topics.length > 0) {
    const wanted = new Set(topics)
    const fitting = items.filter((item) => item.topics.some((t) => wanted.has(t)))
    const share = shareOfWindows(personId, 'lean', index, INSPIRATION_LEAN_IN, INSPIRATION_LEAN_OF)
    if (fitting.length > 0 && share.taken) {
      return pickInspirationItem(fitting, `${personId}:${[...wanted].sort().join(',')}`, share.turn)
    }
  }
  return pickInspirationItem(items, personId, window)
}

/** The items for this window and the next `count - 1`, without repeats: what a device keeps ready. */
export function upcomingInspirationItems(
  items: InspirationItem[],
  personId: string,
  window: number,
  count: number,
): InspirationItem[] {
  if (items.length === 0) return []
  const order = personalOrder(items, personId)
  const out: InspirationItem[] = []
  for (let i = 0; i < Math.min(count, order.length); i++) {
    out.push(order[(((window + i) % order.length) + order.length) % order.length])
  }
  return out
}

/** A poem's lines: " / " in the text is a line break. */
export function inspirationLines(text: string): string[] {
  return text.split(' / ').map((line) => line.trim()).filter(Boolean)
}

/** A Wikipedia link's article name, as the article titles itself: "The Song of the Lark (Jules Breton)". */
export function wikipediaArticleName(url: string): string {
  const match = /\/wiki\/([^?#]+)/.exec(url)
  if (!match) return ''
  let title = match[1]
  try {
    title = decodeURIComponent(title)
  } catch {
    /* already plain */
  }
  return title.replace(/_/g, ' ').trim()
}

// ── Checking a catalog ────────────────────────────────────────────────────────────────────────────

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const PICTURE_PATH = /^p\/[a-z0-9-]+\.[a-f0-9]{8,}\.(jpg|jpeg|png|webp)$/
const COLOUR = /^#[0-9a-fA-F]{3,8}$/
const WIKIPEDIA = /^https:\/\/en\.wikipedia\.org\/wiki\/[^\s?#]+$/
/** About a tweet's length: a line or two under the picture, never an essay. */
const ABOUT_MAX = 280

function checkWords(raw: any, where: string, warnings: string[]): InspirationWords | undefined {
  if (raw === undefined) return undefined
  if (!raw || !isText(raw.text) || !isText(raw.who) || !isText(raw.work) || !isText(raw.year)) {
    warnings.push(`${where}: words need text, who, work and year`)
    return undefined
  }
  const words: InspirationWords = { text: raw.text, who: raw.who, work: raw.work, year: raw.year }
  if (raw.wikipedia !== undefined) {
    if (typeof raw.wikipedia === 'string' && WIKIPEDIA.test(raw.wikipedia)) words.wikipedia = raw.wikipedia
    else warnings.push(`${where}: words' wikipedia must be an en.wikipedia.org/wiki/ link`)
  }
  return words
}

function checkPicture(raw: any, where: string, warnings: string[]): InspirationPicture | undefined {
  if (raw === undefined) return undefined
  const ok = raw
    && isText(raw.path) && PICTURE_PATH.test(raw.path)
    && Number.isFinite(raw.width) && raw.width > 0
    && Number.isFinite(raw.height) && raw.height > 0
    && isText(raw.focus)
    && isText(raw.title) && isText(raw.maker) && isText(raw.date) && isText(raw.source) && isText(raw.licence)
    && (raw.fit === undefined || raw.fit === 'contain')
    && (raw.mat === undefined || (typeof raw.mat === 'string' && COLOUR.test(raw.mat)))
  if (!ok) {
    warnings.push(`${where}: picture needs a p/<name>.<hash> path, its size, focus, title, maker, date, source and licence`)
    return undefined
  }
  const picture: InspirationPicture = {
    path: raw.path, width: raw.width, height: raw.height, focus: raw.focus,
    title: raw.title, maker: raw.maker, date: raw.date, source: raw.source, licence: raw.licence,
  }
  if (raw.fit === 'contain') picture.fit = 'contain'
  if (typeof raw.mat === 'string') picture.mat = raw.mat
  if (raw.about !== undefined) {
    if (isText(raw.about) && raw.about.length <= ABOUT_MAX) picture.about = raw.about
    else warnings.push(`${where}: about must be text of at most ${ABOUT_MAX} characters`)
  }
  if (raw.wikipedia !== undefined) {
    if (typeof raw.wikipedia === 'string' && WIKIPEDIA.test(raw.wikipedia)) picture.wikipedia = raw.wikipedia
    else warnings.push(`${where}: picture's wikipedia must be an en.wikipedia.org/wiki/ link`)
  }
  if (raw.thumb !== undefined) {
    if (isText(raw.thumb) && PICTURE_PATH.test(raw.thumb)) picture.thumb = raw.thumb
    else warnings.push(`${where}: thumb must be a p/<name>.<hash> path`)
  }
  return picture
}

/**
 * A catalog checked field by field. At build time any warning fails the build; on a device a bad
 * item is dropped and the rest stand, and a response that is not a catalog at all (a box answers a
 * missing file with its index.html) gives null.
 */
export function sanitizeInspirationCatalog(raw: unknown): { catalog: InspirationCatalog | null; warnings: string[] } {
  const warnings: string[] = []
  const input = raw as any
  if (!input || typeof input !== 'object' || !isText(input.revision) || !Array.isArray(input.collections) || !Array.isArray(input.items)) {
    return { catalog: null, warnings: ['not an inspiration catalog'] }
  }

  const collections: InspirationCollection[] = []
  for (const c of input.collections) {
    if (!c || !isText(c.id) || !isText(c.name) || !Array.isArray(c.topics)) {
      warnings.push(`collection ${c?.id ?? '?'}: needs id, name and topics`)
      continue
    }
    const topics = c.topics.filter((t: any) => t && isText(t.id) && isText(t.name)).map((t: any) => ({ id: t.id, name: t.name }))
    if (topics.length !== c.topics.length) warnings.push(`collection ${c.id}: a topic needs id and name`)
    const collection: InspirationCollection = { id: c.id, name: c.name, topics }
    if (isText(c.description)) collection.description = c.description
    collections.push(collection)
  }
  const topicsOf = new Map(collections.map((c) => [c.id, new Set(c.topics.map((t) => t.id))]))

  const items: InspirationItem[] = []
  const seen = new Set<string>()
  for (const it of input.items) {
    const where = `item ${it?.id ?? '?'}`
    if (!it || !isText(it.id) || !isText(it.collection) || !Array.isArray(it.topics)) {
      warnings.push(`${where}: needs id, collection and topics`)
      continue
    }
    if (seen.has(it.id)) {
      warnings.push(`${where}: id used twice`)
      continue
    }
    const known = topicsOf.get(it.collection)
    if (!known) {
      warnings.push(`${where}: no collection ${it.collection}`)
      continue
    }
    const unknown = it.topics.filter((t: unknown) => typeof t !== 'string' || !known.has(t))
    if (unknown.length) warnings.push(`${where}: topics not in ${it.collection}: ${unknown.join(', ')}`)
    const picture = checkPicture(it.picture, where, warnings)
    const words = checkWords(it.words, where, warnings)
    if (!picture && !words) {
      warnings.push(`${where}: needs a picture, words or both`)
      continue
    }
    seen.add(it.id)
    const item: InspirationItem = {
      id: it.id,
      collection: it.collection,
      topics: it.topics.filter((t: unknown) => typeof t === 'string' && known.has(t)),
    }
    if (picture) item.picture = picture
    if (words) item.words = words
    items.push(item)
  }

  return { catalog: { revision: input.revision, collections, items }, warnings }
}
