// Ids inside an item's type data (`info.schemas`), for Kindredly item files.
//
// An item file carries items out of one library and into another, so every id that means something
// only in the sender's library has to change on the way:
//   - an id of another item (a track section's `startsAt`, a task's `linkedItemIds`) becomes the
//     file's local id ("i3") on export and the new item's id on import; one that points outside the
//     file is removed, because it would point at nothing in the recipient's library;
//   - an attachment id (a lesson's `attachmentId`) becomes the id the upload gave on import;
//   - a person or account id (a task's `assignedUserIds`) never leaves the sender's library.
//
// The walk goes by key name, not by schema, so a schema that follows the naming is covered without a
// change here. `ITEM_FILE_SCHEMA_REVIEW` lists every schema id someone has checked against these
// rules, and a test fails when a new one appears in the codebase without being added to it.

import { KINDREDLY_APP_REF_SCHEMA_ID } from '../types/item.types';
import { PAGE_NOTE_SCHEMA_ID, pageNoteFileIdOf, pageNoteItemIdOf, pageNoteItemKey } from '../pageNote.utils';

/** Keys whose string value is the id of one of this item's own attachments. */
export const ATTACHMENT_ID_KEYS: ReadonlySet<string> = new Set(['attachmentId', 'previewAttachmentId', 'assetId']);

/** Keys whose string value is the id of another item. */
export const ITEM_ID_KEYS: ReadonlySet<string> = new Set(['startsAt', 'sourceItemId', 'parentItemId', 'itemId']);

/** Keys whose value is a list of item ids. */
export const ITEM_ID_LIST_KEYS: ReadonlySet<string> = new Set(['itemOrder', 'linkedItemIds', 'inOrderPartIds']);

/** Keys that name a person or an account in the sender's family. Removed on export. */
export const PERSON_ID_KEYS: ReadonlySet<string> = new Set([
  'accountId',
  'createdByUserId',
  'completedByUserId',
  'assignedByUserId',
  'userId',
  'ownerId',
]);

/** Keys that list people in the sender's family. Emptied on export. */
export const PERSON_ID_LIST_KEYS: ReadonlySet<string> = new Set(['assignedUserIds', 'attendeeUserIds']);

/** Keys that point at the sender's own subscriptions, feeds, AI app connections and chats. Removed on export. */
export const SENDER_REFERENCE_KEYS: ReadonlySet<string> = new Set([
  'subscriptionId',
  'subscriptionRefId',
  'subscriptionRefType',
  'feedId',
  'connectionId',
  'kinbotSessionId',
]);

/** Schemas whose owner fields must name the recipient after import, or the recipient cannot edit them. */
export const OWNER_SCHEMA_IDS: readonly string[] = ['kindredly.task.v1', 'kindredly.event.v1'];

/**
 * Every `info.schemas` id checked against the rules above, with what it holds. Add a schema here
 * after checking its id fields follow the key names; `itemFileIds.test.ts` fails until you do.
 */
export const ITEM_FILE_SCHEMA_REVIEW: Readonly<Record<string, string>> = {
  'kindredly.appBuild.v1': 'no ids',
  'kindredly.appCapabilities.v1': 'no ids',
  'kindredly.audioParts.v1': 'order[].attachmentId (this item\'s attachment); links[].id and order[].linkId name links inside the schema, not items',
  'kindredly.appRef.v1': 'sourceId is an item id when sourceKind is "item" (handled below)',
  'kindredly.ebookReader.v1': 'no ids',
  'kindredly.event.v1': 'accountId, createdByUserId, attendeeUserIds, linkedItemIds, sourceItemId',
  'kindredly.helper.v1': 'forUserIds (family members a helper is for, not items); no item or attachment ids',
  'kindredly.kindTemplate.v1': 'templateId names a built-in template, not an item',
  'kindredly.lesson.v1': 'attachmentId, previewAttachmentId; a source ref itemId',
  'kindredly.lessonWriting.v1': 'no ids',
  'kindredly.lessonPack.v1': 'packKey names a lesson pack built into the app, not an item',
  'kindredly.mapEmbed.v1': 'no ids',
  'kindredly.mediaRef.v1': 'attachmentId, previewAttachmentId',
  'kindredly.note.v1': 'no ids',
  'kindredly.origin.v1': 'connectionId, kinbotSessionId (the sender\'s); editedBy[].userId',
  'kindredly.pageNote.v1': 'sourceUrl/sourceKey, also in morePages[]: kindredly-item:<id> is an item id, kindredly-file:<id> a file id (handled below); videoId, channelId are YouTube ids',
  'kindredly.parentSource.v1': 'subscriptionId, subscriptionRefId, feedId, parentItemId',
  'kindredly.playback.v1': 'no ids',
  'kindredly.project.v1': 'inOrderPartIds (a Project\'s parts, its sub-collections)',
  'kindredly.siteStyle.v1': 'no ids',
  'kindredly.task.v1': 'accountId, createdByUserId, assignedUserIds, linkedItemIds, sourceItemId; subtasks[].itemId (an item a subtask opens)',
  'kindredly.thing.v1': 'no ids',
  'kindredly.track.v1': 'startsAt, itemOrder',
  'kindredly.trackDraft.v1': 'items[].itemId (an item of the feed); syllabus.droppedSource.attachmentId (HAT-752)',
  'kindredly.trackUnpublished.v1': 'no ids',
  'kindredly.trackItem.v1': 'image assetId (an attachment, or a published asset kept as it is)',
  'knd.subtype.ai_prompt.v1': 'no ids (a Talk row\'s question)',
  'knd.subtype.product.v1': 'no ids',
};

