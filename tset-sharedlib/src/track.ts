import type { ItemDetailsInfo } from './types/item.types';
import type { SubscriptionConsumeSettingsV1 } from './types/published.types';

// A learning track's outline (docs/trackers/learning-tracks-tracker.md, TRK-6).
//
// A track is a collection you subscribe to; each item is its own library or published item. The
// outline lives on the collection:
//   - Library collection: `info.schemas['kindredly.track.v1']`.
//   - Published collection: `data.track`.
//
// Sections are headers placed in the collection's order, never sub-collections and never labels on
// items (decision 15): a section starts at an item (`startsAt`), and every item belongs to the
// nearest header at or before it, so no item can be left out. Items before the first header are an
// unlabeled introduction. When a section's first item is removed, the section starts at the next
// item that is still there, found from `itemOrder`, the order when the outline was last saved.

export const TRACK_SCHEMA_ID = 'kindredly.track.v1';

/** A Theme is standalone items at a limited pace; a Light course goes somewhere, with no limit. */
export type TrackKind = 'theme' | 'course';

export const TRACK_KIND_LABELS: Record<TrackKind, string> = {
  theme: 'Theme',
  course: 'Light course',
};

/** The three voices (decision 7). Samples and descriptions are in track-voices.ts. */
export type TrackVoiceKey = 'story' | 'direct' | 'curious';

export interface TrackSection {
  /** Stable, unique in the outline. */
  key: string;
  title: string;
  /** Makes this a subsection of another section. */
  parentKey?: string;
  /** The id of the item the section starts at, as the collection lists it. */
  startsAt: string;
}

export interface TrackOutlineV1 {
  schemaVersion: 1;
  schemaId: typeof TRACK_SCHEMA_ID;
  kind: TrackKind;
  voice: TrackVoiceKey;
  sections: TrackSection[];
  /** A theme's default pace in days (1, 3 or 7). A course has none. */
  paceIntervalDays?: number;
  /** Item ids in order when the outline was saved; only used to place a removed start item. */
  itemOrder?: string[];
  /** Who it was written for, as the maker put it: "curious 12-year-olds". */
  audience?: string;
}

const TRACK_KINDS: TrackKind[] = ['theme', 'course'];
const TRACK_VOICES: TrackVoiceKey[] = ['story', 'direct', 'curious'];

/** Theme paces (decision 19): every day, every 3 days or weekly. There is no own pace. */
export const THEME_PACE_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 1, label: 'Every day' },
  { days: 3, label: 'Every 3 days' },
  { days: 7, label: 'Weekly' },
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Re-validates a stored outline; null when it is not one. */
export function parseTrackOutlineV1(raw: unknown): TrackOutlineV1 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Partial<TrackOutlineV1>;
  if (!TRACK_KINDS.includes(r.kind as TrackKind)) return null;

  const seen = new Set<string>();
  const sections: TrackSection[] = [];
  for (const s of Array.isArray(r.sections) ? r.sections : []) {
    if (!s || typeof s !== 'object') continue;
    const sec = s as Partial<TrackSection>;
    if (!isNonEmptyString(sec.key) || seen.has(sec.key)) continue;
    if (!isNonEmptyString(sec.title) || !isNonEmptyString(sec.startsAt)) continue;
    seen.add(sec.key);
    sections.push({
      key: sec.key,
      title: sec.title,
      startsAt: sec.startsAt,
      ...(isNonEmptyString(sec.parentKey) ? { parentKey: sec.parentKey } : {}),
    });
  }

  const pace = r.paceIntervalDays;
  const itemOrder = Array.isArray(r.itemOrder) ? r.itemOrder.filter(isNonEmptyString) : undefined;

  return {
    schemaVersion: 1,
    schemaId: TRACK_SCHEMA_ID,
    kind: r.kind as TrackKind,
    voice: TRACK_VOICES.includes(r.voice as TrackVoiceKey) ? (r.voice as TrackVoiceKey) : 'story',
    sections,
    ...(r.kind === 'theme'
      ? { paceIntervalDays: THEME_PACE_OPTIONS.some((o) => o.days === pace) ? pace : 1 }
      : {}),
    ...(itemOrder && itemOrder.length ? { itemOrder } : {}),
    ...(isNonEmptyString(r.audience) ? { audience: r.audience } : {}),
  };
}

