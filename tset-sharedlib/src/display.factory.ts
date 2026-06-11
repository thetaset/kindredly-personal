import {
  getPlaybackSchemaV1,
  ItemInfoView,
  ItemInfoViewWithSearchFields,
  ItemRelationView,
  PermissionType,
  PublishedInfoView,
} from './shared.types';
import Item from './schemas/public/Item';
import {
  LibraryDisplayItem,
  PublishedDisplayItem,
  TabDisplayItem,
  ItemType,
} from './display.types';
import {
  ItemTypeSecondary,
  getUseCriteriaObjWithKeys,
  getItemTypeDetails,
  getItemTypeInfo,
  getSubTypeFromMeta,
  normalizeSubTypeForType,
} from './content.types';
import { resolveAbsoluteUrl } from './extraction.utils';

function isIterable(value: unknown): value is Iterable<unknown> {
  return !!value && typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function';
}

function toISOStringSafe(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    const normalized = value.filter(Boolean).map((v) => String(v));
    return normalized.length > 0 ? normalized : undefined;
  }

  if (value instanceof Set) {
    const normalized = Array.from(value).filter(Boolean).map((v) => String(v));
    return normalized.length > 0 ? normalized : undefined;
  }

  if (typeof value === 'string') {
    return value ? [value] : undefined;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('ids' in obj) return normalizeStringArray(obj.ids);
    if ('categories' in obj) return normalizeStringArray(obj.categories);

    if (isIterable(obj)) {
      try {
        const normalized = Array.from(obj)
          .filter(Boolean)
          .map((v) => String(v));
        return normalized.length > 0 ? normalized : undefined;
      } catch {
        // fall through
      }
    }
  }

  return undefined;
}

