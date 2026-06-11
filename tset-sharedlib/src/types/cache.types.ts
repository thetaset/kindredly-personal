/**
 * Types for external metadata caching system
 * 
 * The cache stores metadata from external APIs (YouTube, Reddit, Netflix, etc.)
 * with TTL-based freshness and parent-child relationships.
 */

import type { ItemMeta, ItemMetaExtracted } from './item.types';
import type { ItemResourceType } from '../constants';

/**
 * Cache entry for external metadata
 * Keyed by resourceType + externalId for deduplication across URL formats
 */
export interface ExternalMetaCacheEntry {
  _id: string; // Hash of resourceType:externalId
  resourceType: ExternalResourceType;
  externalId: string; // e.g., YouTube videoId, channelId, Reddit post ID
  parentExternalId?: string | null; // e.g., channelId for a video, seriesId for an episode
  canonicalUrl?: string | null; // Normalized URL
  
  meta?: ItemMeta | null; // Basic metadata structure
  extendedInfo?: ExternalMetaExtendedInfo | null; // Provider-specific data
  
  sourceId?: ExternalMetaSourceId | null; // Where the metadata came from
  
  fetchCount?: number; // How many times this was fetched
  fetchedAt: Date; // When last fetched from external source
  expiresAt?: Date | null; // When cache should be considered stale
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Resource types for external content
 * Extends ItemResourceType with additional types for caching purposes
 */
export type ExternalResourceType = ItemResourceType | 
  'REDDIT_POST' | 
  'REDDIT_SUBREDDIT' |
  'NETFLIX_SERIES' |
  'NETFLIX_EPISODE' |
  'GENERIC_SITE';

/**
 * Source identifier for tracking where metadata came from
 */
export type ExternalMetaSourceId = 
  | 'yt_api'          // YouTube Data API
  | 'reddit_api'      // Reddit JSON API
  | 'html_parser'     // Generic HTML meta extraction
  | 'parser_err'      // Extraction failed
  | 'manual'          // Manually entered
  | string;           // Allow custom sources

/**
 * Provider-specific extended metadata
 * Different providers may have different fields
 */
export interface ExternalMetaExtendedInfo {
  // YouTube-specific
  ageRestricted?: boolean;
  madeForKids?: boolean;
  categoryIds?: string[];
  contentRatingDetails?: any;
  
  // Reddit-specific
  redditScore?: number;
  redditComments?: number;
  redditSubreddit?: string;
  redditAuthor?: string;
  
  // Netflix-specific
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  
  // Generic
  source?: string;
  rawData?: any; // For debugging/future use
}

/**
 * TTL configuration per resource type (in milliseconds)
 */
export const EXTERNAL_META_TTL: Record<string, number> = {
  YOUTUBE_VIDEO: 7 * 24 * 60 * 60 * 1000,      // 7 days - metadata rarely changes
  YOUTUBE_CHANNEL: 24 * 60 * 60 * 1000,        // 24 hours - subscriber counts, latest videos
  REDDIT_POST: 60 * 60 * 1000,                  // 1 hour - scores change rapidly
  REDDIT_SUBREDDIT: 24 * 60 * 60 * 1000,       // 24 hours
  NETFLIX_SERIES: 7 * 24 * 60 * 60 * 1000,     // 7 days
  NETFLIX_EPISODE: 7 * 24 * 60 * 60 * 1000,    // 7 days
  SITE_ROOT: 7 * 24 * 60 * 60 * 1000,          // 7 days
  SITE_ITEM: 24 * 60 * 60 * 1000,              // 24 hours
  GENERIC_SITE: 24 * 60 * 60 * 1000,           // 24 hours default
};

/**
 * Options for cache lookup
 */
export interface ExternalMetaCacheLookupOptions {
  /** Force refresh even if cached */
  forceRefresh?: boolean;
  /** Skip cache entirely */
  skipCache?: boolean;
  /** Include extended info in lookup */
  includeExtendedInfo?: boolean;
}

/**
 * Result from cache lookup with freshness info
 */
export interface ExternalMetaCacheLookupResult {
  entry: ExternalMetaCacheEntry | null;
  isFresh: boolean;
  isExpired: boolean;
  cacheHit: boolean;
}
