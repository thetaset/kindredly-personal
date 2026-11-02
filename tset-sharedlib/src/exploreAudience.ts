import type { MinAgeGroup, TargetAudience } from './content.types';
import { ageGroupForAge, calculateAge, type DateOfBirth } from './date.utils';

/**
 * Who an Explore item is for, by a child's age group (HAT-554). There are two ways to look:
 *
 * - `madeFor` — a parent picked one of their children. Only what is made for that child's age
 *   group or for all ages (`ta_*`) and not rated for anyone older (`minage_*`). An item with no age
 *   group is for no child in particular: it shows under Everyone and waits for a curator to set one.
 * - `shownTo` — the child is signed in themselves. Everything curated except what is rated for
 *   someone older, or made only for other ages. An item with no age group yet stays visible, as it
 *   always has for a child browsing Explore.
 *
 * Kindredly never guesses an age. The server counts topics with `fitsLens` and Explore's searches
 * send the lens as `forAudience`, which the server turns into the same rule in SQL, so the number on
 * a topic is what opening it shows.
 */

export type AudienceLensMode = 'madeFor' | 'shownTo';
export type AudienceLens = { audience: TargetAudience; mode: AudienceLensMode };

/** Youngest to oldest. A child's age group and a rating share these names: `ta_kids`, `minage_kids`. */
const BANDS = ['prek', 'kids', 'preteen', 'teen', 'adult'] as const;

/** The age groups a child can be in, youngest first. */
export const CHILD_AUDIENCES: TargetAudience[] = BANDS.map((band) => `ta_${band}` as TargetAudience);

/** The tags that give an item an age group. `ta_unknown` is the same as none. */
export const AGE_GROUP_TAGS: TargetAudience[] = [...CHILD_AUDIENCES, 'ta_all'];

/** A person's age group from their date of birth, or null when it is not set. */
export function audienceForDob(dob: DateOfBirth | null | undefined, referenceDate?: Date): TargetAudience | null {
  const rating = ageGroupForAge(calculateAge(dob, referenceDate));
  return rating ? (rating.replace('minage_', 'ta_') as TargetAudience) : null;
}

/** The ratings for anyone older than this age group: what a child of that age is not shown. */
export function olderRatings(audience: TargetAudience): MinAgeGroup[] {
  const index = BANDS.indexOf(audience.replace('ta_', '') as (typeof BANDS)[number]);
  if (index === -1) return [];
  return BANDS.slice(index + 1).map((band) => `minage_${band}` as MinAgeGroup);
}

/** A lens the server can trust: a real age group and a known mode, or null. */
export function normalizeLens(raw: unknown): AudienceLens | null {
  const lens = raw as Partial<AudienceLens> | null | undefined;
  if (!lens || !CHILD_AUDIENCES.includes(lens.audience as TargetAudience)) return null;
  if (lens.mode !== 'madeFor' && lens.mode !== 'shownTo') return null;
  return { audience: lens.audience as TargetAudience, mode: lens.mode };
}

/** Made for this age group or all ages, and not rated older. No age group chosen means Everyone: always. */
export function fitsAudience(
  useCriteria: readonly string[] | null | undefined,
  audience: TargetAudience | null | undefined,
): boolean {
  if (!audience) return true;
  return fitsLens(useCriteria, { audience, mode: 'madeFor' });
}

/** Whether an item's tags put it in front of this lens. No lens means Everyone: always. */
export function fitsLens(useCriteria: readonly string[] | null | undefined, lens: AudienceLens | null | undefined): boolean {
  if (!lens) return true;
  const tags = useCriteria || [];
  if (olderRatings(lens.audience).some((rating) => tags.includes(rating))) return false;
  const forThem = tags.includes(lens.audience) || tags.includes('ta_all');
  if (lens.mode === 'madeFor') return forThem;
  return forThem || !AGE_GROUP_TAGS.some((tag) => tags.includes(tag));
}