export type ItemFileIdMaps = {
  /** Item id → replacement. An item id not in the map is removed. */
  itemIds: ReadonlyMap<string, string>;
  /** This item's attachment id → replacement. An attachment id not in the map is kept as it is. */
  attachmentIds?: ReadonlyMap<string, string>;
  /** Remove person, account and subscription ids. True on export. */
  stripPeople?: boolean;
};

const MAX_DEPTH = 40;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function rewriteValue(value: unknown, maps: ItemFileIdMaps, depth: number): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteValue(entry, maps, depth + 1)).filter((entry) => entry !== undefined);
  }
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (maps.stripPeople && (PERSON_ID_KEYS.has(key) || SENDER_REFERENCE_KEYS.has(key))) continue;
    if (maps.stripPeople && PERSON_ID_LIST_KEYS.has(key)) {
      out[key] = [];
      continue;
    }
    if (ATTACHMENT_ID_KEYS.has(key) && typeof raw === 'string') {
      out[key] = maps.attachmentIds?.get(raw) ?? raw;
      continue;
    }
    if (ITEM_ID_KEYS.has(key) && typeof raw === 'string') {
      const mapped = maps.itemIds.get(raw);
      if (mapped) out[key] = mapped;
      continue;
    }
    if (ITEM_ID_LIST_KEYS.has(key) && Array.isArray(raw)) {
      out[key] = raw
        .map((id) => (typeof id === 'string' ? maps.itemIds.get(id) : undefined))
        .filter((id): id is string => !!id);
      continue;
    }
    const next = rewriteValue(raw, maps, depth + 1);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

/**
 * One page a page note is about. A note about an item or a file in Kindredly (HAT-1068, PGN-20) is
 * filed under `kindredly-item:<itemId>` or `kindredly-file:<fileId>` in `sourceUrl` and `sourceKey`,
 * which no key name reaches. The address decides, as every reader of the schema does: an item's key
 * follows its item, and is removed with an item outside the file; a file's key is removed, since the
 * copy could not read the file. A web page stays as it is. Null when the page is removed.
 */
function pageNotePageForFile(page: Record<string, unknown>, maps: ItemFileIdMaps): Record<string, unknown> | null {
  const url = typeof page.sourceUrl === 'string' ? page.sourceUrl : null;
  const itemId = pageNoteItemIdOf(url);
  if (itemId) {
    const key = pageNoteItemKey(maps.itemIds.get(itemId));
    return key ? { ...page, sourceUrl: key, sourceKey: key } : null;
  }
  return pageNoteFileIdOf(url) ? null : page;
}

/** A page note with its pages rewritten; the first page left becomes the note's own. Null with none left. */
function pageNoteForFile(schema: Record<string, unknown>, maps: ItemFileIdMaps): Record<string, unknown> | null {
  const { schemaVersion, morePages, ...first } = schema;
  const pages = [first, ...(Array.isArray(morePages) ? morePages : [])]
    .filter(isPlainObject)
    .map((page) => pageNotePageForFile(page, maps))
    .filter((page): page is Record<string, unknown> => !!page);
  if (!pages.length) return null;
  const [own, ...more] = pages;
  return { schemaVersion, ...own, ...(more.length ? { morePages: more } : {}) };
}

/**
 * Rewrite every id inside `info.schemas` with `maps`, and return the new schemas. The input is not
 * changed. An app ref whose code lives in an item outside the file is removed, because the app
 * could not run from it; so is a page note's schema with none of its pages left (the note stays).
 */
export function rewriteItemFileSchemaIds(
  schemas: Record<string, unknown> | null | undefined,
  maps: ItemFileIdMaps,
): Record<string, unknown> {
  if (!isPlainObject(schemas)) return {};
  const out: Record<string, unknown> = {};

  for (const [schemaId, payload] of Object.entries(schemas)) {
    if (schemaId === KINDREDLY_APP_REF_SCHEMA_ID && isPlainObject(payload) && payload.sourceKind === 'item') {
      const mapped = typeof payload.sourceId === 'string' ? maps.itemIds.get(payload.sourceId) : undefined;
      if (!mapped) continue;
      out[schemaId] = { ...(rewriteValue(payload, maps, 1) as Record<string, unknown>), sourceId: mapped };
      continue;
    }
    if (schemaId === PAGE_NOTE_SCHEMA_ID && isPlainObject(payload)) {
      const next = pageNoteForFile(rewriteValue(payload, maps, 1) as Record<string, unknown>, maps);
      if (next) out[schemaId] = next;
      continue;
    }
    const next = rewriteValue(payload, maps, 1);
    if (next !== undefined) out[schemaId] = next;
  }
  return out;
}

/**
 * Make the importing person the owner of a task or an event, so they can edit their copy. Export
 * removed the sender's ids; the importer fills in its own.
 */
export function assignItemFileOwner(
  schemas: Record<string, unknown>,
  owner: { accountId: string; userId: string },
): Record<string, unknown> {
  const out = { ...schemas };
  for (const schemaId of OWNER_SCHEMA_IDS) {
    const payload = out[schemaId];
    if (!isPlainObject(payload)) continue;
    out[schemaId] = { ...payload, accountId: owner.accountId, createdByUserId: owner.userId };
  }
  return out;
}
