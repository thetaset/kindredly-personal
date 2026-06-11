import {UserActivityRepo} from '@/db/user_activity.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {DynObj} from '@/types';
import FeedbackService from './feedback.service';
import {RequestContext} from '../base/request_context';
import {v4 as uuidv4} from 'uuid';
import {config} from '@/config';
import {UserActivityLogRepo} from '@/db/user_activity_log.repo';
import {ClassificationFeedbackReportRepo} from '@/db/classification_feedback_report.repo';
import {ClassificationDatasetSampleRepo} from '@/db/classification_dataset_sample.repo';
import {UserType} from 'tset-sharedlib/shared.types';
import UserActivityLog from 'tset-sharedlib/schemas/public/UserActivityLog';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';
import {createHash} from 'crypto';
import type {
  GetClassificationEvalProgramStatusRequest,
  GetClassificationEvalProgramStatusResponse,
  InvalidateActivityMonitorsResponse,
  ReportClassificationIssueRequest,
  ReportClassificationIssueResponse,
  SaveUserActivityLogResponse,
  UserActivityLogListResponse,
  UploadClassificationDatasetSamplesRequest,
  UploadClassificationDatasetSamplesResponse,
} from 'tset-sharedlib/api';
import type {EduValue} from 'tset-sharedlib/content.types';

class ActivityService {
  private static readonly ACTIVITY_CONTROL_TYPE = 'activity_control';
  private static readonly ACTIVITY_CONTROL_MONITOR_ID = '__activity_control__';

  private feedbackService = new FeedbackService();
  private userActivity_deprecating = new UserActivityRepo();
  private userActivityLogRepo = new UserActivityLogRepo();
  private classificationFeedbackReportRepo = new ClassificationFeedbackReportRepo();
  private classificationDatasetSampleRepo = new ClassificationDatasetSampleRepo();
  private feedback = new ItemFeedbackRepo();

  private getActivityControlRowId(userId: string): string {
    return `${userId}_${ActivityService.ACTIVITY_CONTROL_MONITOR_ID}`;
  }

  private async getActivityInvalidationCutoffMs(userId: string): Promise<number> {
    const controlRow = await this.userActivityLogRepo.findById(this.getActivityControlRowId(userId));
    const cutoffValue = controlRow?.data?.invalidateBeforeCreatedAtMs;
    return typeof cutoffValue === 'number' && cutoffValue > 0 ? cutoffValue : 0;
  }

  async invalidateActivityMonitors(
    ctx: RequestContext,
    targetUserId: string,
  ): Promise<InvalidateActivityMonitorsResponse> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    const invalidateBeforeCreatedAtMs = Date.now();
    await this.userActivityLogRepo.create({
      _id: this.getActivityControlRowId(targetUserId),
      userId: targetUserId,
      monitorId: ActivityService.ACTIVITY_CONTROL_MONITOR_ID,
      clientId: ctx.getClientId(),
      createdAt: new Date(invalidateBeforeCreatedAtMs),
      updatedAt: new Date(invalidateBeforeCreatedAtMs),
      type: ActivityService.ACTIVITY_CONTROL_TYPE,
      data: {
        invalidateBeforeCreatedAtMs,
      },
      complete: true,
      encrypted: false,
      encInfo: null,
    });

