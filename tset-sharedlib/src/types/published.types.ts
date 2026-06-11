/**
 * Published content and subscription types
 */

import type Published from '../schemas/public/Published';
import type { DateString } from './common.types';
import type { ItemInfoView } from './item.types';
import type { ItemFeed, FeedType } from './item.types';

export type { Published };

export interface PublishedWithItems {
  published: Published;
  items: ItemInfoView[];
}

export interface PublishedFeedItem {
  published: Published;
  item: ItemInfoView;
}

export interface PublishedStatsView {
  overallRating?: number;
  numRatings?: number;
  statSubCount?: number;
  statViewCount?: number;
}

export interface PublishedCurationView {
  curated?: boolean;
  curationStatus?: string;
  curatedDate?: DateString;
  curatorId?: string;
  curatorComment?: string;
}

export interface SubUnprepared {
  _id: string;
  refType: string;
  refId: string;
  data?: ItemFeed;
  item?: ItemInfoView;
}

export interface FeedConfig {
  pubId?: string;
}

export interface SubWithDetails {
  _id: string;
  refType: string;
  refId: string;
  feedId: string;
  item?: any; // LibraryDisplayItem from display.types - avoid circular dependency
  title: string;
  description?: string;
  type: string | FeedType;
  config?: FeedConfig;
  url?: string;
  feedURL?: string;
  lastUpdatedAt?: string;
  selected?: boolean;
  itemsLastUpdated?: number | null;
  isTemp?: boolean;
}

export interface SubGroup {
  _id: string;
  name: string;
  subIds: string[];
}

export interface SubItem {
  _id?: string;
  type: 'feed_item' | 'pubcol' | 'pub_item' | 'item' | 'pub_col';
  baseType: 'subItem'
  sourceId?: string;
  title: string;
  url: string;
  description: string;
  categories?: { term: string; label: string }[];
  imageUrl: string | null;
  defaultImage: string | null;
  all: string;
  subDetails: SubWithDetails;
  removing?: boolean;
  createdAt: string;
  dismissed?: boolean;
  itemMatch?: ItemInfoView;
  info?: any; // ItemDetailsInfo from item.types
  patterns?: string[];
  /** For pub_item type: contains the full PublishedDisplayItem from display.types */
  data?: any;
  // Podcast/audio episode fields
  audioUrl?: string;
  audioDuration?: string; // itunes:duration format (HH:MM:SS or seconds)
  audioType?: string; // MIME type e.g. 'audio/mpeg'
}

export interface PublishedRelationView {
  _id?: string;
  parentId?: string;
  itemId?: string;
  order?: number;
  details?: { name?: string; description?: string; comment?: string };
  availableAt?: DateString;
  createdAt?: DateString;
}

export interface PublishedInfoView {
  publishedId: string;
  details: Published;
  stats?: PublishedStatsView;
  curation?: PublishedCurationView;
  parentRelation?: PublishedRelationView;
  inLibrary?: boolean;
}

export type SubscriptionConsumeMode = 'whats_new' | 'work_through';

export type SubscriptionCompletionMode = 'open' | 'explicit';

export type SubscriptionWorkThroughProgressV1 = {
  completedThroughKey?: string | null;
  completedAt?: DateString | null;
};

export type SubscriptionConsumeSettingsV1 = {
  mode?: SubscriptionConsumeMode;
  completionMode?: SubscriptionCompletionMode;
  workThrough?: SubscriptionWorkThroughProgressV1;
};

export type SubscriptionData = Record<string, any> & {
  consumeSettings?: SubscriptionConsumeSettingsV1;
};

export interface SubscriptionInfo {
  _id: string;
  userId: string;
  refId: string;
  refType: string;
  enabled: boolean;
  settings?: Record<string, any>;
  data?: SubscriptionData;
  item?: ItemInfoView;
  createdAt: string;
  title?: string;
  description?: string;
  type?: string | FeedType;
}

