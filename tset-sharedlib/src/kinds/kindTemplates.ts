import { ItemDetailsInfo } from '../shared.types'

/**
 * Kind templates — named sets of expected kind slots ("skill trees" for collecting
 * your important info). A template INSTANCE is a normal collection tagged with the
 * template id inside its encrypted `info.schemas`; slot coverage is computed over
 * that collection's members, which is also how per-person scoping works
 * ("Health – Alex" vs "Health – Sam" are separate instances of the same template).
 *
 * Product framing: the slot dashboard is for ACCESS first (filled slots are one-tap
 * shortcuts) — empty slots are quiet "possible next steps", never requirements.
 */
export type KindTemplateSlot = {
  kindId: string
  importance?: 'recommended' | 'optional'
  hint?: string
  /**
   * Display-only overrides, used when `getKindDefinition(kindId)` misses.
   *
   * They exist so a catalog template can self-describe a `custom.<slug>` slot.
   * That matters because catalog slots are restricted to shipped registry ids
   * or `custom.*`: any other id would be stripped by `sanitizeKindIds` on the
   * WRITE path, silently destroying the assignment on an older client. Since
   * `custom.*` ids carry no registry entry, the label and icon have to travel
   * with the template.
   *
   * Never used on a write path — these only affect rendering.
   */
  label?: string
  /** Bootstrap icon name. Charset-restricted by the sanitizer: it is interpolated into a class. */
  icon?: string
}

/** Named accent tokens — mapped to colors by the shipped renderers (never raw CSS in data). */
export type KindTemplateAccent = 'rose' | 'teal' | 'amber' | 'violet' | 'sky'

/** Slot-card weight: 'bold' renders larger icons and more prominent cards. */
export type KindTemplateEmphasis = 'standard' | 'bold'

/**
 * Renderer layout: 'cards' = detail rows at rest; 'symbols' = icon/image tile
 * grid, tap a tile to expand its contents; 'gallery' = every member as a picture
 * grid, no slots involved. Unknown values fall back to 'cards' on old clients
 * (MV3-safe enum-of-shipped-renderers pattern).
 */
export type KindTemplateLayout = 'cards' | 'symbols' | 'gallery'

/**
 * Layouts whose whole job is to render the collection's members, so an empty
 * `slots` array is the correct shape rather than a malformed one. Keep this in
 * sync with the layouts that ignore slots entirely.
 */
const SLOTLESS_LAYOUTS = new Set<string>(['gallery'])

export type KindTemplate = {
  id: string
  name: string
  group?: string
  description?: string
  accent?: KindTemplateAccent
  emphasis?: KindTemplateEmphasis
  layout?: KindTemplateLayout
  slots: KindTemplateSlot[]
  /**
   * Withdrawn from the pickers but still resolvable, so collections already
   * created from it keep rendering. Deleting the definition outright would
   * dead-end every v1-marked instance (v1 markers carry no snapshot).
   */
  retired?: boolean
}

const HEALTH_SLOTS: KindTemplateSlot[] = [
  { kindId: 'health.insurance.medical', importance: 'recommended', hint: 'Member portal, policy doc, or a note with plan details' },
  { kindId: 'health.provider.physician', importance: 'recommended', hint: 'Practice site, patient portal, or contact info' },
  { kindId: 'health.provider.dentist', importance: 'recommended' },
  { kindId: 'health.insurance.dental', importance: 'optional' },
  { kindId: 'health.pharmacy', importance: 'optional' },
  { kindId: 'health.provider.physicalTherapist', importance: 'optional' },
]

