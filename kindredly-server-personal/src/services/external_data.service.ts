import {ItemRepo} from '@/db/item.repo';
import TaskRunnerService from './task_runner.service';
import ExternalMetaCacheService from './external_meta_cache.service';
import {RequestContext} from '../base/request_context';
import axios from 'axios';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import type {Response} from 'express';
import {getYTResourceTypeFromURL} from 'tset-sharedlib/url.utils';
import {ItemResourceType} from 'tset-sharedlib/constants';
import AITaskService from './_internal/aitask.service';
import type {ItemMeta, ResourceFetchInfoResponse} from 'tset-sharedlib/types/item.types';
import ContentModerationService from './_internal/content_moderation.service';
import {ModerationSeverity} from 'tset-sharedlib/moderation.types';
import {getRedisClient} from '@/base/redis_client';
import {findSourcePriorityDomainRule} from './source_priority_domain_policy';

type ClassificationValue = {value: string; confidence: number};

type SourcePriorityClassificationResult = {
  classification: string;
  confidence?: number;
  details?: {
    eduValue?: ClassificationValue | null;
    categories?: ClassificationValue[];
    contentTypes?: ClassificationValue[];
    flags?: ClassificationValue[];
    topics?: ClassificationValue[];
    shortReason?: string;
    provenance?: {
      sourceUsed: string;
      sourcesChecked: string[];
      fallbackReason?: string | null;
      cacheAgeMs?: number | null;
      policyVersion?: string | null;
    };
  };
};

/**
 * Service for fetching and managing external data (metadata, content classification, proxying)
 * Uses ExternalMetaCacheService for cached metadata operations
 */
class ExternalDataService {
  private itemsRepo = new ItemRepo();
  private taskRunnerService = new TaskRunnerService();
  private aiTaskService = new AITaskService();
  private contentModerationService = new ContentModerationService();
  private metaCacheService: ExternalMetaCacheService;

  private readonly dailyQuota = Number(process.env.SOURCE_PRIORITY_LLM_DAILY_QUOTA || '250');
  private readonly featureDisabled = process.env.SOURCE_PRIORITY_LOOKUP_DISABLED === 'true';
  private readonly allowlistRaw = process.env.SOURCE_PRIORITY_LOOKUP_ALLOWLIST || '';

  constructor() {
    this.metaCacheService = new ExternalMetaCacheService();
  }

  private toClassificationValues(values: string[] | undefined, confidence: number): ClassificationValue[] {
    if (!Array.isArray(values) || values.length === 0) return [];
    return values.map((value) => ({value, confidence}));
  }

  /**
   * Save metadata to an item record
   */
  async saveItemMeta(ctx: RequestContext, id: string, meta: ItemMeta, updatedAt: Date = new Date()): Promise<void> {
    const item = await this.itemsRepo.findById(id);
    await ctx.verifyInAccount(item.userId);
    await this.itemsRepo.updateWithId(id, {metaUpdatedAt: updatedAt, meta});
  }

  /**
   * Fetch metadata with caching support
   * Uses the cache service to avoid redundant external API calls
   */
  async fetchMetadata(url: string, options: {forceRefresh?: boolean} = {}): Promise<ItemMeta | Record<string, never>> {
    try {
      const result = await this.metaCacheService.getCachedOrFetch(url, {
        forceRefresh: options.forceRefresh === true,
      });

      if (result.meta) {
        console.log(`Metadata for ${url} - fromCache: ${result.fromCache}`);
        return result.meta;
      }

      console.log(`No metadata found for ${url}`);
      return {};
    } catch (e) {
      console.log('Error fetching meta', e, url);
      return {};
    }
  }

  /**
   * Fetch metadata via task runner (for background processing)
   */
  async fetchMetadataTaskRunner(url: string): Promise<ItemMeta | Record<string, never>> {
    return await this.taskRunnerService.runTask('fetchMetadata', {url});
  }

  /**
   * Run content classification via task runner
   */
  async runContentClassificationTaskRunner(
    ctx: RequestContext,
    data: {url: string; features?: Record<string, unknown>},
  ): Promise<SourcePriorityClassificationResult> {
    return await this.taskRunnerService.runTask('contentClassification', {
      ...data,
      userId: ctx.currentUserId,
      accountId: ctx.accountId,
    });
  }

