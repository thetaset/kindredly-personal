import type { MinAgeGroup } from '../content.types'

/**
 * Shared age-band vocabulary for "which presets show by default" lists
 * (Essentials suggestions, collection templates, …).
 *
 * Lives in sharedlib because the collection-template seed references these
 * constants, and that seed is read by the catalog build script and the
 * sanitizer as well as by the client.
 *
 * Note the codebase carries two conventions for an absent `minAgeGroups`:
 * these preset catalogs read it as **all ages**, while `CategorySet`
 * (categoryExplorer.types.ts) reads it as "not an age set" — `general`
 * deliberately declares none. `matchesAgeBand` implements the preset meaning.
 */
export const KIDS_BANDS: MinAgeGroup[] = ['minage_kids', 'minage_preteen', 'minage_teen']
export const YOUNG_BANDS: MinAgeGroup[] = ['minage_prek', 'minage_kids', 'minage_preteen', 'minage_teen']
export const TEEN_BANDS: MinAgeGroup[] = ['minage_preteen', 'minage_teen', 'minage_adult']
export const ADULT_BANDS: MinAgeGroup[] = ['minage_adult']

/** Every value the `MinAgeGroup` union admits — the allow-list the sanitizer filters against. */
export const ALL_MIN_AGE_GROUPS: MinAgeGroup[] = [
  'minage_na',
  'minage_prek',
  'minage_kids',
  'minage_preteen',
  'minage_teen',
  'minage_adult',
  'minage_unknown',
]

/**
 * Does a preset belong in the default list for this age band?
 *
 * - No `minAgeGroups` means all ages — always true.
 * - An unknown band (no date of birth) falls back to adult, mirroring the
 *   Category Explorer's fallback to the general set.
 *
 * This only decides what shows by *default*. Every preset stays reachable
 * through the browse-all affordance in the UI.
 */
export function matchesAgeBand(
  minAgeGroups: MinAgeGroup[] | undefined | null,
  band: MinAgeGroup | null | undefined,
): boolean {
  if (!minAgeGroups || minAgeGroups.length === 0) return true
  const effective: MinAgeGroup = band ?? 'minage_adult'
  return minAgeGroups.includes(effective)
}
