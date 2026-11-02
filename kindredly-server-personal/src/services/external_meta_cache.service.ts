import {ExternalMetaCacheRepo} from '@/db/external_meta_cache.repo';
import {PublishedRepo} from '@/db/published.repo';
import type {
  ExternalMetaCacheEntry,
  ExternalMetaCacheLookupResult,
  ExternalMetaExtendedInfo,
  ExternalResourceType,
} from 'tset-sharedlib/types/cache.types';
import {EXTERNAL_META_TTL} from 'tset-sharedlib/types/cache.types';
import {ItemResourceType} from 'tset-sharedlib/constants';
import {
  getCanonicalPublishedExternalLookupCandidate,
  getLegacyPublishedExternalLookupCandidates,
  type ItemMeta,
  type ItemMetaExtracted,
} from 'tset-sharedlib/types/item.types';
import type Published from 'tset-sharedlib/schemas/public/Published';
import {
  fetchGenericHtmlMeta,
  fetchRedditPageMetaDefault,
  fetchSiteApiMeta,
  fetchGooglePhotosShareMeta,
  fetchSocialPageMetaDefault,
  fetchYoutubeVideoInfo,
  fetchYoutubeChannelMetaWithApiByURL,
  fetchYoutubeChannelLatestVideos,
} from '@/utils/fetch_helpers';
import {config} from '@/config';
import {
  extractYoutubeVideoId,
  getSocialMetadataProvider,
  isYTChannelURL,
  isYTVideoURL,
  isRedditURL,
  getYTResourceTypeFromURL,
  urlToKey,
} from 'tset-sharedlib/url.utils';
import {extractYTChannelID, extractYTVideoID} from 'tset-sharedlib/text.utils';
import {recognizeMediaMetadataUrl} from 'tset-sharedlib/media-metadata.utils';
import {isLikelyChallengeTitle} from 'tset-sharedlib/extraction.pure.utils';
import {isGooglePhotosShareUrl} from 'tset-sharedlib/google-photos.utils';
import {resolveMediaMetadata} from './media_metadata_resolver.service';

/** A Google Photos share's metadata without its cover, which is one of the family's photos (HAT-651). */
function withoutShareCover(url: string, meta: ItemMeta | null): ItemMeta | null {
  if (!meta || !meta.imageSrc || !isGooglePhotosShareUrl(url)) return meta;
  const withoutCover = {...meta};
  delete withoutCover.imageSrc;
  return withoutCover;
}

class ExternalMetaCacheService {
  private repo = new ExternalMetaCacheRepo();
  private publishedRepo = new PublishedRepo();
  private static inFlight = new Map<
    string,
    Promise<{meta: ItemMeta | null; extendedInfo: ExternalMetaExtendedInfo | null}>
  >();

  private coerceBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  private coerceStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;

