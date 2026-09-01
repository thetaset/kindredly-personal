import { ItemTypeSecondary } from '../content.types'

/**
 * Kind registry — the canonical vocabulary of semantic "slots" an item can fill.
 *
 * A kind describes an item's ROLE ("my dentist", "my email app"), distinct from the
 * existing axes: type/subType (behavior), categories (topic), tags (freeform),
 * useCriteria (editorial). Kinds power slot dashboards (template collections that show
 * what you have / what's a possible next step), per-kind defaults (defaults.byKind
 * user pref), and the taskbar's app slots.
 *
 * Kind assignments live in the ENCRYPTED `kinds` column on Item (see
 * Encryption.Schema.ts) — the server never learns which slots an account fills.
 *
 * Users may also mint custom kinds under the reserved `custom.` namespace
 * (e.g. `custom.orthodontist`); those are user vocabulary and never appear here.
 */
export type KindDefinition = {
  id: string
  label: string
  /** Display grouping ('Apps' | 'Health' | ...) */
  group: string
  /** Bootstrap icon name */
  icon?: string
  /** Launchable app-slot — drives taskbar/default-launch affordances */
  appLike?: boolean
  /** Back-compat bridge to today's TaskButtonEntry.name / SetupTaskbarTarget */
  taskbarTarget?: string
  /** Hint for pickers/inference — the item types that usually fill this slot */
  expectedTypes?: ItemTypeSecondary[]
  /** 'single': one item expected (default when omitted is 'multi') */
  cardinality?: 'single' | 'multi'
  /**
   * Extra words to search a library with when nothing carries this kind yet. The label
   * alone is a poor query — "Bank" and "Primary physician" match nothing real — so these
   * are the brand and domain words that actually appear in an item's name, url, or tags.
   * Results found this way are guesses, never matches; pickers keep them under their own
   * heading.
   */
  searchHints?: string[]
}

