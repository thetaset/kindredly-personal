import {ItemRepo} from '@/db/item.repo';
import TaskRunnerService from './task_runner.service';
import ExternalMetaCacheService from './external_meta_cache.service';
import {RequestContext} from '../base/request_context';
import axios from 'axios';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import {buildDefaultBrowserHeaders} from '@/utils/fetch_helpers';
import {classifyUpstreamBlock, readStreamPrefix, type UpstreamBlockVerdict} from '@/utils/upstream_block';
import {recordSecurityEvent, SECURITY_EVENT_TYPES} from '@/services/security_event.service';
import type {Response} from 'express';
import {getYTResourceTypeFromURL} from 'tset-sharedlib/url.utils';
import {ItemResourceType} from 'tset-sharedlib/constants';
import type {ItemMeta, ResourceFetchInfoResponse} from 'tset-sharedlib/types/item.types';
// TYPE-ONLY, deliberately — see the lazy getter below. `import type` is erased
// at compile time, so it emits no require() and cannot fail on a build where
// services/_internal is not present.
import type AITaskService from './_internal/aitask.service';
import type ContentModerationService from './_internal/content_moderation.service';
import {ModerationSeverity} from 'tset-sharedlib/moderation.types';
import {getKeyValueStore} from '@/base/runtime.factory';
import {
  acquireFeedLock,
  getFeedCacheEntry,
  isFeedEntryFresh,
  releaseFeedLock,
  setFeedCacheEntry,
  waitForFeedCacheEntry,
  type FeedCacheEntry,
} from './feed_cache.service';
import {findSourcePriorityDomainRule} from './source_priority_domain_policy';
import {ClassificationModelArtifactRepo} from '@/db/classification_model_artifact.repo';
import {SITE_OVERRIDE_RULES} from '@/data/site-overrides';
import type {SiteOverridesEnvelope} from 'tset-sharedlib/content.types';
import {createHash} from 'crypto';

type ClassificationValue = {value: string; confidence: number};

function isStreamLike(data: any): boolean {
  return !!data && typeof data.on === 'function';
}

/** Coerce a buffered axios body of any shape into a Buffer. */
function toBuffer(data: any): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  return Buffer.alloc(0);
}