interface DisplayItemOptions {
  truncateSize?: number;
  orderIdx?: number;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeExternalImageCandidate(value: unknown, baseUrl?: string): string | undefined {
  const src = asNonEmptyString(value);
  if (!src) return undefined;
  if (!baseUrl) return src;

  return resolveAbsoluteUrl(baseUrl, src) || src;
}

function resolveName(
  details: Item,
  collectionRelation?: ItemRelationView,
  meta?: any
): string {
  return (
    collectionRelation?.details?.name ||
    details.name ||
    meta?.title ||
    prettyURL(details.url ?? undefined) ||
    '?'
  );
}

function resolveDescription(
  details: Item,
  collectionRelation?: ItemRelationView,
  meta?: any
): string | undefined {
  return (
    collectionRelation?.details?.description ||
    details.description ||
    meta?.description
  ) ?? undefined;
}

/**
 * Resolve comment from multiple sources
 */
function resolveComment(
  details: Item,
  collectionRelation?: ItemRelationView
): string | undefined {
  return (collectionRelation?.details?.comment || details.comment) ?? undefined;
}

/**
 * Get icon info based on type and subtype
 */
function getIconInfo(type: ItemType, subType?: ItemTypeSecondary): {
  typeName: string | null;
  typeIcon: string | null;
} {
  if (type === 'col') {
    return { typeName: 'Collection', typeIcon: 'collection' };
  }

  const normalizedSubType = normalizeSubTypeForType(type, subType) ?? undefined;

  // Lookup subType first, then fall back to type
  const lookupType = normalizedSubType || type || 'default';
  const typeInfo = getItemTypeInfo(lookupType);
  
  if (typeInfo) {
    return { typeName: typeInfo.name, typeIcon: typeInfo.icon };
  }
  
  // Fallback if not found in lookup
  return { typeName: normalizedSubType || type, typeIcon: normalizedSubType || type };
}

/**
 * Resolve default image from multiple sources
 */
function resolveDefaultImage(details: Item, meta?: any, baseUrl?: string): string | undefined {
  const normalizedBaseUrl = asNonEmptyString(baseUrl) || asNonEmptyString(details.url) || asNonEmptyString(meta?.url);

  return (
    asNonEmptyString(details.imageFilename) ||
    asNonEmptyString(meta?.bannerImagePath) ||
    normalizeExternalImageCandidate(meta?.imageSrc, normalizedBaseUrl) ||
    normalizeExternalImageCandidate(meta?.bannerImageSrcPath, normalizedBaseUrl) ||
    normalizeExternalImageCandidate(meta?.faviconSrcPath, normalizedBaseUrl) ||
    normalizeExternalImageCandidate(meta?.favicon, normalizedBaseUrl) ||
    asNonEmptyString(meta?.faviconPath)
  );
}

/**
 * Simple URL prettifier (you'd use the real one from your utils)
 */
function prettyURL(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').substring(0, 50);
}


export function createDisplayItem(
  itemInfo: ItemInfoView | ItemInfoViewWithSearchFields,
  options: DisplayItemOptions = {}
): LibraryDisplayItem {
  const { details, feedback, collectionRelation, collectionIds, itemId } = itemInfo;
  const meta = details.meta;
  const playbackSchema = getPlaybackSchemaV1(itemInfo);
  const useCriteriaData = getUseCriteriaObjWithKeys(normalizeStringArray(details.useCriteria) || []);
  
  // Determine subType
  let subType = details.subType;
  if (details.type === 'link' && !subType) {
    subType = getSubTypeFromMeta(meta);
  }
  
  // Get display metadata
  const { typeName, typeIcon } = getIconInfo(details.type!, subType ?? undefined);
  const typeDetails = getItemTypeDetails(details.type!, subType ?? '');
  const defaultImage = resolveDefaultImage(details, meta);
  
  // Check encryption status.
  // Some records (especially post-migration or after admin/debug flows) may carry
  // `encrypted: true` while already being plaintext, or while missing valid encInfo.
  // Only treat as a decryption failure when we have valid encInfo keys.
  const hasEncInfoKeys =
    (details as any)?.encInfo != null &&
    Array.isArray((details as any).encInfo.keys) &&
    (details as any).encInfo.keys.length > 0;

  const decryptionFailed =
    details.encrypted === true &&
    hasEncInfoKeys &&
    details.decrypted === false;
  
  // Resolve display strings (handle decryption failure)
  let name = resolveName(details, collectionRelation, meta);
  let description = resolveDescription(details, collectionRelation, meta);
  let comment = resolveComment(details, collectionRelation);
  
  if (decryptionFailed) {
    name = '[Decryption failed] - check encryption settings';
    description = '[Decryption failed] - check encryption settings';
    comment = '[Decryption failed] - check encryption settings';
  }
  
  // Build the display item
  const displayItem: LibraryDisplayItem = {
    baseType: 'library',
    type: details.type!,
    subType: subType ?? undefined,
    contractId: typeDetails.contractId,
    defaultViewMode: typeDetails.defaultViewMode,
    capabilityFlags: typeDetails.capabilityFlags,
    provider: typeDetails.provider,
    resourceType: typeDetails.resourceType,
    typeName: typeName ?? undefined,
    typeIcon: typeIcon ?? undefined,
    
    _id: details._id || itemId, 
    name,
    description,
    comment,
    url: details.url ?? undefined,
    
    defaultImage,
    accountId: details.accountId ?? undefined,
    userId: details.userId ?? undefined,
    visibility: details.visibility ?? undefined,
    
    categories: normalizeStringArray(details.categories),
    tags: details.tags ?? undefined,
    useCriteria: normalizeStringArray(details.useCriteria),
    eduValue: useCriteriaData.eduValue,
    patterns: details.patterns ?? undefined,
    imageFilename: details.imageFilename ?? undefined,
    archived: details.archived ?? undefined,
    
    createdAt: toISOStringSafe(details.createdAt),
    updatedAt: toISOStringSafe(details.updatedAt),
    
    order: collectionRelation?.order ?? undefined,
    collectionIds,
    collectionRelationId: collectionRelation?._id,
    collectionRelation,
    addedToCollectionAt: collectionRelation?.createdAt ?? undefined,
    publishedUpdatedAt: collectionRelation?.publishedUpdatedAt ?? undefined,
    
    lastVisit: feedback?.lastVisit ?? undefined,
    visitCount: feedback?.visitCount || 0,
    visitTime: feedback?.visitTime ?? undefined,
    feedback,
    
    permission: details.permission as PermissionType ?? undefined,
    permissionUserId: details.permissionUserId ?? undefined,
    sharedByUserId: details.sharedByUserId ?? undefined,
    sharedWithUserId: details.sharedWithUserId ?? undefined,
    sharedAt: toISOStringSafe(details.sharedAt),
    
    publishId: details.publishId ?? undefined,
    published: details.published ?? undefined,
    
    meta: meta ?? undefined,
    attachments: details.attachments ?? undefined,
    info: details.info ?? undefined,
    sysInfo: details.sysInfo ?? undefined,
    audioUrl: playbackSchema?.audioUrl,
    audioType: playbackSchema?.audioType,
    audioDuration: playbackSchema?.audioDuration,
    playbackSchema: playbackSchema ?? undefined,
    
    encrypted: details.encrypted ?? undefined,
    decrypted: details.decrypted ?? undefined,
    decryptionFailed,
    encInfo: details.encInfo,
  };
  
  // Add search-specific fields if present
  if ('scoreInfo' in itemInfo) {
    displayItem.scoreInfo = itemInfo.scoreInfo;
    displayItem.orderIdx = options.orderIdx ?? undefined;
    
    // Calculate relevance score
    displayItem.finalRelScore = displayItem.scoreInfo?._relScore || 0;
    if (displayItem.visitCount && displayItem.visitCount > 0) {
      const baseScore = displayItem.finalRelScore || 0;
      displayItem.finalRelScore =
        baseScore +
        (baseScore || 1) * 0.56 * Math.log(displayItem.visitCount);
    }
  }
  
  return displayItem;
}


export function createDisplayItems(
  items: ItemInfoView[],
  options: DisplayItemOptions = {}
): LibraryDisplayItem[] {
  return items.map((item, idx) =>
    createDisplayItem(item, { ...options, orderIdx: idx })
  );
}


export function createPublishedDisplayItem(
  publishedInfo: PublishedInfoView
): PublishedDisplayItem {
  const { details, stats, curation, parentRelation, inLibrary } = publishedInfo;
  const meta = details.meta;
  
  // Determine subType
  let subType = details.subType;
  if (details.type === 'link' && !subType) {
    subType = getSubTypeFromMeta(meta);
  }
  
  const { typeName, typeIcon } = getIconInfo(details.type!, subType ?? undefined);
  const typeDetails = getItemTypeDetails(details.type!, subType ?? '');
  
  // Resolve image path
  const defaultImage = resolveDefaultImage(details, meta, details.data?.url);
  
  // Resolve name/description with fallbacks (client-side resolution)
  const name =
    parentRelation?.details?.name ||
    details.name ||
    meta?.title ||
    prettyURL(details.data?.url);
    
  const description =
    parentRelation?.details?.description ||
    details.description ||
    meta?.description;
    
  const comment =
    parentRelation?.details?.comment;
  
  // Build the display item with nested structures preserved
  const displayItem: PublishedDisplayItem = {
    baseType: 'published',
    pubItem: true,
    type: details.type!,
    subType: subType ?? undefined,
    contractId: typeDetails.contractId,
    defaultViewMode: typeDetails.defaultViewMode,
    capabilityFlags: typeDetails.capabilityFlags,
    provider: typeDetails.provider,
    resourceType: typeDetails.resourceType,
    
    _id: details._id,
    easyId: details.easyId ?? undefined,
    name: name || '?',
    description,
    comment,
    url: details.data?.url,
    
    typeName: typeName ?? undefined,
    typeIcon: typeIcon ?? undefined,
    defaultImage,
    imageFilename: defaultImage,
    
    patterns: details.data?.patterns,
    categories: normalizeStringArray(details.categories),
    useCriteria: normalizeStringArray(details.useCriteria),
    
    username: details.username ?? undefined,
    publicUserId: details.publicUserId ?? undefined,
    publishType: details.publishType ?? undefined,
    publishConfig: details.publishConfig ?? undefined,
    
    // Nested stats object
    stats,
    
    // Individual stats fields for backward compatibility
    overallRating: stats?.overallRating,
    numRatings: stats?.numRatings,
    statSubCount: stats?.statSubCount,
    statViewCount: stats?.statViewCount,
    
    // Nested curation object
    curation,
    
    // Individual curation fields for backward compatibility  
    curated: curation?.curated,
    curationStatus: curation?.curationStatus,
    curatedDate: curation?.curatedDate ?? undefined,
    curatorId: curation?.curatorId,
    curatorComment: curation?.curatorComment,
    
    inLibrary,
    
    // Nested parent relation
    parentRelation,
    
    createdAt: toISOStringSafe(details.availableAt) || toISOStringSafe(details.createdAt),
    updatedAt: toISOStringSafe(details.updatedAt),
    
    attachments: details.attachments ?? undefined,
    sysInfo: details.sysInfo ?? undefined,
    info: details.info ?? undefined,
    meta: meta ?? undefined,
  };
  
  return displayItem;
}

/**
 * Batch convert PublishedInfoViews
 */
export function createPublishedDisplayItems(
  items: PublishedInfoView[]
): PublishedDisplayItem[] {
  return items.map(createPublishedDisplayItem);
}


export function createTabItem(tab: any): TabDisplayItem {
  return {
    baseType: 'tab',
    type: 'tab',
    _id: `tab_${tab.id}`,
    name: tab.title || tab.url,
    url: tab.url,
    tabId: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    tabInfo: tab,
  };
}

/**
 * Batch convert tabs
 */
export function createTabItems(tabs: any[]): TabDisplayItem[] {
  return tabs.filter(t => t.url.startsWith('http')).map(createTabItem);
}

/**
 * Type guard to check if a display item needs decryption
 */
export function needsDecryption(item: LibraryDisplayItem): boolean {
  return item.encrypted === true && item.decrypted !== true;
}

/**
 * Calculate final relevance score for sorting
 */
export function calculateRelevanceScore(item: LibraryDisplayItem): number {
  let score = item.scoreInfo?._relScore || 0;
  
  if (item.visitCount && item.visitCount > 0) {
    score = score + (score || 1) * 0.56 * Math.log(item.visitCount);
  }
  
  return score;
}