export const KIND_DEFINITIONS: KindDefinition[] = [
  // ---- Apps — unifies datadefaults/taskbar.ts button names + SetupTaskbarTarget ----
  { id: 'apps.search', label: 'Search', group: 'Apps', icon: 'search', appLike: true, taskbarTarget: 'search', cardinality: 'single', searchHints: ['google', 'duckduckgo', 'bing', 'search engine'] },
  { id: 'apps.email', label: 'Email', group: 'Apps', icon: 'envelope', appLike: true, taskbarTarget: 'email', cardinality: 'single', searchHints: ['gmail', 'outlook', 'mail', 'inbox'] },
  { id: 'apps.chat', label: 'Chat', group: 'Apps', icon: 'chat', appLike: true, taskbarTarget: 'chat', cardinality: 'single', searchHints: ['messages', 'whatsapp', 'signal', 'messenger'] },
  { id: 'apps.calendar', label: 'Calendar', group: 'Apps', icon: 'calendar', appLike: true, taskbarTarget: 'calendar', cardinality: 'single', searchHints: ['google calendar', 'schedule', 'agenda'] },
  { id: 'apps.photos', label: 'Photos', group: 'Apps', icon: 'image', appLike: true, taskbarTarget: 'photos', cardinality: 'single', searchHints: ['google photos', 'icloud', 'album', 'pictures'] },
  { id: 'apps.files', label: 'Files', group: 'Apps', icon: 'files', appLike: true, taskbarTarget: 'files', cardinality: 'single', searchHints: ['drive', 'dropbox', 'onedrive', 'documents'] },
  { id: 'apps.music', label: 'Music', group: 'Apps', icon: 'headphones', appLike: true, taskbarTarget: 'music', cardinality: 'single', searchHints: ['spotify', 'apple music', 'youtube music', 'playlist'] },
  { id: 'apps.notes', label: 'Notes', group: 'Apps', icon: 'journal-text', appLike: true, taskbarTarget: 'notes', cardinality: 'single', searchHints: ['notion', 'keep', 'obsidian', 'notepad'] },
  { id: 'apps.ai', label: 'AI Assistant', group: 'Apps', icon: 'stars', appLike: true, taskbarTarget: 'ai', cardinality: 'single', searchHints: ['chatgpt', 'claude', 'gemini', 'assistant'] },

  // ---- Health — first slot-dashboard domain ----
  { id: 'health.insurance.medical', label: 'Health insurance', group: 'Health', icon: 'shield-check', cardinality: 'single', expectedTypes: ['information', 'website'], searchHints: ['insurance', 'member portal', 'coverage', 'aetna', 'blue cross'] },
  { id: 'health.insurance.dental', label: 'Dental insurance', group: 'Health', icon: 'shield-check', cardinality: 'single', expectedTypes: ['information', 'website'], searchHints: ['dental', 'insurance', 'delta dental', 'coverage'] },
  { id: 'health.provider.physician', label: 'Primary physician', group: 'Health', icon: 'heart-pulse', cardinality: 'single', expectedTypes: ['person', 'organization', 'website'], searchHints: ['doctor', 'clinic', 'patient portal', 'mychart'] },
  { id: 'health.provider.dentist', label: 'Dentist', group: 'Health', icon: 'emoji-smile', cardinality: 'single', expectedTypes: ['person', 'organization', 'website'], searchHints: ['dentist', 'dental', 'orthodontist', 'teeth'] },
  { id: 'health.provider.physicalTherapist', label: 'Physical therapist', group: 'Health', icon: 'person-walking', cardinality: 'single', expectedTypes: ['person', 'organization', 'website'], searchHints: ['physical therapy', 'pt', 'rehab', 'sports medicine'] },
  { id: 'health.pharmacy', label: 'Pharmacy', group: 'Health', icon: 'capsule', cardinality: 'single', expectedTypes: ['organization', 'website'], searchHints: ['cvs', 'walgreens', 'prescription', 'refill'] },

  // ---- Home ----
  { id: 'home.wifi', label: 'Wi-Fi & network', group: 'Home', icon: 'wifi', cardinality: 'single', expectedTypes: ['information', 'website'], searchHints: ['wifi', 'router', 'network', 'modem', 'password'] },
  { id: 'home.insurance', label: 'Home insurance', group: 'Home', icon: 'shield-check', cardinality: 'single', expectedTypes: ['information', 'website'], searchHints: ['homeowners', 'renters', 'insurance', 'policy'] },
  { id: 'home.utilities', label: 'Utilities', group: 'Home', icon: 'lightning-charge', expectedTypes: ['website', 'organization'], searchHints: ['electric', 'gas', 'water', 'utility', 'internet bill'] },
  { id: 'home.warranties', label: 'Manuals & warranties', group: 'Home', icon: 'file-earmark-text', expectedTypes: ['information', 'website'], searchHints: ['manual', 'warranty', 'receipt', 'serial number'] },
  { id: 'home.serviceProviders', label: 'Service providers', group: 'Home', icon: 'tools', expectedTypes: ['organization', 'person', 'website'], searchHints: ['plumber', 'electrician', 'hvac', 'handyman', 'landscaping'] },

  // ---- Finance ----
  { id: 'finance.bank', label: 'Bank', group: 'Finance', icon: 'bank', expectedTypes: ['website', 'organization'], searchHints: ['bank', 'checking', 'credit union', 'chase'] },
  { id: 'finance.taxes', label: 'Tax portal', group: 'Finance', icon: 'receipt', cardinality: 'single', expectedTypes: ['website', 'information'], searchHints: ['irs', 'turbotax', 'w2', 'filing', 'tax'] },
  { id: 'finance.insurance.auto', label: 'Auto insurance', group: 'Finance', icon: 'car-front', cardinality: 'single', expectedTypes: ['information', 'website'], searchHints: ['auto insurance', 'car insurance', 'geico', 'policy'] },
  { id: 'finance.retirement', label: 'Retirement account', group: 'Finance', icon: 'piggy-bank', expectedTypes: ['website', 'organization'], searchHints: ['401k', 'ira', 'fidelity', 'vanguard', 'retirement'] },

  // ---- School ----
  { id: 'school.portal', label: 'School portal', group: 'School', icon: 'mortarboard', cardinality: 'single', expectedTypes: ['website'], searchHints: ['powerschool', 'canvas', 'schoology', 'gradebook'] },
  { id: 'school.teacher', label: 'Teacher contact', group: 'School', icon: 'person', expectedTypes: ['person', 'information'], searchHints: ['teacher', 'classroom', 'homeroom', 'email teacher'] },
  { id: 'school.calendar', label: 'School calendar', group: 'School', icon: 'calendar-event', cardinality: 'single', expectedTypes: ['website', 'information'], searchHints: ['school calendar', 'schedule', 'bell schedule', 'holidays'] },
  { id: 'school.lunchMenu', label: 'Lunch menu', group: 'School', icon: 'cup-straw', cardinality: 'single', expectedTypes: ['website', 'information'], searchHints: ['lunch', 'menu', 'cafeteria', 'school meals'] },
]

