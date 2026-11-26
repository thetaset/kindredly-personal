/**
 * Kindredly's default collections for Block page customization (HAT-1268): which collections
 * families see, in what order, and which are on before anyone chooses, set on the admin page
 * without a release.
 *
 * A collection is one of two kinds:
 *   built-in   one of the catalog's own (`library.ts`, published with the webapp), still edited in code;
 *   published  a published collection, made and edited in the app like any public item. Its pictures
 *              (stored on Kindredly's server) and notes show; links never do.
 *
 * Nothing saved (and every server that has no admin page, a box among them): exactly what ships,
 * the catalog's collections with the age rule in `defaultInspirationCollections`.
 *
 * Devices fetch the choice with the catalog, as often as the catalog (inspirationLibrary.ts): at
 * most once a day after a block page has shown, and on every visit to the settings page.
 */
import type { InspirationCatalog, InspirationCollection, InspirationItem, InspirationPicture } from './inspiration'

/** Who a collection is on for before anyone chooses. */
export type BlockPageDefaultOnFor = 'younger' | 'older' | 'everyone' | 'nobody'

export const BLOCK_PAGE_DEFAULT_ON_FOR: BlockPageDefaultOnFor[] = ['younger', 'older', 'everyone', 'nobody']

export type BlockPageDefaultEntry =
  | { source: 'builtin'; id: string; onFor: BlockPageDefaultOnFor }
  | { source: 'published'; id: string; name: string; description?: string; onFor: BlockPageDefaultOnFor }

/** Saved by the admin page. `revision` changes with every save, so a device sees a new choice. */
export type BlockPageDefaults = { revision: string; collections: BlockPageDefaultEntry[] }

/** What a device fetches: the choice, and each chosen published collection's items made into pictures and notes. */
export type BlockPageDefaultsForDevices = {
  defaults: BlockPageDefaults | null
  /** By published collection id. */
  published: Record<string, InspirationItem[]>
}

/** The collections that ship, and who each is on for: what the admin page starts from. */
export const BLOCK_PAGE_SHIPPED_ON_FOR: Record<string, BlockPageDefaultOnFor> = {
  younger: 'younger',
  older: 'older',
  photographs: 'everyone',
}

/** A published collection's id inside the catalog a device puts together. */
export const publishedCollectionId = (publishedId: string) => `pub-${publishedId}`

