import {
  TRACK_DRAFT_SCHEMA_ID,
  getTrackDraftV1,
  hasUnpublishedTrackChanges,
  parseTrackDraftV1,
  setTrackDraftOnInfo,
  setUnpublishedTrackChanges,
  type TrackDraftV1,
} from '../src/track-draft';
import { TRACK_SCHEMA_ID } from '../src/track';

function draft(overrides: Partial<TrackDraftV1> = {}): TrackDraftV1 {
  return {
    schemaVersion: 1,
    schemaId: TRACK_DRAFT_SCHEMA_ID,
    step: 'write',
    describe: { subject: 'Bees', sourceLabel: '', kind: 'course', length: 3, audience: '', voice: 'story', model: 'gpt-6-luna' },
    syllabus: null,
    title: 'Bees',
    description: 'How a hive works.',
    items: [
      { plan: { key: 'i1', title: 'The queen', kind: 'page', sourceId: 's1' }, status: 'checked', itemId: 'it1' },
      { plan: { key: 'i2', title: 'Workers', kind: 'page', sourceId: 's1' }, status: 'waiting' },
    ],
    sections: [{ key: 'a', title: 'The hive', startsAtKey: 'i1' }],
    ...overrides,
  };
}

describe('track draft (HAT-752)', () => {
  it('is read back from the collection info it was put on', () => {
    const info = setTrackDraftOnInfo({ note: 'kept' } as any, draft());
    expect((info as any).note).toBe('kept');
    expect(getTrackDraftV1({ info })?.items.map((i) => i.plan.key)).toEqual(['i1', 'i2']);
    expect(getTrackDraftV1({ details: { info } })?.title).toBe('Bees');
  });

  it('comes off without touching the outline beside it', () => {
    const withBoth = setTrackDraftOnInfo({ schemas: { [TRACK_SCHEMA_ID]: { kind: 'course' } } } as any, draft());
    const finished = setTrackDraftOnInfo(withBoth, null);
    expect(getTrackDraftV1({ info: finished })).toBeNull();
    expect((finished as any).schemas[TRACK_SCHEMA_ID]).toEqual({ kind: 'course' });
    // The info it was given is left as it was.
    expect(getTrackDraftV1({ info: withBoth })).not.toBeNull();
  });

  it('refuses what is not a draft this version reads, and drops items it cannot read', () => {
    expect(parseTrackDraftV1(null)).toBeNull();
    expect(parseTrackDraftV1({ ...draft(), schemaVersion: 2 })).toBeNull();
    expect(parseTrackDraftV1({ ...draft(), step: 'describe' })).toBeNull();
    const parsed = parseTrackDraftV1({ ...draft(), items: [...draft().items, { status: 'writing', plan: { key: 'x' } }, null] });
    expect(parsed?.items).toHaveLength(2);
  });
});

describe('a feed made by hand (HAT-757, FBA-10)', () => {
  it('keeps the mark only when it is true', () => {
    expect(parseTrackDraftV1(draft({ handmade: true }))?.handmade).toBe(true);
    expect(parseTrackDraftV1({ ...draft(), handmade: 'yes' })?.handmade).toBeUndefined();
    expect(parseTrackDraftV1(draft())?.handmade).toBeUndefined();
  });
});

describe('changes not published (HAT-753)', () => {
  it('goes on and comes off, leaving the rest of the info alone', () => {
    const info = setUnpublishedTrackChanges({ schemas: { [TRACK_SCHEMA_ID]: { kind: 'theme' } } } as any, true);
    expect(hasUnpublishedTrackChanges({ info })).toBe(true);
    const off = setUnpublishedTrackChanges(info, false);
    expect(hasUnpublishedTrackChanges({ info: off })).toBe(false);
    expect((off as any).schemas[TRACK_SCHEMA_ID]).toEqual({ kind: 'theme' });
    expect(hasUnpublishedTrackChanges({ info: null })).toBe(false);
  });
});
