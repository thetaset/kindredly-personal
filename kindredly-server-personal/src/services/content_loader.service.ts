import {PublishedRelationRepo} from '@/db/publish_relation.repo';
import {PublishedRepo} from '@/db/published.repo';
import ItemService from '@/services/item.service';
import ExternalMetaCacheService from '@/services/external_meta_cache.service';
import ExternalDataService from '@/services/external_data.service';
import ContentModerationService, {ModerationSeverity} from '@/services/_internal/content_moderation.service';
import UserFileService from '@/services/user_file.service';
import {PublishedFileService} from '@/services/_internal/published_file.service';
import {config} from '@/config';
import {UserFileAccessProviderFS} from '@/base/user_fileaccess.provider.fs';
import {UserFileAccessProviderS3} from '@/base/_internal/user_fileaccess.provider.s3';
import type {
  AdminContentLoaderAdvisory,
  AdminContentLoaderAssetKind,
  AdminContentLoaderAttachmentEntry,
  AdminContentLoaderDryRunDecision,
  AdminContentLoaderDryRunRequest,
  AdminContentLoaderEnrichmentPatch,
  AdminContentLoaderDryRunResponse,
  AdminContentLoaderExecuteRequest,
  AdminContentLoaderExecuteResponse,
  AdminContentLoaderEnrichRowResult,
  AdminContentLoaderManifest,
  AdminContentLoaderManifestAsset,
  AdminContentLoaderManifestRecord,
  AdminContentLoaderMatchPreview,
  AdminContentLoaderUploadAssetRequest,
  AdminContentLoaderUploadAssetResponse,
  AdminPublishedApplyPatchesRequest,
  AdminPublishedApplyPatchesResponse,
  AdminPublishedEnrichItemResult,
  AdminPublishedEnrichRequest,
  AdminPublishedEnrichResponse,
} from 'tset-sharedlib/api';
import type Published from 'tset-sharedlib/schemas/public/Published';
import PublishedRelation from 'tset-sharedlib/schemas/public/PublishedRelation';
import type {ItemAttachment, ItemMeta} from 'tset-sharedlib/types/item.types';
import {publishedItemSchemaUpdater} from '@/services/_internal/internal_published.service';
import {PublishedModerationReporter} from '@/services/_internal/published_moderation_reporter.service';
import {KEY_DIL} from '@/templates/email.templates';
import {getYTResourceTypeFromURL} from 'tset-sharedlib/url.utils';
import {urlToKey} from 'tset-sharedlib/text.utils';
import {v4 as uuidv4} from 'uuid';
import {RequestContext} from '@/base/request_context';
import {
  initialImportProcessingState,
  setPostImportProcessingOnInfo,
  setPublishedExternalLookupOnInfo,
  type PostImportProcessingInfo,
  type PostImportProcessingState,
  type PublishedExternalLookupInfo,
  type ResourceFetchInfoResponse,
} from 'tset-sharedlib/types/item.types';
import {OFFICIAL_PUBLISHER_PUBLIC_ID, OFFICIAL_PUBLISHER_USERNAME} from 'tset-sharedlib/constants';
import {findSourcePriorityDomainRule} from './source_priority_domain_policy';
import {createHash} from 'crypto';

type NormalizedRecordWithIssues = {
  record: AdminContentLoaderManifestRecord;
  issues: string[];
};

type ParsedManifest = {
  records: NormalizedRecordWithIssues[];
  assets: AdminContentLoaderManifestAsset[];
};

type MatchSignal = 'itemId' | 'easyId' | 'sourceItemId' | 'url';

type ImportBatchInfo = {
  batchId: string;
  batchLabel: string | null;
  batchSource: string;
};

type ImportOptions = {
  importVisibility: 'inactive' | 'live';
  batch: ImportBatchInfo;
};

class ContentLoaderService {
  private published = new PublishedRepo();
  private itemService = new ItemService();
  private externalMetaCacheService = new ExternalMetaCacheService();
  private externalDataService = new ExternalDataService();
  private contentModerationService = new ContentModerationService();
  private publishedModerationReporter = PublishedModerationReporter.instance;
  private publishedFileService = new PublishedFileService();
  private userFileService = new UserFileService(
    config.userStorage.type === 'fs' ? new UserFileAccessProviderFS() : new UserFileAccessProviderS3(),
  );

  private getManifestHash(manifestText: string): string {
    return createHash('sha256').update(manifestText || '').digest('hex');
  }