export const KIND_TEMPLATES: KindTemplate[] = [
  {
    id: 'kindtpl.health.v1',
    name: 'Health',
    group: 'Personal Admin',
    description: 'Insurance, providers, and pharmacy — the essentials at your fingertips.',
    accent: 'rose',
    emphasis: 'bold',
    slots: HEALTH_SLOTS,
  },
  {
    id: 'kindtpl.health.symbols.v1',
    name: 'Health – Visual',
    group: 'Personal Admin',
    description: 'A symbolic health board — big tiles, tap one to see what’s inside.',
    accent: 'rose',
    layout: 'symbols',
    slots: HEALTH_SLOTS,
  },
  {
    id: 'kindtpl.home.v1',
    name: 'Home',
    group: 'Personal Admin',
    description: 'Wi-Fi, insurance, utilities, and the people who fix things.',
    slots: [
      { kindId: 'home.wifi', importance: 'recommended', hint: 'A note with your network name, password, and router details' },
      { kindId: 'home.insurance', importance: 'recommended' },
      { kindId: 'home.utilities', importance: 'recommended', hint: 'Power, water, internet — account portals' },
      { kindId: 'home.warranties', importance: 'optional' },
      { kindId: 'home.serviceProviders', importance: 'optional', hint: 'Plumber, electrician, HVAC' },
    ],
  },
  {
    id: 'kindtpl.finance.v1',
    name: 'Finance',
    group: 'Personal Admin',
    description: 'Banking, taxes, and coverage in one place.',
    slots: [
      { kindId: 'finance.bank', importance: 'recommended' },
      { kindId: 'finance.taxes', importance: 'recommended' },
      { kindId: 'finance.insurance.auto', importance: 'optional' },
      { kindId: 'finance.retirement', importance: 'optional' },
    ],
  },
  {
    id: 'kindtpl.school.v1',
    name: 'School',
    group: 'Home & Family',
    description: 'Portal, teachers, and schedules for a student.',
    slots: [
      { kindId: 'school.portal', importance: 'recommended' },
      { kindId: 'school.teacher', importance: 'recommended' },
      { kindId: 'school.calendar', importance: 'optional' },
      { kindId: 'school.lunchMenu', importance: 'optional' },
    ],
  },
  {
    id: 'kindtpl.gallery.v1',
    name: 'Photo Gallery',
    group: 'Photos & Media',
    description: 'Everything in the collection as a grid of pictures.',
    layout: 'gallery',
    // No slots on purpose: a gallery shows what you put in it, so there is
    // nothing to prompt for. See SLOTLESS_LAYOUTS.
    slots: [],
  },
  {
    // Retired — Default Apps (/settings/coreapps) does this job better, and the
    // Launchpad already surfaces the same items. Kept resolvable for the
    // collections people already made from it.
    id: 'kindtpl.apps.v1',
    name: 'Standard Apps',
    group: 'Apps',
    description: 'Your everyday apps — email, search, calendar, and more.',
    retired: true,
    slots: [
      { kindId: 'apps.email', importance: 'recommended' },
      { kindId: 'apps.search', importance: 'recommended' },
      { kindId: 'apps.calendar', importance: 'recommended' },
      { kindId: 'apps.photos', importance: 'optional' },
      { kindId: 'apps.files', importance: 'optional' },
      { kindId: 'apps.music', importance: 'optional' },
      { kindId: 'apps.notes', importance: 'optional' },
      { kindId: 'apps.ai', importance: 'optional' },
    ],
  },
]

// ---- Catalog overlay -------------------------------------------------------
//
// `KIND_TEMPLATES` above is the bundled SEED, compiled into every client. The
// client also fetches a static catalog (see the client's templateCatalog.ts) and
// installs it here, so a template published after a build shipped still renders.
//
// The overlay is module-level mutable state, which is normally a hazard in this
// codebase because the extension runs background and frontend in separate JS
// realms. It is safe here because nothing in `tset-client/src/bg` or
// `tset-server/src` reads this registry — it is used only by frontend components
// and composables, a single realm. Keep it that way.

let remoteKindTemplates: KindTemplate[] = []
let mergedCache: KindTemplate[] | null = null

/**
 * Merge the seed with the catalog, by id.
 *
 * The catalog wins field-by-field EXCEPT `retired`, which is OR-ed. Without that
 * exception a template retired in code would be resurrected forever by a stale
 * cached catalog — code has to keep its veto.
 *
 * WHAT MERGING BUYS, precisely: the catalog is a serialization of the whole seed
 * plus anything newer, so for an id present in both the catalog wins outright —
 * that is what lets a shipped template be corrected or retired without a client
 * release. Merging still matters for the ids the catalog does NOT carry: the
 * bundled seed remains the cold/offline floor, and a client that shipped ahead of
 * the last static deploy keeps its own newer templates instead of losing them.
 *
 * The ordering assumption: the deployed catalog is at least as new as any shipped
 * client, which the pipeline gives us — deploy_static_content.yml builds the
 * webapp and the extensions from one commit. If a client ever ran ahead of the
 * deployed catalog, template copy for shared ids would fall back a version until
 * the next deploy. Bounded and self-correcting, but worth knowing.
 */
function mergeKindTemplates(seed: KindTemplate[], remote: KindTemplate[]): KindTemplate[] {
  const byId = new Map<string, KindTemplate>(seed.map((t) => [t.id, t]))
  for (const incoming of remote) {
    const existing = byId.get(incoming.id)
    byId.set(
      incoming.id,
      existing ? { ...existing, ...incoming, retired: !!existing.retired || !!incoming.retired } : incoming,
    )
  }
  return [...byId.values()]
}

/** Merged seed ⊕ catalog view. Memoized until the overlay changes. */
export function getAllKindTemplates(): KindTemplate[] {
  if (!mergedCache) mergedCache = mergeKindTemplates(KIND_TEMPLATES, remoteKindTemplates)
  return mergedCache
}

/**
 * Install the fetched catalog. Callers pass ALREADY-SANITIZED templates —
 * sanitizing is the client port's job, because it must run against the client's
 * own enum vocabulary (that is what coerces a layout a newer catalog knows and
 * this build does not).
 */
export function setRemoteKindTemplates(list: KindTemplate[]): void {
  remoteKindTemplates = Array.isArray(list) ? list : []
  mergedCache = null
}

