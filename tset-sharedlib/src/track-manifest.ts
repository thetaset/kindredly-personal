// Publish as Kindredly: a learning track as a content loader manifest (TRK-22, decision 1).
//
// An official track goes in the way every official feed does, through the content loader's dry run
// and execute, inactive until it is approved. The collection record carries the outline as
// `data.track` and the pace as `data.defaultConsumeSettings`; each item is an `information` record
// whose body is the composed markdown and whose fields are `data.trackItem`.
//
// Identities are `sourceItemId`s built from the track's key, so publishing the same track again
// updates it instead of making a copy. A section starts at an item's `sourceItemId`, which the
// published item keeps, so Contents finds it (`workThroughContents.ts`).

import type { AdminContentLoaderManifest, AdminContentLoaderManifestRecord } from './api/api-types';
import { getTrackDefaultConsumeSettings, TRACK_SCHEMA_ID, type TrackKind, type TrackOutlineV1, type TrackVoiceKey } from './track';
import { composeTrackItemMarkdown, type TrackItemV1 } from './track-item';

export const TRACK_MANIFEST_COLLECTION_LOCAL_ID = 'track';

export interface TrackManifestInput {
  /** Stable for this track: publishing it again with the same key updates it. */
  trackKey: string;
  title: string;
  description?: string;
  kind: TrackKind;
  voice: TrackVoiceKey;
  audience?: string;
  /** A theme's pace in days (1, 3 or 7). */
  paceIntervalDays?: number;
  sections: Array<{ key: string; title: string; parentKey?: string; startsAtItemKey: string }>;
  items: Array<{ key: string; title: string; item: TrackItemV1; imageAssetId?: string | null }>;
  categories?: string[];
  useCriteria?: string[];
}

export function trackCollectionSourceId(trackKey: string): string {
  return `track:${trackKey}`;
}

export function trackItemSourceId(trackKey: string, itemKey: string): string {
  return `track:${trackKey}:item:${itemKey}`;
}

export function trackItemLocalId(itemKey: string): string {
  return `item-${itemKey}`;
}

/** The loader manifest for one track; its image assets are uploaded first and named by id. */
export function buildTrackManifest(input: TrackManifestInput): AdminContentLoaderManifest {
  const categories = input.categories || [];
  const useCriteria = input.useCriteria || [];
  const itemIds = input.items.map((i) => trackItemSourceId(input.trackKey, i.key));
  const known = new Set(input.items.map((i) => i.key));

  // The page moves a section whose first item was dropped to the next item it keeps (decision 15);
  // one that still names no item here is left out, with its subsections.
  const placed = input.sections.filter((s) => known.has(s.startsAtItemKey));
  const topKeys = new Set(placed.filter((s) => !s.parentKey).map((s) => s.key));
  const outline: TrackOutlineV1 = {
    schemaVersion: 1,
    schemaId: TRACK_SCHEMA_ID,
    kind: input.kind,
    voice: input.voice,
    sections: placed
      .filter((s) => !s.parentKey || topKeys.has(s.parentKey))
      .map((s) => ({
        key: s.key,
        title: s.title,
        ...(s.parentKey ? { parentKey: s.parentKey } : {}),
        startsAt: trackItemSourceId(input.trackKey, s.startsAtItemKey),
      })),
    ...(input.kind === 'theme' ? { paceIntervalDays: input.paceIntervalDays || 1 } : {}),
    itemOrder: itemIds,
    ...(input.audience?.trim() ? { audience: input.audience.trim() } : {}),
  };

  const items: AdminContentLoaderManifestRecord[] = input.items.map((i) => ({
    localId: trackItemLocalId(i.key),
    sourceItemId: trackItemSourceId(input.trackKey, i.key),
    type: 'information',
    name: i.title,
    textContent: composeTrackItemMarkdown(i.item),
    data: { trackItem: i.item },
    categories,
    useCriteria,
    childLocalIds: [],
    ...(i.imageAssetId ? { imageAssetId: i.imageAssetId } : {}),
    published: false,
  }));

  const collection: AdminContentLoaderManifestRecord = {
    localId: TRACK_MANIFEST_COLLECTION_LOCAL_ID,
    sourceItemId: trackCollectionSourceId(input.trackKey),
    type: 'col',
    publishType: 'feed',
    name: input.title,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    data: { track: outline, defaultConsumeSettings: getTrackDefaultConsumeSettings(outline) },
    categories,
    useCriteria,
    childLocalIds: items.map((r) => r.localId),
    published: false,
  };

  return { records: [...items, collection], assets: [] };
}
