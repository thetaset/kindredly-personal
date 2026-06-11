/**
 * Item, collection, and metadata types
 */

import type { ItemResourceType } from '../constants';
import type { ItemTypePrimary, ItemTypeSecondary, TagOptionDetail } from '../content.types';
import type Item from '../schemas/public/Item';
import { ActivityContentInfo, MatchResult } from './activity.types';
import type { RecognizedPageInfo } from '../page-recognition.utils';
import type { DateString, Modify } from './common.types';
import type { EncInfo } from './encryption.types';
import type { FilePreview } from './file.types';
import type { UserType } from './user.types';

// Re-export Item schema
export type { Item };

export enum ItemTypeEnum {
  collection = 'col',
  link = 'link',
  note = 'note',
  file_group = 'file_group',
  file = 'file_group',
  default = 'default',
  thing = 'thing',
  tab = 'tab',
}


export enum PermissionType {
  owner = 'owner',
  editor = 'editor',
  viewer = 'viewer',
}

export const PermissionTypeList = [PermissionType.owner, PermissionType.editor, PermissionType.viewer];
export const PermissionTypeEditableList = [PermissionType.owner, PermissionType.editor];

export interface ItemPermissionDetails {
  userId: string;
  itemId: string;
  username?: string;
  permission: PermissionType;
  sharedByUserId?: string;
  /**
   * When true, user has permission but the item should not be listed in their library.
   * (This is orthogonal to access.)
   */
  notInLibrary?: boolean;
  direct?: boolean;
  inheritedFrom?: Array<string>;
  inheritedFromUsers?: Array<string>;
}

export interface PathTreeNode { item: Item; others: Item[]; earlyEnd: boolean }

export interface ItemRelationshipInfo {
  parents: ItemInfoView[];
  children: ItemInfoView[];
}

export interface ItemMetaExtracted {
  pageType: ItemResourceType | null;
  youtubeChannelIds?: string[];
  videoId?: string | null;
  channelId?: string | null;
  handleId?: string | null;
  discoveredFeedLinks?: ExtractedFeedLink[];
  message?: string | null;
  sourceId?: 'yt_api' | 'parser_1' | 'parser_err' | 'html_parser' | 'published' | 'published_curated' | 'oembed' | 'live_dom';
  redditScore?: number;
  redditComments?: number;
  redditSubreddit?: string;
  redditAuthor?: string;
  redditCreated?: number;

  /**
   * Optional richer page recognition output (provider + resourceType + ids).
   * This is additive and should not change existing behavior unless callers opt in.
   */
  recognized?: RecognizedPageInfo;
}

export interface ExtractedFeedLink {
  url: string;
  title?: string;
  type?: 'rss' | 'atom' | 'json' | 'other';
}

export interface ItemMeta {
  url?: string;
  keywords?: string;
  siteName?: string;
  type?: string;
  locale?: string;
  favicon?: string;
  faviconSrcPath?: string;
  
  tsManifest?: Record<string, any>;
  title?: string;
  description?: string;
  faviconPath?: string;
  bannerImagePath?: string;
  bannerImageSrcPath?: string;
  imageSrc?: string;
  tsExtractedInfo?: ItemMetaExtracted;

  resolved?: boolean;
}

export interface ItemFeedbackView {
  _id?: string;
  userId?: string | null;
  data?: unknown | null;
  isReadLaterDate?: DateString;
  starredDate?: DateString;
  isReadDate?: DateString;
  isHidden?: boolean;
  reactionDate?: DateString;
  reaction?: string;
  archivedDate?: DateString;
  snoozeUntilDate?: DateString;
  neverRemindDate?: DateString;
  notes?: unknown | null;
  visitCount?: number | null;
  visitTime?: DateString;
  updatedAt?: DateString;
  lastVisit?: DateString;
  createdAt?: DateString;
}

export interface ItemAttachment {
  id?: string;
  type: 'file' | 'snapshot' | 'snip' | 'uri';
  filename?: string;
  fileType: string;
  fileId?: string;
  info?: Record<string, any>;
  meta?: Record<string, any>;
  previews?: FilePreview[];
  encryptedInfo?: boolean;
  createDate?: number;
}

export type FeedType = 'pub_col' | 'rss' | 'atom' | 'json' | 'other';

export type FeedMediaKind = 'audio';

