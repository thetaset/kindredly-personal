// Kindredly item files (`.kindredly`): one item or collection, with its attachments, as a file
// someone else opens to add a copy to their own library.
//
// Tracker: docs/trackers/item-files-tracker.md (IFX). Decisions there: no password, adults only,
// collections included, `.kindredly`, saved data optional, and item files are not backups.
//
// This module is the format only — pure functions over a `{ path: bytes or source }` map, so it
// runs the same under Jest, Vitest and the browser. Zipping, reading the library and uploading live
// in the client (`tset-client/src/app/itemFile/`).
//
// Layout inside the ZIP:
//   kindredly.json    the manifest: format, version, roots, counts, and the check value of every file
//   items.json        one record per item and collection, with local ids ("i1", "i2"…)
//   relations.json    collection → child, with order and the child's name within the collection
//   saved-data.json   only when the sender included saved data
//   files/<hash>      attachment bytes, previews and covers, named by their check value
//   README.txt        for someone who does not have Kindredly
//
// Versions: 1 named a file by the SHA-256 of all of it. 2 (IFX-15) names it by the SHA-256 of its
// 2 MB pieces' SHA-256s, so a file of any size is checked a piece at a time, and stores every part
// uncompressed, so an opened file is read as slices of itself.
//
// Files stay readable forever: `formatVersion` goes up only for a change an older reader cannot
// ignore, unknown fields are ignored, and a reader for an old version is never removed.

import type Item from '../schemas/public/Item';
import {
  asItemFileSource,
  hashItemFileSource,
  readWholeSource,
  sha256HexOfSource,
  type ItemFileSource,
} from './itemFileSource';
import {
  assignItemFileOwner,
  PERSON_ID_KEYS,
  PERSON_ID_LIST_KEYS,
  rewriteItemFileSchemaIds,
} from './itemFileIds';

export const ITEM_FILE_FORMAT = 'kindredly-item';
export const ITEM_FILE_FORMAT_VERSION = 2;
export const ITEM_FILE_EXTENSION = '.kindredly';
export const ITEM_FILE_MIME_TYPE = 'application/vnd.kindredly.item+zip';

export const ITEM_FILE_PATHS = {
  manifest: 'kindredly.json',
  items: 'items.json',
  relations: 'relations.json',
  savedData: 'saved-data.json',
  readme: 'README.txt',
  filesPrefix: 'files/',
} as const;

export const ITEM_FILE_LIMITS = {
  /** Under ZIP's 4 GB without ZIP64. Each attachment is also held to the recipient's plan upload limit. */
  maxTotalBytes: 2 * 1024 * 1024 * 1024,
  /** Each JSON part is read whole. */
  maxJsonBytes: 64 * 1024 * 1024,
  maxEntries: 5000,
  maxItems: 2000,
  /** Places items have in collections. Ten per item is far more than any real library. */
  maxRelations: 20000,
  /** The server refuses a saved-data row above 64KB (`ref_state.service.ts`). */
  maxSavedDataRowBytes: 64 * 1024,
  maxSavedDataRows: 2000,
};

/** Collection subtypes that are one-per-person system collections; a copy becomes a plain collection. */
const SYSTEM_COLLECTION_SUBTYPES = new Set(['defaultQuickbar', 'defaultSharedCollection', 'defaultShowcaseCollection']);

/** The picture types a cover may be. */
export const ITEM_FILE_COVER_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** The item fields a file carries. Everything else — ids, owners, keys, publishing — stays behind. */
export const ITEM_FILE_DETAIL_FIELDS = [
  'name',
  'description',
  'comment',
  'type',
  'subType',
  'categories',
  'tags',
  'useCriteria',
  'kinds',
  'url',
  'patterns',
  'imageFilename',
  'info',
  'meta',
  'sourceInfo',
] as const;

export type ItemFileDetails = Partial<Pick<Item, (typeof ITEM_FILE_DETAIL_FIELDS)[number]>>;

