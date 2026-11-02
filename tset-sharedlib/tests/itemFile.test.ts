import {
  ITEM_FILE_FORMAT_VERSION,
  ITEM_FILE_PATHS,
  ItemFileBuilder,
  ItemFileError,
  itemDetailsForFile,
  itemDetailsFromFile,
  itemFileCreationOrder,
  itemFileName,
  isTravellingSavedDataKey,
  readItemFile,
  summarizeItemFile,
} from '../src/item-file/itemFile';
import { bytesSource, crc32Update, hashItemFileSource, ITEM_FILE_PIECE_BYTES } from '../src/item-file/itemFileSource';

const bytes = (text: string) => new TextEncoder().encode(text);

async function buildSample() {
  const builder = new ItemFileBuilder();
  const photo = await builder.addFile(bytes('photo bytes'));
  const again = await builder.addFile(bytes('photo bytes'));
  const cover = await builder.addFile(bytes('cover bytes'));
  expect(again).toBe(photo);

  const entries = builder.build({
    rootIds: ['i1'],
    records: [
      { id: 'i1', details: { name: 'Trip', type: 'col' }, attachments: [], cover: { file: cover, mimeType: 'image/png' } },
      {
        id: 'i2',
        details: { name: 'Beach', type: 'file_group', info: { value: '' } },
        attachments: [{ id: 'photo_jpg', type: 'file', filename: 'photo.jpg', fileType: 'image/jpeg', file: photo, size: 11 }],
      },
      { id: 'i3', details: { name: 'Plan', type: 'note', info: { value: 'hello' } }, attachments: [] },
    ],
    relations: [
      { collectionId: 'i1', itemId: 'i3', order: 1, details: { name: 'The plan' } },
      { collectionId: 'i1', itemId: 'i2', order: 0 },
    ],
    savedData: [{ itemId: 'i3', store: 'user', refType: 'item', stateKey: 'app:notes', stateSubKey: '', data: { a: 1 } }],
    createdAt: '2026-09-24T00:00:00.000Z',
  });
  // Everything here was added as bytes, so every part is bytes.
  return entries as Record<string, Uint8Array>;
}