  private normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    const normalized = this.normalizeString(value);
    return normalized || undefined;
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const entry of value) {
      const nextValue = this.normalizeString(entry);
      if (!nextValue || seen.has(nextValue)) continue;
      seen.add(nextValue);
      normalized.push(nextValue);
    }

    return normalized;
  }

  private normalizeObject(value: unknown): Record<string, any> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return {...(value as Record<string, any>)};
  }

  private normalizeURL(value: unknown): string | undefined {
    const raw = this.normalizeString(value);
    if (!raw) return undefined;

    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return undefined;
      }
      return parsed.toString();
    } catch {
      return undefined;
    }
  }

  private normalizeAttachment(rawAttachment: any): AdminContentLoaderAttachmentEntry {
    return {
      id: this.normalizeOptionalString(rawAttachment?.id),
      type:
        rawAttachment?.type === 'snapshot' || rawAttachment?.type === 'snip' || rawAttachment?.type === 'uri'
          ? rawAttachment.type
          : 'file',
      filename: this.normalizeOptionalString(rawAttachment?.filename),
      fileType: this.normalizeOptionalString(rawAttachment?.fileType) || 'application/octet-stream',
      fileId: this.normalizeOptionalString(rawAttachment?.fileId),
      info: this.normalizeObject(rawAttachment?.info),
      meta: this.normalizeObject(rawAttachment?.meta),
      previews: Array.isArray(rawAttachment?.previews) ? rawAttachment.previews : undefined,
      encryptedInfo: typeof rawAttachment?.encryptedInfo === 'boolean' ? rawAttachment.encryptedInfo : undefined,
      createDate: typeof rawAttachment?.createDate === 'number' ? rawAttachment.createDate : undefined,
      assetId: this.normalizeOptionalString(rawAttachment?.assetId) || null,
    };
  }

  private normalizeAssetKind(value: unknown): AdminContentLoaderAssetKind {
    return value === 'banner_image' ? 'banner_image' : 'published_attachment';
  }

  private normalizeAsset(rawAsset: any, index: number): AdminContentLoaderManifestAsset {
    return {
      assetId: this.normalizeOptionalString(rawAsset?.assetId) || `asset-${index + 1}`,
      ownerLocalId: this.normalizeString(rawAsset?.ownerLocalId),
      kind: this.normalizeAssetKind(rawAsset?.kind),
      filename: this.normalizeOptionalString(rawAsset?.filename) || null,
      fileType: this.normalizeOptionalString(rawAsset?.fileType) || null,
      tempUploadId: this.normalizeOptionalString(rawAsset?.tempUploadId) || null,
      remoteUrl: this.normalizeURL(rawAsset?.remoteUrl) || null,
      meta: this.normalizeObject(rawAsset?.meta) || null,
    };
  }

  private normalizeRecord(rawRecord: any, index: number): NormalizedRecordWithIssues {
    const data = this.normalizeObject(rawRecord?.data);
    const meta = this.normalizeObject(rawRecord?.meta);
    const attachments = Array.isArray(rawRecord?.attachments)
      ? rawRecord.attachments.map((attachment: any) => this.normalizeAttachment(attachment))
      : [];
    const record: AdminContentLoaderManifestRecord = {
      localId: this.normalizeOptionalString(rawRecord?.localId) || `record-${index + 1}`,
      itemId: this.normalizeOptionalString(rawRecord?.itemId),
      easyId: this.normalizeOptionalString(rawRecord?.easyId),
      sourceItemId: this.normalizeOptionalString(rawRecord?.sourceItemId),
      type: this.normalizeString(rawRecord?.type),
      name: this.normalizeString(rawRecord?.name),
      description: this.normalizeOptionalString(rawRecord?.description),
      url: this.normalizeURL(rawRecord?.url) || this.normalizeURL(data?.url) || this.normalizeURL(meta?.url),
      categories: this.normalizeStringArray(rawRecord?.categories),
      useCriteria: this.normalizeStringArray(rawRecord?.useCriteria),
      childLocalIds: this.normalizeStringArray(rawRecord?.childLocalIds),
      imageAssetId: this.normalizeOptionalString(rawRecord?.imageAssetId) || null,
      imageFilename: this.normalizeOptionalString(rawRecord?.imageFilename) || null,
      attachments: attachments.length > 0 ? attachments : undefined,
      data,
      meta,
      published: typeof rawRecord?.published === 'boolean' ? rawRecord.published : true,
    };

    const issues: string[] = [];
    if (!record.type) {
      issues.push('Type is required.');
    }
    if (!record.name) {
      issues.push('Name is required.');
    }
    if (!record.itemId && !record.easyId && !record.sourceItemId && !record.url) {
      issues.push('Add at least one stable identity: itemId, easyId, sourceItemId, or url.');
    }
    if (record.childLocalIds.length > 0 && record.type !== 'col') {
      issues.push('childLocalIds are only valid on collection records.');
    }
    if (record.imageAssetId && record.type !== 'col' && record.type !== 'thing') {
      issues.push('imageAssetId is only supported on thing and collection records.');
    }
    if ((record.attachments || []).length > 0 && record.type === 'col') {
      issues.push('Attachments are only supported on item-like records, not collections.');
    }

    return {record, issues};
  }

  private parseManifest(manifestText: string): ParsedManifest {
    let parsed: unknown;

    try {
      parsed = JSON.parse(manifestText);
    } catch {
      throw new Error('Manifest must be valid JSON.');
    }

    const rawRecords = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as {records?: unknown[]} | null)?.records)
        ? (parsed as {records: unknown[]}).records
        : null;

    if (!rawRecords) {
      throw new Error('Manifest must be a JSON array or an object with a records array.');
    }

    const rawAssets = Array.isArray((parsed as {assets?: unknown[]} | null)?.assets)
      ? ((parsed as {assets: unknown[]}).assets || [])
      : [];

    return {
      records: rawRecords.map((rawRecord, index) => this.normalizeRecord(rawRecord, index)),
      assets: rawAssets.map((rawAsset, index) => this.normalizeAsset(rawAsset, index)),
    };
  }

  private toMatchPreview(item: Published): AdminContentLoaderMatchPreview {
    return {
      _id: item._id || '',
      name: item.name || undefined,
      easyId: item.easyId || undefined,
      type: item.type || undefined,
      url: item.data?.url || item.meta?.url || undefined,
    };
  }

  private async findBySignal(signal: MatchSignal, value: string): Promise<Published[]> {
    if (!value) return [];

    switch (signal) {
      case 'itemId': {
        const match = await this.published.query().where({_id: value}).first();
        return match ? [match as Published] : [];
      }
      case 'easyId':
        return await this.published.query().where({easyId: value});
      case 'sourceItemId':
        return await this.published.query().where({sourceItemId: value});
      case 'url':
        return await this.published.query().whereRaw("COALESCE(data->>'url', meta->>'url') = ?", [value]);
      default:
        return [];
    }
  }

  private buildMatchIssues(
    record: AdminContentLoaderManifestRecord,
    signalMatches: Record<MatchSignal, string[]>,
    matchedIds: string[],
  ): string[] {
    const issues: string[] = [];

    if (matchedIds.length > 1) {
      issues.push('Multiple existing published records match this row.');
    }

    const signalLabels: Record<MatchSignal, string> = {
      itemId: 'itemId',
      easyId: 'easyId',
      sourceItemId: 'sourceItemId',
      url: 'url',
    };

    const signals: MatchSignal[] = ['itemId', 'easyId', 'sourceItemId', 'url'];
    for (const signal of signals) {
      const value = record[signal];
      const matches = signalMatches[signal];
      if (!value) continue;
      if (matches.length > 1) {
        issues.push(`${signalLabels[signal]} matches more than one existing record.`);
      } else if (matches.length === 0 && matchedIds.length > 0) {
        issues.push(`${signalLabels[signal]} does not match the same record as the other identifiers.`);
      }
    }

    return issues;
  }

  private getDecision(
    validationIssues: string[],
    matchIssues: string[],
    matchedIds: string[],
  ): AdminContentLoaderDryRunDecision {
    if (validationIssues.length > 0) return 'invalid';
    if (matchIssues.length > 0) return 'conflict';
    if (matchedIds.length > 0) return 'update';
    return 'create';
  }

  private isValidUseCriteriaSuggestion(value: unknown): value is string {
    return typeof value === 'string' && /^(eduval_|ta_|topic_|intent_|ct_|minage_)/.test(value);
  }

  private getAdvisoryStatus(input: {
    moderationSeverity: string;
    suggestedUseCriteriaCount: number;
    notes: string[];
    resourceInfo: ResourceFetchInfoResponse | null;
  }): AdminContentLoaderAdvisory['status'] {
    if (
      input.moderationSeverity === ModerationSeverity.CRITICAL ||
      input.moderationSeverity === ModerationSeverity.HIGH ||
      input.resourceInfo?.meta?.ageRestricted === true
    ) {
      return 'warning';
    }

    if (input.moderationSeverity === ModerationSeverity.MEDIUM) {
      return 'review';
    }

    if (
      input.suggestedUseCriteriaCount > 0 ||
      input.notes.length > 0 ||
      input.moderationSeverity === ModerationSeverity.LOW
    ) {
      return 'suggested';
    }

    return 'clear';
  }

  private async buildAdvisory(record: AdminContentLoaderManifestRecord): Promise<AdminContentLoaderAdvisory | null> {
    const notes: string[] = [];
    const enrichmentReasons: string[] = [];
    const suggestedUseCriteria = new Set<string>();
    const existingUseCriteria = new Set(record.useCriteria || []);

    const moderationText = [
      record.name,
      record.description,
      record.url,
      record.meta ? JSON.stringify(record.meta) : '',
      record.data ? JSON.stringify(record.data) : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 8000);

    let moderation: AdminContentLoaderAdvisory['moderation'] = null;
    if (moderationText.length > 0) {
      const moderationResult = await this.contentModerationService.checkContent(RequestContext.instanceForSystem(), {
        contentType: 'published_content',
        text: moderationText,
        metadata: {localId: record.localId, url: record.url},
      });

      moderation = {
        approved: moderationResult.approved,
        severity: moderationResult.severity,
        suggestedAction: moderationResult.suggestedAction,
        flags: (moderationResult.flags || []).map((flag) => flag.type),
      };

      if (moderationResult.details) {
        notes.push(moderationResult.details);
      } else if ((moderationResult.flags || []).length > 0) {
        notes.push(`Moderation flags: ${(moderationResult.flags || []).map((flag) => flag.type).join(', ')}`);
      }
    }

    const domainRule = record.url ? findSourcePriorityDomainRule(record.url) : null;
    if (
      domainRule?.rule?.eduValue &&
      this.isValidUseCriteriaSuggestion(domainRule.rule.eduValue) &&
      !existingUseCriteria.has(domainRule.rule.eduValue)
    ) {
      suggestedUseCriteria.add(domainRule.rule.eduValue);
      enrichmentReasons.push(domainRule.rule.shortReason);
    }

    for (const topic of domainRule?.rule?.topics || []) {
      if (this.isValidUseCriteriaSuggestion(topic) && !existingUseCriteria.has(topic)) {
        suggestedUseCriteria.add(topic);
      }
    }

    let resourceInfo: ResourceFetchInfoResponse | null = null;
    if (record.url && getYTResourceTypeFromURL(record.url)) {
      try {
        resourceInfo = await this.externalDataService.getResourceInfo({url: record.url});
      } catch {
        resourceInfo = null;
      }

      if (resourceInfo?.meta?.madeForKids === true && !existingUseCriteria.has('ta_kids')) {
        suggestedUseCriteria.add('ta_kids');
        enrichmentReasons.push('YouTube metadata marks this content as made for kids.');
      }

      if (resourceInfo?.meta?.ageRestricted === true) {
        notes.push('YouTube metadata marks this content as age-restricted.');
      }
    }

    if ((record.useCriteria || []).length === 0 && suggestedUseCriteria.size === 0 && record.type !== 'col') {
      notes.push('No useCriteria supplied. Review audience and educational intent before execute.');
    }

    const advisoryStatus = this.getAdvisoryStatus({
      moderationSeverity: moderation?.severity || ModerationSeverity.NONE,
      suggestedUseCriteriaCount: suggestedUseCriteria.size,
      notes,
      resourceInfo,
    });

    if (advisoryStatus === 'clear') {
      return null;
    }

    return {
      status: advisoryStatus,
      notes,
      moderation,
      enrichment: {
        suggestedUseCriteria: [...suggestedUseCriteria],
        reasons: [...new Set(enrichmentReasons)],
        resourceHints: resourceInfo
          ? {
              rtype: resourceInfo.rtype || null,
              hasLookupData: !!resourceInfo.meta,
              madeForKids: resourceInfo.meta?.madeForKids || false,
              ageRestricted: resourceInfo.meta?.ageRestricted || false,
            }
          : null,
      },
    };
  }

  private buildPublishedExternalLookup(
    advisory: AdminContentLoaderAdvisory | null | undefined,
  ): PublishedExternalLookupInfo | null {
    const resourceHints = advisory?.enrichment?.resourceHints;
    if (!resourceHints?.rtype || resourceHints.hasLookupData !== true) {
      return null;
    }

    return {
      resourceType: resourceHints.rtype,
      ageRestricted: resourceHints.ageRestricted === true,
      madeForKids: resourceHints.madeForKids === true,
      source: 'content_loader',
    };
  }

  private buildRecordPayload(
    record: AdminContentLoaderManifestRecord,
    publishId: string,
    existing: Published | null,
    now: Date,
    advisory?: AdminContentLoaderAdvisory | null,
    resolvedAssets?: {
      imageFilename?: string | null;
      attachments?: {entries: ItemAttachment[]} | null;
    },
    importOptions?: ImportOptions,
  ): Published {
    const nextData = {
      ...(existing?.data || {}),
      ...(record.data || {}),
    } as Record<string, any>;
    if (record.url) {
      nextData.url = record.url;
    }

    const nextMeta = {
      ...(existing?.meta || {}),
      ...(record.meta || {}),
    } as Record<string, any>;
    if (record.url && !nextMeta.url) {
      nextMeta.url = record.url;
    }

    const processingInfo = this.buildPostImportProcessingInfo(
      now,
      initialImportProcessingState(record.type, record.url),
      importOptions?.batch,
    );

    // Creates default to inactive so they flow through the review pipeline;
    // updates never silently unpublish an already-live record.
    const nextPublished =
      importOptions?.importVisibility === 'live'
        ? record.published
        : existing
          ? (existing.published ?? false)
          : false;
    const nextInfo = setPostImportProcessingOnInfo(
      setPublishedExternalLookupOnInfo(
        (this.normalizeObject(existing?.info) || {}) as any,
        this.buildPublishedExternalLookup(advisory),
      ),
      processingInfo,
    );

    const payload: Published = {
      ...(existing || {}),
      _id: publishId,
      key: record.url ? urlToKey(record.url) : existing?.key,
      type: record.type as any,
      name: record.name,
      description: record.description || null,
      sourceItemId: record.sourceItemId || existing?.sourceItemId || null,
      categories: record.categories,
      useCriteria: record.useCriteria,
      updatedAt: now,
      published: nextPublished,
      easyId: record.easyId || existing?.easyId || null,
      data: Object.keys(nextData).length > 0 ? nextData : null,
      meta: Object.keys(nextMeta).length > 0 ? nextMeta : null,
      info: Object.keys(nextInfo).length > 0 ? nextInfo : null,
      tableGroup: existing?.tableGroup || 'info',
      visibilityCode: existing?.visibilityCode ?? 2,
      excludeFromSearch: existing?.excludeFromSearch ?? false,
      imageFilename:
        resolvedAssets?.imageFilename !== undefined ? resolvedAssets.imageFilename : (record.imageFilename ?? existing?.imageFilename ?? null),
      attachments:
        resolvedAssets?.attachments !== undefined ? resolvedAssets.attachments : (record.attachments ? {entries: record.attachments as ItemAttachment[]} : (existing?.attachments || null)),
      ownerUserId: null,
      publicUserId: OFFICIAL_PUBLISHER_PUBLIC_ID,
      username: OFFICIAL_PUBLISHER_USERNAME,
      curationStatus: existing?.curationStatus || null,
      curated: existing?.curated ?? false,
      curatedDate: existing?.curatedDate || null,
      curatorId: existing?.curatorId || null,
      curatorComment: existing?.curatorComment || null,
      itemCount: record.type === 'col' ? record.childLocalIds.length : (existing?.itemCount ?? 0),
      createdAt: existing?.createdAt || now,
    };

    publishedItemSchemaUpdater(payload);
    return payload;
  }

  private buildPostImportProcessingInfo(
    now: Date,
    state: PostImportProcessingState = 'pending_metadata',
    batch?: ImportBatchInfo,
  ): PostImportProcessingInfo {
    const iso = now.toISOString();
    return {
      state,
      source: 'admin_content_loader',
      importedAt: iso,
      updatedAt: iso,
      lastError: null,
      ...(batch
        ? {
            batchId: batch.batchId,
            batchLabel: batch.batchLabel,
            batchSource: batch.batchSource,
          }
        : {}),
    };
  }

  private createImportBatchId(now: Date): string {
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `imp_${datePart}-${uuidv4().slice(0, 8)}`;
  }

  private hasMeaningfulString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private recordHasFieldValue(record: AdminContentLoaderManifestRecord, field: string): boolean {
    if (field === 'description') {
      return this.hasMeaningfulString(record.description);
    }
    if (field === 'categories') {
      return (record.categories || []).length > 0;
    }
    if (field === 'useCriteria') {
      return (record.useCriteria || []).length > 0;
    }
    if (field === 'meta.title') {
      return this.hasMeaningfulString(record.meta?.title);
    }
    if (field === 'meta.siteName') {
      return this.hasMeaningfulString(record.meta?.siteName);
    }
    if (field === 'meta.imageSrc') {
      return this.hasMeaningfulString(record.meta?.imageSrc);
    }
    return false;
  }

  private getSuggestedStringArray(
    record: AdminContentLoaderManifestRecord,
    patches: AdminContentLoaderEnrichmentPatch[],
    field: 'categories' | 'useCriteria',
  ): string[] {
    const values = new Set(field === 'categories' ? record.categories || [] : record.useCriteria || []);

    for (const patch of patches) {
      if (patch.field !== field || patch.operation !== 'merge' || !Array.isArray(patch.value)) continue;
      for (const entry of patch.value) {
        if (typeof entry !== 'string' || !entry.trim()) continue;
        values.add(entry.trim());
      }
    }

    return [...values];
  }

  private addSetPatch(
    record: AdminContentLoaderManifestRecord,
    patches: AdminContentLoaderEnrichmentPatch[],
    input: {
      field: string;
      value: string | null | undefined;
      source: AdminContentLoaderEnrichmentPatch['source'];
      reason: string;
      confidence?: number | null;
    },
  ) {
    if (!this.hasMeaningfulString(input.value) || this.recordHasFieldValue(record, input.field)) {
      return;
    }

    if (patches.some((patch) => patch.field === input.field && patch.operation === 'set')) {
      return;
    }

    patches.push({
      field: input.field,
      operation: 'set',
      source: input.source,
      value: input.value.trim(),
      reason: input.reason,
      confidence: input.confidence ?? null,
    });
  }

  private addMergePatch(
    record: AdminContentLoaderManifestRecord,
    patches: AdminContentLoaderEnrichmentPatch[],
    input: {
      field: 'categories' | 'useCriteria';
      values: string[];
      source: AdminContentLoaderEnrichmentPatch['source'];
      reason: string;
      confidence?: number | null;
    },
  ) {
    const existing = new Set(this.getSuggestedStringArray(record, patches, input.field));
    const additions = this.normalizeStringArray(input.values).filter((value) => !existing.has(value));
    if (additions.length === 0) {
      return;
    }

    patches.push({
      field: input.field,
      operation: 'merge',
      source: input.source,
      value: additions,
      reason: input.reason,
      confidence: input.confidence ?? null,
    });
  }

  private needsAiGapFill(record: AdminContentLoaderManifestRecord, patches: AdminContentLoaderEnrichmentPatch[]): boolean {
    return (
      this.getSuggestedStringArray(record, patches, 'categories').length === 0 ||
      this.getSuggestedStringArray(record, patches, 'useCriteria').length === 0
    );
  }

  private async buildEnrichmentForRecord(
    record: AdminContentLoaderManifestRecord | null,
    advisory: AdminContentLoaderAdvisory | null | undefined,
  ): Promise<{verification: AdminContentLoaderEnrichRowResult['verification']; patches: AdminContentLoaderEnrichmentPatch[]}> {
    const patches: AdminContentLoaderEnrichmentPatch[] = [];
    const checkedUrl = record?.url || null;

    const verification: AdminContentLoaderEnrichRowResult['verification'] = {
      status: checkedUrl ? 'checked' : 'skipped',
      checkedUrl,
      resourceType: null,
      hasMetadata: false,
      notes: checkedUrl ? [] : ['No URL available for verification.'],
    };

    if (!record?.url) {
      return {verification, patches};
    }

    let fetchedMeta: ItemMeta | null = null;

    try {
      const [metaResponse, resourceInfo] = await Promise.all([
        this.externalDataService.fetchMetadata(record.url),
        this.externalDataService.getResourceInfo({url: record.url}),
      ]);

      fetchedMeta = metaResponse && Object.keys(metaResponse).length > 0 ? (metaResponse as ItemMeta) : null;
      verification.resourceType = resourceInfo?.rtype || null;
      verification.hasMetadata = !!fetchedMeta;

      if (!fetchedMeta) {
        verification.notes.push('No metadata extracted.');
      }
      if (resourceInfo?.meta?.ageRestricted === true) {
        verification.notes.push('Resource is age-restricted.');
      }
      if (resourceInfo?.meta?.madeForKids === true) {
        verification.notes.push('Resource is made for kids.');
      }

      this.addSetPatch(record, patches, {
        field: 'description',
        value: fetchedMeta?.description,
        source: 'metadata',
        reason: 'Filled missing description from fetched metadata.',
      });
      this.addSetPatch(record, patches, {
        field: 'meta.title',
        value: fetchedMeta?.title,
        source: 'metadata',
        reason: 'Saved extracted metadata title.',
      });
      this.addSetPatch(record, patches, {
        field: 'meta.siteName',
        value: fetchedMeta?.siteName,
        source: 'metadata',
        reason: 'Saved extracted site name.',
      });
      this.addSetPatch(record, patches, {
        field: 'meta.imageSrc',
        value: fetchedMeta?.imageSrc,
        source: 'metadata',
        reason: 'Saved extracted image URL.',
      });
    } catch (error: any) {
      verification.status = 'failed';
      verification.hasMetadata = false;
      verification.notes = [error?.message || 'Verification failed.'];
      return {verification, patches};
    }

    const deterministicUseCriteria = advisory?.enrichment?.suggestedUseCriteria || [];
    if (deterministicUseCriteria.length > 0) {
      this.addMergePatch(record, patches, {
        field: 'useCriteria',
        values: deterministicUseCriteria,
        source: 'deterministic',
        reason: (advisory?.enrichment?.reasons || []).join(' ') || 'Applied deterministic source rules.',
      });
    }

    if (this.needsAiGapFill(record, patches)) {
      try {
        const classification = await this.externalDataService.contentClassification(RequestContext.instanceForSystem(), {
          url: record.url,
          features: {
            title: fetchedMeta?.title || record.name,
            description: record.description || fetchedMeta?.description || '',
          },
        });

        const aiCategories = (classification.details?.categories || [])
          .map((entry) => entry?.value)
          .filter((value): value is string => typeof value === 'string' && value.startsWith('cat_'));
        this.addMergePatch(record, patches, {
          field: 'categories',
          values: aiCategories,
          source: 'ai',
          reason: classification.details?.shortReason || 'AI suggested missing categories.',
          confidence: classification.confidence ?? null,
        });

        const aiUseCriteria = [classification.details?.eduValue?.value, ...(classification.details?.topics || []).map((entry) => entry?.value)]
          .filter((value): value is string => this.isValidUseCriteriaSuggestion(value));
        this.addMergePatch(record, patches, {
          field: 'useCriteria',
          values: aiUseCriteria,
          source: 'ai',
          reason: classification.details?.shortReason || 'AI suggested missing audience tags.',
          confidence: classification.confidence ?? null,
        });
      } catch {
        // Best-effort AI gap fill should not fail the enrich pass.
      }
    }

    return {verification, patches};
  }

  private createPublishId(type: string): string {
    return `pub_${type}-${uuidv4()}`;
  }

  async uploadAsset(
    ctx: RequestContext,
    data: AdminContentLoaderUploadAssetRequest,
  ): Promise<AdminContentLoaderUploadAssetResponse> {
    const ownerLocalId = this.normalizeString(data?.ownerLocalId);
    const filename = this.normalizeString(data?.filename);
    const fileType = this.normalizeString(data?.fileType);
    const fileData = this.normalizeString(data?.fileData);

    if (!ownerLocalId) {
      throw new Error('ownerLocalId is required.');
    }
    if (!filename) {
      throw new Error('filename is required.');
    }
    if (!fileType) {
      throw new Error('fileType is required.');
    }
    if (!fileData) {
      throw new Error('fileData is required.');
    }

    const assetId = `cla_${uuidv4()}`;
    const fileRef = await this.userFileService.uploadFile(ctx, {
      refId: assetId,
      refType: 'admin_content_loader_asset',
      filename,
      fileType,
      fileData,
      encInfo: null,
    });

    return {
      asset: {
        assetId,
        ownerLocalId,
        kind: this.normalizeAssetKind(data?.kind),
        filename,
        fileType,
        tempUploadId: fileRef._id,
        remoteUrl: null,
        meta: null,
      },
    };
  }

  private buildAssetMap(assets: AdminContentLoaderManifestAsset[]): {
    assetById: Map<string, AdminContentLoaderManifestAsset>;
    assetIdCounts: Map<string, number>;
  } {
    const assetById = new Map<string, AdminContentLoaderManifestAsset>();
    const assetIdCounts = new Map<string, number>();

    for (const asset of assets) {
      assetIdCounts.set(asset.assetId, (assetIdCounts.get(asset.assetId) || 0) + 1);
      if (!assetById.has(asset.assetId)) {
        assetById.set(asset.assetId, asset);
      }
    }

    return {assetById, assetIdCounts};
  }

  private buildAssetIssues(
    record: AdminContentLoaderManifestRecord,
    knownLocalIds: Set<string>,
    assetById: Map<string, AdminContentLoaderManifestAsset>,
    assetIdCounts: Map<string, number>,
  ): string[] {
    const issues: string[] = [];

    for (const [assetId, count] of assetIdCounts.entries()) {
      if (count > 1 && ((record.imageAssetId && record.imageAssetId === assetId) || (record.attachments || []).some((attachment) => attachment.assetId === assetId))) {
        issues.push(`Asset id ${assetId} must be unique within the manifest.`);
      }
    }

    const imageAssetId = this.normalizeOptionalString(record.imageAssetId);
    if (imageAssetId) {
      const asset = assetById.get(imageAssetId);
      if (!asset) {
        issues.push(`Missing image asset ${imageAssetId}.`);
      } else {
        if (!asset.ownerLocalId || !knownLocalIds.has(asset.ownerLocalId)) {
          issues.push(`Asset ${imageAssetId} references unknown ownerLocalId ${asset.ownerLocalId || '(missing)'}.`);
        }
        if (asset.ownerLocalId !== record.localId) {
          issues.push(`Image asset ${imageAssetId} must belong to ${record.localId}.`);
        }
        if (asset.kind !== 'banner_image') {
          issues.push(`Image asset ${imageAssetId} must use kind banner_image.`);
        }
        if (!asset.tempUploadId && !asset.remoteUrl) {
          issues.push(`Image asset ${imageAssetId} is missing a supported source.`);
        }
        if (asset.remoteUrl) {
          issues.push(`Remote image assets are not supported yet: ${imageAssetId}.`);
        }
      }
    }

    for (const attachment of record.attachments || []) {
      if (!attachment.assetId) continue;
      const asset = assetById.get(attachment.assetId);
      if (!asset) {
        issues.push(`Missing attachment asset ${attachment.assetId}.`);
        continue;
      }
      if (!asset.ownerLocalId || !knownLocalIds.has(asset.ownerLocalId)) {
        issues.push(`Asset ${attachment.assetId} references unknown ownerLocalId ${asset.ownerLocalId || '(missing)'}.`);
      }
      if (asset.ownerLocalId !== record.localId) {
        issues.push(`Attachment asset ${attachment.assetId} must belong to ${record.localId}.`);
      }
      if (asset.kind !== 'published_attachment') {
        issues.push(`Attachment asset ${attachment.assetId} must use kind published_attachment.`);
      }
      if (attachment.type !== 'file') {
        issues.push(`Attachment asset ${attachment.assetId} is only supported for file attachments.`);
      }
      if (!asset.tempUploadId && !asset.remoteUrl) {
        issues.push(`Attachment asset ${attachment.assetId} is missing a supported source.`);
      }
      if (asset.remoteUrl) {
        issues.push(`Remote attachment assets are not supported yet: ${attachment.assetId}.`);
      }
    }

    return issues;
  }

  private normalizePublishAttachmentFilename(filename: string | undefined, fallback: string): string {
    const normalized = this.normalizeString(filename).replace(/[\\/]+/g, '-');
    return normalized || fallback;
  }

  private async resolveRecordAssets(
    ctx: RequestContext,
    record: AdminContentLoaderManifestRecord,
    existing: Published | null,
    publishId: string,
    assetById: Map<string, AdminContentLoaderManifestAsset>,
  ): Promise<{
    imageFilename?: string | null;
    attachments?: {entries: ItemAttachment[]} | null;
    importedBannerCount: number;
    importedAttachmentCount: number;
  }> {
    let imageFilename: string | null | undefined = undefined;
    let attachments: {entries: ItemAttachment[]} | null | undefined = undefined;
    let importedBannerCount = 0;
    let importedAttachmentCount = 0;

    if (record.imageAssetId) {
      const asset = assetById.get(record.imageAssetId);
      if (asset?.tempUploadId) {
        imageFilename = await this.publishedFileService.copyUserFilesForPublishingImage(ctx, asset.tempUploadId, 'banner', publishId);
        importedBannerCount += 1;
      }
    } else if (record.imageFilename !== undefined && record.imageFilename !== null) {
      imageFilename = record.imageFilename;
    }

    if (record.attachments) {
      const nextEntries: ItemAttachment[] = [];
      for (const attachment of record.attachments) {
        if (attachment.assetId && attachment.type === 'file') {
          const asset = assetById.get(attachment.assetId);
          if (!asset?.tempUploadId) {
            throw new Error(`Attachment asset ${attachment.assetId} is not ready for import.`);
          }
          const filename = this.normalizePublishAttachmentFilename(
            attachment.filename || asset.filename || undefined,
            `${publishId}-${nextEntries.length + 1}`,
          );
          await this.publishedFileService.copyUserFilesForPublishingAttachment(ctx, asset.tempUploadId, filename, publishId);
          nextEntries.push({
            ...attachment,
            filename,
            fileId: filename,
          });
          importedAttachmentCount += 1;
        } else {
          nextEntries.push({...attachment});
        }
      }
      attachments = nextEntries.length > 0 ? {entries: nextEntries} : null;
    } else if (existing?.attachments) {
      attachments = existing.attachments as {entries: ItemAttachment[]} | null;
    }

    return {
      imageFilename,
      attachments,
      importedBannerCount,
      importedAttachmentCount,
    };
  }

  private async updateCollectionRelations(
    relationRepo: PublishedRelationRepo,
    parentId: string,
    childIds: string[],
    now: Date,
  ): Promise<number> {
    const existingRelations = await relationRepo.findMany({parentId} as PublishedRelation);
    const existingIds = new Set(existingRelations.map((relation) => relation._id));
    const desiredIds = new Set<string>();

    for (let index = 0; index < childIds.length; index += 1) {
      const childId = childIds[index];
      const relationId = `${parentId}${KEY_DIL}${childId}`;
      desiredIds.add(relationId);

      const relation: PublishedRelation = {
        _id: relationId,
        parentId,
        itemId: childId,
        order: index,
        updatedAt: now,
        details: {},
      } as PublishedRelation;

      if (existingIds.has(relationId)) {
        await relationRepo.updateWithId(relationId, relation);
      } else {
        await relationRepo.create(relation);
      }
    }

    for (const relation of existingRelations) {
      if (!desiredIds.has(relation._id)) {
        await relationRepo.deleteWithId(relation._id);
      }
    }

    return childIds.length;
  }

  async dryRun(data: AdminContentLoaderDryRunRequest): Promise<AdminContentLoaderDryRunResponse> {
    const manifestText = data?.manifestText || '';
    const parsedManifest = this.parseManifest(manifestText);
    const normalizedRecords = parsedManifest.records;
    const manifestAssets = parsedManifest.assets;
    const localIdCounts = new Map<string, number>();
    normalizedRecords.forEach(({record}) => {
      localIdCounts.set(record.localId, (localIdCounts.get(record.localId) || 0) + 1);
    });

    const knownLocalIds = new Set(normalizedRecords.map(({record}) => record.localId));
    const {assetById, assetIdCounts} = this.buildAssetMap(manifestAssets);
    const results = [] as AdminContentLoaderDryRunResponse['results'];

    for (const {record, issues: recordIssues} of normalizedRecords) {
      const validationIssues = [...recordIssues];

      if ((localIdCounts.get(record.localId) || 0) > 1) {
        validationIssues.push('localId must be unique within the manifest.');
      }

      if (record.type === 'col') {
        for (const childLocalId of record.childLocalIds) {
          if (childLocalId === record.localId) {
            validationIssues.push('Collection cannot reference itself in childLocalIds.');
          } else if (!knownLocalIds.has(childLocalId)) {
            validationIssues.push(`Unknown childLocalId: ${childLocalId}`);
          }
        }
      }

      validationIssues.push(...this.buildAssetIssues(record, knownLocalIds, assetById, assetIdCounts));

      const signalValues: Record<MatchSignal, string | undefined> = {
        itemId: record.itemId,
        easyId: record.easyId,
        sourceItemId: record.sourceItemId,
        url: record.url,
      };

      const signalMatches: Record<MatchSignal, string[]> = {
        itemId: [],
        easyId: [],
        sourceItemId: [],
        url: [],
      };
      const previewById = new Map<string, AdminContentLoaderMatchPreview>();

      for (const signal of ['itemId', 'easyId', 'sourceItemId', 'url'] as MatchSignal[]) {
        const value = signalValues[signal];
        if (!value) continue;

        const matches = await this.findBySignal(signal, value);
        signalMatches[signal] = matches.map((match) => match._id).filter((id): id is string => !!id);

        for (const match of matches) {
          if (!match._id || previewById.has(match._id)) continue;
          previewById.set(match._id, this.toMatchPreview(match));
        }
      }

      const matchedPublishedIds = [...previewById.keys()];
      const matchIssues = this.buildMatchIssues(record, signalMatches, matchedPublishedIds);
      const decision = this.getDecision(validationIssues, matchIssues, matchedPublishedIds);
      const advisory = await this.buildAdvisory(record);

      results.push({
        localId: record.localId,
        decision,
        issues: [...validationIssues, ...matchIssues],
        matchedPublishedIds,
        matchedRecords: [...previewById.values()],
        normalizedRecord: record,
        advisory,
      });
    }

    const manifest: AdminContentLoaderManifest = {
      records: normalizedRecords.map(({record}) => record),
      assets: manifestAssets,
    };

    return {
      manifestHash: this.getManifestHash(manifestText),
      manifest,
      summary: {
        totalRecords: results.length,
        createCount: results.filter((result) => result.decision === 'create').length,
        updateCount: results.filter((result) => result.decision === 'update').length,
        conflictCount: results.filter((result) => result.decision === 'conflict').length,
        invalidCount: results.filter((result) => result.decision === 'invalid').length,
        advisorySuggestedCount: results.filter((result) => result.advisory?.status === 'suggested').length,
        advisoryReviewCount: results.filter((result) => result.advisory?.status === 'review').length,
        advisoryWarningCount: results.filter((result) => result.advisory?.status === 'warning').length,
      },
      results,
    };
  }

  async execute(
    data: AdminContentLoaderExecuteRequest,
    ctx: RequestContext = RequestContext.instanceForSystem(),
  ): Promise<AdminContentLoaderExecuteResponse> {
    const expectedManifestHash = this.normalizeOptionalString(data?.expectedManifestHash);
    const actualManifestHash = this.getManifestHash(data?.manifestText || '');
    if (expectedManifestHash && expectedManifestHash !== actualManifestHash) {
      throw new Error('Manifest changed after review. Run dry run or enrich again before execute.');
    }

    const dryRun = await this.dryRun({manifestText: data?.manifestText || ''});
    const blockingRows = dryRun.results.filter(
      (result) => result.decision === 'conflict' || result.decision === 'invalid',
    );

    if (blockingRows.length > 0) {
      const preview = blockingRows
        .slice(0, 3)
        .map((row) => `${row.localId}: ${row.issues.join(' ')}`)
        .join(' | ');
      throw new Error(`Resolve all conflict and invalid rows before execute. ${preview}`.trim());
    }

    const eligibleRows = dryRun.results.filter(
      (result) => result.decision === 'create' || result.decision === 'update',
    );
    const selectedLocalIdSet = new Set(
      (data?.selectedLocalIds || []).map((value) => this.normalizeString(value)).filter(Boolean),
    );
    const rowsToExecute =
      selectedLocalIdSet.size > 0
        ? eligibleRows.filter((result) => selectedLocalIdSet.has(result.localId))
        : eligibleRows;

    if (rowsToExecute.length === 0) {
      throw new Error('Select at least one create or update row before execute.');
    }

    const executableLocalIds = new Set(rowsToExecute.map((result) => result.localId));
    for (const result of rowsToExecute) {
      const record = result.normalizedRecord;
      if (!record || record.type !== 'col') continue;

      for (const childLocalId of record.childLocalIds) {
        if (!executableLocalIds.has(childLocalId)) {
          throw new Error(`Selected collection ${record.localId} also requires child ${childLocalId}.`);
        }
      }
    }

    const now = new Date();
    const importOptions: ImportOptions = {
      importVisibility: data?.importVisibility === 'live' ? 'live' : 'inactive',
      batch: {
        batchId: this.createImportBatchId(now),
        batchLabel: this.normalizeOptionalString(data?.batchLabel) || null,
        batchSource: 'manifest',
      },
    };
    const trx = await this.published.createTransaction();
    const publishedRepo = new PublishedRepo(trx as any);
    const relationRepo = new PublishedRelationRepo(trx as any);
    const localIdToPublishId = new Map<string, string>();
    const executionResults: AdminContentLoaderExecuteResponse['results'] = [];
    const moderationCandidates: Array<{
      action: 'created' | 'updated';
      localId: string;
      published: Pick<
        Published,
        '_id' | 'type' | 'name' | 'description' | 'data' | 'imageFilename' | 'publishType' | 'visibilityCode'
      > & {published?: boolean | null};
      manifest: AdminContentLoaderManifestRecord;
    }> = [];
    let relationCount = 0;
    let importedBannerCount = 0;
    let importedAttachmentCount = 0;
    const assetById = new Map((dryRun.manifest.assets || []).map((asset) => [asset.assetId, asset] as const));

    try {
      for (const result of rowsToExecute) {
        const record = result.normalizedRecord;
        if (!record) continue;

        const existingId = result.matchedPublishedIds[0] || null;
        const publishId = existingId || this.createPublishId(record.type);
        const existing = existingId
          ? ((await publishedRepo.query().where({_id: existingId}).first()) as Published | undefined) || null
          : null;
        const resolvedAssets = await this.resolveRecordAssets(ctx, record, existing, publishId, assetById);
        const payload = this.buildRecordPayload(
          record,
          publishId,
          existing,
          now,
          result.advisory,
          {
            imageFilename: resolvedAssets.imageFilename,
            attachments: resolvedAssets.attachments,
          },
          importOptions,
        );

        if (existing) {
          await publishedRepo.updateWithId(publishId, payload);
        } else {
          await publishedRepo.create(payload);
        }

        moderationCandidates.push({
          action: existing ? 'updated' : 'created',
          localId: record.localId,
          published: {
            _id: publishId,
            type: payload.type,
            name: payload.name,
            description: payload.description,
            data: payload.data,
            imageFilename: payload.imageFilename,
            publishType: payload.publishType,
            visibilityCode: payload.visibilityCode,
            published: payload.published,
          },
          manifest: record,
        });

        localIdToPublishId.set(record.localId, publishId);
        importedBannerCount += resolvedAssets.importedBannerCount;
        importedAttachmentCount += resolvedAssets.importedAttachmentCount;
        executionResults.push({
          localId: record.localId,
          publishId,
          action: existing ? 'updated' : 'created',
          type: record.type,
          name: record.name,
          processingState: initialImportProcessingState(record.type, record.url),
          importedAssetCount: resolvedAssets.importedBannerCount + resolvedAssets.importedAttachmentCount,
        });
      }

      for (const result of rowsToExecute) {
        const record = result.normalizedRecord;
        if (!record || record.type !== 'col') continue;

        const parentId = localIdToPublishId.get(record.localId);
        if (!parentId) {
          throw new Error(`Missing publishId for collection ${record.localId}`);
        }

        const childIds = record.childLocalIds.map((childLocalId) => {
          const childId = localIdToPublishId.get(childLocalId);
          if (!childId) {
            throw new Error(`Missing publishId for child ${childLocalId}`);
          }
          return childId;
        });

        relationCount += await this.updateCollectionRelations(relationRepo, parentId, childIds, now);
        await publishedRepo.updateWithId(parentId, {
          itemCount: childIds.length,
          updatedAt: now,
        } as Published);
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    const categories = executionResults.flatMap((entry) => {
      const row = rowsToExecute.find((result) => result.localId === entry.localId)?.normalizedRecord;
      return row?.categories || [];
    });

    const urls = executionResults.flatMap((entry) => {
      const row = rowsToExecute.find((result) => result.localId === entry.localId)?.normalizedRecord;
      return row?.url ? [row.url] : [];
    });

    if (categories.length > 0) {
      await this.itemService.updateAvailCategories([...new Set(categories)]);
    }

    for (const url of [...new Set(urls)]) {
      await this.externalMetaCacheService.invalidateByUrl(url);
    }

    this.reportLoaderModeration(RequestContext.instanceForSystem(), moderationCandidates).catch(() => undefined);

    return {
      summary: {
        createdCount: executionResults.filter((row) => row.action === 'created').length,
        updatedCount: executionResults.filter((row) => row.action === 'updated').length,
        relationCount,
        pendingProcessingCount: executionResults.filter((row) => row.processingState === 'pending_metadata').length,
        importedBannerCount,
        importedAttachmentCount,
        batchId: importOptions.batch.batchId,
      },
      dryRun,
      results: executionResults,
    };
  }

  private publishedToManifestRecord(item: Published): AdminContentLoaderManifestRecord {
    return {
      localId: item._id || '',
      itemId: item._id || undefined,
      easyId: item.easyId || undefined,
      sourceItemId: item.sourceItemId || undefined,
      type: item.type || '',
      name: item.name || '',
      description: this.normalizeOptionalString(item.description),
      url: this.normalizeURL(item.data?.url) || this.normalizeURL(item.meta?.url),
      categories: this.normalizeStringArray(item.categories),
      useCriteria: this.normalizeStringArray(item.useCriteria),
      childLocalIds: [],
      imageAssetId: null,
      imageFilename: item.imageFilename || null,
      data: this.normalizeObject(item.data),
      meta: this.normalizeObject(item.meta),
      published: item.published === true,
    };
  }

  async enrichPublishedItems(data: AdminPublishedEnrichRequest): Promise<AdminPublishedEnrichResponse> {
    const itemIds = [...new Set((data?.itemIds || []).map((value) => this.normalizeString(value)).filter(Boolean))];
    if (itemIds.length === 0) {
      throw new Error('itemIds is required.');
    }
    if (itemIds.length > 25) {
      throw new Error('Enrich at most 25 items per request.');
    }

    const results: AdminPublishedEnrichItemResult[] = [];
    for (const itemId of itemIds) {
      const item = ((await this.published.query().where({_id: itemId}).first()) as Published | undefined) || null;
      if (!item) {
        results.push({
          itemId,
          name: '',
          verification: {
            status: 'failed',
            checkedUrl: null,
            resourceType: null,
            hasMetadata: false,
            notes: ['Published item not found.'],
          },
          patches: [],
        });
        continue;
      }

      const record = this.publishedToManifestRecord(item);
      const advisory = await this.buildAdvisory(record);
      const enrichment = await this.buildEnrichmentForRecord(record, advisory);
      results.push({
        itemId,
        name: item.name || '',
        verification: enrichment.verification,
        patches: enrichment.patches,
      });
    }

    return {
      summary: {
        requestedCount: itemIds.length,
        enrichedCount: results.filter((result) => result.verification.status === 'checked').length,
        patchCount: results.reduce((sum, result) => sum + result.patches.length, 0),
      },
      results,
    };
  }

  async applyEnrichmentPatches(data: AdminPublishedApplyPatchesRequest): Promise<AdminPublishedApplyPatchesResponse> {
    const itemId = this.normalizeString(data?.itemId);
    if (!itemId) {
      throw new Error('itemId is required.');
    }
    const patches = Array.isArray(data?.patches) ? data.patches : [];
    if (patches.length === 0) {
      throw new Error('patches is required.');
    }

    const item = ((await this.published.query().where({_id: itemId}).first()) as Published | undefined) || null;
    if (!item) {
      throw new Error(`Published item not found: ${itemId}`);
    }

    const nextMeta = {...((item.meta as Record<string, any>) || {})};
    let nextDescription = item.description ?? null;
    const categories = new Set(this.normalizeStringArray(item.categories));
    const useCriteria = new Set(this.normalizeStringArray(item.useCriteria));
    let appliedCount = 0;

    for (const patch of patches) {
      const field = this.normalizeString(patch?.field);
      if (patch?.operation === 'set' && this.hasMeaningfulString(patch.value)) {
        const value = (patch.value as string).trim();
        if (field === 'description') {
          nextDescription = value;
        } else if (field === 'meta.title') {
          nextMeta.title = value;
        } else if (field === 'meta.siteName') {
          nextMeta.siteName = value;
        } else if (field === 'meta.imageSrc') {
          nextMeta.imageSrc = value;
        } else {
          throw new Error(`Unsupported patch field: ${field || '(missing)'}`);
        }
        appliedCount += 1;
      } else if (patch?.operation === 'merge' && Array.isArray(patch.value)) {
        const values = this.normalizeStringArray(patch.value);
        if (field === 'categories') {
          values.forEach((value) => categories.add(value));
        } else if (field === 'useCriteria') {
          values.forEach((value) => useCriteria.add(value));
        } else {
          throw new Error(`Unsupported merge patch field: ${field || '(missing)'}`);
        }
        appliedCount += 1;
      } else {
        throw new Error(`Unsupported patch operation for field: ${field || '(missing)'}`);
      }
    }

    const now = new Date();
    const iso = now.toISOString();
    const prevProcessing = ((item.info as any)?.postImportProcessing || {}) as Partial<PostImportProcessingInfo>;
    // 'approved' is terminal: enriching an already-approved live item must not
    // pull it back into the review queues.
    const markState: PostImportProcessingState =
      prevProcessing.state === 'approved' ? 'approved' : data?.markState || 'ready';
    const nextInfo = setPostImportProcessingOnInfo((this.normalizeObject(item.info) || {}) as any, {
      ...prevProcessing,
      state: markState,
      source: prevProcessing.source || 'admin_content_loader',
      updatedAt: iso,
      lastCompletedAt: iso,
      lastError: null,
    });

    const payload: Published = {
      ...item,
      description: nextDescription,
      categories: [...categories],
      useCriteria: [...useCriteria],
      meta: Object.keys(nextMeta).length > 0 ? nextMeta : null,
      info: nextInfo,
      updatedAt: now,
    };
    await this.published.updateWithId(itemId, payload);

    if (categories.size > 0) {
      await this.itemService.updateAvailCategories([...categories]);
    }
    const url = this.normalizeURL(item.data?.url) || this.normalizeURL(item.meta?.url);
    if (url) {
      await this.externalMetaCacheService.invalidateByUrl(url);
    }

    return {
      itemId,
      appliedCount,
      item: payload,
    };
  }

  private async reportLoaderModeration(
    ctx: RequestContext,
    moderationCandidates: Array<{
      action: 'created' | 'updated';
      localId: string;
      published: Pick<
        Published,
        '_id' | 'type' | 'name' | 'description' | 'data' | 'imageFilename' | 'publishType' | 'visibilityCode'
      > & {published?: boolean | null};
      manifest: AdminContentLoaderManifestRecord;
    }>,
  ): Promise<void> {
    for (const candidate of moderationCandidates) {
      if (!candidate.published.published) continue;

      await this.publishedModerationReporter
        .reportIfNeeded(
          ctx,
          {
            _id: candidate.published._id,
            type: candidate.published.type,
            name: candidate.published.name,
            description: candidate.published.description,
            data: candidate.published.data,
            imageFilename: candidate.published.imageFilename,
            publishType: candidate.published.publishType,
            visibilityCode: candidate.published.visibilityCode,
          },
          {
            sourceMode: 'admin_content_loader',
            localId: candidate.localId,
            action: candidate.action,
            type: candidate.manifest.type,
            url: candidate.manifest.url,
            sourceItemId: candidate.manifest.sourceItemId,
            easyId: candidate.manifest.easyId,
            childLocalIds: candidate.manifest.childLocalIds,
          },
          {source: 'contentLoaderExecute'},
        )
        .catch(() => undefined);
    }
  }
}

export default ContentLoaderService;