export interface ItemFileManifest {
  format: typeof ITEM_FILE_FORMAT;
  formatVersion: number;
  createdAt: string;
  appVersion?: string;
  /** Local ids of the items the sender chose; usually one. */
  rootIds: string[];
  counts: { items: number; collections: number; attachments: number; bytes: number };
  includesSavedData: boolean;
  /** Every file under `files/`, by path: its check value (see the versions above) and size. */
  files: Record<string, { hash: string; size: number }>;
}

export interface ItemFileAttachment {
  /** The attachment's id in the sender's item. Type data may point at it; import rewrites both. */
  id: string;
  type: 'file' | 'snapshot';
  filename: string;
  fileType: string;
  /** `files/<sha256>` */
  file: string;
  size: number;
  meta?: Record<string, unknown>;
  createDate?: number;
  preview?: { file: string; type: string };
}

export interface ItemFileRecord {
  /** Local id, unique in the file. */
  id: string;
  details: ItemFileDetails;
  attachments: ItemFileAttachment[];
  /** The item's own cover picture, when it was an uploaded image rather than a web address. */
  cover?: { file: string; mimeType: string };
  /** A collection's background banner (`meta.bgBannerFilename`), when it was an uploaded image. */
  banner?: { file: string; mimeType: string };
}

export interface ItemFileRelation {
  collectionId: string;
  itemId: string;
  order: number;
  details?: { name?: string; description?: string; comment?: string };
}

/** One row of saved data (progress, answers, reading position, an app's data). */
export interface ItemFileSavedDataRow {
  /** Local id of the item it belongs to. */
  itemId: string;
  /** `user`: stored on the server for the person. `session`: stored only on the device. */
  store: 'user' | 'session';
  refType: 'item' | 'app';
  /** For `app` rows: the published app's id, which is the same in every library. */
  refId?: string;
  stateKey: string;
  stateSubKey: string;
  data: unknown;
}

export interface ItemFileContents {
  manifest: ItemFileManifest;
  records: ItemFileRecord[];
  relations: ItemFileRelation[];
  savedData: ItemFileSavedDataRow[];
  /** `files/<hash>` → its bytes, read a slice at a time */
  files: Map<string, ItemFileSource>;
  /** Problems the reader worked around. Shown to the person, never silent. */
  warnings: string[];
}

export type ItemFileErrorCode =
  | 'not_item_file'
  | 'newer_version'
  | 'too_large'
  | 'damaged'
  | 'empty'
  /** The app could not load the code that opens the file (a deploy while the page was open): reload. */
  | 'needs_reload';