describe('item file: write then read', () => {
  it('gives back what was written', async () => {
    const entries = await buildSample();
    expect(Object.keys(entries)).toEqual(
      expect.arrayContaining([ITEM_FILE_PATHS.manifest, ITEM_FILE_PATHS.items, ITEM_FILE_PATHS.relations, ITEM_FILE_PATHS.readme, ITEM_FILE_PATHS.savedData]),
    );

    const contents = await readItemFile(entries);
    expect(contents.manifest.formatVersion).toBe(ITEM_FILE_FORMAT_VERSION);
    expect(contents.manifest.counts).toMatchObject({ items: 3, collections: 1, attachments: 1 });
    expect(contents.records.map((r) => r.id)).toEqual(['i1', 'i2', 'i3']);
    expect(contents.records[1].attachments[0]).toMatchObject({ id: 'photo_jpg', filename: 'photo.jpg', size: 11 });
    expect(contents.records[0].cover?.mimeType).toBe('image/png');
    expect(contents.relations).toEqual([
      { collectionId: 'i1', itemId: 'i3', order: 1, details: { name: 'The plan' } },
      { collectionId: 'i1', itemId: 'i2', order: 0 },
    ]);
    expect(contents.savedData).toHaveLength(1);
    expect(contents.files.size).toBe(2);
    expect(contents.warnings).toEqual([]);

    expect(summarizeItemFile(contents)).toMatchObject({ name: 'Trip', type: 'col', items: 3, collections: 1, attachments: 1, includesSavedData: true });
  });

  it('refuses a file whose attachment was changed', async () => {
    const entries = await buildSample();
    const filePath = Object.keys(entries).find((p) => p.startsWith('files/'))!;
    entries[filePath] = bytes('tampered!!!');
    await expect(readItemFile(entries)).rejects.toMatchObject({ code: 'damaged' });
  });

  it('refuses something that is not an item file', async () => {
    await expect(readItemFile({ 'hello.txt': bytes('hi') })).rejects.toMatchObject({ code: 'not_item_file' });
    await expect(readItemFile({ [ITEM_FILE_PATHS.manifest]: bytes('{"format":"other"}') })).rejects.toMatchObject({ code: 'not_item_file' });
  });

  it('refuses a file from a newer version with a sentence saying to update', async () => {
    const entries = await buildSample();
    const manifest = JSON.parse(new TextDecoder().decode(entries[ITEM_FILE_PATHS.manifest]));
    manifest.formatVersion = ITEM_FILE_FORMAT_VERSION + 1;
    entries[ITEM_FILE_PATHS.manifest] = bytes(JSON.stringify(manifest));
    const error = await readItemFile(entries).catch((e) => e);
    expect(error).toBeInstanceOf(ItemFileError);
    expect(error.code).toBe('newer_version');
    expect(error.message).toMatch(/Update Kindredly/);
  });

  it('refuses a file whose items are not readable', async () => {
    const entries = await buildSample();
    entries[ITEM_FILE_PATHS.items] = bytes('not json');
    await expect(readItemFile(entries)).rejects.toMatchObject({ code: 'damaged' });
  });

  it('names a missing attachment instead of failing the whole file', async () => {
    const entries = await buildSample();
    const filePath = Object.keys(entries).find((p) => p.startsWith('files/') && new TextDecoder().decode(entries[p]) === 'photo bytes')!;
    delete entries[filePath];
    const contents = await readItemFile(entries);
    expect(contents.records[1].attachments).toEqual([]);
    expect(contents.warnings.join(' ')).toMatch(/Beach/);
  });

  it('leaves out a cover that is not a picture type, and says so', async () => {
    const entries = await buildSample();
    const items = JSON.parse(new TextDecoder().decode(entries[ITEM_FILE_PATHS.items]));
    items[0].cover.mimeType = 'image/svg+xml';
    entries[ITEM_FILE_PATHS.items] = bytes(JSON.stringify(items));
    const contents = await readItemFile(entries);
    expect(contents.records[0].cover).toBeUndefined();
    expect(contents.warnings).toEqual(['The cover picture of "Trip" was left out.']);
  });

  it('leaves out saved data that must not travel, and people inside saved data', async () => {
    const entries = await buildSample();
    entries[ITEM_FILE_PATHS.savedData] = bytes(
      JSON.stringify([
        { itemId: 'i3', store: 'user', refType: 'item', stateKey: 'task_assignment', stateSubKey: 'current', data: { userId: 'u' } },
        { itemId: 'i3', store: 'user', refType: 'item', stateKey: 'task_completion', stateSubKey: 'occ:1', data: { completedByUserId: 'u', done: true } },
        { itemId: 'nope', store: 'user', refType: 'item', stateKey: 'lesson_progress', stateSubKey: '', data: {} },
      ]),
    );
    const contents = await readItemFile(entries);
    expect(contents.savedData).toEqual([
      { itemId: 'i3', store: 'user', refType: 'item', stateKey: 'task_completion', stateSubKey: 'occ:1', data: { done: true } },
    ]);
  });

  it('breaks a loop in the collection tree', async () => {
    const builder = new ItemFileBuilder();
    const entries = builder.build({
      rootIds: ['i1'],
      records: [
        { id: 'i1', details: { name: 'A', type: 'col' }, attachments: [] },
        { id: 'i2', details: { name: 'B', type: 'col' }, attachments: [] },
      ],
      relations: [
        { collectionId: 'i1', itemId: 'i2', order: 0 },
        { collectionId: 'i2', itemId: 'i1', order: 0 },
      ],
    });
    const contents = await readItemFile(entries);
    expect(contents.relations).toEqual([{ collectionId: 'i1', itemId: 'i2', order: 0 }]);
    expect(contents.warnings).toHaveLength(1);
  });
});