/** A library collection (`info.schemas`) or a published collection (`data.track`). */
export function getTrackOutlineV1(
  source:
    | {
        info?: ItemDetailsInfo | null;
        details?: { info?: ItemDetailsInfo | null; data?: { track?: unknown } | null } | null;
        data?: { track?: unknown } | null;
      }
    | null
    | undefined,
): TrackOutlineV1 | null {
  const raw =
    source?.info?.schemas?.[TRACK_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[TRACK_SCHEMA_ID] ||
    source?.data?.track ||
    source?.details?.data?.track;
  return parseTrackOutlineV1(raw);
}

export function setTrackOutlineOnInfo(
  info: ItemDetailsInfo | null | undefined,
  outline: TrackOutlineV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? info.schemas : {};
  return { ...(info || {}), schemas: { ...schemas, [TRACK_SCHEMA_ID]: outline } };
}

/**
 * How a new subscriber follows the track, for the published collection's
 * `data.defaultConsumeSettings`: a theme one item per its pace, a course with no limit.
 */
export function getTrackDefaultConsumeSettings(outline: TrackOutlineV1): SubscriptionConsumeSettingsV1 {
  if (outline.kind === 'theme') {
    return { mode: 'work_through', completionMode: 'explicit', paceIntervalDays: outline.paceIntervalDays || 1 };
  }
  return { mode: 'work_through', completionMode: 'explicit' };
}

// ---------------------------------------------------------------------------
// Sections placed in the collection's order
// ---------------------------------------------------------------------------

export interface ResolvedTrackSection {
  key: string;
  title: string;
  /** 0 for a section, 1 for a subsection, and so on. */
  depth: number;
  parentKey?: string;
  /** Items directly under this header, in order. Empty when a subsection starts at the same item. */
  itemIds: string[];
  /** Index in the collection's order where the section starts. */
  startIndex: number;
}

export interface ResolvedTrackOutline {
  /** Items before the first header. */
  introItemIds: string[];
  /** Headers in reading order; a subsection follows its parent. */
  sections: ResolvedTrackSection[];
  /** The section each item falls under; null for the introduction. */
  sectionKeyByItemId: Record<string, string | null>;
}

const MAX_SECTION_DEPTH = 3;

/** Where a section starts now: its item, or the next item still in the collection. */
function resolveStartIndex(
  section: TrackSection,
  indexById: Map<string, number>,
  itemOrder: string[] | undefined,
): number {
  const direct = indexById.get(section.startsAt);
  if (direct !== undefined) return direct;
  if (!itemOrder) return -1;
  const was = itemOrder.indexOf(section.startsAt);
  if (was < 0) return -1;
  for (let i = was + 1; i < itemOrder.length; i++) {
    const idx = indexById.get(itemOrder[i]);
    if (idx !== undefined) return idx;
  }
  return -1;
}

/**
 * Places the outline's headers in the collection's current order (`orderedItemIds`, first item
 * first) and puts every item under the nearest header at or before it.
 */
export function resolveTrackSections(outline: TrackOutlineV1, orderedItemIds: string[]): ResolvedTrackOutline {
  const indexById = new Map<string, number>();
  orderedItemIds.forEach((id, i) => {
    if (!indexById.has(id)) indexById.set(id, i);
  });

  const byKey = new Map(outline.sections.map((s) => [s.key, s]));
  const depthOf = (section: TrackSection): number => {
    let depth = 0;
    const visited = new Set<string>([section.key]);
    let parentKey = section.parentKey;
    while (parentKey && byKey.has(parentKey) && !visited.has(parentKey) && depth < MAX_SECTION_DEPTH) {
      visited.add(parentKey);
      depth += 1;
      parentKey = byKey.get(parentKey)!.parentKey;
    }
    return depth;
  };

  const placed = outline.sections
    .map((section, outlineIndex) => ({
      section,
      outlineIndex,
      startIndex: resolveStartIndex(section, indexById, outline.itemOrder),
      depth: depthOf(section),
    }))
    .filter((p) => p.startIndex >= 0)
    // At one item, a parent comes before its subsection, and the last header there owns the items.
    .sort((a, b) => a.startIndex - b.startIndex || a.depth - b.depth || a.outlineIndex - b.outlineIndex);

  const sections: ResolvedTrackSection[] = placed.map((p) => {
    const parentKey = p.section.parentKey && byKey.has(p.section.parentKey) ? p.section.parentKey : undefined;
    return {
      key: p.section.key,
      title: p.section.title,
      depth: p.depth,
      ...(parentKey && p.depth > 0 ? { parentKey } : {}),
      itemIds: [],
      startIndex: p.startIndex,
    };
  });

  const introItemIds: string[] = [];
  const sectionKeyByItemId: Record<string, string | null> = {};
  let current = -1;
  orderedItemIds.forEach((id, i) => {
    while (current + 1 < sections.length && sections[current + 1].startIndex <= i) current += 1;
    if (current < 0) {
      introItemIds.push(id);
      sectionKeyByItemId[id] = null;
    } else {
      sections[current].itemIds.push(id);
      sectionKeyByItemId[id] = sections[current].key;
    }
  });

  return { introItemIds, sections, sectionKeyByItemId };
}

/**
 * The outline to save after the collection changed: each section's `startsAt` moved to where it
 * now starts, sections with nothing left removed, and `itemOrder` brought up to date.
 */
export function updateTrackOutlineForItems(outline: TrackOutlineV1, orderedItemIds: string[]): TrackOutlineV1 {
  const indexById = new Map<string, number>();
  orderedItemIds.forEach((id, i) => {
    if (!indexById.has(id)) indexById.set(id, i);
  });
  const sections: TrackSection[] = [];
  for (const section of outline.sections) {
    const idx = resolveStartIndex(section, indexById, outline.itemOrder);
    if (idx < 0) continue;
    sections.push({ ...section, startsAt: orderedItemIds[idx] });
  }
  const keys = new Set(sections.map((s) => s.key));
  return {
    ...outline,
    sections: sections.map((s) => {
      if (s.parentKey && !keys.has(s.parentKey)) {
        const { parentKey: _dropped, ...rest } = s;
        return rest;
      }
      return s;
    }),
    itemOrder: [...orderedItemIds],
  };
}