    const normalized = value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return normalized.length > 0 ? [...new Set(normalized)] : undefined;
  }

  private normalizePublishedExtendedInfo(published: Published): ExternalMetaExtendedInfo | null {
    const canonicalCandidate = getCanonicalPublishedExternalLookupCandidate(published);
    const legacyCandidates = getLegacyPublishedExternalLookupCandidates(published);
    const candidates = canonicalCandidate ? [canonicalCandidate, ...legacyCandidates] : legacyCandidates;

    if (candidates.length === 0) {
      return null;
    }

    let ageRestricted: boolean | undefined;
    let madeForKids: boolean | undefined;
    let categoryIds: string[] | undefined;
    let contentRatingDetails: any = undefined;

    for (const candidate of candidates) {
      if (ageRestricted === undefined) {
        ageRestricted = this.coerceBoolean(candidate.ageRestricted);
      }

      if (madeForKids === undefined) {
        madeForKids = this.coerceBoolean(candidate.madeForKids);
      }

      if (!categoryIds) {
        categoryIds = this.coerceStringArray(candidate.categoryIds);
      }

      if (contentRatingDetails == null && candidate.contentRatingDetails != null) {
        contentRatingDetails = candidate.contentRatingDetails;
      }
    }

    const hasSignals =
      ageRestricted !== undefined || madeForKids !== undefined || !!categoryIds?.length || contentRatingDetails != null;

    if (!hasSignals) {
      return null;
    }

    return {
      ...(ageRestricted !== undefined ? {ageRestricted} : {}),
      ...(madeForKids !== undefined ? {madeForKids} : {}),
      ...(categoryIds ? {categoryIds} : {}),
      ...(contentRatingDetails != null ? {contentRatingDetails} : {}),
      source: 'published',
      rawData: {
        publishedId: published._id,
        curationStatus: published.curationStatus,
        categories: published.categories,
      },
    };
  }

  private getNegativeExternalId(url: string): string {
    const normalized = urlToKey(url) || url;
    return ExternalMetaCacheRepo.generateCacheId('negative_url', normalized);
  }

  /**
   * Get TTL in milliseconds for a resource type
   */
  private getTtlMs(resourceType: string): number {
    return EXTERNAL_META_TTL[resourceType] || EXTERNAL_META_TTL.GENERIC_SITE;
  }

  /**
   * Calculate expiration date based on resource type
   */
  private calculateExpiresAt(resourceType: string): Date {
    const ttl = this.getTtlMs(resourceType);
    return new Date(Date.now() + ttl);
  }

  /**
   * Check if a cache entry is fresh (not expired)
   */
  private isFresh(entry: ExternalMetaCacheEntry): boolean {
    if (!entry.expiresAt) return true;
    return new Date(entry.expiresAt) > new Date();
  }

  /**
   * Look up cached metadata with freshness info
   */
  async lookup(resourceType: ExternalResourceType, externalId: string): Promise<ExternalMetaCacheLookupResult> {
    const entry = await this.repo.getByExternalId(resourceType, externalId);

    if (!entry) {
      return {entry: null, isFresh: false, isExpired: false, cacheHit: false};
    }

    const isFresh = this.isFresh(entry);
    return {
      entry,
      isFresh,
      isExpired: !isFresh,
      cacheHit: true,
    };
  }

  /**
   * Get cached metadata, refreshing if stale
   * This is the main entry point for cache-aware metadata fetching
   *
   * Priority order:
   * 1. Published items (curated = highest priority, then any published)
   * 2. Local cache (if fresh)
   * 3. Fresh fetch from external source
   */
  async getCachedOrFetch(
    url: string,
    options: {forceRefresh?: boolean; skipCache?: boolean; skipPublished?: boolean} = {},
  ): Promise<{
    meta: ItemMeta | null;
    extendedInfo: ExternalMetaExtendedInfo | null;
    fromCache: boolean;
    source?: string;
  }> {
    if (!options.skipPublished && !options.forceRefresh) {
      const published = await this.getPublishedMetadata(url);
      if (published) {
        console.log(`Using published metadata for ${url} (curated: ${published.curated})`);
        return {
          meta: published.meta,
          extendedInfo: published.extendedInfo,
          fromCache: true,
          source: published.curated ? 'published_curated' : 'published',
        };
      }
    }

    const resource = this.categorizeUrl(url);
    let staleEntry: ExternalMetaCacheEntry | null = null;

    if (!options.skipCache && !options.forceRefresh) {
      const cached = await this.lookup(resource.resourceType, resource.externalId);
      // An entry stored before sign-in and challenge pages were screened out carries that page's
      // title ("Google Docs: Sign-in", HAT-168). It is neither served nor kept as the fallback,
      // so the next fetch replaces it.
      if (cached.entry && isLikelyChallengeTitle(cached.entry.meta?.title)) {
        cached.entry = null;
        cached.cacheHit = false;
      }
      if (cached.cacheHit && cached.isFresh) {
        await this.repo.touch(cached.entry!._id);
        return {
          meta: withoutShareCover(url, cached.entry!.meta || null),
          extendedInfo: cached.entry!.extendedInfo || null,
          fromCache: true,
          source: 'cache',
        };
      }
      staleEntry = cached.entry;
    }

    const inFlightKey = `${resource.resourceType}:${resource.externalId}`;
    const existingFetch = ExternalMetaCacheService.inFlight.get(inFlightKey);
    if (existingFetch) {
      const result = await existingFetch;
      return {...result, fromCache: false, source: 'coalesced'};
    }

    const fetchAndStore = (async () => {
      const result = await this.fetchFreshMetadata(url, resource.resourceType, resource.externalId);
      const {meta, extendedInfo} = result;

      // `fileInfo` counts as content: a PDF whose filename yields no usable title is
      // still a fully recognised file, not a parse failure, and negative-caching it
      // for an hour would hide that from the popup.
      const hasContent = !!(meta?.title || meta?.description || meta?.imageSrc || meta?.fileInfo || extendedInfo);
      if (!hasContent && staleEntry && (staleEntry.meta || staleEntry.extendedInfo)) {
        return {meta: withoutShareCover(url, staleEntry.meta || null), extendedInfo: staleEntry.extendedInfo || null};
      }
      await this.store(
        {
          resourceType: resource.resourceType,
          externalId: resource.externalId,
          parentExternalId: resource.parentExternalId,
          canonicalUrl: resource.canonicalUrl || url,
          meta: meta || null,
          extendedInfo: extendedInfo || null,
          sourceId: meta?.tsExtractedInfo?.sourceId || (hasContent ? 'html_parser' : 'parser_err'),
        },
        hasContent ? undefined : 60 * 60 * 1000,
      );
      return result;
    })();
    ExternalMetaCacheService.inFlight.set(inFlightKey, fetchAndStore);
    try {
      const result = await fetchAndStore;
      return {...result, fromCache: false, source: 'fetch'};
    } finally {
      if (ExternalMetaCacheService.inFlight.get(inFlightKey) === fetchAndStore) {
        ExternalMetaCacheService.inFlight.delete(inFlightKey);
      }
    }
  }

  /**
   * Look up metadata from Published items (curated/canonical source)
   * Returns curated items with highest priority
   */
  private async getPublishedMetadata(
    url: string,
  ): Promise<{meta: ItemMeta; extendedInfo: ExternalMetaExtendedInfo | null; curated: boolean} | null> {
    try {
      const key = urlToKey(url);
      if (!key) return null;

      const publishedItems: Published[] = await this.publishedRepo
        .findMany({key})
        .where('published', true)
        .where(function () {
          this.whereNull('availableAt').orWhere('availableAt', '<', new Date());
        });

      if (!publishedItems || publishedItems.length === 0) {
        return null;
      }

      const curated = publishedItems.find((p) => p.curated === true);
      const bestMatch = curated || publishedItems[0];

      if (!bestMatch.meta) {
        return null;
      }

      const extendedInfo = this.normalizePublishedExtendedInfo(bestMatch);

      return {
        meta: {
          ...bestMatch.meta,
          title: bestMatch.meta.title || bestMatch.name || undefined,
          description: bestMatch.meta.description || bestMatch.description || undefined,
          tsExtractedInfo: {
            ...bestMatch.meta.tsExtractedInfo,
            sourceId: curated ? 'published_curated' : 'published',
          } as ItemMetaExtracted,
        },
        extendedInfo,
        curated: !!curated,
      };
    } catch (error) {
      console.error('Error looking up published metadata:', error);
      return null;
    }
  }

  private categorizeUrl(url: string): {
    resourceType: ExternalResourceType;
    externalId: string;
    parentExternalId?: string;
    canonicalUrl?: string;
  } {
    const media = recognizeMediaMetadataUrl(url);
    if (media) {
      return {
        resourceType: media.resourceType,
        externalId: `${media.provider}:${media.externalId}`,
        canonicalUrl: media.canonicalUrl,
      };
    }

    if (isYTVideoURL(url)) {
      const videoId = extractYoutubeVideoId(url);
      if (videoId) {
        return {
          resourceType: ItemResourceType.YT_VIDEO,
          externalId: videoId,
        };
      }
    }

    if (isYTChannelURL(url)) {
      const channelId = extractYTChannelID(url);
      if (channelId) {
        return {
          resourceType: ItemResourceType.YT_CHANNEL,
          externalId: channelId,
        };
      }
    }

    if (isRedditURL(url)) {
      return {
        resourceType: 'REDDIT_POST',
        externalId: ExternalMetaCacheRepo.generateCacheId('url', url),
      };
    }

    return {
      resourceType: 'GENERIC_SITE',
      externalId: ExternalMetaCacheRepo.generateCacheId('url', url),
    };
  }

  private async fetchFreshMetadata(
    url: string,
    resourceType: ExternalResourceType,
    externalId: string,
  ): Promise<{meta: ItemMeta | null; extendedInfo: ExternalMetaExtendedInfo | null}> {
    try {
      if (recognizeMediaMetadataUrl(url)) {
        const resolved = await resolveMediaMetadata(url);
        if (!resolved) return {meta: null, extendedInfo: null};
        // The resolver always returns extendedInfo, even when it found nothing. Keep it
        // only for a resolved title: otherwise a provider's one-off stall would count as
        // content, earn the provider's 7-30 day TTL, and overwrite an older good entry.
        return {meta: resolved.meta, extendedInfo: resolved.meta.resolved ? resolved.extendedInfo : null};
      }

      if (resourceType === ItemResourceType.YT_VIDEO) {
        const result = await this.fetchYouTubeVideoMeta(url, externalId);
        // The YouTube Data API path is entirely key/quota dependent and returns
        // null on any failure (missing/invalid key, quota, private/deleted video).
        // Fall back to scraping the page's og:image so we still get a thumbnail.
        return result.meta ? result : {meta: await fetchGenericHtmlMeta(url), extendedInfo: null};
      }

      if (resourceType === ItemResourceType.YT_CHANNEL) {
        const result = await this.fetchYouTubeChannelMeta(url, externalId);
        return result.meta ? result : {meta: await fetchGenericHtmlMeta(url), extendedInfo: null};
      }

      if (resourceType === 'REDDIT_POST') {
        return await this.fetchRedditMeta(url);
      }

      if (getSocialMetadataProvider(url)) {
        const meta = await fetchSocialPageMetaDefault(url);
        return {meta, extendedInfo: null};
      }

      // A site that refuses a page read but names the page through a public API (HAT-619).
      const meta =
        (await fetchSiteApiMeta(url)) || (await fetchGooglePhotosShareMeta(url)) || (await fetchGenericHtmlMeta(url));
      // A Google Photos share's cover is one of the family's photos, and this cache is shared: none is
      // kept, even from the plain page read used when the share's own reader found nothing (HAT-651).
      return {meta: withoutShareCover(url, meta), extendedInfo: null};
    } catch (error) {
      console.error(`Error fetching metadata for ${url}:`, error);
      return {meta: null, extendedInfo: null};
    }
  }

  /**
   * Fetch YouTube video metadata with extended info
   */
  private async fetchYouTubeVideoMeta(
    url: string,
    videoId: string,
  ): Promise<{meta: ItemMeta | null; extendedInfo: ExternalMetaExtendedInfo | null}> {
    const videoMeta = await fetchYoutubeVideoInfo(videoId, config.googleServiceApiKey);
    if (!videoMeta) {
      return {meta: null, extendedInfo: null};
    }

    const channelId = videoMeta.snippet?.channelId || null;
    const meta: ItemMeta = {
      url,
      title: videoMeta.snippet?.title,
      description: videoMeta.snippet?.description,
      imageSrc: videoMeta.snippet?.thumbnails?.high?.url,
      tsExtractedInfo: {
        pageType: ItemResourceType.YT_VIDEO,
        videoId,
        channelId,
        channelName: videoMeta.snippet?.channelTitle || null,
        youtubeChannelIds: channelId ? [channelId] : [],
        sourceId: 'yt_api',
      },
    };

    const extendedInfo: ExternalMetaExtendedInfo = {
      ageRestricted: videoMeta.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
      madeForKids: videoMeta.status?.madeForKids || false,
      categoryIds: videoMeta.snippet?.categoryId ? [videoMeta.snippet.categoryId] : [],
      contentRatingDetails: videoMeta.contentDetails?.contentRating || null,
      source: 'youtube',
    };

    return {meta, extendedInfo};
  }

  /**
   * Fetch YouTube channel metadata with extended info from latest videos.
   * Handles all channel URL formats: /channel/UC..., /@handle, /c/name, /user/name, and vanity URLs.
   */
  private async fetchYouTubeChannelMeta(
    url: string,
    channelIdOrHandle: string,
  ): Promise<{meta: ItemMeta | null; extendedInfo: ExternalMetaExtendedInfo | null}> {
    // Use URL-based fetcher which handles all channel URL types (handles, vanity, etc.)
    const channelMeta = await fetchYoutubeChannelMetaWithApiByURL(url);

    if (!channelMeta) {
      return {meta: null, extendedInfo: null};
    }

    // Get the resolved channel ID from the meta (API always returns the UC... ID)
    const resolvedChannelId = channelMeta.tsExtractedInfo?.channelId;

    // Fetch latest videos using the resolved channel ID
    const latestVideos = resolvedChannelId
      ? await fetchYoutubeChannelLatestVideos(resolvedChannelId, config.googleServiceApiKey, 10)
      : [];

    let categoryIds: string[] = [];
    let madeForKidsCount = 0;
    let ageRestrictedCount = 0;

    for (const video of latestVideos || []) {
      const catId = video?.snippet?.categoryId;
      if (catId && !categoryIds.includes(catId)) {
        categoryIds.push(catId);
      }
      if (video?.status?.madeForKids) madeForKidsCount++;
      if (video?.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') ageRestrictedCount++;
    }

    const videoCount = latestVideos?.length || 0;
    const ageRestricted = videoCount > 0 && ageRestrictedCount / videoCount > 0.5;
    const madeForKids = videoCount > 0 && madeForKidsCount / videoCount > 0.5 && !ageRestricted;

    const extendedInfo: ExternalMetaExtendedInfo = {
      ageRestricted,
      madeForKids,
      categoryIds,
      source: 'youtube',
    };

    return {meta: channelMeta, extendedInfo};
  }

  /**
   * Fetch Reddit metadata with extended info
   */
  private async fetchRedditMeta(
    url: string,
  ): Promise<{meta: ItemMeta | null; extendedInfo: ExternalMetaExtendedInfo | null}> {
    const meta = await fetchRedditPageMetaDefault(url);
    if (!meta) {
      return {meta: null, extendedInfo: null};
    }

    const extendedInfo: ExternalMetaExtendedInfo = {
      source: 'reddit',
      redditScore: meta.tsExtractedInfo?.redditScore,
      rawData: {
        subreddit: meta.tsExtractedInfo?.redditSubreddit,
        author: meta.tsExtractedInfo?.redditAuthor,
        comments: meta.tsExtractedInfo?.redditComments,
        created: meta.tsExtractedInfo?.redditCreated,
      },
    };

    return {meta, extendedInfo};
  }

  /**
   * Store metadata in cache
   */
  async store(
    data: {
      resourceType: ExternalResourceType;
      externalId: string;
      parentExternalId?: string;
      canonicalUrl?: string;
      meta?: ItemMeta | null;
      extendedInfo?: ExternalMetaExtendedInfo | null;
      sourceId?: string;
    },
    ttlOverrideMs?: number,
  ): Promise<ExternalMetaCacheEntry> {
    const expiresAt = ttlOverrideMs ? new Date(Date.now() + ttlOverrideMs) : this.calculateExpiresAt(data.resourceType);

    const entry: ExternalMetaCacheEntry = {
      _id: ExternalMetaCacheRepo.generateCacheId(data.resourceType, data.externalId),
      resourceType: data.resourceType,
      externalId: data.externalId,
      parentExternalId: data.parentExternalId || null,
      canonicalUrl: data.canonicalUrl || null,
      meta: data.meta || null,
      extendedInfo: data.extendedInfo || null,
      sourceId: data.sourceId || null,
      fetchedAt: new Date(),
      expiresAt,
    };

    return await this.repo.upsert(entry);
  }

  /**
   * Get all children for a parent (e.g., all videos for a channel)
   */
  async getChildren(resourceType: ExternalResourceType, parentExternalId: string): Promise<ExternalMetaCacheEntry[]> {
    return await this.repo.getByParentId(resourceType, parentExternalId);
  }

  /**
   * Get cached resource info for content moderation (used by /data/resourceInfo)
   * Returns extended info (age restriction, madeForKids) from cache if available
   */
  async getCachedResourceInfo(
    url: string,
  ): Promise<{hit: boolean; extendedInfo: ExternalMetaExtendedInfo | null; resourceType: ExternalResourceType}> {
    const resource = this.categorizeUrl(url);

    const cached = await this.lookup(resource.resourceType, resource.externalId);
    if (cached.cacheHit && cached.isFresh && cached.entry?.extendedInfo) {
      return {
        hit: true,
        extendedInfo: cached.entry.extendedInfo,
        resourceType: resource.resourceType,
      };
    }

    return {hit: false, extendedInfo: null, resourceType: resource.resourceType};
  }

  /**
   * Get full resource info for content moderation, fetching if not cached
   * This is the preferred method for getResourceInfo - handles caching automatically
   */
  async getResourceInfoWithCache(
    url: string,
    options: {forceRefresh?: boolean} = {},
  ): Promise<{
    resourceType: ExternalResourceType;
    meta: ItemMeta | null;
    extendedInfo: ExternalMetaExtendedInfo | null;
    fromCache: boolean;
  }> {
    const result = await this.getCachedOrFetch(url, options);
    const resource = this.categorizeUrl(url);

    return {
      resourceType: resource.resourceType,
      meta: result.meta,
      extendedInfo: result.extendedInfo,
      fromCache: result.fromCache,
    };
  }

  async getNegativeClassification(url: string): Promise<{
    hit: boolean;
    data: {
      classification: string;
      confidence?: number;
      flags?: Array<{value: string; confidence: number}>;
      shortReason?: string;
      source?: string;
      createdAt?: string;
    } | null;
  }> {
    const externalId = this.getNegativeExternalId(url);
    const cached = await this.lookup('GENERIC_SITE', externalId);
    if (!cached.cacheHit || !cached.isFresh || !cached.entry) {
      return {hit: false, data: null};
    }

    const entry = cached.entry;
    if (entry.sourceId !== 'negative_intel') {
      return {hit: false, data: null};
    }

    const payload = (entry.extendedInfo as any)?.rawData?.negativeClassification;
    if (!payload || typeof payload !== 'object') {
      return {hit: false, data: null};
    }

    return {
      hit: true,
      data: {
        classification: typeof payload.classification === 'string' ? payload.classification : 'unsafe',
        confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined,
        flags: Array.isArray(payload.flags) ? payload.flags : undefined,
        shortReason: typeof payload.shortReason === 'string' ? payload.shortReason : undefined,
        source: typeof payload.source === 'string' ? payload.source : 'negative_intel',
        createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : undefined,
      },
    };
  }

  async storeNegativeClassification(
    url: string,
    data: {
      classification: string;
      confidence?: number;
      flags?: Array<{value: string; confidence: number}>;
      shortReason?: string;
      source?: string;
    },
    ttlOverrideMs?: number,
  ): Promise<void> {
    const externalId = this.getNegativeExternalId(url);
    const nowIso = new Date().toISOString();
    await this.store(
      {
        resourceType: 'GENERIC_SITE',
        externalId,
        canonicalUrl: url,
        meta: null,
        extendedInfo: {
          source: 'negative_intel',
          rawData: {
            negativeClassification: {
              classification: data.classification,
              confidence: data.confidence,
              flags: data.flags || [],
              shortReason: data.shortReason,
              source: data.source || 'source-priority',
              createdAt: nowIso,
            },
          },
        },
        sourceId: 'negative_intel',
      },
      ttlOverrideMs,
    );
  }

  async invalidateByUrl(url: string): Promise<void> {
    const resource = this.categorizeUrl(url);
    await this.invalidate(resource.resourceType, resource.externalId);

    const negativeExternalId = this.getNegativeExternalId(url);
    await this.invalidate('GENERIC_SITE', negativeExternalId);
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(resourceType: ExternalResourceType, externalId: string): Promise<void> {
    await this.repo.deleteByExternalId(resourceType, externalId);
  }

  /**
   * Clean up expired entries (can be run via cron)
   */
  async cleanupExpired(): Promise<number> {
    return await this.repo.deleteExpired();
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return await this.repo.getStats();
  }
}

export default ExternalMetaCacheService;