describe('item file: files of any size', () => {
  /** A source that counts how much it was asked for at once, to show nothing is read whole. */
  function countedSource(bytes: Uint8Array) {
    let largestRead = 0;
    return {
      size: bytes.byteLength,
      read: async (start: number, end: number) => {
        largestRead = Math.max(largestRead, end - start);
        return bytes.subarray(start, end);
      },
      get largestRead() {
        return largestRead;
      },
    };
  }

  it('checks a large file 2 MB at a time, and finds a changed piece', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 7).map((_, i) => i % 253);
    const builder = new ItemFileBuilder();
    const path = await builder.addFile(countedSource(big));
    const entries = builder.build({
      rootIds: ['i1'],
      records: [{ id: 'i1', details: { name: 'Film', type: 'file_group' }, attachments: [{ id: 'f', type: 'file', filename: 'film.mp4', fileType: 'video/mp4', file: path, size: big.byteLength }] }],
      relations: [],
    });
    const source = countedSource(big);
    const contents = await readItemFile({ ...entries, [path]: source });
    expect(contents.records[0].attachments[0].size).toBe(big.byteLength);
    expect(source.largestRead).toBe(ITEM_FILE_PIECE_BYTES);

    const changed = big.slice();
    changed[3 * 1024 * 1024] ^= 1;
    await expect(readItemFile({ ...entries, [path]: bytesSource(changed) })).rejects.toMatchObject({ code: 'damaged' });
  });

  it('names a file by the SHA-256 of its pieces\' SHA-256s, with the ZIP CRC-32 from the same pass', async () => {
    const text = new TextEncoder().encode('hello');
    const { hash, crc32 } = await hashItemFileSource(bytesSource(text));
    const pieceDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', text));
    const expected = Buffer.from(await crypto.subtle.digest('SHA-256', pieceDigest)).toString('hex');
    expect(hash).toBe(expected);
    expect(crc32).toBe(0x3610a686);
    expect(crc32Update(crc32Update(0, text.subarray(0, 2)), text.subarray(2))).toBe(0x3610a686);
  });

  it('holds a file to a smaller limit when asked (a phone), and says so before reading more', async () => {
    const builder = new ItemFileBuilder({ maxTotalBytes: 10, tooLargeMessage: 'Too much for a phone.' });
    await builder.addFile(bytes('123456'));
    expect(() => builder.checkRoomFor(5)).toThrow('Too much for a phone.');
    await expect(builder.addFile(bytes('12345'))).rejects.toMatchObject({ code: 'too_large' });
    // Never more than the format allows.
    expect(() => new ItemFileBuilder({ maxTotalBytes: 3 * 1024 ** 3 }).checkRoomFor(2 * 1024 ** 3 + 1)).toThrow(ItemFileError);
  });

  it('hands each new file over as soon as it is checked, once, and keeps it out of build (IFX-19)', async () => {
    const handed: string[] = [];
    const builder = new ItemFileBuilder({ onNewFile: async (path) => void handed.push(path) });
    const first = await builder.addFile(bytes('photo'));
    await builder.addFile(bytes('photo'));
    expect(handed).toEqual([first]);
    const entries = builder.build({ rootIds: ['i1'], records: [{ id: 'i1', details: { name: 'Beach', type: 'file_group' } as any, attachments: [] }], relations: [] });
    expect(Object.keys(entries).some((path) => path.startsWith('files/'))).toBe(false);
    expect(JSON.parse(new TextDecoder().decode(entries['kindredly.json'] as Uint8Array)).files[first].size).toBe(5);
  });

  it('still opens a file made by version 1, which named files by the SHA-256 of all of them', async () => {
    const photo = bytes('photo bytes');
    const sha = Buffer.from(await crypto.subtle.digest('SHA-256', photo)).toString('hex');
    const path = `files/${sha}`;
    const v1 = {
      [ITEM_FILE_PATHS.manifest]: bytes(JSON.stringify({
        format: 'kindredly-item',
        formatVersion: 1,
        rootIds: ['i1'],
        files: { [path]: { sha256: sha, size: photo.byteLength } },
      })),
      [ITEM_FILE_PATHS.items]: bytes(JSON.stringify([
        { id: 'i1', details: { name: 'Beach', type: 'file_group' }, attachments: [{ id: 'p', filename: 'p.jpg', fileType: 'image/jpeg', file: path }] },
      ])),
      [path]: photo,
    };
    const contents = await readItemFile(v1);
    expect(contents.records[0].attachments[0]).toMatchObject({ filename: 'p.jpg', size: photo.byteLength });
    expect(contents.warnings).toEqual([]);
  });
});