export interface ItemFeed {
  feedId: string;
  type: FeedType;
  title: string;
  mediaKind?: FeedMediaKind;
  description?: string;
  config?: {
    pubId?: string;
  };
  url?: string;
  feedURL?: string;
}

export interface AdditionalLink {
  id: string;
  title: string;
  url: string;
  type?: string;
}

export interface PublishedExternalLookupInfo {
  resourceType?: ItemResourceType | string;
  ageRestricted?: boolean;
  madeForKids?: boolean;
  categoryIds?: string[];
  contentRatingDetails?: unknown;
  source?: string;
  rawData?: unknown;
  extendedInfo?: Record<string, unknown> | null;
}

export type PostImportProcessingState =
  | 'pending_metadata'
  | 'fetching_assets'
  | 'verification_pending'
  | 'classification_pending'
  | 'ready'
  | 'approved'
  | 'failed'
  | 'needs_review';

export interface PostImportProcessingInfo {
  state: PostImportProcessingState;
  source: 'admin_content_loader' | string;
  updatedAt: string;
  importedAt?: string;
  lastRequestedAt?: string;
  lastCompletedAt?: string;
  lastAttemptMessage?: string | null;
  lastError?: string | null;
  batchId?: string;
  batchLabel?: string | null;
  batchSource?: 'manifest' | 'package' | string;
}

/**
 * Only link-like records with a real http(s) source URL have metadata to fetch.
 * Collections and items without a fetchable URL have nothing to pull, so they
 * skip the metadata stage and land 'ready' (still subject to curation/approval)
 * instead of getting stuck in the "needs metadata" queue.
 */
