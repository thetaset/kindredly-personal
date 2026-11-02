import {
  TRACK_SCHEMA_ID,
  getTrackDefaultConsumeSettings,
  getTrackOutlineV1,
  parseTrackOutlineV1,
  resolveTrackSections,
  setTrackOutlineOnInfo,
  updateTrackOutlineForItems,
  type TrackOutlineV1,
} from '../src/track';

function outline(overrides: Partial<TrackOutlineV1> = {}): TrackOutlineV1 {
  return parseTrackOutlineV1({
    kind: 'course',
    voice: 'story',
    sections: [
      { key: 'p1', title: 'Part 1: Light', startsAt: 'b' },
      { key: 'c1', title: 'Waves', parentKey: 'p1', startsAt: 'b' },
      { key: 'c2', title: 'Particles', parentKey: 'p1', startsAt: 'd' },
      { key: 'p2', title: 'Part 2: Atoms', startsAt: 'f' },
    ],
    itemOrder: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    ...overrides,
  })!;
}

describe('resolveTrackSections', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('puts every item under the nearest header at or before it', () => {
    const r = resolveTrackSections(outline(), order);
    expect(r.sections.map((s) => [s.key, s.depth, s.itemIds])).toEqual([
      ['p1', 0, []],
      ['c1', 1, ['b', 'c']],
      ['c2', 1, ['d', 'e']],
      ['p2', 0, ['f', 'g']],
    ]);
  });

  it('keeps items before the first header as an unlabeled introduction', () => {
    const r = resolveTrackSections(outline(), order);
    expect(r.introItemIds).toEqual(['a']);
    expect(r.sectionKeyByItemId.a).toBeNull();
    expect(r.sectionKeyByItemId.e).toBe('c2');
  });

  it("starts a section at the next item when its first item is removed", () => {
    const r = resolveTrackSections(outline(), ['a', 'b', 'c', 'e', 'f', 'g']);
    expect(r.sections.find((s) => s.key === 'c2')!.itemIds).toEqual(['e']);
    expect(r.sections.find((s) => s.key === 'c1')!.itemIds).toEqual(['b', 'c']);
  });

  it('follows the collection when it is reordered: a moved item joins the section it now sits in', () => {
    const r = resolveTrackSections(outline(), ['a', 'b', 'g', 'c', 'd', 'e', 'f']);
    expect(r.sections.find((s) => s.key === 'c1')!.itemIds).toEqual(['b', 'g', 'c']);
    expect(r.sections.find((s) => s.key === 'p2')!.itemIds).toEqual(['f']);
  });

  it('drops a section whose items are all gone, and survives a parent loop', () => {
    const r = resolveTrackSections(outline(), ['a', 'b', 'c']);
    expect(r.sections.map((s) => s.key)).toEqual(['p1', 'c1']);

    const loop = parseTrackOutlineV1({
      kind: 'theme',
      voice: 'curious',
      sections: [
        { key: 'x', title: 'X', parentKey: 'y', startsAt: 'a' },
        { key: 'y', title: 'Y', parentKey: 'x', startsAt: 'b' },
      ],
    })!;
    const lr = resolveTrackSections(loop, ['a', 'b']);
    expect(lr.sections.map((s) => s.itemIds)).toEqual([['a'], ['b']]);
  });
});

describe('updateTrackOutlineForItems', () => {
  it('moves startsAt to where a section now starts and refreshes the saved order', () => {
    const next = updateTrackOutlineForItems(outline(), ['a', 'b', 'c', 'e', 'f', 'g']);
    expect(next.sections.find((s) => s.key === 'c2')!.startsAt).toBe('e');
    expect(next.itemOrder).toEqual(['a', 'b', 'c', 'e', 'f', 'g']);
  });

  it('removes an emptied section and un-nests its subsections', () => {
    const o = outline({
      sections: [
        { key: 'p1', title: 'Part 1', startsAt: 'z' },
        { key: 'c1', title: 'Child', parentKey: 'p1', startsAt: 'b' },
      ],
      itemOrder: ['z'],
    });
    const next = updateTrackOutlineForItems(o, ['a', 'b']);
    expect(next.sections).toEqual([{ key: 'c1', title: 'Child', startsAt: 'b' }]);
  });
});

describe('outline storage and pace', () => {
  it('reads from a library collection and a published collection', () => {
    const o = outline();
    const info = setTrackOutlineOnInfo(null, o);
    expect(info.schemas?.[TRACK_SCHEMA_ID]).toEqual(o);
    expect(getTrackOutlineV1({ info })).toEqual(o);
    expect(getTrackOutlineV1({ data: { track: o } })).toEqual(o);
  });

  it('gives a theme a pace of 1, 3 or 7 days and a course none', () => {
    const theme = parseTrackOutlineV1({ kind: 'theme', voice: 'direct', sections: [], paceIntervalDays: 3 })!;
    expect(getTrackDefaultConsumeSettings(theme)).toEqual({ mode: 'work_through', completionMode: 'explicit', paceIntervalDays: 3 });
    expect(parseTrackOutlineV1({ kind: 'theme', voice: 'direct', sections: [], paceIntervalDays: 0 })!.paceIntervalDays).toBe(1);
    expect(getTrackDefaultConsumeSettings(outline())).toEqual({ mode: 'work_through', completionMode: 'explicit' });
  });

  it('falls back to Story first for an unknown voice and refuses an unknown kind', () => {
    expect(parseTrackOutlineV1({ kind: 'course', voice: 'shouty', sections: [] })!.voice).toBe('story');
    expect(parseTrackOutlineV1({ kind: 'book', voice: 'story', sections: [] })).toBeNull();
  });
});
