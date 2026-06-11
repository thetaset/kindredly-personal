import {
  ItemMeta,
  ItemAttachment,
  ItemSysInfo,
  ItemDetailsInfo,
  PlaybackSchemaV1,
  PermissionType,
  ItemFeedbackView,
  ItemRelationView,
  PublishedStatsView,
  PublishedCurationView,
  PublishedRelationView,
} from './shared.types';
import {
  ItemExperienceCapability,
  ItemExperienceViewMode,
  ItemTypePrimary,
  ItemTypeSecondary,
} from './content.types';

export type DisplayItemType = 'library' | 'published' | 'tab' | 'menu';

/** Canonical primary item type for persisted/displayed library items */
export type ItemType = ItemTypePrimary;

export interface BaseDisplayItem {
  _id?: string;
  name: string;
  description?: string;
  baseType: DisplayItemType;
  typeName?: string;
  typeIcon?: string;
  defaultImage?: string;
}

export interface LibraryDisplayItem extends BaseDisplayItem {
  baseType: 'library';
  type: ItemType;
  subType?: ItemTypeSecondary;
  contractId?: string;
  defaultViewMode?: ItemExperienceViewMode;
  capabilityFlags?: ItemExperienceCapability[];
  provider?: string;
  resourceType?: string;
  
  url?: string;
  accountId?: string;
  userId?: string;
  visibility?: string;
  categories?: string[];
  tags?: string[];
  useCriteria?: string[];
  eduValue?: string;
  patterns?: string[];
  imageFilename?: string;
  comment?: string;
  archived?: boolean;
  
  createdAt?: string;
  updatedAt?: string;
  addedToCollectionAt?: string;
  publishedUpdatedAt?: string;
  
  order?: number;
  collectionIds?: string[];
  parentList?: Array<{name: string; _id: string; imageFilename?: string}>;
  collectionRelationId?: string;
  collectionRelation?: ItemRelationView;
  
  lastVisit?: string;
  visitCount?: number;
  visitTime?: string;
  feedback?: ItemFeedbackView;
  
  permission?: PermissionType;
  permissionUserId?: string;
  sharedByUserId?: string;
  sharedWithUserId?: string;
  sharedAt?: string;
  permList?: {userId:string; permission: PermissionType}[];
  
  publishId?: string;
  published?: boolean;
  
  meta?: ItemMeta;
  attachments?: {entries: ItemAttachment[]};
  info?: ItemDetailsInfo;
  sysInfo?: ItemSysInfo;
  audioUrl?: string;
  audioType?: string;
  audioDuration?: string;
  playbackSchema?: PlaybackSchemaV1;
  
  encrypted?: boolean;
  decrypted?: boolean;
  decryptionFailed?: boolean;
  encInfo?: any;
  
  scoreInfo?: Record<string, any>;
  orderIdx?: number;
  finalRelScore?: number;
  
  removing?: boolean;


  /** Tab-specific: index of tab in window */
  index?: number;
  /** Tab-specific: window ID containing the tab */
  windowId?: number;
  
  /** @deprecated */
  imageUrl?: string;
}

export interface PublishedDisplayItem extends Omit<LibraryDisplayItem, 'baseType'> {
  baseType: 'published';
  pubItem: true;
  
  easyId?: string;
  username?: string;
  publicUserId?: string;
  publishType?: string;
  publishConfig?: any;
  
  // Nested stats object (new)
  stats?: PublishedStatsView;
  
  // Individual stats fields (kept for backward compatibility)
  overallRating?: number;
  numRatings?: number;
  statSubCount?: number;
  statViewCount?: number;
  
  // Nested curation object (new)
  curation?: PublishedCurationView;
  
  // Individual curation fields (kept for backward compatibility)
  curated?: boolean;
  curationStatus?: string;
  curatedDate?: string;
  curatorId?: string;
  curatorComment?: string;
  
  inLibrary?: boolean;
  
  // Nested parent relation (updated type)
  parentRelation?: PublishedRelationView;
  
  // Use criteria fields (partitioned from useCriteria array)
  eduValue?: string;
  minAgeGroup?: string;
  targetAudiences?: Array<{name: string; [key: string]: any}>;
  cost?: string;
  ads?: boolean;
  costDetails?: Record<string, any>;
}

export interface TabDisplayItem extends BaseDisplayItem {
  baseType: 'tab';
  type: 'tab';
  url: string;
  tabId: number;
  windowId: number;
  index: number;
  tabInfo?: any;
}

export interface MenuDisplayItem extends BaseDisplayItem {
  baseType: 'menu';
  type: 'menu';
  fullPath: string;
  to?: string;
  modal?: string;
  icon?: string;
  customIcon?: {name: string; [key: string]: any};
  keywords: string[];
  parentLabel?: string;
  showCondition?: 'admin' | 'nonAdmin' | 'mobile' | 'developer' | 'advanced';
}

export type DisplayItem = 
  | LibraryDisplayItem 
  | PublishedDisplayItem 
  | TabDisplayItem 
  | MenuDisplayItem;

export function isLibraryItem(item: DisplayItem | BaseDisplayItem): item is LibraryDisplayItem {
  return item.baseType === 'library';
}

export function isPublishedItem(item: DisplayItem | BaseDisplayItem): item is PublishedDisplayItem {
  return item.baseType === 'published';
}

export function isTabItem(item: DisplayItem | BaseDisplayItem): item is TabDisplayItem {
  return item.baseType === 'tab';
}

export function isMenuItem(item: DisplayItem | BaseDisplayItem): item is MenuDisplayItem {
  return item.baseType === 'menu';
}

export function hasUrl(item: DisplayItem): item is LibraryDisplayItem | PublishedDisplayItem | TabDisplayItem {
  return item.baseType === 'library' || item.baseType === 'published' || item.baseType === 'tab';
}

export function supportsCollections(item: DisplayItem): item is LibraryDisplayItem | PublishedDisplayItem {
  return item.baseType === 'library' || item.baseType === 'published';
}

/** @deprecated Use LibraryDisplayItem */
export type LibraryItemView = LibraryDisplayItem;

/** @deprecated Use PublishedDisplayItem */
export type PublishedItemView = PublishedDisplayItem;

/** @deprecated Use TabDisplayItem */
export type TabItemView = TabDisplayItem;

/** @deprecated Use MenuDisplayItem */
export type InternalMenuItemView = MenuDisplayItem;