export function importRecordHasFetchableUrl(
  type: string | null | undefined,
  url: string | null | undefined,
): boolean {
  if (type !== 'thing' && type !== 'link') return false;
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

export function initialImportProcessingState(
  type: string | null | undefined,
  url: string | null | undefined,
): Extract<PostImportProcessingState, 'pending_metadata' | 'ready'> {
  return importRecordHasFetchableUrl(type, url) ? 'pending_metadata' : 'ready';
}

export const PLAYBACK_SCHEMA_ID = 'kindredly.playback.v1';

export const MEDIA_REF_SCHEMA_ID = 'kindredly.mediaRef.v1';

export const EBOOK_READER_SCHEMA_ID = 'kindredly.ebookReader.v1';

export const PARENT_SOURCE_SCHEMA_ID = 'kindredly.parentSource.v1';

export const ITEM_EMBEDDING_SCHEMA_ID = 'kindredly.itemEmbedding.v1';

export type MediaRefKind = 'image' | 'video' | 'file';

export interface MediaRefSchemaV1 {
  schemaVersion: 1;
  attachmentId: string;
  kind: MediaRefKind;
  mimeType?: string;
  previewAttachmentId?: string | null;
}

export interface PlaybackSchemaV1 {
  schemaVersion: 1;
  mediaKind: 'audio';
  playableKind: 'podcast_episode';
  audioUrl: string;
  audioType?: string;
  audioDuration?: string;
  sourceUrl?: string;
  artworkUrl?: string;
  title?: string;
}

export interface EbookReaderSchemaV1 {
  schemaVersion: 1;
  downloadUrl?: string;
}

export type ParentSourceSavedItemType = 'feed_item' | 'pub_item';

export interface ParentSourceSchemaV1 {
  schemaVersion: 1;
  sourceKind: 'subscription';
  savedFromItemType: ParentSourceSavedItemType;
  subscriptionId?: string;
  subscriptionRefType?: string;
  subscriptionRefId?: string;
  feedId?: string;
  feedURL?: string;
  parentItemId?: string;
  parentItemUrl?: string;
  parentTitle?: string;
  parentSubtitle?: string;
  channelId?: string;
}

export interface ItemEmbeddingSchemaV1 {
  schemaVersion: 1;
  modelId: string;
  embedding: number[];
  contentHash: string;
  computedAt: number;
}

function normalizePlaybackString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeMediaRefString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeEbookUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeParentSourceString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function createPlaybackSchemaV1(data: {
  audioUrl?: string | null;
  audioType?: string | null;
  audioDuration?: string | null;
  sourceUrl?: string | null;
  artworkUrl?: string | null;
  title?: string | null;
}): PlaybackSchemaV1 | null {
  const audioUrl = normalizePlaybackString(data.audioUrl);
  if (!audioUrl) return null;

  const schema: PlaybackSchemaV1 = {
    schemaVersion: 1,
    mediaKind: 'audio',
    playableKind: 'podcast_episode',
    audioUrl,
  };

  const audioType = normalizePlaybackString(data.audioType);
  if (audioType) schema.audioType = audioType;

  const audioDuration = normalizePlaybackString(data.audioDuration);
  if (audioDuration) schema.audioDuration = audioDuration;

  const sourceUrl = normalizePlaybackString(data.sourceUrl);
  if (sourceUrl) schema.sourceUrl = sourceUrl;

  const artworkUrl = normalizePlaybackString(data.artworkUrl);
  if (artworkUrl) schema.artworkUrl = artworkUrl;

  const title = normalizePlaybackString(data.title);
  if (title) schema.title = title;

  return schema;
}

export function createParentSourceSchemaV1(data: {
  savedFromItemType?: ParentSourceSavedItemType | null;
  subscriptionId?: string | null;
  subscriptionRefType?: string | null;
  subscriptionRefId?: string | null;
  feedId?: string | null;
  feedURL?: string | null;
  parentItemId?: string | null;
  parentItemUrl?: string | null;
  parentTitle?: string | null;
  parentSubtitle?: string | null;
  channelId?: string | null;
}): ParentSourceSchemaV1 | null {
  const savedFromItemType =
    data.savedFromItemType === 'feed_item' || data.savedFromItemType === 'pub_item'
      ? data.savedFromItemType
      : null;
  if (!savedFromItemType) return null;

  const subscriptionId = normalizeParentSourceString(data.subscriptionId);
  const subscriptionRefType = normalizeParentSourceString(data.subscriptionRefType);
  const subscriptionRefId = normalizeParentSourceString(data.subscriptionRefId);
  const feedId = normalizeParentSourceString(data.feedId);
  const feedURL = normalizeParentSourceString(data.feedURL);
  const parentItemId = normalizeParentSourceString(data.parentItemId);
  const parentItemUrl = normalizeParentSourceString(data.parentItemUrl);
  const parentTitle = normalizeParentSourceString(data.parentTitle);
  const parentSubtitle = normalizeParentSourceString(data.parentSubtitle);
  const channelId = normalizeParentSourceString(data.channelId);

  const hasUsefulReference =
    !!subscriptionId ||
    !!feedURL ||
    !!parentItemId ||
    !!parentItemUrl ||
    (!!subscriptionRefType && !!subscriptionRefId);

  if (!hasUsefulReference) return null;

  const schema: ParentSourceSchemaV1 = {
    schemaVersion: 1,
    sourceKind: 'subscription',
    savedFromItemType,
  };

  if (subscriptionId) schema.subscriptionId = subscriptionId;
  if (subscriptionRefType) schema.subscriptionRefType = subscriptionRefType;
  if (subscriptionRefId) schema.subscriptionRefId = subscriptionRefId;
  if (feedId) schema.feedId = feedId;
  if (feedURL) schema.feedURL = feedURL;
  if (parentItemId) schema.parentItemId = parentItemId;
  if (parentItemUrl) schema.parentItemUrl = parentItemUrl;
  if (parentTitle) schema.parentTitle = parentTitle;
  if (parentSubtitle) schema.parentSubtitle = parentSubtitle;
  if (channelId) schema.channelId = channelId;

  return schema;
}

export function createMediaRefSchemaV1(data: {
  attachmentId?: string | null;
  kind?: MediaRefKind | null;
  mimeType?: string | null;
  previewAttachmentId?: string | null;
}): MediaRefSchemaV1 | null {
  const attachmentId = normalizeMediaRefString(data.attachmentId);
  if (!attachmentId) return null;

  const kind = data.kind;
  if (kind !== 'image' && kind !== 'video' && kind !== 'file') return null;

  const schema: MediaRefSchemaV1 = {
    schemaVersion: 1,
    attachmentId,
    kind,
  };

  const mimeType = normalizeMediaRefString(data.mimeType);
  if (mimeType) schema.mimeType = mimeType;

  const previewAttachmentId = normalizeMediaRefString(data.previewAttachmentId);
  if (previewAttachmentId) schema.previewAttachmentId = previewAttachmentId;

  return schema;
}

export interface ItemBaseView {
  _id?: string;
  name?: string | null;
  description?: string | null;
  url?: string | null;
  type?: ItemTypePrimary | null;
  subType?: ItemTypeSecondary | null;
}

export interface ItemDetailsInfo {
  additionalLinks?: AdditionalLink[];
  feeds?: ItemFeed[];
  hasFeeds?: boolean;
  value?: string;
  editor?: string;
  accessScopeKind?: 'specific' | 'site' | 'domain';

  /**
   * Shared published-content lookup hints used by metadata/cache flows.
   * Legacy compatibility reads may still check older locations, but new writes
   * should prefer this field.
   */
  externalLookup?: PublishedExternalLookupInfo;

  /**
   * System-owned state for post-import processing after persistence.
   */
  postImportProcessing?: PostImportProcessingInfo;

  /**
   * Namespaced schema payloads for extensible item info.
   * Stored inside encrypted `info` so the server remains schema-agnostic.
   */
  schemas?: Record<string, unknown>;

  /**
   * @deprecated Legacy single-bucket schema payload.
   * Prefer `schemas[schemaId]`.
   */
  schemaData?: Record<string, unknown>;
}

export function setPlaybackSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: PlaybackSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas)
      ? info.schemas
      : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [PLAYBACK_SCHEMA_ID]: schema,
    },
  };
}

