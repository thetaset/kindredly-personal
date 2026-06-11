import {PublishedRepo} from '@/db/published.repo';
import {PublishedRelationRepo} from '@/db/publish_relation.repo';
import {KEY_DIL} from '@/templates/email.templates';
import {streamToBase64} from '@/utils/binary_utils';
import JSZip from 'jszip';
import path from 'path';
import {createHash} from 'crypto';
import type {
  AdminPublishedPackageAsset,
  AdminPublishedPackageAttachmentEntry,
  AdminPublishedPackageDataManifest,
  AdminPublishedPackageExportRequest,
  AdminPublishedPackageExportResponse,
  AdminPublishedPackageImportRequest,
  AdminPublishedPackageImportResponse,
  AdminPublishedPackageImportRowResult,
  AdminPublishedPackageRecord,
  AdminPublishedPackageRelation,
} from 'tset-sharedlib/api';
import type Published from 'tset-sharedlib/schemas/public/Published';
import type PublishedRelation from 'tset-sharedlib/schemas/public/PublishedRelation';
import type {FilePreview, ItemAttachment} from 'tset-sharedlib/shared.types';
import {
  initialImportProcessingState,
  setPostImportProcessingOnInfo,
  type PostImportProcessingInfo,
} from 'tset-sharedlib/types/item.types';
import {OFFICIAL_PUBLISHER_PUBLIC_ID, OFFICIAL_PUBLISHER_USERNAME} from 'tset-sharedlib/constants';
import {urlToKey} from 'tset-sharedlib/text.utils';
import {v4 as uuidv4} from 'uuid';
import {publishedItemSchemaUpdater} from './_internal/internal_published.service';
import {PublishedFileService} from './_internal/published_file.service';
import {PublishedModerationReporter} from './_internal/published_moderation_reporter.service';
import {RequestContext} from '../base/request_context';

class ImportExportService {
  private published = new PublishedRepo();
  private publishedRelations = new PublishedRelationRepo();
  private publishedFileService = new PublishedFileService();
  private publishedModerationReporter = PublishedModerationReporter.instance;

  //
  async exportCollections(_ctx: RequestContext, _options: unknown) {}

  async loadImport(_ctx: RequestContext, _importData: unknown) {}

  async exportPublishedDataPackage(
    request: AdminPublishedPackageExportRequest,
  ): Promise<AdminPublishedPackageExportResponse> {
    const requestedIds = [...new Set((request.publishedIds || []).map((value) => value?.trim()).filter(Boolean))];
    if (requestedIds.length === 0) {
      throw new Error('At least one published id or easyId is required.');
    }

    const includeChildren = request.includeChildren !== false;
    const {records, matchedRequestedRecordIds, foundRequestIds} = await this.collectPublishedRecords(
      requestedIds,
      includeChildren,
    );
    const localIdMap = this.buildLocalIdMap(records);
    const recordIds = records.map((record) => record._id).filter((value): value is string => !!value);
    const relationRows =
      recordIds.length === 0
        ? []
        : await this.publishedRelations
            .query()
            .whereIn('parentId', recordIds)
            .select('*')
            .orderBy('parentId', 'asc')
            .orderBy('order', 'asc')
            .orderBy('_id', 'asc');

    const recordIdSet = new Set(recordIds);
    const assets: AdminPublishedPackageAsset[] = [];
    const manifestRecords = records.map((record) =>
      this.toPackageRecord(record, localIdMap.get(record._id || '') || record._id || 'record', assets),
    );
    const relations = relationRows
      .filter((relation) => !!relation.parentId && !!relation.itemId && recordIdSet.has(relation.itemId))
      .map(
        (relation) =>
          ({
            parentLocalId: localIdMap.get(relation.parentId || '') || relation.parentId || '',
            childLocalId: localIdMap.get(relation.itemId || '') || relation.itemId || '',
            order: typeof relation.order === 'number' ? relation.order : null,
            details: this.cloneValue(relation.details) || null,
            availableAt: this.toIsoString(relation.availableAt),
          }) satisfies AdminPublishedPackageRelation,
      );

    const manifest: AdminPublishedPackageDataManifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: new Date().toISOString(),
      records: manifestRecords,
      relations,
      assets,
    };

    const bundleBase64 = await this.buildPackageBundle(manifest);

    const warnings = requestedIds
      .filter((id) => !foundRequestIds.has(id))
      .map((id) => `Published record not found for ${id}.`);

