import type { MinAgeGroup } from '../content.types'
import { ALL_MIN_AGE_GROUPS } from './ageBands'
import type { CollectionTemplate } from './collectionTemplates'
import { KIND_IDS, isCustomKindId } from './kindRegistry'
import {
  isSlotlessLayout,
  type KindTemplate,
  type KindTemplateAccent,
  type KindTemplateEmphasis,
  type KindTemplateLayout,
  type KindTemplateSlot,
} from './kindTemplates'

/**
 * The one sanitizer for the static template catalog. It runs TWICE, against two
 * different vocabularies, and both runs matter:
 *
 *  1. At BUILD time, as a gate — a malformed template fails CI instead of
 *     reaching production. This is why the catalog needs no runtime warnings.
 *  2. On the CLIENT at ingest, against *that build's* enums — which is what
 *     lets a newer catalog stay safe on an older client. A `layout` this build
 *     has never heard of coerces to 'cards' rather than rendering nothing.
 *
 * Every output object is built field-by-field and input is NEVER spread, so
 * unknown keys are dropped structurally rather than by an explicit deny-list.
 *
 * Ids are VALIDATED, never slugified. They are written into E2E-encrypted user
 * data (`info.schemas`), so a coerced id can never be corrected afterwards —
 * dropping a malformed one is the only safe move.
 */

export type SanitizedCatalog = {
  templates: CollectionTemplate[]
  kindTemplates: KindTemplate[]
  /** Human-readable record of everything dropped. The build gate fails on a non-empty list. */
  warnings: string[]
}

export type RawCatalog = {
  templates?: unknown
  kindTemplates?: unknown
}

const KIND_TEMPLATE_ID_RE = /^kindtpl\.[a-z0-9][a-z0-9._-]{0,63}$/
const COLLECTION_TEMPLATE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/
const TAG_RE = /^[a-z0-9-]{1,24}$/

/**
 * Icon names are interpolated straight into a class attribute by
 * BIconComponent.vue (`:class="`bi bi-${icon}`"`). An unconstrained string is
 * therefore arbitrary CSS-class injection (`"x d-none position-fixed top-0"`),
 * so this charset is a security boundary, not a style preference.
 */
const ICON_RE = /^[a-z0-9-]{1,40}$/

const ACCENTS = new Set<string>(['rose', 'teal', 'amber', 'violet', 'sky'])
const EMPHASES = new Set<string>(['standard', 'bold'])
const LAYOUTS = new Set<string>(['cards', 'symbols', 'gallery'])
const IMPORTANCES = new Set<string>(['recommended', 'optional'])
const MIN_AGE_GROUPS = new Set<string>(ALL_MIN_AGE_GROUPS)

const MAX_SLOTS = 24
const MAX_TAGS = 8
const MAX_ENTRIES = 120

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function bounded(value: unknown, max: number): string | undefined {
  const s = str(value)
  if (!s) return undefined
  return s.slice(0, max)
}

function required(value: unknown, max: number): string | null {
  const s = str(value)
  if (!s) return null
  return s.slice(0, max)
}

function matched(value: unknown, re: RegExp): string | undefined {
  const s = str(value)
  return s && re.test(s) ? s : undefined
}

function pick<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T
function pick<T extends string>(value: unknown, allowed: Set<string>, fallback: undefined): T | undefined
function pick(value: unknown, allowed: Set<string>, fallback: string | undefined): string | undefined {
  const s = str(value)
  return s && allowed.has(s) ? s : fallback
}

/**
 * `seedText` is concatenated into an embedding query (PopCollectionSelector),
 * so it is stripped to letters, numbers and light punctuation rather than just
 * length-capped.
 */