export function setParentSourceSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: ParentSourceSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas)
      ? info.schemas
      : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [PARENT_SOURCE_SCHEMA_ID]: schema,
    },
  };
}

export function setMediaRefSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: MediaRefSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas)
      ? info.schemas
      : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [MEDIA_REF_SCHEMA_ID]: schema,
    },
  };
}

export function setItemEmbeddingSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: ItemEmbeddingSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas)
      ? info.schemas
      : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [ITEM_EMBEDDING_SCHEMA_ID]: schema,
    },
  };
}

export function clearMediaRefSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas)
      ? { ...info.schemas }
      : {};

  delete schemas[MEDIA_REF_SCHEMA_ID];

  return {
    ...(info || {}),
    schemas,
  };
}

export function setPublishedExternalLookupOnInfo(
  info: ItemDetailsInfo | null | undefined,
  externalLookup: PublishedExternalLookupInfo | null | undefined,
): ItemDetailsInfo {
  if (!externalLookup) {
    return {
      ...(info || {}),
    };
  }

  return {
    ...(info || {}),
    externalLookup: {
      ...(info?.externalLookup || {}),
      ...externalLookup,
    },
  };
}

export function setPostImportProcessingOnInfo(
  info: ItemDetailsInfo | null | undefined,
  processing: PostImportProcessingInfo | null | undefined,
): ItemDetailsInfo {
  if (!processing) {
    return {
      ...(info || {}),
    };
  }

  return {
    ...(info || {}),
    postImportProcessing: {
      ...(info?.postImportProcessing || {}),
      ...processing,
    },
  };
}

function asLookupRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function unwrapPublishedLookupCandidate(value: unknown): Record<string, unknown> | null {
  const record = asLookupRecord(value);
  if (!record) return null;

  return asLookupRecord(record.extendedInfo) || record;
}

export function getCanonicalPublishedExternalLookupCandidate(source: {
  info?: ItemDetailsInfo | null;
  sourceInfo?: unknown;
  sysInfo?: unknown;
  meta?: ItemMeta | null;
  details?: {
    info?: ItemDetailsInfo | null;
    sourceInfo?: unknown;
    sysInfo?: unknown;
    meta?: ItemMeta | null;
  } | null;
} | null | undefined): Record<string, unknown> | null {
  const info = source?.info || source?.details?.info || null;

  return unwrapPublishedLookupCandidate(info?.externalLookup);
}

