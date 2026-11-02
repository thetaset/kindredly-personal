import * as fs from 'fs';
import * as path from 'path';
import {
  assignItemFileOwner,
  ITEM_FILE_SCHEMA_REVIEW,
  rewriteItemFileSchemaIds,
} from '../src/item-file/itemFileIds';

describe('rewriteItemFileSchemaIds', () => {
  const exportMaps = {
    itemIds: new Map([
      ['item_a', 'i1'],
      ['item_b', 'i2'],
    ]),
    stripPeople: true,
  };

  it('points a track outline at local ids and drops items outside the file', () => {
    const out = rewriteItemFileSchemaIds(
      {
        'kindredly.track.v1': {
          schemaVersion: 1,
          sections: [
            { key: 's1', title: 'One', startsAt: 'item_a' },
            { key: 's2', title: 'Two', startsAt: 'item_elsewhere' },
          ],
          itemOrder: ['item_a', 'item_elsewhere', 'item_b'],
        },
      },
      exportMaps,
    );
    expect(out['kindredly.track.v1']).toEqual({
      schemaVersion: 1,
      sections: [
        { key: 's1', title: 'One', startsAt: 'i1' },
        { key: 's2', title: 'Two' },
      ],
      itemOrder: ['i1', 'i2'],
    });
  });

  it('removes every person in the sender family from a task', () => {
    const out = rewriteItemFileSchemaIds(
      {
        'kindredly.task.v1': {
          schemaVersion: 1,
          accountId: 'acct_1',
          createdByUserId: 'user_parent',
          assignedUserIds: ['user_child'],
          linkedItemIds: ['item_b', 'item_gone'],
          sourceItemId: 'item_gone',
          title: 'Feed the cat',
        },
      },
      exportMaps,
    );
    expect(out['kindredly.task.v1']).toEqual({
      schemaVersion: 1,
      assignedUserIds: [],
      linkedItemIds: ['i2'],
      title: 'Feed the cat',
    });
  });

  it('removes the sender subscription from a saved feed item', () => {
    const out = rewriteItemFileSchemaIds(
      {
        'kindredly.parentSource.v1': {
          schemaVersion: 1,
          sourceKind: 'subscription',
          subscriptionId: 'sub_1',
          feedId: 'feed_1',
          parentItemId: 'item_gone',
          parentTitle: 'A podcast',
        },
      },
      exportMaps,
    );
    expect(out['kindredly.parentSource.v1']).toEqual({ schemaVersion: 1, sourceKind: 'subscription', parentTitle: 'A podcast' });
  });

  it('rewrites attachment ids on import and keeps ones it does not know', () => {
    const out = rewriteItemFileSchemaIds(
      {
        'kindredly.mediaRef.v1': { schemaVersion: 1, attachmentId: 'photo_jpg', previewAttachmentId: 'thumb_jpg', kind: 'image' },
        'kindredly.trackItem.v1': { image: { assetId: 'pub_asset_9', credit: 'x' } },
      },
      { itemIds: new Map(), attachmentIds: new Map([['photo_jpg', 'photo_1_jpg'], ['thumb_jpg', 'thumb_1_jpg']]) },
    );
    expect(out['kindredly.mediaRef.v1']).toMatchObject({ attachmentId: 'photo_1_jpg', previewAttachmentId: 'thumb_1_jpg' });
    expect(out['kindredly.trackItem.v1']).toEqual({ image: { assetId: 'pub_asset_9', credit: 'x' } });
  });

  it('keeps an app ref only when its code is in the file', () => {
    const inFile = rewriteItemFileSchemaIds(
      { 'kindredly.appRef.v1': { runtime: 'hosted', sourceKind: 'item', sourceId: 'item_a' } },
      exportMaps,
    );
    expect(inFile['kindredly.appRef.v1']).toEqual({ runtime: 'hosted', sourceKind: 'item', sourceId: 'i1' });

    const elsewhere = rewriteItemFileSchemaIds(
      { 'kindredly.appRef.v1': { runtime: 'hosted', sourceKind: 'item', sourceId: 'item_elsewhere' } },
      exportMaps,
    );
    expect(elsewhere['kindredly.appRef.v1']).toBeUndefined();

    const published = rewriteItemFileSchemaIds(
      { 'kindredly.appRef.v1': { runtime: 'hosted', sourceKind: 'published', sourceId: 'pub_123' } },
      exportMaps,
    );
    expect(published['kindredly.appRef.v1']).toEqual({ runtime: 'hosted', sourceKind: 'published', sourceId: 'pub_123' });
  });

  it('does not change its input', () => {
    const input = { 'kindredly.track.v1': { itemOrder: ['item_a'] } };
    rewriteItemFileSchemaIds(input, exportMaps);
    expect(input).toEqual({ 'kindredly.track.v1': { itemOrder: ['item_a'] } });
  });
});

describe('assignItemFileOwner', () => {
  it('makes the importer the owner of a task and an event, and leaves other schemas alone', () => {
    const out = assignItemFileOwner(
      {
        'kindredly.task.v1': { title: 'x' },
        'kindredly.event.v1': { title: 'y' },
        'kindredly.note.v1': { color: 'blue' },
      },
      { accountId: 'acct_me', userId: 'user_me' },
    );
    expect(out['kindredly.task.v1']).toEqual({ title: 'x', accountId: 'acct_me', createdByUserId: 'user_me' });
    expect(out['kindredly.event.v1']).toEqual({ title: 'y', accountId: 'acct_me', createdByUserId: 'user_me' });
    expect(out['kindredly.note.v1']).toEqual({ color: 'blue' });
  });
});

// A new kind of type data could hold an id these rules do not know. Every schema id in the
// codebase must be listed in ITEM_FILE_SCHEMA_REVIEW, which says what ids it holds; add yours after
// checking it follows the key names in itemFileIds.ts, or the copy someone imports will open broken.
describe('every info.schemas id has been checked for item files', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const roots = [path.join(repoRoot, 'tset-sharedlib', 'src'), path.join(repoRoot, 'tset-client', 'src')];
  const SCHEMA_ID_RE = /SCHEMA_ID\s*=\s*['"]([a-zA-Z0-9_.-]+\.v\d+)['"]/g;

  function walk(dir: string, out: string[]) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(ts|vue)$/.test(entry.name)) out.push(full);
    }
  }

  it('finds no unreviewed schema id', () => {
    const files: string[] = [];
    for (const root of roots) walk(root, files);
    const found = new Set<string>();
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(SCHEMA_ID_RE)) found.add(match[1]);
    }
    expect(found.size).toBeGreaterThan(10);
    const unreviewed = [...found].filter((id) => !(id in ITEM_FILE_SCHEMA_REVIEW)).sort();
    expect(unreviewed).toEqual([]);
  });
});