/** Drop the overlay; the seed alone is authoritative again. */
export function clearRemoteKindTemplates(): void {
  remoteKindTemplates = []
  mergedCache = null
}

export function getKindTemplate(id: string): KindTemplate | null {
  return getAllKindTemplates().find((t) => t.id === id) ?? null
}

/** Templates a user may still pick. Retired ones resolve but are never offered. */
export function getSelectableKindTemplates(): KindTemplate[] {
  return getAllKindTemplates().filter((t) => !t.retired)
}

/** True when this layout renders the collection's members, so it needs no slots. */
export function isSlotlessLayout(layout: string | undefined | null): boolean {
  return !!layout && SLOTLESS_LAYOUTS.has(layout)
}

// ---- Template-instance marker (info.schemas payload, E2E-encrypted) --------

export const KIND_TEMPLATE_SCHEMA_ID = 'kindredly.kindTemplate.v1'

export interface KindTemplateSchemaV1 {
  schemaVersion: 1
  templateId: string
}

/**
 * v2 snapshots the template essentials at instantiation, so registry/repo edits
 * or deletions never break an existing dashboard. templateId stays as
 * provenance (future opt-in "template updated — refresh?" flows).
 */
export interface KindTemplateSchemaV2 {
  schemaVersion: 2
  templateId: string
  snapshot: {
    name: string
    accent?: KindTemplateAccent
    emphasis?: KindTemplateEmphasis
    layout?: KindTemplateLayout
    slots: KindTemplateSlot[]
  }
}

export type KindTemplateSchema = KindTemplateSchemaV1 | KindTemplateSchemaV2

/**
 * Read + re-validate the template-instance marker off an item or
 * ItemInfoView-like source. Unknown/malformed versions degrade to a v1 shape
 * (templateId only) rather than null, so a newer marker still marks the
 * collection as an instance on older clients.
 */
export function getKindTemplateSchema(source: any): KindTemplateSchema | null {
  const info: ItemDetailsInfo | undefined = source?.info ?? source?.details?.info
  const raw: any = info?.schemas?.[KIND_TEMPLATE_SCHEMA_ID]
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.templateId !== 'string' || !raw.templateId) return null
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion < 1) return null
  if (raw.schemaVersion === 2) {
    const snap: any = raw.snapshot
    const slots = Array.isArray(snap?.slots)
      ? snap.slots.filter((s: any) => s && typeof s.kindId === 'string' && s.kindId)
      : []
    // Slots are what proves a snapshot survived intact — except for layouts that
    // never had any, where demanding them would strip a gallery of its snapshot
    // and dead-end the collection the moment its template moves.
    const usable = slots.length > 0 || isSlotlessLayout(snap?.layout)
    if (typeof snap?.name === 'string' && snap.name && usable) {
      return { schemaVersion: 2, templateId: raw.templateId, snapshot: { ...snap, slots } }
    }
  }
  return { schemaVersion: 1, templateId: raw.templateId }
}

/** Snapshot a template into a v2 instance marker. */
export function makeKindTemplateSchema(template: KindTemplate): KindTemplateSchemaV2 {
  return {
    schemaVersion: 2,
    templateId: template.id,
    snapshot: {
      name: template.name,
      ...(template.accent ? { accent: template.accent } : {}),
      ...(template.emphasis ? { emphasis: template.emphasis } : {}),
      ...(template.layout ? { layout: template.layout } : {}),
      slots: template.slots.map((slot) => ({ ...slot })),
    },
  }
}

/**
 * Turn a marker into a renderable template. The live registry wins when the
 * templateId still resolves (bundled improvements flow through); the v2
 * snapshot is the fallback that keeps deleted/renamed templates working.
 */
export function resolveKindTemplateFromSchema(schema: KindTemplateSchema | null): KindTemplate | null {
  if (!schema) return null
  const live = getKindTemplate(schema.templateId)
  if (live) return live
  if (schema.schemaVersion === 2) return { id: schema.templateId, ...schema.snapshot }
  return null
}

/** Immutable merge — preserves other info keys and foreign schema entries. */
export function setKindTemplateSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: KindTemplateSchema,
): ItemDetailsInfo {
  const base = info ?? {}
  return {
    ...base,
    schemas: {
      ...(base.schemas ?? {}),
      [KIND_TEMPLATE_SCHEMA_ID]: schema,
    },
  }
}

/**
 * Immutable delete — drops only this marker, leaving other info keys and foreign
 * schema entries alone. The collection becomes an ordinary one; nothing else is
 * touched, and in particular members keep their `kinds`, so re-applying the same
 * template restores the exact same coverage.
 */
export function clearKindTemplateSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
): ItemDetailsInfo {
  const base = info ?? {}
  if (!base.schemas || !(KIND_TEMPLATE_SCHEMA_ID in base.schemas)) return { ...base }
  const { [KIND_TEMPLATE_SCHEMA_ID]: _removed, ...rest } = base.schemas as Record<string, unknown>
  return { ...base, schemas: rest }
}