  /**
   * Classify content using AI
   */
  async contentClassification(
    ctx: RequestContext,
    data: {url: string; features?: Record<string, unknown>; maxTokens?: number},
  ): Promise<SourcePriorityClassificationResult> {
    console.log('Content classification request:', data);

    const currentUserId = ctx.currentUserId || 'unknown';
    const currentAccountId = ctx.accountId || 'unknown';
    const allowlist = this.parseAllowlist(this.allowlistRaw);

    const sourcesChecked = ['metadata_lookup'];
    const url = typeof data.url === 'string' ? data.url : '';
    const title = typeof data.features?.title === 'string' ? data.features.title : '';
    const description = typeof data.features?.description === 'string' ? data.features.description : '';
    const extractedTextRaw = data.features?.extractedText;
    const extractedText =
      typeof extractedTextRaw === 'string'
        ? extractedTextRaw
        : typeof (extractedTextRaw as any)?.extractedText === 'string'
          ? (extractedTextRaw as any).extractedText
          : '';
    const textForModeration = [title, description, extractedText].filter(Boolean).join(' ').slice(0, 6000);

    const cachedNegative = await this.metaCacheService.getNegativeClassification(url);
    if (cachedNegative.hit && cachedNegative.data) {
      return {
        classification: cachedNegative.data.classification,
        confidence: cachedNegative.data.confidence || 0.9,
        details: {
          flags: cachedNegative.data.flags || [],
          shortReason: cachedNegative.data.shortReason || 'Previously flagged unsafe content.',
          provenance: {
            sourceUsed: 'negative_cache',
            sourcesChecked: ['negative_cache', ...sourcesChecked],
            fallbackReason: null,
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    }

    const metaLookup = await this.metaCacheService.getCachedOrFetch(url, {forceRefresh: false});
    const metaSource = metaLookup.source || (metaLookup.fromCache ? 'cache' : 'fetch');

    if (metaLookup.extendedInfo?.ageRestricted === true) {
      await this.metaCacheService.storeNegativeClassification(
        url,
        {
          classification: 'unsafe',
          confidence: 0.95,
          flags: [{value: 'flag_sexual_content', confidence: 0.95}],
          shortReason: 'Metadata indicates age-restricted content.',
          source: 'metadata_lookup',
        },
        7 * 24 * 60 * 60 * 1000,
      );

      return {
        classification: 'unsafe',
        confidence: 0.95,
        details: {
          flags: [{value: 'flag_sexual_content', confidence: 0.95}],
          shortReason: 'Metadata indicates age-restricted content.',
          provenance: {
            sourceUsed: metaSource,
            sourcesChecked,
            fallbackReason: null,
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    }

    if (metaLookup.extendedInfo?.madeForKids === true) {
      return {
        classification: 'cat_educational',
        confidence: 0.88,
        details: {
          categories: [{value: 'cat_educational', confidence: 0.88}],
          eduValue: {value: 'eduval_educational', confidence: 0.86},
          shortReason: 'Trusted metadata indicates children-focused content.',
          provenance: {
            sourceUsed: metaSource,
            sourcesChecked,
            fallbackReason: null,
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    }

    if (textForModeration.length > 0) {
      sourcesChecked.push('moderation_rules');
      const moderation = await this.contentModerationService.checkContent(ctx, {
        contentType: 'text',
        text: textForModeration,
        metadata: {url, extractedText: extractedText.slice(0, 3000)},
      });

      if (moderation.severity === ModerationSeverity.CRITICAL || moderation.severity === ModerationSeverity.HIGH) {
        const moderationFlags = moderation.flags
          .slice(0, 8)
          .map((flag) => ({value: flag.type, confidence: flag.confidence}));

        await this.metaCacheService.storeNegativeClassification(
          url,
          {
            classification: 'unsafe',
            confidence: moderation.confidence,
            flags: moderationFlags,
            shortReason: moderation.details || 'Deterministic moderation rules marked this content unsafe.',
            source: 'moderation_rules',
          },
          7 * 24 * 60 * 60 * 1000,
        );

        return {
          classification: 'unsafe',
          confidence: moderation.confidence,
          details: {
            flags: moderationFlags,
            shortReason: moderation.details || 'Deterministic moderation rules marked this content unsafe.',
            provenance: {
              sourceUsed: 'moderation_rules',
              sourcesChecked,
              fallbackReason: null,
              cacheAgeMs: null,
              policyVersion: 'source-priority-v1',
            },
          },
        };
      }
    }

    const domainRuleMatch = findSourcePriorityDomainRule(url);
    if (domainRuleMatch) {
      const confidence = domainRuleMatch.rule.confidence ?? 0.82;
      const categories = this.toClassificationValues(domainRuleMatch.rule.categories, confidence);
      const contentTypes = this.toClassificationValues(domainRuleMatch.rule.contentTypes, confidence);
      const flags = this.toClassificationValues(domainRuleMatch.rule.flags, confidence);
      const topics = this.toClassificationValues(domainRuleMatch.rule.topics, confidence);

      sourcesChecked.push('domain_policy');

      return {
        classification: categories[0]?.value || contentTypes[0]?.value || 'uncertain',
        confidence,
        details: {
          eduValue: {value: domainRuleMatch.rule.eduValue, confidence},
          categories,
          contentTypes,
          flags,
          topics,
          shortReason: domainRuleMatch.rule.shortReason,
          provenance: {
            sourceUsed: 'domain_policy',
            sourcesChecked,
            fallbackReason: null,
            cacheAgeMs: null,
            policyVersion: `domain-policy:${domainRuleMatch.rule.id}`,
          },
        },
      };
    }

    if (this.featureDisabled) {
      return {
        classification: 'uncertain',
        confidence: 0.5,
        details: {
          shortReason: 'Server lookup fallback is currently disabled by policy.',
          provenance: {
            sourceUsed: 'policy_gate',
            sourcesChecked,
            fallbackReason: 'feature_disabled',
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    }

    if (!this.isAllowedByAllowlist(allowlist, currentAccountId, currentUserId)) {
      return {
        classification: 'uncertain',
        confidence: 0.5,
        details: {
          shortReason: 'LLM fallback is not enabled for this account/user yet.',
          provenance: {
            sourceUsed: 'policy_gate',
            sourcesChecked,
            fallbackReason: 'not_allowlisted',
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    }

    const quotaDecision = await this.checkAndConsumeDailyQuota(currentAccountId, currentUserId);
    if (!quotaDecision.allowed) {
      return {
        classification: 'uncertain',
        confidence: 0.5,
        details: {
          shortReason: 'Daily LLM lookup limit reached; using deterministic sources only.',
          provenance: {
            sourceUsed: 'policy_gate',
            sourcesChecked,
            fallbackReason: 'daily_quota_exceeded',
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    }

    sourcesChecked.push('llm_fallback');
    const llmResult = (await this.aiTaskService.taskRequest(ctx, {
      taskname: 'contentClassification',
      data: {
        url,
        features: data.features || {},
      },
      maxTokens: data.maxTokens || 1000,
    })) as {message: {content: string}};

    console.log('Content classification results:', llmResult);

    try {
      const parsed = JSON.parse(llmResult?.message?.content || '{}') as Record<string, any>;
      const details = typeof parsed === 'object' && parsed !== null ? parsed : {};

      const categories = Array.isArray(details.categories) ? details.categories : [];
      const contentTypes = Array.isArray(details.contentTypes) ? details.contentTypes : [];
      const flags = Array.isArray(details.flags) ? details.flags : [];
      const topics = Array.isArray(details.topics) ? details.topics : [];
      const confidenceCandidates = [
        ...categories.map((entry: any) => Number(entry?.confidence || 0)),
        ...contentTypes.map((entry: any) => Number(entry?.confidence || 0)),
        ...flags.map((entry: any) => Number(entry?.confidence || 0)),
        Number(details?.eduValue?.confidence || 0),
      ].filter((value) => Number.isFinite(value) && value > 0);

      const topClassification =
        categories[0]?.value || contentTypes[0]?.value || (flags.length > 0 ? 'unsafe' : 'uncertain');

      return {
        classification: String(topClassification),
        confidence: confidenceCandidates.length > 0 ? Math.max(...confidenceCandidates) : 0.5,
        details: {
          eduValue: details.eduValue || null,
          categories,
          contentTypes,
          flags,
          topics,
          shortReason: typeof details.shortReason === 'string' ? details.shortReason : undefined,
          provenance: {
            sourceUsed: 'llm_fallback',
            sourcesChecked,
            fallbackReason: 'deterministic_sources_not_confident',
            cacheAgeMs: null,
            policyVersion: 'source-priority-v1',
          },
        },
      };
    } catch (error) {
      console.error('Error parsing content classification results:', error);
      throw new Error('Failed to parse content classification results');
    }
  }

  private parseAllowlist(raw: string): Set<string> {
    return new Set(
      String(raw || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    );
  }

  private isAllowedByAllowlist(allowlist: Set<string>, accountId: string, userId: string): boolean {
    if (allowlist.size === 0) return true;
    return allowlist.has(accountId) || allowlist.has(userId) || allowlist.has(`${accountId}:${userId}`);
  }

  private async checkAndConsumeDailyQuota(
    accountId: string,
    userId: string,
  ): Promise<{allowed: boolean; used: number}> {
    if (!Number.isFinite(this.dailyQuota) || this.dailyQuota <= 0) {
      return {allowed: false, used: 0};
    }

    try {
      const redis = getRedisClient();
      const dateKey = new Date().toISOString().slice(0, 10);
      const quotaKey = `source_priority_llm_quota:${accountId}:${userId}:${dateKey}`;
      const used = await redis.incr(quotaKey);
      if (used === 1) {
        await redis.expire(quotaKey, 26 * 60 * 60);
      }
      return {allowed: used <= this.dailyQuota, used};
    } catch (error) {
      console.error('Failed to enforce source-priority quota; allowing fallback', error);
      return {allowed: true, used: 0};
    }
  }

  /**
   * Get resource info for content moderation (age restriction, madeForKids, etc.)
   * Delegates to cache service which handles caching automatically
   */
  async getResourceInfo(data: {url: string; forceRefresh?: boolean}): Promise<ResourceFetchInfoResponse> {
    const {url, forceRefresh} = data;
    const rtype = getYTResourceTypeFromURL(url);

    // Use cache service's unified method for fetching with cache
    const result = await this.metaCacheService.getResourceInfoWithCache(url, {forceRefresh});

    console.log(`Resource info for ${url} - fromCache: ${result.fromCache}`);

    // For YouTube content, extract moderation-relevant info from extendedInfo
    if (result.extendedInfo && (rtype === ItemResourceType.YT_VIDEO || rtype === ItemResourceType.YT_CHANNEL)) {
      return {
        rtype,
        contentInfo: null,
        meta: {
          channelId: result.meta?.tsExtractedInfo?.channelId || null,
          ageRestricted: result.extendedInfo.ageRestricted || false,
          madeForKids: result.extendedInfo.madeForKids || false,
          title: result.meta?.title || null,
        },
      };
    }

    return {rtype, contentInfo: null, meta: null};
  }

  /**
   * Get cache statistics (for admin/debugging)
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    byResourceType: Record<string, number>;
  }> {
    return await this.metaCacheService.getStats();
  }

  /**
   * Clean up expired cache entries (can be called via cron/scheduled task)
   */
  async cleanupExpiredCache(): Promise<number> {
    return await this.metaCacheService.cleanupExpired();
  }

  /**
   * Proxy and stream external data (images, RSS feeds)
   */
  async fetchAndStreamData(url: string, res: Response, type: 'image' | 'rss' | string): Promise<void> {
    try {
      assertSafeExternalUrl(url);
      const response = await axios.get(
        url,
        safeFetchConfig({
          responseType: 'stream',
          validateStatus: () => true,
        }),
      );

      const closeUpstream = () => {
        if (response.data && typeof response.data.destroy === 'function') {
          response.data.destroy();
        }
      };

      if (response.status !== 200) {
        console.error('Error fetching data:', response.status, url);
        closeUpstream();
        res.status(response.status).send(response.statusText || 'Upstream request failed');
        return;
      }

      const contentType = response.headers['content-type'] || '';

      if (type === 'image' && !contentType.startsWith('image/')) {
        console.error('Error fetching data: not an image');
        closeUpstream();
        res.status(502).send('Upstream resource was not an image');
        return;
      }

      if (type === 'rss' && !contentType.includes('xml')) {
        console.error('Error fetching data: not an xml feed');
        closeUpstream();
        res.status(502).send('Upstream resource was not an XML feed');
        return;
      }

      console.log('Proxy results on their way');
      res.setHeader('Content-Type', contentType);
      // axios maxContentLength doesn't apply to streams — cap manually so the
      // proxy can't be used to relay unbounded payloads. Errors on either
      // stream must be handled: writing in-flight chunks to a destroyed res
      // would otherwise raise an uncaught ERR_STREAM_DESTROYED.
      const maxBytes = 50 * 1024 * 1024;
      let bytes = 0;
      const onData = (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          console.error('Proxy stream exceeded size cap:', url);
          response.data.off('data', onData);
          response.data.unpipe(res);
          closeUpstream();
          res.destroy();
        }
      };
      response.data.on('data', onData);
      response.data.on('error', (e: Error) => {
        console.error('Proxy upstream stream error:', e.message);
        res.destroy();
      });
      res.on('error', (e: Error) => {
        console.error('Proxy response stream error:', e.message);
        closeUpstream();
      });
      response.data.pipe(res);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
      res.status(502).send('Upstream request failed');
    }
  }
}

export default ExternalDataService;