describe('item file: crafted files', () => {
  it('breaks loops quickly in a file with thousands of relations', async () => {
    const records = Array.from({ length: 2000 }, (_, i) => ({ id: `c${i}`, details: { name: `C${i}`, type: 'col' as const }, attachments: [] }));
    // A chain c0 → c1 → … → c1999, then an edge back from every collection to c0.
    const relations = [
      ...records.slice(1).map((record, i) => ({ collectionId: `c${i}`, itemId: record.id, order: 0 })),
      ...records.slice(1).map((record) => ({ collectionId: record.id, itemId: 'c0', order: 1 })),
    ];
    const entries = new ItemFileBuilder().build({ rootIds: ['c0'], records, relations });
    const started = Date.now();
    const contents = await readItemFile(entries);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(contents.relations).toHaveLength(1999);
    expect(contents.relations.every((relation) => relation.itemId !== 'c0')).toBe(true);
  });

  it('refuses a file with more relations than any library has', async () => {
    const entries = await buildSample();
    const many = Array.from({ length: 20001 }, () => ({ collectionId: 'i1', itemId: 'i2', order: 0 }));
    entries[ITEM_FILE_PATHS.relations] = bytes(JSON.stringify(many));
    await expect(readItemFile(entries)).rejects.toMatchObject({ code: 'too_large' });
  });
});

describe('itemFileCreationOrder', () => {
  it('puts every collection before what is inside it', () => {
    const order = itemFileCreationOrder({
      records: [
        { id: 'leaf', details: { type: 'link' }, attachments: [] },
        { id: 'inner', details: { type: 'col' }, attachments: [] },
        { id: 'outer', details: { type: 'col' }, attachments: [] },
      ],
      relations: [
        { collectionId: 'inner', itemId: 'leaf', order: 0 },
        { collectionId: 'outer', itemId: 'inner', order: 0 },
      ],
    });
    expect(order).toEqual(['outer', 'inner', 'leaf']);
  });
});

describe('item details', () => {
  it('leaves ids, owners, publishing and uploaded covers behind', () => {
    const out = itemDetailsForFile(
      {
        _id: 'item_a',
        userId: 'user_1',
        accountId: 'acct_1',
        name: 'Chores',
        type: 'thing',
        subType: 'task',
        visibility: 'shared',
        publishId: 'pub_1',
        encInfo: { keys: [] } as any,
        imageFilename: 'uf_file_1',
        meta: { title: 't', bgBannerFilename: 'uf_file_2' } as any,
        info: {
          value: '',
          postImportProcessing: { state: 'ready' } as any,
          schemas: { 'kindredly.task.v1': { assignedUserIds: ['u'], createdByUserId: 'u', title: 'Chores' } },
        },
      } as any,
      new Map([['item_a', 'i1']]),
    );
    expect(out).toEqual({
      name: 'Chores',
      type: 'thing',
      subType: 'task',
      meta: { title: 't' },
      info: { value: '', schemas: { 'kindredly.task.v1': { assignedUserIds: [], title: 'Chores' } } },
    });
  });

  it('keeps a cover that is a web address', () => {
    expect(itemDetailsForFile({ name: 'x', type: 'link', imageFilename: 'https://example.com/a.png' } as any, new Map()).imageFilename).toBe(
      'https://example.com/a.png',
    );
  });

  it('makes an imported copy private, owned by the importer, never a system collection, and drops file ids', () => {
    const out = itemDetailsFromFile(
      {
        name: 'Showcase',
        type: 'col',
        subType: 'defaultShowcaseCollection',
        visibility: 'network',
        publishId: 'pub_x',
        imageFilename: 'uf_file_1',
        meta: { title: 't', bgBannerFilename: 'uf_file_2' },
        info: { schemas: { 'kindredly.task.v1': { title: 'x', linkedItemIds: ['i2'] } } },
      } as any,
      { itemIds: new Map([['i2', 'item_new2']]) },
      { accountId: 'acct_me', userId: 'user_me' },
    );
    expect(out).toEqual({
      name: 'Showcase',
      type: 'col',
      subType: null,
      visibility: 'private',
      meta: { title: 't' },
      info: { schemas: { 'kindredly.task.v1': { title: 'x', linkedItemIds: ['item_new2'], accountId: 'acct_me', createdByUserId: 'user_me' } } },
    });
  });
});

describe('small rules', () => {
  it('lets only listed saved data travel', () => {
    expect(isTravellingSavedDataKey('lesson_progress')).toBe(true);
    expect(isTravellingSavedDataKey('app:notes')).toBe(true);
    expect(isTravellingSavedDataKey('task_assignment')).toBe(false);
    expect(isTravellingSavedDataKey('family_policy')).toBe(false);
  });

  it('names the file after the item, safely', () => {
    expect(itemFileName('Chore chart')).toBe('Chore chart.kindredly');
    expect(itemFileName('a/b:c*?"<>|')).toBe('a b c.kindredly');
    expect(itemFileName('   ')).toBe('Kindredly item.kindredly');
  });
});