    return {
      manifest,
      bundleBase64,
      bundleFileName: this.buildPackageBundleFileName(manifest),
      bundleMimeType: 'application/zip',
      summary: {
        requestedCount: requestedIds.length,
        recordCount: manifest.records.length,
        relationCount: manifest.relations.length,
        assetCount: manifest.assets.length,
        childInclusionCount: Math.max(0, manifest.records.length - matchedRequestedRecordIds.size),
      },
      warnings,
    };
  }

  private getPackageRecordIdentityKeys(record: AdminPublishedPackageRecord): string[] {
    const keys: string[] = [];
    if (record.publishId) keys.push(`id:${record.publishId}`);
    if (record.easyId) keys.push(`easy:${record.easyId}`);
    if (record.sourceItemId) keys.push(`src:${record.sourceItemId}`);
    const url = this.getPackageRecordUrl(record);
    if (url) keys.push(`url:${url}`);
    return keys;
  }

  private async planPackageImport(
    manifest: AdminPublishedPackageDataManifest,
  ): Promise<Array<{record: AdminPublishedPackageRecord; existing: Published | null; duplicateOfLocalId: string | null}>> {
    const rows: Array<{record: AdminPublishedPackageRecord; existing: Published | null; duplicateOfLocalId: string | null}> = [];
    // Records later in the package that share an identity with an earlier record
    // must write to the same row, not create a duplicate.
    const seenIdentities = new Map<string, string>();
    for (const record of manifest.records) {
      const identityKeys = this.getPackageRecordIdentityKeys(record);
      const duplicateOfLocalId = identityKeys.map((key) => seenIdentities.get(key)).find(Boolean) || null;
      const existing = duplicateOfLocalId ? null : await this.findExistingPublishedForPackageRecord(record);
      for (const key of identityKeys) {
        if (!seenIdentities.has(key)) {
          seenIdentities.set(key, record.localId);
        }
      }
      rows.push({record, existing, duplicateOfLocalId});
    }
    return rows;
  }

  private buildPackageImportBatchId(now: Date): string {
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `imp_${datePart}-${uuidv4().slice(0, 8)}`;
  }

  async importPublishedDataPackage(
    request: AdminPublishedPackageImportRequest,
  ): Promise<AdminPublishedPackageImportResponse> {
    const {manifest, bundleFilesByAssetId, assetImportMode} = await this.parsePackageImport(request);
    this.validatePackageAssetReferences(manifest, assetImportMode, bundleFilesByAssetId);
    const plannedRows = await this.planPackageImport(manifest);

    if (request.dryRun) {
      return {
        manifest,
        dryRun: true,
        batchId: null,
        summary: {
          createdCount: plannedRows.filter((row) => !row.existing && !row.duplicateOfLocalId).length,
          updatedCount: plannedRows.filter((row) => !!row.existing || !!row.duplicateOfLocalId).length,
          relationCount: manifest.relations.length,
          relationDeletedCount: 0,
          importedBannerCount: 0,
          importedAttachmentCount: 0,
          pendingBannerAssetCount: 0,
          pendingAttachmentCount: 0,
          skippedRelationCount: 0,
        },
        results: plannedRows.map(({record, existing, duplicateOfLocalId}) => ({
          localId: record.localId,
          publishId: existing?._id || null,
          action: existing || duplicateOfLocalId ? 'updated' : 'created',
          type: record.type,
          name: record.name,
          importedAssetCount: 0,
          existingName:
            existing?.name ||
            (duplicateOfLocalId
              ? manifest.records.find((other) => other.localId === duplicateOfLocalId)?.name || duplicateOfLocalId
              : null),
        })),
        warnings: [],
      };
    }

    const assetMap = new Map(manifest.assets.map((asset) => [asset.assetId, asset]));
    const now = new Date();
    const importVisibility = request.importVisibility === 'preserve' ? 'preserve' : 'inactive';
    const batchId = this.buildPackageImportBatchId(now);
    const batchLabel = this.optionalString(request.batchLabel);
    const warnings: string[] = [];
    const publishIdByLocalId = new Map<string, string>();
    const results: AdminPublishedPackageImportRowResult[] = [];
    const liveModerationCandidates: Array<{payload: Published; record: AdminPublishedPackageRecord}> = [];

    let createdCount = 0;
    let updatedCount = 0;
    let importedBannerCount = 0;
    let importedAttachmentCount = 0;
    let pendingBannerAssetCount = 0;
    let pendingAttachmentCount = 0;

    for (const {record, existing, duplicateOfLocalId} of plannedRows) {
      const duplicateTargetId = duplicateOfLocalId ? publishIdByLocalId.get(duplicateOfLocalId) : undefined;
      const publishId = duplicateTargetId || existing?._id || record.publishId || `pub_pkg-${uuidv4()}`;
      const isUpdate = !!existing?._id || !!duplicateTargetId;
      publishIdByLocalId.set(record.localId, publishId);

      const sourceInfo = this.clonePlainObject(record.sourceInfo);
      const nextSourceInfo = sourceInfo && typeof sourceInfo === 'object' ? sourceInfo : {};
      if (nextSourceInfo && typeof nextSourceInfo === 'object') {
        delete nextSourceInfo.packageImport;
      }
      const nextPublishConfig = this.stripPackageImportPublishConfig(record.publishConfig);

      const importedAssets =
        assetImportMode === 'bundle'
          ? await this.materializePackageRecordAssets({
              record,
              publishId,
              assetMap,
              bundleFilesByAssetId,
              warnings,
            })
          : this.stageMetadataOnlyPackageAssets({
              record,
              assetMap,
              nextPublishConfig,
              warnings,
            });

      importedBannerCount += importedAssets.importedBannerCount;
      importedAttachmentCount += importedAssets.importedAttachmentCount;
      pendingBannerAssetCount += importedAssets.pendingBannerAssetCount;
      pendingAttachmentCount += importedAssets.pendingAttachmentCount;

      const url = this.getPackageRecordUrl(record);
      const nextMeta = this.clonePlainObject(record.meta);
      const nextData = this.clonePlainObject(record.data);
      if (url) {
        if (nextData) {
          nextData.url = url;
        }
        if (nextMeta && typeof nextMeta.url !== 'string') {
          nextMeta.url = url;
        }
      }

      const importedInfo = this.clonePlainObject(record.info) || {};
      const manifestProcessing = ((importedInfo as any).postImportProcessing || {}) as Partial<PostImportProcessingInfo>;
      const existingProcessing = ((existing?.info as any)?.postImportProcessing || {}) as Partial<PostImportProcessingInfo>;
      const iso = now.toISOString();
      // Re-imports must not regress an existing row's review state (e.g. knock an
      // approved live item back into the pipeline); only new rows enter fresh.
      const processing: PostImportProcessingInfo = {
        ...(existing ? existingProcessing : manifestProcessing),
        state:
          existingProcessing.state ||
          (importVisibility === 'inactive'
            ? initialImportProcessingState(record.type, url)
            : manifestProcessing.state || 'ready'),
        source: 'admin_package_import',
        importedAt: iso,
        updatedAt: iso,
        ...(existing ? {} : {lastError: null}),
        batchId,
        batchLabel: batchLabel || null,
        batchSource: 'package',
      };
      const nextInfo = setPostImportProcessingOnInfo(importedInfo as any, processing);

      const payload = publishedItemSchemaUpdater({
        ...(existing || {}),
        _id: publishId,
        key: url ? urlToKey(url) : existing?.key || null,
        easyId: record.easyId || existing?.easyId || null,
        sourceItemId: record.sourceItemId || existing?.sourceItemId || null,
        type: record.type as any,
        subType: (record.subType as any) || existing?.subType || null,
        name: record.name,
        description: record.description || null,
        categories: this.normalizeStringArray(record.categories),
        useCriteria: this.normalizeStringArray(record.useCriteria),
        imageFilename: importedAssets.imageFilename,
        published:
          importVisibility === 'preserve'
            ? typeof record.published === 'boolean'
              ? record.published
              : (existing?.published ?? true)
            : existing
              ? (existing.published ?? false)
              : false,
        blockedAt: this.toDate(record.blockedAt),
        blockContext: this.clonePlainObject(record.blockContext),
        visibilityCode:
          typeof record.visibilityCode === 'number' ? record.visibilityCode : (existing?.visibilityCode ?? 2),
        curated: typeof record.curated === 'boolean' ? record.curated : (existing?.curated ?? false),
        curationStatus: record.curationStatus || existing?.curationStatus || null,
        publishType: record.publishType || existing?.publishType || null,
        publishConfig: Object.keys(nextPublishConfig).length > 0 ? nextPublishConfig : null,
        excludeFromSearch:
          typeof record.excludeFromSearch === 'boolean'
            ? record.excludeFromSearch
            : (existing?.excludeFromSearch ?? false),
        curatorComment: record.curatorComment || existing?.curatorComment || null,
        availableAt: this.toDate(record.availableAt),
        data: nextData,
        meta: nextMeta,
        info: nextInfo as any,
        sysInfo: this.clonePlainObject(record.sysInfo) as any,
        sourceInfo: Object.keys(nextSourceInfo).length > 0 ? nextSourceInfo : null,
        attachments: importedAssets.attachments.length > 0 ? {entries: importedAssets.attachments} : null,
        ownerUserId: null,
        publicUserId: OFFICIAL_PUBLISHER_PUBLIC_ID,
        username: OFFICIAL_PUBLISHER_USERNAME,
        updatedAt: now,
        createdAt: existing?.createdAt || now,
      });

      await this.published.create(payload);

      if (isUpdate) {
        updatedCount++;
      } else {
        createdCount++;
      }

      if (payload.published) {
        liveModerationCandidates.push({payload, record});
      }

      results.push({
        localId: record.localId,
        publishId,
        action: isUpdate ? 'updated' : 'created',
        type: record.type,
        name: record.name,
        importedAssetCount: importedAssets.importedBannerCount + importedAssets.importedAttachmentCount,
        existingName: existing?.name || null,
      });
    }

    let relationCount = 0;
    let relationDeletedCount = 0;
    let skippedRelationCount = 0;
    const desiredRelationIdsByParent = new Map<string, Set<string>>();

    for (const relation of manifest.relations) {
      const parentId = publishIdByLocalId.get(relation.parentLocalId);
      const childId = publishIdByLocalId.get(relation.childLocalId);

      if (!parentId || !childId) {
        skippedRelationCount += 1;
        warnings.push(
          `Skipped relation ${relation.parentLocalId} -> ${relation.childLocalId} because one side was missing.`,
        );
        continue;
      }

      const relationId = `${parentId}${KEY_DIL}${childId}`;
      const desiredIds = desiredRelationIdsByParent.get(parentId) || new Set<string>();
      desiredIds.add(relationId);
      desiredRelationIdsByParent.set(parentId, desiredIds);

      await this.publishedRelations.create({
        _id: relationId,
        parentId,
        itemId: childId,
        order: typeof relation.order === 'number' ? relation.order : 0,
        details: this.clonePlainObject(relation.details),
        availableAt: this.toDate(relation.availableAt),
        updatedAt: now,
        createdAt: now,
      } satisfies PublishedRelation);
      relationCount += 1;
    }

    const importedParentIds = manifest.records
      .filter((record) => record.type === 'col')
      .map((record) => publishIdByLocalId.get(record.localId))
      .filter((value): value is string => !!value);

    for (const parentId of importedParentIds) {
      const desiredIds = desiredRelationIdsByParent.get(parentId) || new Set<string>();
      const existingRelations = await this.publishedRelations.query().where({parentId}).select('*');
      for (const existingRelation of existingRelations) {
        if (!existingRelation._id || desiredIds.has(existingRelation._id)) {
          continue;
        }
        await this.publishedRelations.deleteWithId(existingRelation._id);
        relationDeletedCount += 1;
      }
    }

    // Rows that go live through a package import never pass the approve step,
    // so moderation reporting must happen here (best-effort, non-blocking).
    this.reportPackageImportModeration(liveModerationCandidates).catch(() => undefined);

    return {
      manifest,
      dryRun: false,
      batchId,
      summary: {
        createdCount,
        updatedCount,
        relationCount,
        relationDeletedCount,
        importedBannerCount,
        importedAttachmentCount,
        pendingBannerAssetCount,
        pendingAttachmentCount,
        skippedRelationCount,
      },
      results,
      warnings,
    };
  }

  private async reportPackageImportModeration(
    candidates: Array<{payload: Published; record: AdminPublishedPackageRecord}>,
  ): Promise<void> {
    const ctx = RequestContext.instanceForSystem();
    for (const {payload, record} of candidates) {
      await this.publishedModerationReporter
        .reportIfNeeded(
          ctx,
          {
            _id: payload._id,
            type: payload.type,
            name: payload.name,
            description: payload.description,
            data: payload.data,
            imageFilename: payload.imageFilename,
            publishType: payload.publishType,
            visibilityCode: payload.visibilityCode,
          },
          {
            sourceMode: 'admin_package_import',
            localId: record.localId,
            url: this.getPackageRecordUrl(record),
            easyId: record.easyId,
            sourceItemId: record.sourceItemId,
          },
          {source: 'packageImport'},
        )
        .catch(() => undefined);
    }
  }

  private async collectPublishedRecords(requestedIds: string[], includeChildren: boolean) {
    const requestedIdSet = new Set(requestedIds);
    const foundRequestIds = new Set<string>();
    const matchedRequestedRecordIds = new Set<string>();
    const records: Published[] = [];
    const recordsById = new Map<string, Published>();
    const queue = [...requestedIds];

    while (queue.length > 0) {
      const nextId = queue.shift();
      if (!nextId) {
        continue;
      }

      const record = await this.published.findById(nextId);
      if (!record?._id) {
        continue;
      }

      if (requestedIdSet.has(nextId)) {
        foundRequestIds.add(nextId);
        matchedRequestedRecordIds.add(record._id);
      }

      if (recordsById.has(record._id)) {
        continue;
      }

      recordsById.set(record._id, record);
      records.push(record);

      if (!includeChildren) {
        continue;
      }

      const childRelations = await this.publishedRelations.query().where({parentId: record._id}).select('itemId');
      for (const relation of childRelations) {
        if (relation.itemId && !recordsById.has(relation.itemId)) {
          queue.push(relation.itemId);
        }
      }
    }

    return {
      records,
      foundRequestIds,
      matchedRequestedRecordIds,
    };
  }

  private buildLocalIdMap(records: Published[]) {
    const used = new Set<string>();
    const localIdMap = new Map<string, string>();

    for (const record of records) {
      if (!record._id) {
        continue;
      }

      const baseId = (record.easyId || record._id || 'record').trim();
      let localId = baseId;
      let suffix = 2;
      while (used.has(localId)) {
        localId = `${baseId}-${suffix}`;
        suffix += 1;
      }

      used.add(localId);
      localIdMap.set(record._id, localId);
    }

    return localIdMap;
  }

  private toPackageRecord(
    record: Published,
    localId: string,
    assets: AdminPublishedPackageAsset[],
  ): AdminPublishedPackageRecord {
    const imageFilename = typeof record.imageFilename === 'string' ? record.imageFilename.trim() : '';
    let exportedImageFilename: string | null = imageFilename || null;
    let imageAssetId: string | null = null;

    if (imageFilename && !this.isExternalUrl(imageFilename)) {
      imageAssetId = `${localId}::banner`;
      exportedImageFilename = null;
      assets.push({
        assetId: imageAssetId,
        ownerLocalId: localId,
        ownerPublishedId: record._id || null,
        kind: 'banner_image',
        filename: imageFilename,
        sourceRuntimeRef: imageFilename,
        bundlePath: this.buildBannerBundlePath(localId, imageFilename),
        meta: null,
      });
    }

    const attachments = Array.isArray(record.attachments?.entries) ? record.attachments.entries : [];
    const exportedAttachments = attachments.map((attachment, index) => {
      const nextAttachment: AdminPublishedPackageAttachmentEntry = {
        id: attachment.id,
        type: attachment.type,
        filename: attachment.filename,
        fileType: attachment.fileType,
        info: this.clonePlainObject(attachment.info),
        meta: this.clonePlainObject(attachment.meta),
        previews: this.cloneValue(attachment.previews) || undefined,
        encryptedInfo: attachment.encryptedInfo,
        createDate: attachment.createDate,
      };

      if (attachment.type === 'file' && attachment.fileId) {
        const assetId = `${localId}::attachment::${index + 1}`;
        nextAttachment.assetId = assetId;
        assets.push({
          assetId,
          ownerLocalId: localId,
          ownerPublishedId: record._id || null,
          kind: 'published_attachment',
          filename: attachment.filename || null,
          sourceRuntimeRef: attachment.fileId,
          bundlePath: this.buildAttachmentBundlePath(localId, index + 1, attachment.filename || attachment.fileId),
          attachmentId: attachment.id || null,
          fileType: attachment.fileType,
          meta: this.clonePlainObject(attachment.meta),
        });
      } else if (attachment.fileId) {
        nextAttachment.fileId = attachment.fileId;
      }

      return nextAttachment;
    });

    return {
      localId,
      publishId: record._id || null,
      easyId: record.easyId || null,
      sourceItemId: record.sourceItemId || null,
      type: record.type || 'thing',
      subType: record.subType || null,
      name: record.name || localId,
      description: record.description || null,
      url: this.getPublishedUrl(record),
      categories: this.normalizeStringArray(record.categories),
      useCriteria: this.normalizeStringArray(record.useCriteria),
      imageFilename: exportedImageFilename,
      imageAssetId,
      published: typeof record.published === 'boolean' ? record.published : null,
      blockedAt: this.toIsoString(record.blockedAt),
      blockContext: this.clonePlainObject(record.blockContext),
      visibilityCode: typeof record.visibilityCode === 'number' ? record.visibilityCode : null,
      curated: typeof record.curated === 'boolean' ? record.curated : null,
      curationStatus: record.curationStatus || null,
      publishType: record.publishType || null,
      publishConfig: this.stripPackageImportPublishConfig(record.publishConfig),
      excludeFromSearch: typeof record.excludeFromSearch === 'boolean' ? record.excludeFromSearch : null,
      curatorComment: record.curatorComment || null,
      availableAt: this.toIsoString(record.availableAt),
      data: this.clonePlainObject(record.data),
      meta: this.clonePlainObject(record.meta),
      info: this.clonePlainObject(record.info),
      sysInfo: this.clonePlainObject(record.sysInfo),
      sourceInfo: this.stripPackageImportState(record.sourceInfo),
      attachments: exportedAttachments,
    };
  }

  private parsePackageManifest(packageText: string): AdminPublishedPackageDataManifest {
    if (!packageText || !packageText.trim()) {
      throw new Error('Package JSON is required.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(packageText);
    } catch (error: any) {
      throw new Error(error?.message || 'Package JSON is invalid.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Package JSON must be an object.');
    }

    if (parsed.kind !== 'published-package-data') {
      throw new Error('Unsupported package kind. Expected published-package-data.');
    }

    if (!Array.isArray(parsed.records)) {
      throw new Error('Package records must be an array.');
    }

    const records = parsed.records.map((record: any, index: number) => this.normalizePackageRecord(record, index));
    const relations = Array.isArray(parsed.relations)
      ? parsed.relations.map((relation: any, index: number) => this.normalizePackageRelation(relation, index))
      : [];
    const assets = Array.isArray(parsed.assets)
      ? parsed.assets.map((asset: any, index: number) => this.normalizePackageAsset(asset, index))
      : [];

    return {
      kind: 'published-package-data',
      packageVersion: parsed.packageVersion === 2 ? 2 : 1,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      records,
      relations,
      assets,
    };
  }

  private normalizePackageRecord(record: any, index: number): AdminPublishedPackageRecord {
    const localId = this.requireString(record?.localId, `records[${index}].localId`);
    const type = this.requireString(record?.type, `records[${index}].type`);
    const name = this.requireString(record?.name, `records[${index}].name`);

    return {
      localId,
      publishId: this.optionalString(record?.publishId),
      easyId: this.optionalString(record?.easyId),
      sourceItemId: this.optionalString(record?.sourceItemId),
      type,
      subType: this.optionalString(record?.subType),
      name,
      description: this.optionalString(record?.description),
      url: this.optionalString(record?.url),
      categories: this.normalizeStringArray(record?.categories),
      useCriteria: this.normalizeStringArray(record?.useCriteria),
      imageFilename: this.optionalString(record?.imageFilename),
      imageAssetId: this.optionalString(record?.imageAssetId),
      published: typeof record?.published === 'boolean' ? record.published : null,
      blockedAt: this.optionalString(record?.blockedAt),
      blockContext: this.clonePlainObject(record?.blockContext),
      visibilityCode: typeof record?.visibilityCode === 'number' ? record.visibilityCode : null,
      curated: typeof record?.curated === 'boolean' ? record.curated : null,
      curationStatus: this.optionalString(record?.curationStatus),
      publishType: this.optionalString(record?.publishType),
      publishConfig: this.clonePlainObject(record?.publishConfig),
      excludeFromSearch: typeof record?.excludeFromSearch === 'boolean' ? record.excludeFromSearch : null,
      curatorComment: this.optionalString(record?.curatorComment),
      availableAt: this.optionalString(record?.availableAt),
      data: this.clonePlainObject(record?.data),
      meta: this.clonePlainObject(record?.meta),
      info: this.clonePlainObject(record?.info),
      sysInfo: this.clonePlainObject(record?.sysInfo),
      sourceInfo: this.clonePlainObject(record?.sourceInfo),
      attachments: Array.isArray(record?.attachments)
        ? record.attachments.map((attachment: any) => this.normalizePackageAttachment(attachment))
        : [],
    };
  }

  private normalizePackageRelation(relation: any, index: number): AdminPublishedPackageRelation {
    return {
      parentLocalId: this.requireString(relation?.parentLocalId, `relations[${index}].parentLocalId`),
      childLocalId: this.requireString(relation?.childLocalId, `relations[${index}].childLocalId`),
      order: typeof relation?.order === 'number' ? relation.order : null,
      details: this.clonePlainObject(relation?.details),
      availableAt: this.optionalString(relation?.availableAt),
    };
  }

  private normalizePackageAsset(asset: any, index: number): AdminPublishedPackageAsset {
    return {
      assetId: this.requireString(asset?.assetId, `assets[${index}].assetId`),
      ownerLocalId: this.requireString(asset?.ownerLocalId, `assets[${index}].ownerLocalId`),
      ownerPublishedId: this.optionalString(asset?.ownerPublishedId),
      kind: asset?.kind === 'banner_image' ? 'banner_image' : 'published_attachment',
      filename: this.optionalString(asset?.filename),
      sourceRuntimeRef: this.optionalString(asset?.sourceRuntimeRef),
      bundlePath: this.optionalString(asset?.bundlePath),
      byteSize: typeof asset?.byteSize === 'number' ? asset.byteSize : null,
      checksumSha256: this.optionalString(asset?.checksumSha256),
      attachmentId: this.optionalString(asset?.attachmentId),
      fileType: this.optionalString(asset?.fileType),
      meta: this.clonePlainObject(asset?.meta),
    };
  }

  private async parsePackageImport(request: AdminPublishedPackageImportRequest) {
    if (request.packageDataBase64) {
      return {
        ...(await this.parsePackageBundleImport(request.packageDataBase64)),
        assetImportMode: 'bundle' as const,
      };
    }

    return {
      manifest: this.parsePackageManifest(request.packageText || ''),
      bundleFilesByAssetId: new Map<string, {base64: string; byteSize: number; checksumSha256: string}>(),
      assetImportMode: 'metadata' as const,
    };
  }

  private async parsePackageBundleImport(packageDataBase64: string) {
    if (!packageDataBase64?.trim()) {
      throw new Error('Package bundle data is required.');
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(Buffer.from(packageDataBase64, 'base64'));
    } catch (error: any) {
      throw new Error(error?.message || 'Package bundle is invalid.');
    }

    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Package bundle is missing manifest.json.');
    }

    const manifest = this.parsePackageManifest(await manifestFile.async('string'));
    const bundleFilesByAssetId = new Map<string, {base64: string; byteSize: number; checksumSha256: string}>();

    for (const asset of manifest.assets) {
      const bundlePath = this.optionalString(asset.bundlePath);
      if (!bundlePath) {
        continue;
      }

      const assetFile = zip.file(bundlePath);
      if (!assetFile) {
        throw new Error(`Package bundle is missing ${bundlePath} for ${asset.assetId}.`);
      }

      const base64 = await assetFile.async('base64');
      const byteSize = Buffer.from(base64, 'base64').length;
      const checksumSha256 = this.createSha256(base64);

      if (asset.checksumSha256 && asset.checksumSha256 !== checksumSha256) {
        throw new Error(`Package asset checksum mismatch for ${asset.assetId}.`);
      }

      bundleFilesByAssetId.set(asset.assetId, {
        base64,
        byteSize,
        checksumSha256,
      });
    }

    return {
      manifest,
      bundleFilesByAssetId,
    };
  }

  private async materializePackageRecordAssets(options: {
    record: AdminPublishedPackageRecord;
    publishId: string;
    assetMap: Map<string, AdminPublishedPackageAsset>;
    bundleFilesByAssetId: Map<string, {base64: string; byteSize: number; checksumSha256: string}>;
    warnings: string[];
  }) {
    const {record, publishId, assetMap, bundleFilesByAssetId, warnings} = options;

    let importedBannerCount = 0;
    let importedAttachmentCount = 0;
    let imageFilename = record.imageFilename || null;

    if (record.imageAssetId) {
      const asset = assetMap.get(record.imageAssetId);
      const bundleFile = bundleFilesByAssetId.get(record.imageAssetId);
      if (!asset) {
        warnings.push(`Missing banner asset ${record.imageAssetId} for ${record.localId}.`);
        imageFilename = null;
      } else if (!bundleFile) {
        warnings.push(`Missing bundled banner asset ${record.imageAssetId} for ${record.localId}.`);
        imageFilename = null;
      } else {
        imageFilename = await this.publishedFileService.savePublishImage(
          null as any,
          bundleFile.base64,
          this.getImportedAssetFilename(asset, 'banner'),
          publishId,
        );
        importedBannerCount += 1;
      }
    }

    const attachments: ItemAttachment[] = [];
    for (const attachment of record.attachments || []) {
      if (!attachment.assetId) {
        attachments.push(this.toRuntimeAttachment(attachment));
        continue;
      }

      const asset = assetMap.get(attachment.assetId);
      const bundleFile = bundleFilesByAssetId.get(attachment.assetId);
      if (!asset) {
        warnings.push(`Missing attachment asset ${attachment.assetId} for ${record.localId}.`);
        continue;
      }
      if (!bundleFile) {
        warnings.push(`Missing bundled attachment asset ${attachment.assetId} for ${record.localId}.`);
        continue;
      }

      const storedFilename = await this.publishedFileService.savePublishAttachment(
        null as any,
        bundleFile.base64,
        this.getImportedAssetFilename(asset, attachment.filename || asset.filename || asset.assetId),
        publishId,
      );

      attachments.push({
        ...this.toRuntimeAttachment(attachment),
        fileId: storedFilename,
      });
      importedAttachmentCount += 1;
    }

    return {
      imageFilename,
      attachments,
      importedBannerCount,
      importedAttachmentCount,
      pendingBannerAssetCount: 0,
      pendingAttachmentCount: 0,
    };
  }

  private stageMetadataOnlyPackageAssets(options: {
    record: AdminPublishedPackageRecord;
    assetMap: Map<string, AdminPublishedPackageAsset>;
    nextPublishConfig: Record<string, any>;
    warnings: string[];
  }) {
    const {record, assetMap, nextPublishConfig, warnings} = options;

    const pendingBannerAssetId =
      record.imageAssetId && assetMap.has(record.imageAssetId) ? record.imageAssetId : null;
    if (record.imageAssetId && !pendingBannerAssetId) {
      warnings.push(`Missing banner asset ${record.imageAssetId} for ${record.localId}.`);
    }

    const pendingAttachmentAssetIds = (record.attachments || [])
      .map((attachment) => attachment.assetId)
      .filter((assetId): assetId is string => !!assetId && assetMap.has(assetId));

    for (const attachment of record.attachments || []) {
      if (attachment.assetId && !assetMap.has(attachment.assetId)) {
        warnings.push(`Missing attachment asset ${attachment.assetId} for ${record.localId}.`);
      }
    }

    if (pendingBannerAssetId || pendingAttachmentAssetIds.length > 0) {
      nextPublishConfig.packageImport = {
        importedAt: new Date().toISOString(),
        packageVersion: 1,
        sourcePublishId: record.publishId || null,
        pendingBannerAssetId,
        pendingAttachmentAssetIds,
      };
    }

    const importedAttachments = (record.attachments || [])
      .filter((attachment) => !attachment.assetId)
      .map((attachment) => this.toRuntimeAttachment(attachment));

    return {
      imageFilename: pendingBannerAssetId ? null : record.imageFilename || null,
      attachments: importedAttachments,
      importedBannerCount: 0,
      importedAttachmentCount: 0,
      pendingBannerAssetCount: pendingBannerAssetId ? 1 : 0,
      pendingAttachmentCount: pendingAttachmentAssetIds.length,
    };
  }

  private validatePackageAssetReferences(
    manifest: AdminPublishedPackageDataManifest,
    assetImportMode: 'bundle' | 'metadata',
    bundleFilesByAssetId: Map<string, {base64: string; byteSize: number; checksumSha256: string}>,
  ) {
    const assetMap = new Map(manifest.assets.map((asset) => [asset.assetId, asset]));
    const requireBundleBytes = assetImportMode === 'bundle' || manifest.packageVersion >= 2;

    for (const record of manifest.records) {
      if (record.imageAssetId) {
        const asset = assetMap.get(record.imageAssetId);
        if (!asset) {
          throw new Error(`Missing banner asset ${record.imageAssetId} for ${record.localId}.`);
        }
        if (requireBundleBytes && !bundleFilesByAssetId.has(record.imageAssetId)) {
          throw new Error(`Missing bundled banner asset ${record.imageAssetId} for ${record.localId}.`);
        }
      }

      for (const attachment of record.attachments || []) {
        if (!attachment.assetId) {
          continue;
        }

        const asset = assetMap.get(attachment.assetId);
        if (!asset) {
          throw new Error(`Missing attachment asset ${attachment.assetId} for ${record.localId}.`);
        }
        if (requireBundleBytes && !bundleFilesByAssetId.has(attachment.assetId)) {
          throw new Error(`Missing bundled attachment asset ${attachment.assetId} for ${record.localId}.`);
        }
      }
    }
  }

  private normalizePackageAttachment(attachment: any): AdminPublishedPackageAttachmentEntry {
    return {
      id: this.optionalString(attachment?.id) || undefined,
      type:
        attachment?.type === 'snapshot' || attachment?.type === 'snip' || attachment?.type === 'uri'
          ? attachment.type
          : 'file',
      filename: this.optionalString(attachment?.filename) || undefined,
      fileType: this.requireString(attachment?.fileType, 'attachment.fileType'),
      fileId: this.optionalString(attachment?.fileId) || undefined,
      info: this.clonePlainObject(attachment?.info) || undefined,
      meta: this.clonePlainObject(attachment?.meta) || undefined,
      previews: this.cloneValue(attachment?.previews) || undefined,
      encryptedInfo: typeof attachment?.encryptedInfo === 'boolean' ? attachment.encryptedInfo : undefined,
      createDate: typeof attachment?.createDate === 'number' ? attachment.createDate : undefined,
      assetId: this.optionalString(attachment?.assetId),
    };
  }

  private async findExistingPublishedForPackageRecord(record: AdminPublishedPackageRecord) {
    if (record.publishId) {
      const byId = await this.published.findById(record.publishId);
      if (byId) {
        return byId;
      }
    }

    if (record.easyId) {
      const byEasyId = await this.published.findById(record.easyId);
      if (byEasyId) {
        return byEasyId;
      }
    }

    if (record.sourceItemId) {
      const bySourceItemId = await this.published.query().where({sourceItemId: record.sourceItemId}).first();
      if (bySourceItemId) {
        return bySourceItemId as Published;
      }
    }

    const url = this.getPackageRecordUrl(record);
    if (url) {
      const byUrl = await this.published
        .query()
        .whereRaw(`coalesce(published.data->>'url', published.meta->>'url') = ?`, [url])
        .first();
      if (byUrl) {
        return byUrl as Published;
      }
    }

    return null;
  }

  private toRuntimeAttachment(attachment: AdminPublishedPackageAttachmentEntry): ItemAttachment {
    return {
      id: attachment.id,
      type: attachment.type,
      filename: attachment.filename,
      fileType: attachment.fileType,
      fileId: attachment.fileId,
      info: this.clonePlainObject(attachment.info) || undefined,
      meta: this.clonePlainObject(attachment.meta) || undefined,
      previews: (this.cloneValue(attachment.previews) as FilePreview[] | null) || undefined,
      encryptedInfo: attachment.encryptedInfo,
      createDate: attachment.createDate,
    };
  }

  private getPublishedUrl(record: Published) {
    const dataUrl = typeof record.data?.url === 'string' ? record.data.url.trim() : '';
    if (dataUrl) {
      return dataUrl;
    }

    const metaUrl = typeof (record.meta as any)?.url === 'string' ? (record.meta as any).url.trim() : '';
    return metaUrl || null;
  }

  private getPackageRecordUrl(record: AdminPublishedPackageRecord) {
    const directUrl = this.optionalString(record.url);
    if (directUrl) {
      return directUrl;
    }

    const dataUrl = this.optionalString(record.data?.url);
    if (dataUrl) {
      return dataUrl;
    }

    return this.optionalString(record.meta?.url);
  }

  private stripPackageImportState(sourceInfo: Record<string, any> | null | undefined) {
    const nextSourceInfo = this.clonePlainObject(sourceInfo);
    if (nextSourceInfo && typeof nextSourceInfo === 'object') {
      delete nextSourceInfo.packageImport;
    }
    return nextSourceInfo;
  }

  private stripPackageImportPublishConfig(publishConfig: Record<string, any> | null | undefined) {
    const nextPublishConfig = this.clonePlainObject(publishConfig) || {};
    if (nextPublishConfig && typeof nextPublishConfig === 'object') {
      delete nextPublishConfig.packageImport;
    }
    return nextPublishConfig;
  }

  private normalizeStringArray(values: string[] | null | undefined) {
    if (!Array.isArray(values)) {
      return [];
    }
    return values.map((value) => (typeof value === 'string' ? value.trim() : '')).filter((value) => !!value);
  }

  private async buildPackageBundle(manifest: AdminPublishedPackageDataManifest) {
    const zip = new JSZip();
    const bundleFiles = await this.loadBundleFiles(manifest.assets);

    for (const asset of manifest.assets) {
      const bundleFile = bundleFiles.get(asset.assetId);
      if (!bundleFile) {
        continue;
      }

      asset.bundlePath = bundleFile.bundlePath;
      asset.byteSize = bundleFile.byteSize;
      asset.checksumSha256 = bundleFile.checksumSha256;
      zip.file(bundleFile.bundlePath, bundleFile.base64, {base64: true});
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    return await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: {level: 6},
    });
  }

  private async loadBundleFiles(assets: AdminPublishedPackageAsset[]) {
    const bundleFiles = new Map<
      string,
      {bundlePath: string; base64: string; byteSize: number; checksumSha256: string}
    >();

    for (const asset of assets) {
      const bundlePath = this.optionalString(asset.bundlePath);
      if (!bundlePath) {
        continue;
      }

      const base64 = await this.readPublishedAssetBase64(asset);
      const byteSize = Buffer.from(base64, 'base64').length;
      bundleFiles.set(asset.assetId, {
        bundlePath,
        base64,
        byteSize,
        checksumSha256: this.createSha256(base64),
      });
    }

    return bundleFiles;
  }

  private async readPublishedAssetBase64(asset: AdminPublishedPackageAsset) {
    if (asset.kind === 'banner_image') {
      const runtimeRef = this.requireString(asset.sourceRuntimeRef, `${asset.assetId}.sourceRuntimeRef`);
      const stream = await this.publishedFileService.getPublishImageStream(runtimeRef);
      return String(await streamToBase64(stream));
    }

    const publishId = this.requireString(asset.ownerPublishedId, `${asset.assetId}.ownerPublishedId`);
    const runtimeRef = this.requireString(asset.sourceRuntimeRef || asset.filename, `${asset.assetId}.sourceRuntimeRef`);
    const stream = await this.publishedFileService.getPubFileStream(null as any, publishId, runtimeRef);
    return String(await streamToBase64(stream));
  }

  private buildPackageBundleFileName(manifest: AdminPublishedPackageDataManifest) {
    const firstRecord = manifest.records[0]?.localId || 'content-export';
    const safePrefix = this.sanitizePathSegment(firstRecord) || 'content-export';
    return `${safePrefix}-${manifest.records.length}-rows.content-export.zip`;
  }

  private buildBannerBundlePath(localId: string, filename: string | null) {
    return `assets/${this.sanitizePathSegment(localId)}/banner${this.getFileExtension(filename)}`;
  }

  private buildAttachmentBundlePath(localId: string, index: number, filename: string | null) {
    const safeName = this.sanitizeFileName(filename) || `attachment-${index}`;
    return `assets/${this.sanitizePathSegment(localId)}/attachment-${index}-${safeName}`;
  }

  private getImportedAssetFilename(asset: AdminPublishedPackageAsset, fallbackName: string) {
    const bundlePath = this.optionalString(asset.bundlePath);
    if (bundlePath) {
      return path.posix.basename(bundlePath);
    }
    return this.sanitizeFileName(asset.filename || fallbackName) || this.sanitizePathSegment(asset.assetId);
  }

  private getFileExtension(filename: string | null | undefined) {
    const normalized = this.optionalString(filename);
    if (!normalized) {
      return '';
    }
    const extension = path.extname(normalized);
    return extension || '';
  }

  private sanitizePathSegment(value: string) {
    return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'asset';
  }

  private sanitizeFileName(value: string | null | undefined) {
    const normalized = this.optionalString(value);
    if (!normalized) {
      return null;
    }
    const trimmed = normalized.split('/').pop() || normalized;
    return trimmed.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || null;
  }

  private createSha256(base64: string) {
    return createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex');
  }

  private requireString(value: unknown, label: string) {
    const normalized = this.optionalString(value);
    if (!normalized) {
      throw new Error(`${label} is required.`);
    }
    return normalized;
  }

  private optionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  private toIsoString(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toDate(value: string | null | undefined) {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isExternalUrl(value: string) {
    return /^https?:\/\//i.test(value);
  }

  private clonePlainObject<T>(value: T) {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return this.cloneValue(value);
  }

  private cloneValue<T>(value: T): T | null {
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

export default ImportExportService;