    return {invalidateBeforeCreatedAtMs};
  }

  private normalizeUrlForReport(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url);
      const path = (parsed.pathname || '/').slice(0, 180);
      return `${parsed.hostname}${path}`.toLowerCase();
    } catch {
      return null;
    }
  }

  private stringHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private normalizeDatasetText(value: unknown, maxLen: number): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLen);
  }

  private assertClassificationEvalProgramEnabled(): void {
    if (!config.devMode) {
      throw new Error('Classification evaluation program is only available in developer mode.');
    }
  }

  private async assertClassificationEvalProgramAccess(ctx: RequestContext): Promise<void> {
    // Admin users can always submit classification feedback, regardless of devMode
    if (await ctx.isAdmin()) return;

    this.assertClassificationEvalProgramEnabled();

    const allowList = Array.isArray((config as any).classificationEvalAllowedUserIds)
      ? ((config as any).classificationEvalAllowedUserIds as string[])
      : [];

    if (allowList.length === 0) {
      return;
    }

    const currentUserId = ctx.currentUserId || '';
    if (!allowList.includes(currentUserId)) {
      throw new Error('Classification evaluation program is not allowlisted for this user.');
    }
  }

  async getClassificationEvalProgramStatus(
    ctx: RequestContext,
    _data: GetClassificationEvalProgramStatusRequest,
  ): Promise<GetClassificationEvalProgramStatusResponse> {
    if (!config.devMode) {
      return {enabled: false, reason: 'developer_mode_required'};
    }

    const allowList = Array.isArray((config as any).classificationEvalAllowedUserIds)
      ? ((config as any).classificationEvalAllowedUserIds as string[])
      : [];
    if (allowList.length > 0 && !allowList.includes(ctx.currentUserId || '')) {
      return {enabled: false, reason: 'not_allowlisted'};
    }

    return {enabled: true, reason: 'enabled'};
  }

  async reportClassificationIssue(
    ctx: RequestContext,
    data: ReportClassificationIssueRequest,
  ): Promise<ReportClassificationIssueResponse> {
    await this.assertClassificationEvalProgramAccess(ctx);

    const normalized = {
      source: {
        kind: 'activity-log' as const,
        logRefId: data?.source?.logRefId || null,
        url: this.normalizeUrlForReport(data?.source?.url),
        startTime: typeof data?.source?.startTime === 'number' ? data.source.startTime : null,
        endTime: typeof data?.source?.endTime === 'number' ? data.source.endTime : null,
        clientId: data?.source?.clientId || null,
      },
      classification: {
        restricted: data?.classification?.restricted ?? null,
        reasonCode: data?.classification?.reasonCode || null,
        eduValue: data?.classification?.eduValue || null,
        flags: Array.isArray(data?.classification?.flags) ? data.classification.flags.slice(0, 20).sort() : [],
        contentTypes: Array.isArray(data?.classification?.contentTypes)
          ? data.classification.contentTypes.slice(0, 20).sort()
          : [],
        categories: Array.isArray(data?.classification?.categories)
          ? data.classification.categories.slice(0, 20).sort()
          : [],
        topics: Array.isArray(data?.classification?.topics) ? data.classification.topics.slice(0, 20).sort() : [],
      },
      feedback: {
        issueType: data?.feedback?.issueType || 'other',
        comment: typeof data?.feedback?.comment === 'string' ? data.feedback.comment.slice(0, 1000) : '',
        expectedEduValue: data?.feedback?.expectedEduValue || null,
        expectedRestricted: data?.feedback?.expectedRestricted ?? null,
      },
      context: {
        pipelineSummary: data?.context?.pipelineSummary || null,
      },
    };

    const dedupeRaw = JSON.stringify({
      source: normalized.source,
      classification: normalized.classification,
      feedback: {
        issueType: normalized.feedback.issueType,
        expectedEduValue: normalized.feedback.expectedEduValue,
        expectedRestricted: normalized.feedback.expectedRestricted,
      },
    });
    const dedupeKey = this.stringHash(dedupeRaw);

    const existing = await this.classificationFeedbackReportRepo.findLatestByDedupeKey(dedupeKey);

    if (existing?._id) {
      const nextCount = Number((existing as any)?.reportCount || 1) + 1;
      await this.classificationFeedbackReportRepo.updateWithId(existing._id, {
        reportCount: nextCount,
        lastReportedAt: new Date(),
      } as any);
      return {
        reportId: existing._id,
        deduped: true,
        reportCount: nextCount,
      };
    }

    const created = await this.classificationFeedbackReportRepo.create({
      dedupeKey,
      userId: ctx.currentUserId,
      sourceType: 'activityLogClassification',
      sourceId: dedupeKey,
      details: normalized as any,
      reportCount: 1,
      lastReportedAt: new Date(),
      createdAt: new Date(),
    } as any);

    const createdRow = Array.isArray(created) ? created[0] : created;
    return {
      reportId: Number((createdRow as any)?._id || 0),
      deduped: false,
      reportCount: 1,
    };
  }

  async uploadClassificationDatasetSamples(
    ctx: RequestContext,
    data: UploadClassificationDatasetSamplesRequest,
  ): Promise<UploadClassificationDatasetSamplesResponse> {
    await this.assertClassificationEvalProgramAccess(ctx);

    const samples = Array.isArray(data?.samples) ? data.samples : [];
    const safeSamples = samples.slice(0, 500);
    const datasetName = (data?.datasetName || 'developer-dataset').slice(0, 100);
    const datasetId = `${datasetName}-${new Date().toISOString().slice(0, 10)}`;

    let inserted = 0;
    let deduped = 0;

    for (const sample of safeSamples) {
      const rawUrl = this.normalizeDatasetText(sample?.source?.url, 2000);
      const normalizedSource = {
        pipelineResultId: sample?.source?.pipelineResultId || null,
        url: rawUrl,
        normalizedUrl: sample?.source?.normalizedUrl || this.normalizeUrlForReport(sample?.source?.url),
        timestamp: typeof sample?.source?.timestamp === 'number' ? sample.source.timestamp : null,
        tabId: sample?.source?.tabId || null,
      };

      const normalizedClassification = {
        restricted: sample?.classification?.restricted ?? null,
        reasonCode: sample?.classification?.reasonCode || null,
        eduValue: sample?.classification?.eduValue || null,
        flags: Array.isArray(sample?.classification?.flags) ? sample.classification.flags.slice(0, 20).sort() : [],
        contentTypes: Array.isArray(sample?.classification?.contentTypes)
          ? sample.classification.contentTypes.slice(0, 20).sort()
          : [],
        categories: Array.isArray(sample?.classification?.categories)
          ? sample.classification.categories.slice(0, 20).sort()
          : [],
        topics: Array.isArray(sample?.classification?.topics) ? sample.classification.topics.slice(0, 20).sort() : [],
      };

      const normalizedSummary = {
        hasPipelineResult: sample?.summary?.hasPipelineResult === true,
        hasDebugInfo: sample?.summary?.hasDebugInfo === true,
        extractedTextLength:
          typeof sample?.summary?.extractedTextLength === 'number' ? sample.summary.extractedTextLength : 0,
        titleLength: typeof sample?.summary?.titleLength === 'number' ? sample.summary.titleLength : 0,
        descriptionLength:
          typeof sample?.summary?.descriptionLength === 'number' ? sample.summary.descriptionLength : 0,
      };

      const normalizedPageData = {
        pageTitle: this.normalizeDatasetText(sample?.pageData?.pageTitle, 8000),
        description: this.normalizeDatasetText(sample?.pageData?.description, 12000),
        extractedText: this.normalizeDatasetText(sample?.pageData?.extractedText, 120000),
        imageAltText: this.normalizeDatasetText(sample?.pageData?.imageAltText, 12000),
        canonicalUrl: this.normalizeDatasetText(sample?.pageData?.canonicalUrl, 2000),
      };

      const modelName = this.normalizeDatasetText(sample?.modelContext?.modelName, 240);
      const modelVersion = this.normalizeDatasetText(sample?.modelContext?.modelVersion, 240);
      const classifierType =
        this.normalizeDatasetText(sample?.modelContext?.classifierType, 120) || 'pipeline_predicted';
      const runLabel = this.normalizeDatasetText(sample?.modelContext?.runLabel, 300);
      const modelConfigJson = this.normalizeDatasetText(sample?.modelContext?.modelConfigJson, 20000);
      const providedConfigHash = this.normalizeDatasetText(sample?.modelContext?.modelConfigHash, 128);
      const computedConfigHash = this.stringHash(
        JSON.stringify({
          classifierType,
          modelName,
          modelVersion,
          modelConfigJson,
        }),
      );

      const normalizedModelContext = {
        classifierType,
        modelName,
        modelVersion,
        runLabel,
        modelConfigJson,
        modelConfigHash: providedConfigHash || computedConfigHash,
        ingestedAt: new Date().toISOString(),
      };

      const dedupeRaw = JSON.stringify({
        source: normalizedSource,
        classification: normalizedClassification,
      });
      const dedupeKey = this.stringHash(dedupeRaw);

      const existing = await this.classificationDatasetSampleRepo.findLatestByDedupeKey(dedupeKey);

      if (existing?._id) {
        deduped++;
        const nextCount = Number((existing as any)?.sampleCount || 1) + 1;
        await this.classificationDatasetSampleRepo.updateWithId(existing._id, {
          sampleCount: nextCount,
          datasetId,
          lastSeenAt: new Date(),
        } as any);
        continue;
      }

      await this.classificationDatasetSampleRepo.create({
        dedupeKey,
        datasetId,
        userId: ctx.currentUserId,
        sourceType: 'activityPipelineSample',
        sourceId: dedupeKey,
        details: {
          datasetId,
          source: normalizedSource,
          classification: normalizedClassification,
          pageData: normalizedPageData,
          modelContext: normalizedModelContext,
          summary: normalizedSummary,
        } as any,
        sampleCount: 1,
        lastSeenAt: new Date(),
        createdAt: new Date(),
      } as any);
      inserted++;
    }

    return {
      datasetId,
      received: safeSamples.length,
      inserted,
      deduped,
    };
  }

  async listUserActivityLogSince(
    ctx: RequestContext,
    targetUserId: string,
    type: string,
    options: {createdAt?: Date} = {},
  ): Promise<UserActivityLogListResponse> {
    await ctx.verifySelfOrAdmin(targetUserId);

    const {createdAt} = options || {};
    const invalidateBeforeCreatedAtMs = await this.getActivityInvalidationCutoffMs(targetUserId);

    let selectBy = {userId: targetUserId};
    if (type != '*') selectBy['type'] = type;
    const results = await this.userActivityLogRepo
      .findMany(selectBy)
      .where('createdAt', '>=', createdAt)
      .orderBy('createdAt', 'desc');

    return {
      invalidateBeforeCreatedAtMs,
      userActivityLog: results.filter((entry) => entry.type !== ActivityService.ACTIVITY_CONTROL_TYPE),
    };
  }

  async clearUsageLog(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    await this.userActivityLogRepo.deleteWhere({userId: targetUserId});
    await this.invalidateActivityMonitors(ctx, targetUserId);
    return true;
  }

  async fixActivityLogClassification(
    ctx: RequestContext,
    input: {
      userId?: string;
      monitorId?: string;
      url: string;
      startTime: number;
      endTime?: number;
      eduValue: EduValue;
      note?: string;
    },
  ) {
    const targetUserId = input.userId || ctx.currentUserId;
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    const normalizedUrl = String(input.url || '').trim();
    const startTime = Number(input.startTime || 0);
    const endTime = typeof input.endTime === 'number' ? input.endTime : null;
    const eduValue = String(input.eduValue || '') as EduValue;
    const monitorId = typeof input.monitorId === 'string' ? input.monitorId.trim() : '';

    if (!normalizedUrl || !startTime || !eduValue.startsWith('eduval_')) {
      throw new Error('Invalid activity log classification payload');
    }

    const createdAtFloor = new Date(Math.max(0, startTime - 24 * 60 * 60 * 1000));

    const loadRecentRows = async () => {
      return await this.userActivityLogRepo
        .findMany({userId: targetUserId, type: 'default'})
        .where('createdAt', '>=', createdAtFloor)
        .orderBy('createdAt', 'desc');
    };

    let rows = monitorId
      ? await this.userActivityLogRepo.findWhereIdIn([`${targetUserId}_${monitorId}`])
      : await loadRecentRows();

    let updatedEntries = 0;

    const updateRows = async (candidateRows: any[]) => {
      let localUpdatedEntries = 0;

      for (const row of candidateRows) {
        if (!row || row.type === ActivityService.ACTIVITY_CONTROL_TYPE) continue;
        const logList = Array.isArray((row as any)?.data?.log) ? (row as any).data.log : null;
        if (!logList) continue;

        let rowChanged = false;
        for (const entry of logList) {
          if (!entry || entry.url !== normalizedUrl) continue;
          if (typeof entry.startTime !== 'number' || Math.abs(entry.startTime - startTime) > 2000) continue;
          if (
            typeof endTime === 'number' &&
            typeof entry.endTime === 'number' &&
            Math.abs(entry.endTime - endTime) > 5000
          )
            continue;

          const nextMeta = {
            ...(((entry.contentInfo || {}).meta || {}) as DynObj),
            manualClassificationFix: {
              eduValue,
              note: input.note || null,
              fixedAt: Date.now(),
            },
          };
          entry.contentInfo = {
            ...(entry.contentInfo || {}),
            eduValue,
            meta: nextMeta,
          };
          rowChanged = true;
          localUpdatedEntries += 1;
        }

        if (!rowChanged) continue;

        await this.userActivityLogRepo.updateWithId(row._id, {
          ...(row as any),
          updatedAt: new Date(),
          data: {
            ...(row as any).data,
            log: logList,
          },
        } as any);
      }

      return localUpdatedEntries;
    };

    updatedEntries = await updateRows(rows);

    if (updatedEntries === 0 && monitorId) {
      rows = await loadRecentRows();
      updatedEntries = await updateRows(rows);
    }

    return {
      updatedEntries,
    };
  }

  // TODO: not done
  // ROUTE-METHOD
  async saveUserActivityLog(
    ctx: RequestContext,
    targetUserId: string | null | undefined,
    monitorId: string,
    createdAt: number,
    updatedAt: number,
    type: string,
    data: DynObj,
    encInfo: DynObj,
    complete: boolean,
  ): Promise<SaveUserActivityLogResponse> {
    const resolvedTargetUserId = targetUserId || ctx.currentUserId;
    await ctx.verifySelfOrAdminOverUser(resolvedTargetUserId);

    const invalidateBeforeCreatedAtMs = await this.getActivityInvalidationCutoffMs(resolvedTargetUserId);
    if (
      type !== ActivityService.ACTIVITY_CONTROL_TYPE &&
      typeof createdAt === 'number' &&
      invalidateBeforeCreatedAtMs > 0 &&
      createdAt < invalidateBeforeCreatedAtMs
    ) {
      return {
        saved: false,
        flushRequired: true,
        invalidateBeforeCreatedAtMs,
      };
    }

    const _id = `${resolvedTargetUserId}_${monitorId}`;

    // Guardrail: create() upserts (onConflict merge). If a row already exists and is encrypted,
    // enforce that encInfo is present and only changes additively.
    const existing = await this.userActivityLogRepo.findById(_id);
    assertEncryptedUpdateHasEncInfo({
      currentEncInfo: (existing as any)?.encInfo,
      nextEncInfo: encInfo ?? null,
      context: '/user/activity/push',
    });
    if ((existing as any)?.encInfo && encInfo != null) {
      assertEncInfoUpdateIsSafe({
        currentEncInfo: (existing as any).encInfo,
        nextEncInfo: encInfo,
        context: '/user/activity/push',
        payloadForCiphertextCheck: {data},
      });
    }

    const clientId = ctx.getClientId();

    const info = {
      _id,
      userId: resolvedTargetUserId,
      monitorId: monitorId,
      clientId: clientId,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      type: type,
      data,
      encInfo,
      complete,
      encrypted: encInfo != null,
    };

    try {
      await this.userActivityLogRepo.create(info);
    } catch (e) {
      return {saved: true};
    }

    return {saved: true};
  }

  //not done
  async saveUserActivityLogEntries(ctx: RequestContext, entries: []) {
    let entriesToSave = [];
    for (const entry of entries) {
      const entryWithUser = {};
    }

    try {
      await this.userActivityLogRepo.saveMany(entriesToSave);
    } catch (e) {
      return true;
    }

    return true;
  }

  // TODO: Deprecate all below methods in favor of userActivityLogRepo - Keep until all clients are updated

  // ROUTE-METHOD
  async listUserActivity_deprecating(ctx: RequestContext, targetUserId, options) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const {currentPage = 0, perPage = 100, includeTotalRows} = options;
    const results = await this.userActivity_deprecating
      .findMany({userId: targetUserId})
      .limit(perPage)
      .offset(currentPage)
      .orderBy('createdAt', 'desc');

    if (!includeTotalRows) return {userActivity: results, count: null};
    const count = await this.userActivity_deprecating.countRows({userId: targetUserId});
    return {userActivity: results, count};
  }

  // ROUTE-METHOD
  async removeActivityEntry_deprecating(ctx: RequestContext, targetUserId: string, id) {
    await ctx.isAdmin();
    return await this.userActivity_deprecating.deleteWhere({_id: id, userId: targetUserId});
  }

  // ROUTE-METHOD
  async deleteAllForUser_deprecating(ctx: RequestContext, targetUserId: string) {
    await ctx.verifyAdminPermissions(targetUserId);
    return await this.userActivity_deprecating.deleteWhere({userId: targetUserId});
  }

  // ROUTE-METHOD
  async updateVisitHistoryForItems_deprecate(ctx: RequestContext, updateList: {id: string; visitTime: string}[]) {
    //TODO: update mutliple items at once or at least pull items from db in one query
    for (const item of updateList) {
      await this.updateLastVisited_deprecate(ctx.currentUserId, item.id, new Date(item.visitTime));
    }
    return null;
  }

  private async updateLastVisited_deprecate(userId, itemId, visitTime = null) {
    const now = visitTime || new Date();
    const id = this.feedbackService.feedbackId(userId, itemId);
    const feedback = await this.feedbackService._getItemFeedbackById(id);
    await this._updateFeedbackVisitRecord_deprecate(feedback, id, userId, itemId, now);
    return;
  }

  private async _updateFeedbackVisitRecord_deprecate(
    feedback: any,
    feedbackId: string,
    userId: any,
    itemId: any,
    lastVisit: any,
  ) {
    if (!feedback) {
      await this.feedback.create({
        _id: feedbackId,
        userId,
        itemId,
        lastVisit: lastVisit,
        visitTime: lastVisit,
        visitCount: 1,
      });
    } else {
      // check if more than 15 minutes have passed since last visit
      const countVisit =
        !feedback.visitTime || feedback.visitTime < new Date(Date.now() - config.visitCountThresholdSec * 1000);
      feedback.lastVisit = feedback.visitTime;
      feedback.visitTime = lastVisit;
      if (countVisit) feedback.visitCount += 1;
      await this.feedback.updateWithId(feedbackId, {
        lastVisit: lastVisit,
        visitTime: lastVisit,
        visitCount: feedback.visitCount,
      });
    }
  }

  async logURLVisit_deprecate(
    ctx: RequestContext,
    activityType: string,
    url: string,
    info: DynObj = {},
    matchingItemIds: string[],
    blocked: boolean,
    context: DynObj = {},
    encInfo: DynObj,
  ) {
    const now = new Date();
    const userId = ctx.currentUserId;

    for (const itemId of matchingItemIds) await this.updateLastVisited_deprecate(userId, itemId);

    const user = await ctx.getCurrentUser();

    const encrypted = encInfo != null;
    const logActivity = user?.type == UserType.restricted || (user?.options?.logActivity == true && encrypted);

    if (logActivity) {
      const _id = `ua_` + uuidv4();
      const entry = {
        _id: _id,
        userId: userId,
        info: info,
        url: url,
        activityType: activityType,
        blocked: blocked,
        context: context,
        createdAt: now,
        encInfo,
        encrypted: encrypted,
      };
      try {
        await this.userActivity_deprecating.create(entry);
      } catch (e) {
        return null;
      }
    }

    return null;
  }
}

export default ActivityService;