export const KIND_IDS: Set<string> = new Set(KIND_DEFINITIONS.map((k) => k.id))

const KIND_BY_ID: Map<string, KindDefinition> = new Map(KIND_DEFINITIONS.map((k) => [k.id, k]))

export function getKindDefinition(id: string): KindDefinition | null {
  return KIND_BY_ID.get(id) ?? null
}

/** Registry kinds grouped for pickers, preserving definition order. */
export function getKindsByGroup(): Array<{ group: string; kinds: KindDefinition[] }> {
  const groups: Array<{ group: string; kinds: KindDefinition[] }> = []
  const byName = new Map<string, KindDefinition[]>()
  for (const kind of KIND_DEFINITIONS) {
    let list = byName.get(kind.group)
    if (!list) {
      list = []
      byName.set(kind.group, list)
      groups.push({ group: kind.group, kinds: list })
    }
    list.push(kind)
  }
  return groups
}

/** Kind id for a taskbar button/setup target name ('email' → 'apps.email'), if bridged. */
export function getKindIdForTaskbarTarget(target: string): string | null {
  const def = KIND_DEFINITIONS.find((k) => k.taskbarTarget === target)
  return def?.id ?? null
}

// ---- Custom kinds (`custom.<slug>`) — user-minted vocabulary ----------------

export const CUSTOM_KIND_PREFIX = 'custom.'
const CUSTOM_KIND_RE = /^custom\.[a-z0-9][a-z0-9_-]{0,47}$/

export function isCustomKindId(id: string): boolean {
  return typeof id === 'string' && CUSTOM_KIND_RE.test(id)
}

/** Slugify a user label into a `custom.<slug>` kind id; null if nothing usable remains. */
export function makeCustomKindId(label: string): string | null {
  const slug = (label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug ? `${CUSTOM_KIND_PREFIX}${slug}` : null
}

/** Human label for any kind id — registry label, or a prettified custom slug. */
export function getKindLabel(id: string): string {
  const def = KIND_BY_ID.get(id)
  if (def) return def.label
  if (isCustomKindId(id)) {
    const slug = id.slice(CUSTOM_KIND_PREFIX.length).replace(/[-_]+/g, ' ').trim()
    return slug.charAt(0).toUpperCase() + slug.slice(1)
  }
  return id
}

/**
 * Words to search a library with for this kind: its label first, then its hints.
 * A custom kind has only its label; an unknown id has nothing worth searching for.
 */
export function getKindSearchTerms(id: string): string[] {
  const def = KIND_BY_ID.get(id)
  if (def) return [def.label, ...(def.searchHints || [])]
  return isCustomKindId(id) ? [getKindLabel(id)] : []
}

// Keep only registry IDs and well-formed `custom.*` IDs. De-duplicated, order-preserving —
// mirrors sanitizeCategoryIdsAgainst (publishedCategoryMapping.ts).
export function sanitizeKindIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    if (KIND_IDS.has(id) || isCustomKindId(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}