/** A picture stored on Kindredly's server, served by its public `/image/get/` route. */
export const SERVER_IMAGE_PREFIX = 'img:'
const SERVER_IMAGE_PATH = /^img:[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/
const ID = /^[A-Za-z0-9_-]{1,100}$/
const NAME_MAX = 80
const DESCRIPTION_MAX = 160
const ABOUT_MAX = 280
const NOTE_MAX = 280
/** A collection's items a device keeps: enough for months of three-hour windows. */
export const BLOCK_PAGE_PUBLISHED_ITEMS_MAX = 200

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export function isServerImagePath(path: string): boolean {
  return SERVER_IMAGE_PATH.test(path) && !/\.json(\.|$)/i.test(path)
}

/** The admin's choice checked field by field; null when it is not one, or chooses nothing. */
export function sanitizeBlockPageDefaults(raw: unknown): BlockPageDefaults | null {
  const input = raw as any
  if (!input || typeof input !== 'object' || !isText(input.revision) || !Array.isArray(input.collections)) return null
  const seen = new Set<string>()
  const collections: BlockPageDefaultEntry[] = []
  for (const c of input.collections) {
    if (!c || !ID.test(String(c.id ?? '')) || !BLOCK_PAGE_DEFAULT_ON_FOR.includes(c.onFor)) continue
    const key = `${c.source}:${c.id}`
    if (seen.has(key)) continue
    if (c.source === 'builtin') {
      collections.push({ source: 'builtin', id: c.id, onFor: c.onFor })
    } else if (c.source === 'published' && isText(c.name)) {
      const entry: BlockPageDefaultEntry = { source: 'published', id: c.id, name: c.name.trim().slice(0, NAME_MAX), onFor: c.onFor }
      if (isText(c.description)) entry.description = c.description.trim().slice(0, DESCRIPTION_MAX)
      collections.push(entry)
    } else continue
    seen.add(key)
  }
  return collections.length ? { revision: input.revision, collections } : null
}

function checkPublishedItem(raw: any): InspirationItem | null {
  if (!raw || !ID.test(String(raw.id ?? ''))) return null
  const item: InspirationItem = { id: raw.id, collection: 'published', topics: [] }
  const p = raw.picture
  if (p && typeof p.path === 'string' && isServerImagePath(p.path)) {
    item.picture = {
      path: p.path,
      width: Number.isFinite(p.width) && p.width > 0 ? p.width : 0,
      height: Number.isFinite(p.height) && p.height > 0 ? p.height : 0,
      focus: '50% 50%',
      title: isText(p.title) ? p.title.slice(0, NAME_MAX * 2) : '',
      maker: '',
      date: '',
      source: '',
      licence: '',
    }
    if (isText(p.about)) item.picture.about = p.about.slice(0, ABOUT_MAX)
  }
  const w = raw.words
  if (w && isText(w.text)) {
    item.words = { text: w.text.slice(0, NOTE_MAX), who: isText(w.who) ? w.who : '', work: '', year: '' }
  }
  return item.picture || item.words ? item : null
}

/** What a device fetched, checked: the choice, and only well-formed pictures and notes. */
export function sanitizeBlockPageDefaultsForDevices(raw: unknown): BlockPageDefaultsForDevices | null {
  const input = raw as any
  if (!input || typeof input !== 'object') return null
  const defaults = sanitizeBlockPageDefaults(input.defaults)
  const published: Record<string, InspirationItem[]> = {}
  if (defaults && input.published && typeof input.published === 'object') {
    for (const entry of defaults.collections) {
      if (entry.source !== 'published') continue
      const list = Array.isArray(input.published[entry.id]) ? input.published[entry.id] : []
      published[entry.id] = list
        .slice(0, BLOCK_PAGE_PUBLISHED_ITEMS_MAX)
        .map(checkPublishedItem)
        .filter((item: InspirationItem | null): item is InspirationItem => !!item)
    }
  }
  return { defaults, published }
}

/**
 * The catalog a device uses: the admin's choice applied to the catalog that ships. Without a
 * choice, the catalog as it is. A built-in collection the choice leaves out is not shown; a
 * published one with nothing that can show is left out too.
 */
export function applyBlockPageDefaults(
  catalog: InspirationCatalog | null,
  forDevices: BlockPageDefaultsForDevices | null | undefined,
): InspirationCatalog | null {
  const defaults = forDevices?.defaults
  if (!defaults?.collections.length) return catalog
  const builtin = new Map((catalog?.collections ?? []).map((c) => [c.id, c]))
  const collections: InspirationCollection[] = []
  const items: InspirationItem[] = []
  for (const entry of defaults.collections) {
    if (entry.source === 'builtin') {
      const collection = builtin.get(entry.id)
      if (!collection) continue
      collections.push({ ...collection, onFor: entry.onFor })
      items.push(...(catalog?.items ?? []).filter((item) => item.collection === entry.id))
      continue
    }
    const list = forDevices?.published[entry.id] ?? []
    if (!list.length) continue
    const id = publishedCollectionId(entry.id)
    const collection: InspirationCollection = { id, name: entry.name, topics: [], onFor: entry.onFor }
    if (entry.description) collection.description = entry.description
    collections.push(collection)
    items.push(...list.map((item) => ({ ...item, id: `${id}-${item.id}`, collection: id })))
  }
  return { revision: `${catalog?.revision ?? 'none'}+${defaults.revision}`, collections, items }
}

/** Text with its HTML and Markdown marks out, as one paragraph cut at a sentence. */
function plainText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  const text = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[#*_`>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return end > max / 3 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))} …`
}

/** The published row fields this reads; a server row has more. */
export type PublishedRowForBlockPage = {
  _id?: string | null
  type?: string | null
  name?: string | null
  description?: string | null
  imageFilename?: string | null
  info?: Record<string, any> | null
}

/**
 * One published item as a block page picture or note, or null when it has nothing to show. A
 * picture is the item's image stored on Kindredly's server, never one on another site; a note is
 * its text. A collection or a tab inside never shows.
 */
export function blockPageItemFromPublished(row: PublishedRowForBlockPage): InspirationItem | null {
  const id = typeof row?._id === 'string' ? row._id : ''
  if (!ID.test(id) || row.type === 'col' || row.type === 'tab') return null
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  const filename = typeof row.imageFilename === 'string' ? row.imageFilename.trim() : ''
  const item: InspirationItem = { id, collection: 'published', topics: [] }
  if (filename && !/^(https?:|data:)/i.test(filename) && isServerImagePath(SERVER_IMAGE_PREFIX + filename)) {
    const picture: InspirationPicture = {
      path: SERVER_IMAGE_PREFIX + filename,
      width: 0,
      height: 0,
      focus: '50% 50%',
      title: name,
      maker: '',
      date: '',
      source: '',
      licence: '',
    }
    const about = plainText(row.description, ABOUT_MAX)
    if (about) picture.about = about
    item.picture = picture
  }
  if (row.type === 'note') {
    // A note's text is a string, or an editor's blocks.
    const value = row.info?.value
    const raw = value && typeof value === 'object' && Array.isArray(value.blocks)
      ? value.blocks.map((b: any) => b?.data?.text ?? '').join('\n')
      : value
    const text = plainText(raw, NOTE_MAX)
    if (text) item.words = { text, who: name && !text.startsWith(name) ? name : '', work: '', year: '' }
  }
  return item.picture || item.words ? item : null
}