export function getLegacyPublishedExternalLookupCandidates(source: {
  info?: ItemDetailsInfo | null;
  sourceInfo?: unknown;
  sysInfo?: unknown;
  meta?: ItemMeta | null;
  details?: {
    info?: ItemDetailsInfo | null;
    sourceInfo?: unknown;
    sysInfo?: unknown;
    meta?: ItemMeta | null;
  } | null;
} | null | undefined): Record<string, unknown>[] {
  const info = source?.info || source?.details?.info || null;
  const sourceInfo = asLookupRecord(source?.sourceInfo || source?.details?.sourceInfo);
  const sysInfo = asLookupRecord(source?.sysInfo || source?.details?.sysInfo);
  const manifestInfo = asLookupRecord(source?.meta?.tsManifest || source?.details?.meta?.tsManifest);
  const infoCompat = info ? (info as Record<string, unknown>) : null;

  return [
    unwrapPublishedLookupCandidate(infoCompat?.externalMeta),
    unwrapPublishedLookupCandidate(infoCompat?.resourceHints),
    unwrapPublishedLookupCandidate(sourceInfo?.externalLookup),
    unwrapPublishedLookupCandidate(sourceInfo?.externalMeta),
    unwrapPublishedLookupCandidate(sysInfo?.externalLookup),
    unwrapPublishedLookupCandidate(sysInfo?.externalMeta),
    unwrapPublishedLookupCandidate(manifestInfo?.externalLookup),
    unwrapPublishedLookupCandidate(manifestInfo?.externalMeta),
    unwrapPublishedLookupCandidate(manifestInfo?.resourceHints),
  ].filter((candidate): candidate is Record<string, unknown> => !!candidate);
}