function toBufferPrefix(data: any, maxBytes: number): Buffer {
  return toBuffer(data).subarray(0, maxBytes);
}

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
  private classificationModelArtifactRepo = new ClassificationModelArtifactRepo();
  private metaCacheService: ExternalMetaCacheService;
  private siteOverridesEnvelope: SiteOverridesEnvelope | null = null;

  private readonly dailyQuota = Number(process.env.SOURCE_PRIORITY_LLM_DAILY_QUOTA || '250');
  private readonly featureDisabled = process.env.SOURCE_PRIORITY_LOOKUP_DISABLED === 'true';
  private readonly allowlistRaw = process.env.SOURCE_PRIORITY_LOOKUP_ALLOWLIST || '';

  constructor() {
    this.metaCacheService = new ExternalMetaCacheService();
  }

  /**
   * The cloud-only services, resolved on first use rather than at construction.
   *
   * `services/_internal` is withheld from the published Kindredly Personal repo
   * (scripts/personal-sync/server-src.exclude), and this file is not — too many
   * open services import it. A top-level `import` of a withheld module compiles
   * fine there, because that build is `swc src --out-dir dist`, which transpiles
   * without resolving — and then the server dies on start with
   * MODULE_NOT_FOUND. The whole published repo has been in that state.
   *
   * A lazy require moves the resolution to the code paths that need it, and
   * those are paths a self-hosted server never takes: moderation runs on
   * publish-and-share and a personal server has no published routes at all
   * (app.ts skips them when config.privateServer), and the AI task queue is a
   * cloud worker. On the cloud the behaviour is unchanged — same classes, same
   * instances, first touch instead of construction — and call sites stay
   * non-null, which is the point of a getter over an optional field.
   */
  private _aiTaskService: AITaskService | null = null;
  private get aiTaskService(): AITaskService {
    if (!this._aiTaskService) {
      // personal-optional: guarded, never reached on a self-hosted server
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./_internal/aitask.service');
      this._aiTaskService = new (mod.default || mod)();
    }
    return this._aiTaskService as AITaskService;
  }

  private _contentModerationService: ContentModerationService | null = null;
  private get contentModerationService(): ContentModerationService {
    if (!this._contentModerationService) {
      // personal-optional: guarded, never reached on a self-hosted server
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./_internal/content_moderation.service');
      this._contentModerationService = new (mod.default || mod)();
    }
    return this._contentModerationService as ContentModerationService;
  }

  /**
   * Fetch the active learned-classifier artifact for distribution to clients.
   * Returns null when no model has been published/activated yet. Clients cache
   * by `version` and re-download when it changes.
   */
  async getActiveLearnedClassifierModel(kind?: string): Promise<{
    version: string;
    kind: string;
    embeddingModelId: string;
    artifact: any;
    createdAt: string | null;
  } | null> {
    const normalizedKind = (typeof kind === 'string' && kind.trim()) || 'eduValue_logreg';
    const row = await this.classificationModelArtifactRepo.findActive(normalizedKind);
    if (!row?._id) return null;
    return {
      version: row.version,
      kind: row.kind,
      embeddingModelId: row.embeddingModelId,
      artifact: row.artifact,
      // Match the wire contract (api-route-map declares string | null).
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    };
  }

  /**
   * Curated site-classification overrides for client distribution. The list is a
   * checked-in file (code = source of truth); `version` is a content hash so clients
   * cache it and re-parse only when the file actually changes. Memoized per process.
   */
  getActiveSiteOverrides(): SiteOverridesEnvelope {
    if (!this.siteOverridesEnvelope) {
      const version = createHash('sha1').update(JSON.stringify(SITE_OVERRIDE_RULES)).digest('hex').slice(0, 12);
      this.siteOverridesEnvelope = {version, updatedAt: null, entries: SITE_OVERRIDE_RULES};
    }
    return this.siteOverridesEnvelope;
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
   * Has our own content check already flagged this URL as unsafe?
   *
   * Exposed so the assistant review can refuse to put a flagged page in front of
   * a model at all. The full classification cascade consults the same cache, but
   * callers that only need the yes/no should not have to run the cascade — or pay
   * for it — to get it.
   */
  async hasNegativeClassification(url: string): Promise<boolean> {
    try {
      const cached = await this.metaCacheService.getNegativeClassification(url);
      return cached.hit === true && !!cached.data;
    } catch {
      return false;
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
   * Estimate useCriteria tags for admin enrichment (direct, non user-gated LLM call).
   * Returns suggested tag keys with confidence; callers filter + apply with human review.
   */
  async estimateUseCriteriaForAdmin(input: {
    title?: string;
    description?: string;
    url?: string;
  }): Promise<Array<{value: string; confidence: number}>> {
    return this.aiTaskService.estimateUseCriteria(input);
  }

  /**
   * Ask AI to clean up / simplify a title and description (the existing
   * `cleanupData` task). Returns only fields the model actually rewrote; callers
   * surface them as reviewable overwrite patches.
   */
  async cleanupContentText(
    ctx: RequestContext,
    input: {name?: string; description?: string},
  ): Promise<{name?: string; description?: string}> {
    const result = (await this.aiTaskService.taskRequest(ctx, {
      taskname: 'cleanupData',
      data: {name: input.name || '', description: input.description || ''},
      maxTokens: 600,
    })) as {message?: {content?: string}};

    try {
      const parsed = JSON.parse(result?.message?.content || '{}') as Record<string, unknown>;
      const out: {name?: string; description?: string} = {};
      if (typeof parsed.name === 'string' && parsed.name.trim()) out.name = parsed.name.trim();
      if (typeof parsed.description === 'string' && parsed.description.trim())
        out.description = parsed.description.trim();
      return out;
    } catch {
      return {};
    }
  }

  /**
   * Classify content using AI
   */
  async contentClassification(
    ctx: RequestContext,
    data: {url: string; features?: Record<string, unknown>; maxTokens?: number},
  ): Promise<SourcePriorityClassificationResult> {
    const currentUserId = ctx.currentUserId || 'unknown';
    const currentAccountId = ctx.accountId || 'unknown';
    const allowlist = this.parseAllowlist(this.allowlistRaw);

    const sourcesChecked = ['metadata_lookup'];
    const url = typeof data.url === 'string' ? data.url : '';

    // The request carries a page's title, description and up to 16,000 characters of its text.
    // None of it belongs in a server log: record which site and which account, nothing more.
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      host = '(unparseable url)';
    }
    console.log('Content classification request:', {host, accountId: currentAccountId});
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
      const redis = getKeyValueStore();
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
   * Was this failure a CDN turning *us* away, rather than the origin saying no?
   *
   * Feeds only, on purpose: the image and `type: 'json'` callers read the body
   * blind (`.blob()` / `.json()` with no `.ok` check), so changing the failure
   * shape underneath them would be an unrelated behaviour change. Gating here
   * keeps their blast radius at zero.
   */
  private async detectUpstreamBlock(
    type: string,
    response: {headers: Record<string, any>; data?: any},
    contentType: string,
  ): Promise<UpstreamBlockVerdict> {
    if (type !== 'rss') {
      return {blocked: false};
    }

    // The header signal needs no body, so check it before touching the stream.
    const headerVerdict = classifyUpstreamBlock({headers: response.headers});
    if (headerVerdict.blocked) {
      return headerVerdict;
    }

    // Only sniff markup. A challenge page is HTML; anything binary is not worth
    // buffering, and we are about to discard this body either way.
    const sniffable = !contentType || contentType.includes('text/html') || contentType.includes('text/plain');
    if (!sniffable) {
      return {blocked: false};
    }

    // The feed path buffers the body (it has to, to cache it); the image path
    // still streams. `readStreamPrefix` returns '' for a non-stream, so without
    // this branch the challenge-page sniff would silently stop working for
    // exactly the type it was written for. UTF-8 regardless of the declared
    // charset is fine here — a challenge page is ASCII HTML, and we are only
    // pattern-matching it, not rendering it.
    const bodyPrefix = isStreamLike(response.data)
      ? await readStreamPrefix(response.data)
      : toBufferPrefix(response.data, 32 * 1024).toString('utf8');
    return classifyUpstreamBlock({headers: response.headers, bodyPrefix});
  }

  /**
   * Report a bot mitigation as a structured envelope the client can act on.
   *
   * Status 422 is chosen for what it is *not*: 403 would be remapped to an auth
   * error client-side, and 502/503/504 are read as "Kindredly is unavailable"
   * and trip a global disconnected state — over one third-party feed host. The
   * client keys on `errorType`, never on this status.
   */
  /**
   * Record a proxy-related security event, pulling the actor off the underlying request.
   *
   * The proxy helpers only receive `res`, so identity comes from `res.req` rather than a
   * threaded RequestContext — that keeps every existing caller's signature unchanged.
   */
  private recordProxyEvent(
    res: Response,
    eventType: (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES],
    severity: 'info' | 'warn' | 'critical',
    detail: Record<string, unknown>,
  ): void {
    const req: any = (res as any)?.req;
    recordSecurityEvent({
      eventType,
      severity,
      ip: req?.ip,
      route: req?.path,
      actorUserId: req?.authInfo?.userId || null,
      actorAccountId: req?.authInfo?.accountId || null,
      clientId: req?.authInfo?.clientId || null,
      detail,
    });
  }

  private sendUpstreamBlocked(res: Response, url: string, upstreamStatus: number, signal?: string): void {
    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      // A malformed URL never reaches here (assertSafeExternalUrl parsed it),
      // but the envelope must not fail to send over a hostname.
    }

    // Informational rather than a warning: an upstream CDN block is the remote site's
    // decision, not abuse of ours. It is tracked because a sharp rise means our egress IPs
    // are getting reputation-flagged, which is an availability problem worth seeing early.
    this.recordProxyEvent(res, SECURITY_EVENT_TYPES.PROXY_UPSTREAM_BLOCKED, 'info', {
      upstreamStatus,
      reason: signal,
    });

    res.status(422).json({
      success: false,
      errorType: 'UPSTREAM_BLOCKED',
      message: 'This site blocked the request from our servers.',
      details: {upstreamStatus, signal, host},
    });
  }

  /**
   * Decode a feed body using the charset the origin declared.
   *
   * The stream path passed bytes through untouched, so a windows-1252 or
   * ISO-8859-1 feed arrived intact. Buffering has to decode, and axios would
   * assume UTF-8 — which turns every accented character in those feeds into
   * replacement characters. Read the declared charset instead, and fall back to
   * UTF-8 for the (large) majority that declare nothing.
   */
  private decodeFeedBody(data: any, contentType: string): string {
    const buffer = toBuffer(data);
    const declared = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase();
    if (!declared || declared === 'utf-8' || declared === 'utf8') {
      return buffer.toString('utf8');
    }

    try {
      return new TextDecoder(declared).decode(buffer);
    } catch {
      // An unknown or bogus charset label. UTF-8 is the better guess than
      // failing the whole feed over a header.
      return buffer.toString('utf8');
    }
  }

  /**
   * Re-label a decoded body as UTF-8 while keeping the origin's media type.
   *
   * The bytes we send are a UTF-8 encoding of a JS string, so leaving the
   * origin's `charset=ISO-8859-1` on it would be a lie the client would act on.
   */
  private toUtf8ContentType(contentType: string): string {
    const mediaType = (contentType || 'application/xml').split(';')[0].trim();
    return `${mediaType || 'application/xml'}; charset=utf-8`;
  }

  private sendFeedBody(res: Response, body: string, contentType: string, cacheState: string): void {
    console.log('Proxy feed results on their way', {cacheState});
    res.setHeader('Content-Type', contentType || 'application/xml; charset=utf-8');
    // Diagnostic only — no client reads it, and none should. It exists so a
    // "why is this feed stale / why did the origin see so many requests"
    // question can be answered from a response rather than from server logs.
    res.setHeader('X-Kindredly-Feed-Cache', cacheState);
    res.send(body);
  }

  /**
   * Serve a feed, going upstream at most once per feed per freshness window
   * across all users.
   *
   * The proxy is the webapp's only path to a feed (no CORS headers on feed
   * hosts), so without this every user's refresh was its own origin request
   * from our one egress IP. Nothing here may make a request *fail* that would
   * otherwise have succeeded: a Redis fault, a lock timeout, or an unparseable
   * URL all fall through to the plain uncached fetch.
   */
  private async serveFeedWithCache(url: string, res: Response): Promise<void> {
    const cached = await getFeedCacheEntry(url);
    if (cached && isFeedEntryFresh(cached)) {
      this.sendFeedBody(res, cached.body, cached.contentType, 'hit');
      return;
    }

    const lockToken = await acquireFeedLock(url);
    if (!lockToken) {
      // Someone else is already fetching this exact feed. Wait for their result
      // — but only briefly. Falling through to our own fetch is the same
      // behaviour as before the cache existed; being stuck behind a stranger's
      // slow request would be worse than the duplicate fetch we are avoiding.
      const waited = await waitForFeedCacheEntry(url);
      if (waited) {
        this.sendFeedBody(res, waited.body, waited.contentType, 'wait');
        return;
      }
    }

    try {
      await this.fetchAndServeFeed(url, res, cached);
    } finally {
      if (lockToken) await releaseFeedLock(url, lockToken);
    }
  }

  private async fetchAndServeFeed(url: string, res: Response, cached: FeedCacheEntry | null): Promise<void> {
    const conditionalHeaders: Record<string, string> = {};
    if (cached?.etag) conditionalHeaders['If-None-Match'] = cached.etag;
    if (cached?.lastModified) conditionalHeaders['If-Modified-Since'] = cached.lastModified;

    let response: {status: number; statusText?: string; headers: Record<string, any>; data?: any};
    try {
      response = await axios.get(
        url,
        safeFetchConfig({
          // Bytes, not text: axios would decode as UTF-8 regardless of what the
          // origin declared, and would try to JSON.parse the result on top of
          // that. Decoding is `decodeFeedBody`'s job.
          responseType: 'arraybuffer',
          transformResponse: [(data: any) => data],
          // 304 is a success here, not an error, so status handling stays ours.
          validateStatus: () => true,
          headers: buildDefaultBrowserHeaders(
            {
              Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8',
              ...conditionalHeaders,
            },
            // Declaring `no-cache` makes some origins skip returning validators,
            // which would defeat the revalidation we just asked for.
            {noCache: false},
          ),
        }),
      );
    } catch (error: any) {
      // A transport failure is transient by nature, so a body from the last 24
      // hours beats an error page. Only here — never for a block or a 4xx.
      if (cached) {
        console.error('Feed fetch failed, serving stale body:', error?.message, url);
        this.sendFeedBody(res, cached.body, cached.contentType, 'stale');
        return;
      }
      throw error;
    }

    const contentType = response.headers['content-type'] || '';

    if (response.status === 304 && cached) {
      await setFeedCacheEntry(url, {...cached, fetchedAt: Date.now()});
      this.sendFeedBody(res, cached.body, cached.contentType, 'revalidated');
      return;
    }

    const isXmlFeed = contentType.includes('xml');

    if (response.status !== 200 || !isXmlFeed) {
      // A managed challenge is usually served as text/html with HTTP 200, so the
      // content-type check is the *most* common way a block shows up, not an
      // afterthought to the status check.
      const verdict = await this.detectUpstreamBlock('rss', response, contentType);
      console.error('Error fetching feed:', response.status, url, {
        contentType,
        blocked: verdict.blocked,
        signal: verdict.signal,
      });

      if (verdict.blocked) {
        // Deliberately not served from stale cache. A block is a persistent
        // condition, and the 422 envelope is what tells the person the app and
        // extension would load this feed directly. Papering over it with a
        // day-old body would hide the one thing they can act on.
        this.sendUpstreamBlocked(res, url, response.status, verdict.signal);
        return;
      }

      // A 5xx is the origin having a bad minute; a 4xx or a non-feed response is
      // a real answer the person should see.
      if (cached && response.status >= 500) {
        this.sendFeedBody(res, cached.body, cached.contentType, 'stale');
        return;
      }

      if (response.status !== 200) {
        res.status(response.status).send(response.statusText || 'Upstream request failed');
      } else {
        res.status(502).send('Upstream resource was not an XML feed');
      }
      return;
    }

    const body = this.decodeFeedBody(response.data, contentType);
    const outboundContentType = this.toUtf8ContentType(contentType);

    await setFeedCacheEntry(url, {
      body,
      contentType: outboundContentType,
      etag: response.headers['etag'] || undefined,
      lastModified: response.headers['last-modified'] || undefined,
      fetchedAt: Date.now(),
    });

    this.sendFeedBody(res, body, outboundContentType, 'miss');
  }

  /**
   * Proxy and stream external data (images, RSS feeds)
   */
  async fetchAndStreamData(url: string, res: Response, type: 'image' | 'rss' | string): Promise<void> {
    try {
      try {
        assertSafeExternalUrl(url);
      } catch (ssrfError) {
        // Someone asked the server to fetch a private or non-HTTP address. The guard
        // already refused; this records that it happened so a sustained probe (cloud
        // metadata, RFC1918 sweeps) is visible rather than just a stream of 500s.
        // The URL itself is deliberately not recorded — only that it was rejected.
        this.recordProxyEvent(res, SECURITY_EVENT_TYPES.PROXY_SSRF_BLOCKED, 'critical', {
          reason: 'forbidden_target',
          feature: type,
        });
        throw ssrfError;
      }

      // Feeds take a separate, buffered path so one upstream fetch can serve
      // every user subscribed to that feed. Images keep streaming — their
      // bodies do not belong in Redis.
      if (type === 'rss') {
        await this.serveFeedWithCache(url, res);
        return;
      }

      // Identify as a browser. Left alone, axios sends `User-Agent: axios/x.y.z`,
      // which Cloudflare-fronted hosts reject outright from a datacenter IP — a
      // 403 the client can do nothing about, because its own fallback (a direct
      // fetch from the page) is cross-origin and always blocked outside the
      // extension. This proxy is the only path those clients have.
      const response = await axios.get(
        url,
        safeFetchConfig({
          responseType: 'stream',
          validateStatus: () => true,
          headers: buildDefaultBrowserHeaders(),
        }),
      );

      const closeUpstream = () => {
        if (response.data && typeof response.data.destroy === 'function') {
          response.data.destroy();
        }
      };

      const contentType = response.headers['content-type'] || '';

      if (response.status !== 200) {
        const verdict = await this.detectUpstreamBlock(type, response, contentType);
        closeUpstream();
        console.error('Error fetching data:', response.status, url, {
          blocked: verdict.blocked,
          signal: verdict.signal,
        });
        if (verdict.blocked) {
          this.sendUpstreamBlocked(res, url, response.status, verdict.signal);
          return;
        }
        res.status(response.status).send(response.statusText || 'Upstream request failed');
        return;
      }

      if (type === 'image' && !contentType.startsWith('image/')) {
        console.error('Error fetching data: not an image');
        closeUpstream();
        res.status(502).send('Upstream resource was not an image');
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