function sanitizeSeedText(value: unknown): string | undefined {
  const s = bounded(value, 400)
  if (!s) return undefined
  const cleaned = s.replace(/[^\p{L}\p{N}\s.,'-]/gu, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || undefined
}

function sanitizeSlot(raw: any, warn: (m: string) => void, where: string): KindTemplateSlot | null {
  const kindId = str(raw?.kindId)
  if (!kindId) {
    warn(`${where}: slot dropped — missing kindId`)
    return null
  }
  // The whole reason catalog slots are restricted to registry ids or `custom.*`:
  // any other id is stripped by sanitizeKindIds on the WRITE path, so an older
  // client would silently destroy the assignment when the item is next edited.
  if (!KIND_IDS.has(kindId) && !isCustomKindId(kindId)) {
    warn(`${where}: slot '${kindId}' dropped — not a registry kind and not a valid custom.<slug> id`)
    return null
  }

  const slot: KindTemplateSlot = { kindId }
  slot.importance = pick(raw?.importance, IMPORTANCES, 'recommended') as 'recommended' | 'optional'

  const hint = bounded(raw?.hint, 120)
  if (hint) slot.hint = hint

  const label = bounded(raw?.label, 40)
  if (label) slot.label = label

  const icon = matched(raw?.icon, ICON_RE)
  if (icon) slot.icon = icon
  else if (str(raw?.icon)) warn(`${where}: slot '${kindId}' icon dropped — disallowed characters`)

  return slot
}

function sanitizeKindTemplate(raw: any, warn: (m: string) => void): KindTemplate | null {
  const id = matched(raw?.id, KIND_TEMPLATE_ID_RE)
  if (!id) {
    warn(`kindTemplate dropped — id '${str(raw?.id) || '(empty)'}' must match ${KIND_TEMPLATE_ID_RE}`)
    return null
  }

  const name = required(raw?.name, 60)
  if (!name) {
    warn(`kindTemplate '${id}' dropped — missing name`)
    return null
  }

  const layout = pick(raw?.layout, LAYOUTS, 'cards') as KindTemplateLayout
  if (str(raw?.layout) && !LAYOUTS.has(str(raw.layout))) {
    warn(`kindTemplate '${id}': unknown layout '${str(raw.layout)}' coerced to 'cards'`)
  }

  const slotsIn = Array.isArray(raw?.slots) ? raw.slots : []
  const slots: KindTemplateSlot[] = []
  const seenKinds = new Set<string>()
  for (const rawSlot of slotsIn) {
    if (slots.length >= MAX_SLOTS) {
      warn(`kindTemplate '${id}': slots truncated at ${MAX_SLOTS}`)
      break
    }
    const slot = sanitizeSlot(rawSlot, warn, `kindTemplate '${id}'`)
    if (!slot || seenKinds.has(slot.kindId)) continue
    seenKinds.add(slot.kindId)
    slots.push(slot)
  }

  // A slotted layout with no slots renders an empty dashboard, so it is a
  // malformed template rather than an empty one. Slotless layouts (gallery)
  // legitimately carry none.
  if (slots.length === 0 && !isSlotlessLayout(layout)) {
    warn(`kindTemplate '${id}' dropped — layout '${layout}' needs at least one usable slot`)
    return null
  }

  const template: KindTemplate = { id, name, slots, layout }

  const group = bounded(raw?.group, 40)
  if (group) template.group = group

  const description = bounded(raw?.description, 200)
  if (description) template.description = description

  const accent = pick(raw?.accent, ACCENTS, undefined) as KindTemplateAccent | undefined
  if (accent) template.accent = accent

  const emphasis = pick(raw?.emphasis, EMPHASES, undefined) as KindTemplateEmphasis | undefined
  if (emphasis) template.emphasis = emphasis

  if (raw?.retired === true) template.retired = true

  return template
}

function sanitizeCollectionTemplate(
  raw: any,
  resolvable: Map<string, KindTemplate>,
  warn: (m: string) => void,
): CollectionTemplate | null {
  const id = matched(raw?.id, COLLECTION_TEMPLATE_ID_RE)
  if (!id) {
    warn(`template dropped — id '${str(raw?.id) || '(empty)'}' must match ${COLLECTION_TEMPLATE_ID_RE}`)
    return null
  }

  const name = required(raw?.name, 60)
  if (!name) {
    warn(`template '${id}' dropped — missing name`)
    return null
  }

  // The single most important cross-field check. A chooser card whose view does
  // not resolve gives a blank preview AND writes a snapshot-less v1 marker,
  // which dead-ends the collection permanently.
  const kindTemplateId = str(raw?.kindTemplateId)
  const view = kindTemplateId ? resolvable.get(kindTemplateId) : undefined
  if (!view) {
    warn(`template '${id}' dropped — kindTemplateId '${kindTemplateId || '(empty)'}' does not resolve`)
    return null
  }
  if (view.retired) {
    warn(`template '${id}' dropped — kindTemplateId '${kindTemplateId}' is retired`)
    return null
  }

  const template: CollectionTemplate = { id, name, kindTemplateId }

  const description = bounded(raw?.description, 200)
  if (description) template.description = description

  const group = bounded(raw?.group, 40)
  if (group) template.group = group

  const seedText = sanitizeSeedText(raw?.seedText)
  if (seedText) template.seedText = seedText

  const icon = matched(raw?.icon, ICON_RE)
  if (icon) template.icon = icon
  else if (str(raw?.icon)) warn(`template '${id}': icon dropped — disallowed characters`)

  const tagsIn = Array.isArray(raw?.tags) ? raw.tags : []
  const tags: string[] = []
  for (const rawTag of tagsIn) {
    if (tags.length >= MAX_TAGS) break
    const tag = matched(rawTag, TAG_RE)
    if (tag && !tags.includes(tag)) tags.push(tag)
  }
  if (tags.length) template.tags = tags

  const agesIn = Array.isArray(raw?.minAgeGroups) ? raw.minAgeGroups : []
  const ages: MinAgeGroup[] = []
  for (const rawAge of agesIn) {
    const age = str(rawAge)
    if (MIN_AGE_GROUPS.has(age) && !ages.includes(age as MinAgeGroup)) ages.push(age as MinAgeGroup)
  }
  // An empty list means "all ages", which is what `undefined` already encodes.
  if (ages.length) template.minAgeGroups = ages

  return template
}

/**
 * Sanitize a whole catalog document.
 *
 * ORDER MATTERS: kindTemplates are sanitized first and merged with `seedViews`,
 * then collection templates are validated against that merged set. Passing the
 * bundled seed as `seedViews` is what lets a catalog entry point at a view that
 * only exists in the client bundle.
 */
export function sanitizeTemplateCatalog(raw: RawCatalog, seedViews: KindTemplate[] = []): SanitizedCatalog {
  const warnings: string[] = []
  const warn = (m: string) => warnings.push(m)

  const kindTemplatesIn = Array.isArray(raw?.kindTemplates) ? raw.kindTemplates : []
  const kindTemplates: KindTemplate[] = []
  const seenViewIds = new Set<string>()
  for (const rawView of kindTemplatesIn) {
    if (kindTemplates.length >= MAX_ENTRIES) {
      warn(`kindTemplates truncated at ${MAX_ENTRIES}`)
      break
    }
    const view = sanitizeKindTemplate(rawView, warn)
    if (!view) continue
    if (seenViewIds.has(view.id)) {
      warn(`kindTemplate '${view.id}' dropped — duplicate id`)
      continue
    }
    seenViewIds.add(view.id)
    kindTemplates.push(view)
  }

  // Same `retired` OR rule the runtime overlay applies (see mergeKindTemplates).
  // Without it a stale catalog claiming `retired: false` would keep a chooser
  // card alive for a view the code has retired — the card would show, and then
  // the runtime merge would refuse to offer the view behind it.
  const resolvable = new Map<string, KindTemplate>(seedViews.map((v) => [v.id, v]))
  for (const view of kindTemplates) {
    const seeded = resolvable.get(view.id)
    resolvable.set(view.id, seeded ? { ...view, retired: !!seeded.retired || !!view.retired } : view)
  }

  const templatesIn = Array.isArray(raw?.templates) ? raw.templates : []
  const templates: CollectionTemplate[] = []
  const seenIds = new Set<string>()
  for (const rawTemplate of templatesIn) {
    if (templates.length >= MAX_ENTRIES) {
      warn(`templates truncated at ${MAX_ENTRIES}`)
      break
    }
    const template = sanitizeCollectionTemplate(rawTemplate, resolvable, warn)
    if (!template) continue
    if (seenIds.has(template.id)) {
      warn(`template '${template.id}' dropped — duplicate id`)
      continue
    }
    seenIds.add(template.id)
    templates.push(template)
  }

  return { templates, kindTemplates, warnings }
}

/**
 * Merge collection templates by id, catalog over seed.
 *
 * Mirrors `mergeKindTemplates` in kindTemplates.ts. Kept here rather than there
 * because CollectionTemplate has no overlay registry — the client reads the
 * merged list directly.
 */
export function mergeCollectionTemplates(
  seed: CollectionTemplate[],
  remote: CollectionTemplate[],
): CollectionTemplate[] {
  const byId = new Map<string, CollectionTemplate>(seed.map((t) => [t.id, t]))
  for (const incoming of remote) {
    const existing = byId.get(incoming.id)
    byId.set(incoming.id, existing ? { ...existing, ...incoming } : incoming)
  }
  return [...byId.values()]
}