export function getPlaybackSchemaV1(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): PlaybackSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[PLAYBACK_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[PLAYBACK_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<PlaybackSchemaV1>;
  if (schema.schemaVersion !== 1) return null;
  if (schema.mediaKind !== 'audio') return null;
  if (schema.playableKind !== 'podcast_episode') return null;

  const audioUrl = normalizePlaybackString(schema.audioUrl);
  if (!audioUrl) return null;

  return {
    schemaVersion: 1,
    mediaKind: 'audio',
    playableKind: 'podcast_episode',
    audioUrl,
    audioType: normalizePlaybackString(schema.audioType),
    audioDuration: normalizePlaybackString(schema.audioDuration),
    sourceUrl: normalizePlaybackString(schema.sourceUrl),
    artworkUrl: normalizePlaybackString(schema.artworkUrl),
    title: normalizePlaybackString(schema.title),
  };
}

export function getParentSourceSchemaV1(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): ParentSourceSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[PARENT_SOURCE_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[PARENT_SOURCE_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<ParentSourceSchemaV1>;
  if (schema.schemaVersion !== 1) return null;
  if (schema.sourceKind !== 'subscription') return null;

  const savedFromItemType =
    schema.savedFromItemType === 'feed_item' || schema.savedFromItemType === 'pub_item'
      ? schema.savedFromItemType
      : null;
  if (!savedFromItemType) return null;

  const normalized = createParentSourceSchemaV1({
    savedFromItemType,
    subscriptionId: normalizeParentSourceString(schema.subscriptionId),
    subscriptionRefType: normalizeParentSourceString(schema.subscriptionRefType),
    subscriptionRefId: normalizeParentSourceString(schema.subscriptionRefId),
    feedId: normalizeParentSourceString(schema.feedId),
    feedURL: normalizeParentSourceString(schema.feedURL),
    parentItemId: normalizeParentSourceString(schema.parentItemId),
    parentItemUrl: normalizeParentSourceString(schema.parentItemUrl),
    parentTitle: normalizeParentSourceString(schema.parentTitle),
    parentSubtitle: normalizeParentSourceString(schema.parentSubtitle),
    channelId: normalizeParentSourceString(schema.channelId),
  });

  return normalized;
}

export function getEbookReaderSchemaV1(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): EbookReaderSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[EBOOK_READER_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[EBOOK_READER_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<EbookReaderSchemaV1>;
  if (schema.schemaVersion !== 1) return null;

  const downloadUrl = normalizeEbookUrl(schema.downloadUrl);
  if (!downloadUrl) return null;

  return {
    schemaVersion: 1,
    downloadUrl,
  };
}

export function getEbookDownloadUrl(source: {
  info?: ItemDetailsInfo | null;
  sourceInfo?: unknown;
  url?: string | null;
  details?: {
    info?: ItemDetailsInfo | null;
    sourceInfo?: unknown;
    url?: string | null;
  } | null;
} | null | undefined): string | null {
  const schemaUrl = getEbookReaderSchemaV1(source)?.downloadUrl;
  if (schemaUrl) return schemaUrl;

  const sourceInfo = asLookupRecord(source?.sourceInfo || source?.details?.sourceInfo);
  const legacyEbook = asLookupRecord(sourceInfo?.ebook);
  const legacyUrl = normalizeEbookUrl(legacyEbook?.downloadUrl);
  if (legacyUrl) return legacyUrl;

  return normalizeEbookUrl(source?.url || source?.details?.url) || null;
}

export function getConfiguredEbookDownloadUrl(source: {
  info?: ItemDetailsInfo | null;
  sourceInfo?: unknown;
  details?: {
    info?: ItemDetailsInfo | null;
    sourceInfo?: unknown;
  } | null;
} | null | undefined): string | null {
  const schemaUrl = getEbookReaderSchemaV1(source)?.downloadUrl;
  if (schemaUrl) return schemaUrl;

  const sourceInfo = asLookupRecord(source?.sourceInfo || source?.details?.sourceInfo);
  const legacyEbook = asLookupRecord(sourceInfo?.ebook);
  return normalizeEbookUrl(legacyEbook?.downloadUrl) || null;
}

export function getMediaRefSchemaV1(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): MediaRefSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[MEDIA_REF_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[MEDIA_REF_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<MediaRefSchemaV1>;
  if (schema.schemaVersion !== 1) return null;

  const attachmentId = normalizeMediaRefString(schema.attachmentId);
  if (!attachmentId) return null;

  const kind = schema.kind;
  if (kind !== 'image' && kind !== 'video' && kind !== 'file') return null;

  return {
    schemaVersion: 1,
    attachmentId,
    kind,
    mimeType: normalizeMediaRefString(schema.mimeType),
    previewAttachmentId: normalizeMediaRefString(schema.previewAttachmentId),
  };
}

export function getItemEmbeddingSchemaV1(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): ItemEmbeddingSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[ITEM_EMBEDDING_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[ITEM_EMBEDDING_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<ItemEmbeddingSchemaV1>;
  if (schema.schemaVersion !== 1) return null;
  if (typeof schema.modelId !== 'string' || !schema.modelId) return null;
  if (!Array.isArray(schema.embedding) || !schema.embedding.length) return null;
  if (typeof schema.contentHash !== 'string' || !schema.contentHash) return null;
  if (typeof schema.computedAt !== 'number') return null;

  return {
    schemaVersion: 1,
    modelId: schema.modelId,
    embedding: schema.embedding,
    contentHash: schema.contentHash,
    computedAt: schema.computedAt,
  };
}

function getAttachmentEntries(source: {
  attachments?: { entries?: ItemAttachment[] | null } | null;
  details?: { attachments?: { entries?: ItemAttachment[] | null } | null } | null;
} | null | undefined): ItemAttachment[] {
  const entries = source?.attachments?.entries || source?.details?.attachments?.entries;
  return Array.isArray(entries) ? entries : [];
}

export function getAttachmentById(
  source: {
    attachments?: { entries?: ItemAttachment[] | null } | null;
    details?: { attachments?: { entries?: ItemAttachment[] | null } | null } | null;
  } | null | undefined,
  attachmentId: string | null | undefined,
): ItemAttachment | null {
  const normalizedAttachmentId = normalizeMediaRefString(attachmentId);
  if (!normalizedAttachmentId) return null;

  return getAttachmentEntries(source).find((attachment) => attachment?.id === normalizedAttachmentId) || null;
}

export function getPrimaryMediaAttachment(source: {
  info?: ItemDetailsInfo | null;
  attachments?: { entries?: ItemAttachment[] | null } | null;
  details?: {
    info?: ItemDetailsInfo | null;
    attachments?: { entries?: ItemAttachment[] | null } | null;
  } | null;
} | null | undefined): ItemAttachment | null {
  const mediaRef = getMediaRefSchemaV1(source);
  if (!mediaRef) return null;

  return getAttachmentById(source, mediaRef.attachmentId);
}

export const KINDREDLY_APP_REF_SCHEMA_ID = 'kindredly.appRef.v1';

export type KindredlyAppSourceKind = 'item' | 'published';
export type KindredlyAppOpenMode = 'website' | 'embedded' | 'either';
export type KindredlyAppRole = 'firstParty' | 'userHosted';

export interface KindredlyAppRefV1 {
  runtime: 'hosted';
  sourceKind: KindredlyAppSourceKind;
  sourceId: string;
  preferredOpenMode?: KindredlyAppOpenMode | null;
  launchPath?: string | null;
  appRole?: KindredlyAppRole | null;
}

function normalizeKindredlyAppString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function getKindredlyAppRef(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): KindredlyAppRefV1 | null {
  const raw =
    source?.info?.schemas?.[KINDREDLY_APP_REF_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[KINDREDLY_APP_REF_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<KindredlyAppRefV1>;
  if (schema.runtime != null && schema.runtime !== 'hosted') return null;

  const sourceKind = schema.sourceKind;
  if (sourceKind !== 'item' && sourceKind !== 'published') return null;

  const sourceId = normalizeKindredlyAppString(schema.sourceId);
  if (!sourceId) return null;

  const preferredOpenMode =
    schema.preferredOpenMode === 'website' ||
    schema.preferredOpenMode === 'embedded' ||
    schema.preferredOpenMode === 'either'
      ? schema.preferredOpenMode
      : undefined;

  const appRole =
    schema.appRole === 'firstParty' || schema.appRole === 'userHosted'
      ? schema.appRole
      : undefined;

  return {
    runtime: 'hosted',
    sourceKind,
    sourceId,
    preferredOpenMode,
    launchPath: normalizeKindredlyAppString(schema.launchPath),
    appRole,
  };
}


export interface ItemRelationView {
  _id?: string;
  collectionId?: string | null;
  order?: number | null;
  createdAt?: DateString;
  details?: { name?: string; description?: string; comment?: string } | null;
  publishedUpdatedAt?: DateString;
  userId?: string | null;
  encrypted?: boolean;
  encInfo?: EncInfo | null;
}

export interface PermissionView{
    userId: string;
    permission: PermissionType;
    sharedByUserId?: string;
    createdAt?: DateString;
  }

export interface ItemInfoView {
  itemId: string;
  details: Item;
  feedback?: ItemFeedbackView;
  /** Single relation context (e.g., when viewing item within a specific collection) */
  collectionRelation?: ItemRelationView;
  /** Full relation data for all parent collections. Use this as source of truth. */
  collectionRelations?: ItemRelationView[];
  /** 
   * @deprecated Use collectionRelations instead. This field will be removed in a future version.
   * Array of parent collection IDs (derived from collectionRelations for backwards compatibility)
   */
  collectionIds?: string[];
  permissions?: Array<PermissionView>;
  pathItems?: Item[];
}

export interface ItemInfoViewWithSearchFields extends ItemInfoView {
  sortTime?: number;
  scoreInfo?: Record<string, any>;
  permission?: PermissionType;
  permissionUserId?: string;
  parentList?: { name: string; _id: string; imageFilename?: string }[];
  matchType?: 'similar' | 'exact'
}

export interface ItemSysInfo {
  v?: number;
  hasFeeds?: boolean;
  updatedAt?: Date;
}

export interface ItemChangeLogUpdate {
  fullReset: boolean;
  totalUpdates: number;
  updatedItems: ItemInfoView[];
  removedItemIds: string[];
}

export interface ResourceFetchInfoResponse {
  rtype: ItemResourceType;
  meta: any;
  contentInfo?: ActivityContentInfo;
  itemMatches?: MatchResult[];
  matchItems?: MatchResult[];
}

export interface ItemTemp {
  idx: number;
  type?: ItemTypePrimary | ItemTypeSecondary;
  name?: string;
  description?: string;
  textContent?: string;
  availableDate?: string;
  remark?: string;
  rssURL?: string;
  url?: string;
  files?: any[];
  bannerQuery?: string;
  meta?: ItemMeta;
  sourceInfo?: Record<string, any>;
  tags?: string[];
  editMode?: boolean;
}

/** Options for metadata fetching operations */
export interface FetchMetadataOptions {
  /** Don't fetch/process banner image */
  skipBanner?: boolean;
  /** Bypass cache */
  force?: boolean;
}

/** Result from metadata fetching - structured for clean error handling */
export interface FetchMetadataResult {
  /** Whether the fetch succeeded */
  success: boolean;
  /** The fetched metadata (null if failed) */
  meta: ItemMeta | null;
  /** Derived item subType based on pageType (e.g. 'yt_video', 'yt_channel', 'website') */
  subType: ItemTypeSecondary | null;
  /** Base64 banner image (null if skipBanner or failed) */
  image: string | null;
  /** Original image source URL */
  imageSrc: string | null;
  /** Error message if failed */
  error?: string;
}