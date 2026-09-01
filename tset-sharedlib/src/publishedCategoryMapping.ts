import { DefaultCategorySets } from './categoryExplorerSets'
import type { CategoryNode, CategorySet } from './types/categoryExplorer.types'

// Published content used to be tagged with a flat, ad-hoc `cat_*` vocabulary (see the
// legacy `DefaultCategories` in constants.ts). The canonical taxonomy is now the `general`
// CategorySet's leaf topics. This module maps the old IDs onto the new leaves and validates
// category writes — used by the one-time migration, the importer, and admin assignment.
//
// IDs not listed here are intentionally dropped (age signals or catch-alls that aren't a
// topic): `cat_kids`, `cat_misc`, `cat_other`, `cat_parenting`. Dropped items become
// "uncategorized" and surface in the admin tools for manual assignment.
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  // Learning & School
  cat_education: 'gen_education',
  cat_reference: 'gen_education',
  cat_school: 'gen_education',
  cat_thinking: 'gen_critical_thinking',
  cat_critical_thinking: 'gen_critical_thinking',
  cat_logic: 'gen_critical_thinking',
  cat_media_literacy: 'gen_critical_thinking',
  cat_data: 'gen_math',
  cat_math: 'gen_math',
  cat_statistics: 'gen_math',
  cat_language: 'gen_language',
  cat_languages: 'gen_language',
  cat_poetry: 'gen_language',
  // Science & Tech
  cat_science: 'gen_science',
  cat_biology: 'gen_science',
  cat_chemistry: 'gen_science',
  cat_earthscience: 'gen_science',
  cat_space: 'gen_space',
  cat_nature: 'gen_nature',
  cat_botany: 'gen_nature',
  cat_animals: 'gen_animals',
  cat_birds: 'gen_animals',
  cat_insects: 'gen_animals',
  cat_paleontology: 'gen_animals',
  cat_ocean: 'gen_ocean',
  cat_weather: 'gen_weather',
  cat_coding: 'gen_coding',
  cat_ai: 'gen_ai',
  cat_technology: 'gen_technology',
  cat_engineering: 'gen_engineering',
  cat_inventions: 'gen_inventions',
  // People & History
  cat_history: 'gen_history',
  cat_civics: 'gen_civics',
  cat_government: 'gen_civics',
  cat_geography: 'gen_geography',
  cat_mythology: 'gen_mythology',
  cat_worldviews: 'gen_religion_philosophy',
  cat_news: 'gen_news',
  cat_politics: 'gen_news',
  // Arts & Media
  cat_art: 'gen_art',
  cat_music: 'gen_music',
  cat_diy: 'gen_diy',
  cat_photography: 'gen_photography',
  cat_entertainment: 'gen_entertainment_leaf',
  // Health & Wellbeing
  cat_health: 'gen_health',
  cat_exercise: 'gen_health',
  cat_wellbeing: 'gen_mindfulness',
  cat_character: 'gen_mindfulness',
  cat_sports: 'gen_sports',
  // Everyday Life
  cat_food: 'gen_food',
  cat_cooking: 'gen_food',
  cat_finance: 'gen_finance',
  cat_money: 'gen_finance',
  cat_productivity: 'gen_productivity',
  cat_lifeskills: 'gen_life_skills',
  cat_gardening: 'gen_gardening',
  cat_petcare: 'gen_pets',
  cat_shopping: 'gen_shopping',
}

function collectLeafIds(sets: CategorySet[]): Set<string> {
  const ids = new Set<string>()
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children)
      else ids.add(node.id)
    }
  }
  for (const set of sets) walk(set.nodes ?? [])
  return ids
}

function collectLeaves(sets: CategorySet[]): Array<{ id: string; name: string }> {
  const leaves: Array<{ id: string; name: string }> = []
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children)
      else leaves.push({ id: node.id, name: node.label })
    }
  }
  for (const set of sets) walk(set.nodes ?? [])
  return leaves
}

// The canonical published taxonomy is the `general` set's leaves (the map targets these).
const generalSet = DefaultCategorySets.find((set) => set.id === 'general')
const canonicalSets = generalSet ? [generalSet] : DefaultCategorySets
export const CANONICAL_CATEGORY_IDS: Set<string> = collectLeafIds(canonicalSets)

/** Flat `{ id, name }` list of canonical leaves — feeds the legacy `/data/categories` shape. */
export const CANONICAL_CATEGORIES: Array<{ id: string; name: string }> = collectLeaves(canonicalSets)

export function isCanonicalCategoryId(id: string): boolean {
  return CANONICAL_CATEGORY_IDS.has(id)
}

// Translate a list of category IDs to canonical leaf IDs: already-canonical IDs pass
// through, known legacy `cat_*` IDs map across, everything else is dropped. The result is
// de-duplicated and order-preserving. Safe to call on already-migrated data (idempotent).
export function mapLegacyCategoryIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id) continue
    const mapped = CANONICAL_CATEGORY_IDS.has(id) ? id : LEGACY_CATEGORY_MAP[id]
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped)
      out.push(mapped)
    }
  }
  return out
}

// Keep only IDs present in `valid` (no legacy translation). De-duplicated, order-preserving.
// The server passes the EFFECTIVE taxonomy's leaf ids here (admin overlay ∪ seed) so that
// admin-created categories are assignable, not just the ones bundled at build time.
export function sanitizeCategoryIdsAgainst(ids: unknown, valid: Set<string>): string[] {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (id && valid.has(id) && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

// Keep only valid canonical (bundled-seed) IDs. Convenience wrapper used where the effective
// taxonomy isn't available (migrations, importer back-compat).
export function sanitizeCategoryIds(ids: unknown): string[] {
  return sanitizeCategoryIdsAgainst(ids, CANONICAL_CATEGORY_IDS)
}

/** Leaf ids of the given sets — lets the server validate against the live (overlay) taxonomy. */
export function leafIdsForSets(sets: CategorySet[]): Set<string> {
  return collectLeafIds(sets)
}

// Rewrite a list of category ids through a remap table: `{ oldId: newId | null }`. A key
// mapped to null/'' (or empty string) is DROPPED; ids absent from the table pass through
// unchanged. De-duplicated and order-preserving. This is the reusable "rename / merge /
// delete" primitive behind the admin remap tool and any future taxonomy-change migration —
// the same shape that turned `cat_*` into `gen_*`. Safe to run repeatedly (idempotent once
// the old ids are gone).
export function applyCategoryRemap(ids: unknown, remap: Record<string, string | null | undefined>): string[] {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id) continue
    let target: string | null | undefined = id
    if (Object.prototype.hasOwnProperty.call(remap, id)) {
      const mapped = remap[id]
      target = typeof mapped === 'string' ? mapped.trim() : null
    }
    if (target && !seen.has(target)) {
      seen.add(target)
      out.push(target)
    }
  }
  return out
}
