import { buildTrackManifest, trackItemSourceId } from '../src/track-manifest';
import { parseTrackItemV1 } from '../src/track-item';

const item = (body: string) => parseTrackItemV1({ kind: 'page', body, sources: [] })!;

describe('buildTrackManifest', () => {
  const input = {
    trackKey: 'k1',
    title: 'Clouds',
    kind: 'theme' as const,
    voice: 'story' as const,
    paceIntervalDays: 3,
    sections: [
      { key: 'a', title: 'High', startsAtItemKey: 'x' },
      { key: 'gone', title: 'Dropped', startsAtItemKey: 'missing' },
    ],
    items: [
      { key: 'x', title: 'Cirrus', item: item('Wispy.'), imageAssetId: 'asset-1' },
      { key: 'y', title: 'Cumulus', item: item('Puffy.') },
    ],
  };

  it('names every record by the track key, so publishing again updates the same track', () => {
    const m = buildTrackManifest(input);
    expect(m.records.map((r) => [r.localId, r.sourceItemId, r.type])).toEqual([
      ['item-x', 'track:k1:item:x', 'information'],
      ['item-y', 'track:k1:item:y', 'information'],
      ['track', 'track:k1', 'col'],
    ]);
    expect(buildTrackManifest(input)).toEqual(m);
  });

  it('puts the outline and the pace on the feed, with sections at the items that exist', () => {
    const col = buildTrackManifest(input).records[2];
    expect(col).toMatchObject({ publishType: 'feed', published: false, childLocalIds: ['item-x', 'item-y'] });
    expect(col.data!.track.sections).toEqual([{ key: 'a', title: 'High', startsAt: trackItemSourceId('k1', 'x') }]);
    expect(col.data!.track.paceIntervalDays).toBe(3);

    // A subsection whose section named no item here goes with it.
    const nested = buildTrackManifest({
      ...input,
      sections: [...input.sections, { key: 'child', title: 'Under dropped', parentKey: 'gone', startsAtItemKey: 'y' }],
    }).records[2];
    expect(nested.data!.track.sections.map((s: any) => s.key)).toEqual(['a']);
    expect(col.data!.defaultConsumeSettings).toEqual({ mode: 'work_through', completionMode: 'explicit', paceIntervalDays: 3 });
  });

  it("writes each item's fields and its composed body, with its image asset", () => {
    const [x, y] = buildTrackManifest(input).records;
    expect(x).toMatchObject({ name: 'Cirrus', imageAssetId: 'asset-1', published: false });
    expect(x.data!.trackItem.body).toBe('Wispy.');
    expect(x.textContent).toContain('Wispy.');
    expect(y).not.toHaveProperty('imageAssetId');
  });
});
