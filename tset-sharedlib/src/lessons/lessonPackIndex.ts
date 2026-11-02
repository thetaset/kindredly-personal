import { calculateAge, type DateOfBirth } from '../date.utils';

// What the app needs to know about the built-in lesson packs before any lesson is shown: which packs
// there are and for which ages, how a Library item points at one, and which pack each child got. The
// lessons themselves (./digitalCitizenship, with their text and pictures) load only where they are
// shown, so the app's start doesn't carry them (HAT-578). `tests/lessonPacks.test.ts` checks that
// this list matches the packs.

/** Where a pack item keeps which pack it is. */
export const LESSON_PACK_SCHEMA_ID = 'kindredly.lessonPack.v1';

/** Each pack's key (stable: in children's prefs and on their items) and the ages it is for. */
export const LESSON_PACK_AGES: ReadonlyArray<{ key: string; minAge: number; maxAge: number }> = [
  { key: 'digital-citizenship-4-7', minAge: 4, maxAge: 7 },
  { key: 'digital-citizenship-8-10', minAge: 8, maxAge: 10 },
  { key: 'digital-citizenship-11-13', minAge: 11, maxAge: 13 },
  { key: 'digital-citizenship-14-17', minAge: 14, maxAge: 17 },
];

/** The key of the pack for a child of this age, or null (no date of birth means no pack: never guess an age). */
export function lessonPackKeyForDob(dob: DateOfBirth | null | undefined, referenceDate?: Date): string | null {
  const age = calculateAge(dob, referenceDate);
  if (age === null) return null;
  return LESSON_PACK_AGES.find((pack) => age >= pack.minAge && age <= pack.maxAge)?.key || null;
}

/** The key of the pack a Library item points at, or null for any other item or a pack this app doesn't know. */
export function lessonPackKeyOfItem(details: { info?: unknown } | null | undefined): string | null {
  const schemas = (details?.info as { schemas?: Record<string, unknown> } | null | undefined)?.schemas;
  const ref = schemas?.[LESSON_PACK_SCHEMA_ID] as { packKey?: unknown } | undefined;
  const key = typeof ref?.packKey === 'string' ? ref.packKey : null;
  return key && LESSON_PACK_AGES.some((pack) => pack.key === key) ? key : null;
}

export function quickCheckPartKey(lessonKey: string): string {
  return `${lessonKey}/check`;
}

/**
 * The pack item each child got, per pack. Written by whoever added it (the child's own app, or a
 * parent's from the child's Digital citizenship page). A pack recorded here is never added again,
 * so an item a parent removes stays removed.
 */
export const LESSON_PACKS_PLACED_PREF_KEY = 'lessonPacks.placed';

export type PlacedLessonPack = {
  packKey: string;
  /** The one Library item the pack became. */
  itemId: string;
  /** Extra key → the Library website a parent added. */
  extraItemIds: Record<string, string>;
  placedAtMs: number;
};

function readIdMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, id] of Object.entries(raw)) if (typeof id === 'string' && id) out[key] = id;
  }
  return out;
}

/**
 * Reads the pref into a record per pack key, dropping anything malformed. A record from before
 * HAT-560 (a collection of lesson items, never in production) has no `itemId` and is dropped, so
 * that child gets the pack as one item.
 */
export function readPlacedLessonPacks(raw: unknown): Record<string, PlacedLessonPack> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, PlacedLessonPack> = {};
  for (const [packKey, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Partial<PlacedLessonPack>;
    if (typeof v.itemId !== 'string' || !v.itemId) continue;
    out[packKey] = {
      packKey,
      itemId: v.itemId,
      extraItemIds: readIdMap(v.extraItemIds),
      placedAtMs: typeof v.placedAtMs === 'number' ? v.placedAtMs : 0,
    };
  }
  return out;
}