/** A file that cannot be opened. `message` is written for the person opening it. */
export class ItemFileError extends Error {
  constructor(public readonly code: ItemFileErrorCode, message: string) {
    super(message);
    this.name = 'ItemFileError';
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function jsonBytes(value: unknown): Uint8Array {
  return textEncoder.encode(JSON.stringify(value, null, 2));
}

// ---------------------------------------------------------------------------------------------
// Saved data: which rows may travel
// ---------------------------------------------------------------------------------------------

/**
 * The saved data that travels with an item: the person's own progress and an app's data. Never a
 * task's assignment (it names a child in the sender's family), a family policy, or anything else
 * not listed here — an allowlist, so a new kind of state stays home until someone adds it.
 */
export function isTravellingSavedDataKey(stateKey: string): boolean {
  if (typeof stateKey !== 'string') return false;
  if (stateKey.startsWith('app:')) return true;
  return ['lesson_progress', 'task_completion', 'track_check', 'artifact'].includes(stateKey);
}

/**
 * Remove person and account ids from anything that leaves in a file: a saved-data payload (a task
 * completion's `completedByUserId`) or an item's provenance (`sourceInfo`).
 */
export function stripPersonIds(value: unknown, depth = 0): unknown {
  if (depth > 40) return undefined;
  if (Array.isArray(value)) return value.map((entry) => stripPersonIds(entry, depth + 1));
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (PERSON_ID_KEYS.has(key)) continue;
    if (PERSON_ID_LIST_KEYS.has(key)) {
      out[key] = [];
      continue;
    }
    out[key] = stripPersonIds(raw, depth + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Item details: what leaves, and what arrives
// ---------------------------------------------------------------------------------------------

function isUserFileReference(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('uf_');
}

/**
 * The fields of `details` a file carries, with every id inside the type data rewritten to local
 * ids and every person removed. `itemIds` maps the sender's item ids to the file's local ids.
 */
export function itemDetailsForFile(
  details: Partial<Item> | null | undefined,
  itemIds: ReadonlyMap<string, string>,
): ItemFileDetails {
  const out: Record<string, unknown> = {};
  if (!details) return out as ItemFileDetails;

  for (const field of ITEM_FILE_DETAIL_FIELDS) {
    const value = (details as Record<string, unknown>)[field];
    if (value === undefined || value === null) continue;
    out[field] = value;
  }

  // An uploaded cover or banner travels as a file (`record.cover`, `record.banner`); the reference
  // itself means nothing elsewhere.
  if (isUserFileReference(out.imageFilename)) delete out.imageFilename;

  if (isPlainObject(out.sourceInfo)) out.sourceInfo = stripPersonIds(out.sourceInfo);

  if (isPlainObject(out.meta)) {
    const meta = { ...out.meta };
    if (isUserFileReference(meta.bgBannerFilename)) delete meta.bgBannerFilename;
    out.meta = meta;
  }

  if (isPlainObject(out.info)) {
    const info: Record<string, unknown> = { ...out.info };
    // System state for the sender's own post-import processing, not part of the item.
    delete info.postImportProcessing;
    if (isPlainObject(info.schemas)) {
      info.schemas = rewriteItemFileSchemaIds(info.schemas, { itemIds, stripPeople: true });
    }
    out.info = info;
  }

  return out as ItemFileDetails;
}

/**
 * The details to save for one record on import: only the fields a file may set, type data pointed
 * at the new ids, the importer as the owner of a task or event, private, and never a system
 * collection. The file is untrusted, so this runs on every record whatever the sender wrote.
 */
export function itemDetailsFromFile(
  details: ItemFileDetails,
  maps: { itemIds: ReadonlyMap<string, string>; attachmentIds?: ReadonlyMap<string, string> },
  owner: { accountId: string; userId: string },
): Partial<Item> {
  const out: Record<string, unknown> = {};
  for (const field of ITEM_FILE_DETAIL_FIELDS) {
    const value = (details as Record<string, unknown>)?.[field];
    if (value === undefined || value === null) continue;
    out[field] = value;
  }

  // A file id names a file encrypted for the item it came from; the copy could not read it.
  if (isUserFileReference(out.imageFilename)) delete out.imageFilename;
  if (isPlainObject(out.meta) && isUserFileReference(out.meta.bgBannerFilename)) {
    const meta = { ...out.meta };
    delete meta.bgBannerFilename;
    out.meta = meta;
  }
  if (typeof out.subType === 'string' && SYSTEM_COLLECTION_SUBTYPES.has(out.subType)) out.subType = null;

  if (isPlainObject(out.info)) {
    const info: Record<string, unknown> = { ...out.info };
    delete info.postImportProcessing;
    if (isPlainObject(info.schemas)) {
      const rewritten = rewriteItemFileSchemaIds(info.schemas, maps);
      info.schemas = assignItemFileOwner(rewritten, owner);
    }
    out.info = info;
  }

  out.visibility = 'private';
  return out as Partial<Item>;
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

export const ITEM_FILE_README = `This is a Kindredly item file.

It holds one item or collection from someone's Kindredly library, with its attachments. To add a
copy to your own library, open Kindredly and drag this file onto it, or open the file with
Kindredly.

Anyone who has this file can read what is in it.

Kindredly: https://kindredly.ai
`;

/**
 * Collects files by their hash and writes the entries of an item file. Add every file first, then
 * `build` with the records that point at the paths `addFile` returned.
 */
export class ItemFileBuilder {
  /** `null` once a file has been handed to `onNewFile`, which has written it already. */
  private readonly files = new Map<string, Uint8Array | ItemFileSource | null>();
  private readonly fileInfo: Record<string, { hash: string; size: number }> = {};
  /** Each file's ZIP CRC-32, worked out with its check value so the ZIP needs no second pass. */
  readonly crc32s = new Map<string, number>();
  private totalBytes = 0;
  private readonly maxTotalBytes: number;
  private readonly tooLargeMessage: string;
  private readonly onNewFile?: (path: string, file: Uint8Array | ItemFileSource, crc32: number) => Promise<void>;

  /**
   * A smaller `maxTotalBytes` holds a file to less than the format allows. With `onNewFile`, each
   * new file is handed over as soon as it is checked, and not kept: a phone writes it straight into
   * the file it is making, so only one attachment is held at a time, and `build` returns only the
   * JSON parts.
   */
  constructor(
    options: {
      maxTotalBytes?: number;
      tooLargeMessage?: string;
      onNewFile?: (path: string, file: Uint8Array | ItemFileSource, crc32: number) => Promise<void>;
    } = {},
  ) {
    this.maxTotalBytes = Math.min(options.maxTotalBytes ?? ITEM_FILE_LIMITS.maxTotalBytes, ITEM_FILE_LIMITS.maxTotalBytes);
    this.tooLargeMessage = options.tooLargeMessage ?? `This is more than ${formatMegabytes(this.maxTotalBytes)}, the most one file can hold.`;
    this.onNewFile = options.onNewFile;
  }

  /** Throw before a file of `size` bytes is fetched when it cannot fit. */
  checkRoomFor(size: number): void {
    if (this.totalBytes + size > this.maxTotalBytes) throw new ItemFileError('too_large', this.tooLargeMessage);
  }

  /** Store a file once and return its path, `files/<hash>`. Reads a source 2 MB at a time. */
  async addFile(file: Uint8Array | ItemFileSource): Promise<string> {
    const source = asItemFileSource(file);
    this.checkRoomFor(source.size);
    const { hash, crc32 } = await hashItemFileSource(source);
    const path = `${ITEM_FILE_PATHS.filesPrefix}${hash}`;
    if (!this.files.has(path)) {
      if (this.onNewFile) await this.onNewFile(path, file, crc32);
      this.totalBytes += source.size;
      this.files.set(path, this.onNewFile ? null : file);
      this.fileInfo[path] = { hash, size: source.size };
      this.crc32s.set(path, crc32);
    }
    return path;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  build(input: {
    rootIds: string[];
    records: ItemFileRecord[];
    relations: ItemFileRelation[];
    savedData?: ItemFileSavedDataRow[];
    appVersion?: string;
    createdAt?: string;
  }): Record<string, Uint8Array | ItemFileSource> {
    if (input.records.length === 0) throw new ItemFileError('empty', 'There is nothing to put in the file.');

    const savedData = input.savedData ?? [];
    const manifest: ItemFileManifest = {
      format: ITEM_FILE_FORMAT,
      formatVersion: ITEM_FILE_FORMAT_VERSION,
      createdAt: input.createdAt ?? new Date().toISOString(),
      ...(input.appVersion ? { appVersion: input.appVersion } : {}),
      rootIds: input.rootIds,
      counts: {
        items: input.records.length,
        collections: input.records.filter((record) => record.details.type === 'col').length,
        attachments: input.records.reduce((sum, record) => sum + record.attachments.length, 0),
        bytes: this.totalBytes,
      },
      includesSavedData: savedData.length > 0,
      files: { ...this.fileInfo },
    };

    const entries: Record<string, Uint8Array | ItemFileSource> = {
      [ITEM_FILE_PATHS.manifest]: jsonBytes(manifest),
      [ITEM_FILE_PATHS.items]: jsonBytes(input.records),
      [ITEM_FILE_PATHS.relations]: jsonBytes(input.relations),
      [ITEM_FILE_PATHS.readme]: textEncoder.encode(ITEM_FILE_README),
    };
    if (savedData.length > 0) entries[ITEM_FILE_PATHS.savedData] = jsonBytes(savedData);
    for (const [path, file] of this.files) if (file) entries[path] = file;
    return entries;
  }
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

const FILE_PATH_RE = /^files\/[0-9a-f]{64}$/;
const DAMAGED = 'This file is damaged and cannot be opened.';

function formatMegabytes(bytes: number): string {
  const gigabytes = bytes / (1024 * 1024 * 1024);
  return gigabytes >= 1 ? `${Math.round(gigabytes * 10) / 10} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
}

async function parseJsonEntry(entries: Record<string, ItemFileSource>, path: string, required: boolean): Promise<unknown> {
  const source = entries[path];
  if (!source) {
    if (required) throw new ItemFileError('damaged', DAMAGED);
    return undefined;
  }
  if (source.size > ITEM_FILE_LIMITS.maxJsonBytes) throw new ItemFileError('too_large', 'This file holds too many items to open.');
  try {
    return JSON.parse(textDecoder.decode(await readWholeSource(source)));
  } catch {
    throw new ItemFileError('damaged', DAMAGED);
  }
}

function readManifest(raw: unknown): ItemFileManifest {
  if (!isPlainObject(raw) || raw.format !== ITEM_FILE_FORMAT) {
    throw new ItemFileError('not_item_file', 'This is not a Kindredly item file.');
  }
  const version = raw.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new ItemFileError('damaged', DAMAGED);
  }
  if (version > ITEM_FILE_FORMAT_VERSION) {
    throw new ItemFileError('newer_version', 'This file was made with a newer version of Kindredly. Update Kindredly to open it.');
  }
  // Version 1 called the check value `sha256`; it was the SHA-256 of the whole file.
  const hashKey = version === 1 ? 'sha256' : 'hash';
  const files: Record<string, { hash: string; size: number }> = {};
  if (isPlainObject(raw.files)) {
    for (const [path, info] of Object.entries(raw.files)) {
      if (!FILE_PATH_RE.test(path) || !isPlainObject(info)) throw new ItemFileError('damaged', DAMAGED);
      const hash = info[hashKey];
      if (typeof hash !== 'string' || typeof info.size !== 'number') throw new ItemFileError('damaged', DAMAGED);
      files[path] = { hash, size: info.size };
    }
  }
  const counts = isPlainObject(raw.counts) ? raw.counts : {};
  return {
    format: ITEM_FILE_FORMAT,
    formatVersion: version,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    ...(typeof raw.appVersion === 'string' ? { appVersion: raw.appVersion } : {}),
    rootIds: Array.isArray(raw.rootIds) ? raw.rootIds.filter(isNonEmptyString) : [],
    counts: {
      items: Number(counts.items) || 0,
      collections: Number(counts.collections) || 0,
      attachments: Number(counts.attachments) || 0,
      bytes: Number(counts.bytes) || 0,
    },
    includesSavedData: raw.includesSavedData === true,
    files,
  };
}

function readAttachment(raw: unknown, files: Map<string, ItemFileSource>, warnings: string[], itemName: string): ItemFileAttachment | null {
  if (!isPlainObject(raw)) return null;
  const file = raw.file;
  if (typeof file !== 'string' || !files.has(file)) {
    warnings.push(`An attachment of "${itemName}" is missing from the file.`);
    return null;
  }
  const filename = isNonEmptyString(raw.filename) ? raw.filename.slice(0, 255) : 'attachment';
  let preview: ItemFileAttachment['preview'];
  if (isPlainObject(raw.preview) && typeof raw.preview.file === 'string' && files.has(raw.preview.file)) {
    preview = { file: raw.preview.file, type: isNonEmptyString(raw.preview.type) ? raw.preview.type : 'jpeg' };
  }
  return {
    id: isNonEmptyString(raw.id) ? raw.id : filename,
    type: raw.type === 'snapshot' ? 'snapshot' : 'file',
    filename,
    fileType: isNonEmptyString(raw.fileType) ? raw.fileType : 'application/octet-stream',
    file,
    size: files.get(file)!.size,
    ...(isPlainObject(raw.meta) ? { meta: raw.meta } : {}),
    ...(typeof raw.createDate === 'number' ? { createDate: raw.createDate } : {}),
    ...(preview ? { preview } : {}),
  };
}

/**
 * Break any loop in the collection tree by dropping the relation that closes it. One depth-first
 * walk, so a crafted file with many relations cannot hold the page up.
 */
function dropRelationCycles(relations: ItemFileRelation[], warnings: string[]): ItemFileRelation[] {
  const children = new Map<string, number[]>();
  relations.forEach((relation, index) => {
    const list = children.get(relation.collectionId);
    if (list) list.push(index);
    else children.set(relation.collectionId, [index]);
  });

  const VISITING = 1;
  const DONE = 2;
  const state = new Map<string, number>();
  const dropped = new Set<number>();
  for (const start of children.keys()) {
    if (state.has(start)) continue;
    state.set(start, VISITING);
    const stack: Array<{ id: string; next: number }> = [{ id: start, next: 0 }];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const list = children.get(top.id) ?? [];
      if (top.next >= list.length) {
        state.set(top.id, DONE);
        stack.pop();
        continue;
      }
      const index = list[top.next++];
      const child = relations[index].itemId;
      const seen = state.get(child);
      // A relation to a collection still being walked leads back into itself.
      if (seen === VISITING) dropped.add(index);
      else if (seen === undefined) {
        state.set(child, VISITING);
        stack.push({ id: child, next: 0 });
      }
    }
  }
  if (dropped.size > 0) warnings.push('Some collections were inside themselves; those places were left out.');
  return relations.filter((_, index) => !dropped.has(index));
}

/**
 * Read and check an item file's entries. Throws `ItemFileError` with a sentence for the person when
 * the file cannot be opened; smaller problems are left out and listed in `warnings`.
 */
export async function readItemFile(input: Record<string, Uint8Array | ItemFileSource>): Promise<ItemFileContents> {
  const paths = Object.keys(input);
  if (paths.length > ITEM_FILE_LIMITS.maxEntries) throw new ItemFileError('too_large', 'This file holds too many parts to open.');
  const entries: Record<string, ItemFileSource> = {};
  for (const path of paths) entries[path] = asItemFileSource(input[path]);
  const totalBytes = paths.reduce((sum, path) => sum + entries[path].size, 0);
  if (totalBytes > ITEM_FILE_LIMITS.maxTotalBytes) {
    throw new ItemFileError('too_large', `This file is larger than ${formatMegabytes(ITEM_FILE_LIMITS.maxTotalBytes)}, the most Kindredly opens.`);
  }

  if (!entries[ITEM_FILE_PATHS.manifest]) throw new ItemFileError('not_item_file', 'This is not a Kindredly item file.');
  const manifest = readManifest(await parseJsonEntry(entries, ITEM_FILE_PATHS.manifest, true));
  const warnings: string[] = [];

  // Every file must be listed in the manifest and match its check value, read a piece at a time.
  const files = new Map<string, ItemFileSource>();
  for (const [path, info] of Object.entries(manifest.files)) {
    const source = entries[path];
    if (!source) continue;
    if (source.size !== info.size || path !== `files/${info.hash}`) throw new ItemFileError('damaged', DAMAGED);
    let hash: string;
    try {
      hash = manifest.formatVersion === 1 ? await sha256HexOfSource(source) : (await hashItemFileSource(source)).hash;
    } catch {
      throw new ItemFileError('damaged', DAMAGED);
    }
    if (hash !== info.hash) throw new ItemFileError('damaged', DAMAGED);
    files.set(path, source);
  }

  const rawRecords = await parseJsonEntry(entries, ITEM_FILE_PATHS.items, true);
  if (!Array.isArray(rawRecords)) throw new ItemFileError('damaged', DAMAGED);
  if (rawRecords.length === 0) throw new ItemFileError('empty', 'This file has nothing in it.');
  if (rawRecords.length > ITEM_FILE_LIMITS.maxItems) throw new ItemFileError('too_large', 'This file holds too many items to open.');

  const records: ItemFileRecord[] = [];
  const ids = new Set<string>();
  for (const raw of rawRecords) {
    if (!isPlainObject(raw) || !isNonEmptyString(raw.id) || raw.id.length > 64 || ids.has(raw.id) || !isPlainObject(raw.details)) {
      throw new ItemFileError('damaged', DAMAGED);
    }
    const details = raw.details as ItemFileDetails;
    if (!isNonEmptyString(details.type)) throw new ItemFileError('damaged', DAMAGED);
    const itemName = isNonEmptyString(details.name) ? details.name : 'an item';
    const attachments = (Array.isArray(raw.attachments) ? raw.attachments : [])
      .map((entry) => readAttachment(entry, files, warnings, itemName))
      .filter((entry): entry is ItemFileAttachment => !!entry);
    // Only a picture type: the type goes into the data URL a picture is uploaded from, and an SVG
    // can carry script.
    const picture = (value: unknown, what: string): ItemFileRecord['cover'] => {
      if (!isPlainObject(value) || typeof value.file !== 'string' || !files.has(value.file)) return undefined;
      if (typeof value.mimeType === 'string' && ITEM_FILE_COVER_TYPES.includes(value.mimeType)) {
        return { file: value.file, mimeType: value.mimeType };
      }
      warnings.push(`The ${what} of "${itemName}" was left out.`);
      return undefined;
    };
    const cover = picture(raw.cover, 'cover picture');
    const banner = picture(raw.banner, 'background banner');
    ids.add(raw.id);
    records.push({ id: raw.id, details, attachments, ...(cover ? { cover } : {}), ...(banner ? { banner } : {}) });
  }

  const collectionIds = new Set(records.filter((record) => record.details.type === 'col').map((record) => record.id));
  const rawRelations = await parseJsonEntry(entries, ITEM_FILE_PATHS.relations, false);
  if (Array.isArray(rawRelations) && rawRelations.length > ITEM_FILE_LIMITS.maxRelations) {
    throw new ItemFileError('too_large', 'This file holds too many parts to open.');
  }
  const relations: ItemFileRelation[] = [];
  const seenRelations = new Set<string>();
  for (const raw of Array.isArray(rawRelations) ? rawRelations : []) {
    if (!isPlainObject(raw) || !isNonEmptyString(raw.collectionId) || !isNonEmptyString(raw.itemId)) continue;
    if (!collectionIds.has(raw.collectionId) || !ids.has(raw.itemId)) continue;
    const key = `${raw.collectionId}\u0000${raw.itemId}`;
    if (seenRelations.has(key)) continue;
    seenRelations.add(key);
    const details = isPlainObject(raw.details)
      ? {
          ...(typeof raw.details.name === 'string' ? { name: raw.details.name } : {}),
          ...(typeof raw.details.description === 'string' ? { description: raw.details.description } : {}),
          ...(typeof raw.details.comment === 'string' ? { comment: raw.details.comment } : {}),
        }
      : undefined;
    relations.push({
      collectionId: raw.collectionId,
      itemId: raw.itemId,
      order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : relations.length,
      ...(details && Object.keys(details).length ? { details } : {}),
    });
  }

  const savedData: ItemFileSavedDataRow[] = [];
  const rawSaved = await parseJsonEntry(entries, ITEM_FILE_PATHS.savedData, false);
  for (const raw of Array.isArray(rawSaved) ? rawSaved.slice(0, ITEM_FILE_LIMITS.maxSavedDataRows) : []) {
    if (!isPlainObject(raw) || !ids.has(raw.itemId as string)) continue;
    if (!isNonEmptyString(raw.stateKey) || !isTravellingSavedDataKey(raw.stateKey)) continue;
    if (raw.store !== 'user' && raw.store !== 'session') continue;
    if (raw.refType !== 'item' && raw.refType !== 'app') continue;
    if (raw.refType === 'app' && !isNonEmptyString(raw.refId)) continue;
    if (textEncoder.encode(JSON.stringify(raw.data ?? null)).byteLength > ITEM_FILE_LIMITS.maxSavedDataRowBytes) continue;
    savedData.push({
      itemId: raw.itemId as string,
      store: raw.store,
      refType: raw.refType,
      ...(raw.refType === 'app' ? { refId: raw.refId as string } : {}),
      stateKey: raw.stateKey,
      stateSubKey: typeof raw.stateSubKey === 'string' ? raw.stateSubKey : '',
      data: stripPersonIds(raw.data ?? null),
    });
  }

  const rootIds = manifest.rootIds.filter((id) => ids.has(id));
  return {
    manifest: { ...manifest, rootIds: rootIds.length ? rootIds : [records[0].id] },
    records,
    relations: dropRelationCycles(relations, warnings),
    savedData,
    files,
    warnings,
  };
}

/**
 * Record ids in the order to create them: every collection before anything inside it, so each
 * item can be saved straight into its collections. Items outside any collection keep file order.
 */
export function itemFileCreationOrder(contents: Pick<ItemFileContents, 'records' | 'relations'>): string[] {
  const parents = new Map<string, string[]>();
  for (const relation of contents.relations) {
    parents.set(relation.itemId, [...(parents.get(relation.itemId) ?? []), relation.collectionId]);
  }
  const order: string[] = [];
  const placed = new Set<string>();
  const visiting = new Set<string>();
  const place = (id: string) => {
    if (placed.has(id) || visiting.has(id)) return;
    visiting.add(id);
    for (const parent of parents.get(id) ?? []) place(parent);
    visiting.delete(id);
    placed.add(id);
    order.push(id);
  };
  for (const record of contents.records) place(record.id);
  return order;
}

/** What the import preview shows before anything is written. */
export function summarizeItemFile(contents: ItemFileContents): {
  name: string;
  type: string;
  subType: string | null;
  items: number;
  collections: number;
  attachments: number;
  bytes: number;
  includesSavedData: boolean;
} {
  const root = contents.records.find((record) => record.id === contents.manifest.rootIds[0]) ?? contents.records[0];
  let bytes = 0;
  for (const file of contents.files.values()) bytes += file.size;
  return {
    name: isNonEmptyString(root.details.name) ? root.details.name : 'Untitled',
    type: String(root.details.type),
    subType: typeof root.details.subType === 'string' ? root.details.subType : null,
    items: contents.records.length,
    collections: contents.records.filter((record) => record.details.type === 'col').length,
    attachments: contents.records.reduce((sum, record) => sum + record.attachments.length, 0),
    bytes,
    includesSavedData: contents.savedData.length > 0,
  };
}

/** A file name for the download: the item's name, made safe for every operating system. */
export function itemFileName(name: string | null | undefined): string {
  const base = String(name ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/[. ]+$/, '');
  return `${base || 'Kindredly item'}${ITEM_FILE_EXTENSION}`;
}
