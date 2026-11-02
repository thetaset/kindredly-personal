import type { ItemDetailsInfo } from './types/item.types';
import type { TrackKind, TrackVoiceKey } from './track';
import type { TrackDroppedSource, TrackSyllabusItem, TrackSyllabusResponse } from './track-generation';
import type { TrackCriterion } from './track-item';

// A learning feed still being made, kept on its Library collection as it is written (HAT-752).
//
// The feed page saves each written item to the collection as it finishes, and this draft beside
// them: what was described, the syllabus, every planned item in order (written or not), its
// sections. It is what lets the feed be picked up again, on any device, at the step it was left.
// Share feed writes the outline and removes the draft; a collection with a draft is not finished.
//
// A dropped-in source's text (a PDF, pasted text) can be a whole book, so it is not in the draft:
// it is a text file attached to the collection, written once, named by `attachmentId`.

export const TRACK_DRAFT_SCHEMA_ID = 'kindredly.trackDraft.v1';

/** The statuses a draft keeps. An item caught mid-write or mid-check is kept as it was before. */
export type TrackDraftItemStatusV1 = 'waiting' | 'checked' | 'flagged' | 'pasted' | 'failed' | 'dropped';

export interface TrackDraftItemV1 {
  plan: TrackSyllabusItem;
  status: TrackDraftItemStatusV1;
  /** The Library item a written item was saved as. Its body and image are there, not here. */
  itemId?: string;
  error?: string;
  scores?: Partial<Record<TrackCriterion, number>>;
  notes?: string[];
  flag?: string;
  rounds?: number;
  /** The item's one-line summary, which the next item of a course is written from. */
  summary?: string;
}

/** One of the maker's sources as the draft names it: its text is the attached file `attachmentId`. */
export type TrackDraftDroppedSourceV1 = Omit<TrackDroppedSource, 'text'> & { attachmentId?: string };

export type TrackDraftSyllabusV1 = Omit<TrackSyllabusResponse, 'droppedSource' | 'droppedSources'> & {
  /** Every source of the maker's the plan uses (HAT-761). */
  droppedSources?: TrackDraftDroppedSourceV1[];
  /** The first of them, for older pages, which read only this. */
  droppedSource?: TrackDraftDroppedSourceV1;
};

export interface TrackDraftV1 {
  schemaVersion: 1;
  schemaId: typeof TRACK_DRAFT_SCHEMA_ID;
  step: 'write' | 'save';
  describe: {
    subject: string;
    /** The first of `sourceLabels`, for older pages. */
    sourceLabel: string;
    /** What the maker added, as the page named each: a file name, a link, "Pasted text". */
    sourceLabels?: string[];
    /** Plan from the maker's sources alone (the default), or search the web as well. */
    onlyMySources?: boolean;
    kind: TrackKind;
    length: number;
    audience: string;
    voice: TrackVoiceKey;
    model: string;
  };
  /** Null for a feed pasted from the maker's own AI app: it has no syllabus. */
  syllabus: TrackDraftSyllabusV1 | null;
  /** Made by hand with Make it yourself (HAT-757, FBA-10): no AI planned, wrote or checked it. */
  handmade?: boolean;
  title: string;
  description: string;
  items: TrackDraftItemV1[];
  sections: Array<{ key: string; title: string; parentKey?: string; startsAtKey: string }>;
}

const STEPS = new Set(['write', 'save']);
const STATUSES = new Set<TrackDraftItemStatusV1>(['waiting', 'checked', 'flagged', 'pasted', 'failed', 'dropped']);

/** The draft, or null when it is missing or not one this version reads. */
export function parseTrackDraftV1(raw: unknown): TrackDraftV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<TrackDraftV1>;
  if (d.schemaId !== TRACK_DRAFT_SCHEMA_ID || d.schemaVersion !== 1) return null;
  if (!STEPS.has(String(d.step)) || !d.describe || typeof d.describe !== 'object') return null;
  if (!Array.isArray(d.items) || !Array.isArray(d.sections)) return null;
  const items = d.items.filter(
    (i): i is TrackDraftItemV1 =>
      !!i && typeof i === 'object' && !!i.plan && typeof i.plan.key === 'string' && STATUSES.has(i.status),
  );
  return {
    ...(d as TrackDraftV1),
    syllabus: d.syllabus && typeof d.syllabus === 'object' ? d.syllabus : null,
    handmade: d.handmade === true ? true : undefined,
    title: typeof d.title === 'string' ? d.title : '',
    description: typeof d.description === 'string' ? d.description : '',
    items,
  };
}

export function getTrackDraftV1(
  source: { info?: ItemDetailsInfo | null; details?: { info?: ItemDetailsInfo | null } | null } | null | undefined,
): TrackDraftV1 | null {
  return parseTrackDraftV1(
    source?.info?.schemas?.[TRACK_DRAFT_SCHEMA_ID] || source?.details?.info?.schemas?.[TRACK_DRAFT_SCHEMA_ID],
  );
}

/** The info with this draft on it; `null` takes the draft off, as Share feed does. */
export function setTrackDraftOnInfo(
  info: ItemDetailsInfo | null | undefined,
  draft: TrackDraftV1 | null,
): ItemDetailsInfo {
  const schemas: Record<string, unknown> =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? { ...info.schemas } : {};
  if (draft) schemas[TRACK_DRAFT_SCHEMA_ID] = draft;
  else delete schemas[TRACK_DRAFT_SCHEMA_ID];
  return { ...(info || {}), schemas };
}

// A finished feed improved in the Library and not published again yet (HAT-753). Improving saves
// each change to the Library as it goes; followers have the version from before until Publish
// changes sends them this one and takes the mark off. Kept on the collection, so a later visit,
// on any device, still offers to publish.
export const TRACK_UNPUBLISHED_SCHEMA_ID = 'kindredly.trackUnpublished.v1';

export function hasUnpublishedTrackChanges(source: { info?: ItemDetailsInfo | null } | null | undefined): boolean {
  const mark = source?.info?.schemas?.[TRACK_UNPUBLISHED_SCHEMA_ID] as { schemaVersion?: number } | undefined;
  return !!mark && mark.schemaVersion === 1;
}

/** The info with the mark on (`true`) or off. */
export function setUnpublishedTrackChanges(info: ItemDetailsInfo | null | undefined, on: boolean): ItemDetailsInfo {
  const schemas: Record<string, unknown> =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? { ...info.schemas } : {};
  if (on) schemas[TRACK_UNPUBLISHED_SCHEMA_ID] = { schemaVersion: 1 };
  else delete schemas[TRACK_UNPUBLISHED_SCHEMA_ID];
  return { ...(info || {}), schemas };
}
