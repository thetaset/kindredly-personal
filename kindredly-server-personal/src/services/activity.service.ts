import {UserActivityRepo} from '@/db/user_activity.repo';
import {resolveReporterRole, type ReporterRole} from '@/utils/reporter_role';
import {UserPrefRepo} from '@/db/user_pref.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {DynObj} from '@/types';
import FeedbackService from './feedback.service';
import {RequestContext} from '../base/request_context';
import {v4 as uuidv4} from 'uuid';
import {config} from '@/config';
import {HttpException} from '@/exceptions/HttpException';
import {ITEM_VISIT_SERVER_MAX_BATCH} from 'tset-sharedlib/constants';
import {resolveVisitRecord} from '@/utils/feedback_helpers';
import {UserActivityLogRepo} from '@/db/user_activity_log.repo';
import {ClassificationFeedbackReportRepo} from '@/db/classification_feedback_report.repo';
import {ClassificationDatasetSampleRepo} from '@/db/classification_dataset_sample.repo';
import {ClassificationDatasetRepo} from '@/db/classification_dataset.repo';
import {UserType} from 'tset-sharedlib/shared.types';
import {IMAGE_IMPROVEMENT_PREF_KEY} from 'tset-sharedlib/types';
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
  UploadImageClassificationSamplesRequest,
  UploadImageClassificationSamplesResponse,
} from 'tset-sharedlib/api';
import type {EduValue} from 'tset-sharedlib/content.types';
import type {ActivityNavOrigin} from 'tset-sharedlib/types/activity.types';
import {clampPerPage} from '@/utils/pagination_utils';

// /user/activity/logList bounds. Each row can be a full monitor-session log
// (pushed at up to 70mb), and `createdAt` comes straight from the client, so
// an unbounded since-timestamp query can materialize the whole activity
// history in one response (docs/reports/server-memory-audit-2026-08-11.md).
// orderBy createdAt desc means the row cap keeps the newest sessions.
export const ACTIVITY_LOGLIST_MAX_ROWS = 5000;
export const ACTIVITY_LOGLIST_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

/** Clamp a client-supplied since-timestamp to the floor; invalid/missing values floor too. */
/**
 * Shape of an anonymized report image key: `host#<16 hex>`, or a bare `<16 hex>` for
 * inline images that have no host. Mirrors `anonymizeImageKey` on the client.
 */
const ANONYMIZED_IMAGE_KEY_RE = /^(?:[a-z0-9.-]+(?::\d+)?#)?[0-9a-f]{16}$/i;

/**
 * Keep a reported image key only if it matches the shape the reporter agreed to.
 *
 * When "include exact image links" is unchecked, the client anonymizes to `host#hash`
 * before sending, so nothing URL-shaped should ever arrive. Enforcing it again here means
 * a crafted request cannot post full links under an unchecked box. The client is the real
 * privacy boundary — the exact link never leaves the device — and this is the backstop.
 */
export function normalizeReportImageKey(value: unknown, allowExact: boolean): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, 400);
  if (!text) return null;
  if (allowExact) return text;

  return ANONYMIZED_IMAGE_KEY_RE.test(text) ? text : null;
}

export function resolveLogListSince(createdAt: unknown): Date {
  const floor = new Date(Date.now() - ACTIVITY_LOGLIST_MAX_AGE_MS);
  const requested = createdAt != null ? new Date(createdAt as string | number | Date) : null;
  return requested && !isNaN(requested.getTime()) && requested > floor ? requested : floor;
}

class ActivityService {
  private static readonly ACTIVITY_CONTROL_TYPE = 'activity_control';
  private static readonly ACTIVITY_CONTROL_MONITOR_ID = '__activity_control__';

  /** Page reports per user per hour. Generous for a person, useless for a loop. */
  private static readonly PAGE_REPORT_MAX_PER_WINDOW = 30;
  private static readonly PAGE_REPORT_WINDOW_MS = 60 * 60 * 1000;

  private static readonly IMAGE_SAMPLE_MAX_PER_REQUEST = 200;
  private static readonly IMAGE_SAMPLE_MAX_VECTOR_DIMS = 2048;
  /** ~64KB of base64, comfortably above a 224x224 JPEG and well below abuse. */
  private static readonly IMAGE_SAMPLE_MAX_IMAGE_CHARS = 90_000;

  private feedbackService = new FeedbackService();
  private userActivity_deprecating = new UserActivityRepo();
  private userActivityLogRepo = new UserActivityLogRepo();
  private classificationFeedbackReportRepo = new ClassificationFeedbackReportRepo();
  private classificationDatasetSampleRepo = new ClassificationDatasetSampleRepo();
  private classificationDatasetRepo = new ClassificationDatasetRepo();
  private userPrefRepo = new UserPrefRepo();
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

  private isMissingClassificationDatasetTableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error || '');
    return message.includes('classification_dataset') && message.includes('does not exist');
  }

  private async ensureClassificationDatasetRegistry(
    ctx: RequestContext,
    input: {datasetId: string; name?: string; description?: string | null; role?: string | null; task?: string | null},
  ): Promise<void> {
    const datasetId = (input.datasetId || '').trim();
    if (!datasetId) return;

    let existing = null as any;
    try {
      existing = await this.classificationDatasetRepo.findByDatasetId(datasetId);
    } catch (error) {
      if (this.isMissingClassificationDatasetTableError(error)) return;
      throw error;
    }
    if (existing?._id) return;

    try {
      await this.classificationDatasetRepo.create({
        datasetId,
        name: (input.name || datasetId).trim() || datasetId,
        description: input.description ?? 'Imported from pipeline results.',
        // Open string by design, so a new label task needs no migration.
        task: input.task ?? 'content',
        role: input.role ?? 'mixed',
        frozen: false,
        composedFrom: {kind: input.task === 'image' ? 'imageClassificationSamples' : 'pipelineResultsImport'},
        createdBy: ctx.currentUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    } catch (error) {
      if (this.isMissingClassificationDatasetTableError(error)) return;
      throw error;
    }
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

  /**
   * Whether this user opted in to contributing classifier samples.
   *
   * Read straight from the pref rather than trusting the client: the request
   * already carries the claim, so the point of checking is that a client which
   * ignores or fakes the setting still cannot upload.
   */
  private async hasImageImprovementConsent(ctx: RequestContext): Promise<boolean> {
    const userId = ctx.currentUserId;
    if (!userId) return false;
    try {
      return (await this.userPrefRepo.getUserPref(userId, IMAGE_IMPROVEMENT_PREF_KEY)) === true;
    } catch {
      // Fail closed — an unreadable pref is not consent.
      return false;
    }
  }

  private async assertClassificationEvalProgramAccess(ctx: RequestContext): Promise<void> {
    // Admin users can always submit classification feedback, regardless of devMode
    if (await ctx.isAdmin()) return;

    // An explicit opt-in stands on its own. This has to come before the devMode
    // assert below, which hard-fails in production and would otherwise make the
    // setting unusable for the families it exists for.
    if (await this.hasImageImprovementConsent(ctx)) return;

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

  /**
   * Gate for the page-content dataset upload.
   *
   * Deliberately does NOT honour the image-improvement opt-in. That switch is described
   * to a guardian as contributing image-filter decisions; this upload sends full page
   * URLs and up to 120KB of extracted page text, which is a different thing entirely.
   * Sharing one gate meant turning on the narrow switch silently unlocked the broad
   * upload — so this keeps the original admin / devMode+allowlist rule.
   */
  private async assertClassificationDatasetProgramAccess(ctx: RequestContext): Promise<void> {
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
    // Must mirror assertClassificationEvalProgramAccess exactly. If this says
    // disabled while the gate would allow the upload, the client hides a
    // feature the user has already turned on.
    if (await ctx.isAdmin()) {
      return {enabled: true, reason: 'enabled'};
    }

    if (await this.hasImageImprovementConsent(ctx)) {
      return {enabled: true, reason: 'enabled'};
    }

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

  /** Who is reporting, from the session (utils/reporter_role.ts, shared with catalog reports). */
  private async resolveReporterRole(ctx: RequestContext): Promise<ReporterRole> {
    return resolveReporterRole(ctx);
  }

  /**
   * Cap how often one person can report.
   *
   * The button is reachable by the person being filtered, so without a ceiling
   * it is a way to generate unbounded rows. Counts this user's recent reports
   * rather than tracking state in memory, so it survives a restart and holds
   * across instances.
   */
  private async assertPageReportRateLimit(ctx: RequestContext): Promise<void> {
    const userId = ctx.currentUserId;
    if (!userId) throw new Error('Sign in to report a problem.');

    const since = new Date(Date.now() - ActivityService.PAGE_REPORT_WINDOW_MS);
    try {
      const recent = await this.classificationFeedbackReportRepo
        .query()
        .where('userId', userId)
        .andWhere('createdAt', '>', since)
        .count({count: '*'})
        .first();

      const count = Number((recent as any)?.count || 0);
      if (count >= ActivityService.PAGE_REPORT_MAX_PER_WINDOW) {
        throw new Error('Too many reports just now. Try again later.');
      }
    } catch (error) {
      // Only swallow infrastructure problems. A real limit breach must still
      // stop the write.
      if (error instanceof Error && error.message.startsWith('Too many reports')) throw error;
    }
  }

  async reportClassificationIssue(
    ctx: RequestContext,
    data: ReportClassificationIssueRequest,
  ): Promise<ReportClassificationIssueResponse> {
    const isPageReport = data?.source?.kind === 'page-report';
    // Mirrors the modal's checkbox. Absent means unchecked, which is the safe reading:
    // an older client that does not send the flag gets the anonymized shape enforced.
    const exactImageLinks = (data?.source as any)?.exactImageLinks === true;

    // A page report is an explicit act by the person looking at the page, so it
    // is allowed on its own terms. The dataset-program gate still guards the
    // after-the-fact admin flow, which reads history rather than the page.
    if (!isPageReport) {
      await this.assertClassificationEvalProgramAccess(ctx);
    } else {
      await this.assertPageReportRateLimit(ctx);
    }

    const reporterRole = await this.resolveReporterRole(ctx);

    const normalized = {
      source: {
        kind: isPageReport ? ('page-report' as const) : ('activity-log' as const),
        logRefId: data?.source?.logRefId || null,
        url: this.normalizeUrlForReport(data?.source?.url),
        startTime: typeof data?.source?.startTime === 'number' ? data.source.startTime : null,
        endTime: typeof data?.source?.endTime === 'number' ? data.source.endTime : null,
        clientId: data?.source?.clientId || null,
        duringBlock: data?.source?.duringBlock === true,
      },
      // Derived from the session, never taken from the request: a client
      // claiming to be a guardian must not be able to promote its own reports.
      reporterRole,
      evidence: isPageReport
        ? {
            pageTitle: this.normalizeDatasetText(data?.evidence?.pageTitle, 500),
            pageDescription: this.normalizeDatasetText(data?.evidence?.pageDescription, 2000),
            imageSampleKeys: Array.isArray(data?.evidence?.imageSampleKeys)
              ? data.evidence.imageSampleKeys
                  .slice(0, 50)
                  .map((key: unknown) => normalizeReportImageKey(key, exactImageLinks))
                  .filter((key: string | null): key is string => !!key)
              : [],
            imagesBlocked: typeof data?.evidence?.imagesBlocked === 'number' ? data.evidence.imagesBlocked : null,
            imagesTotal: typeof data?.evidence?.imagesTotal === 'number' ? data.evidence.imagesTotal : null,
          }
        : null,
      // Reports change nothing today. The slot is here so a later re-check can
      // record an outcome without a contract change.
      verdict: {status: 'recorded' as const},
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
      sourceType: isPageReport ? 'pageProblemReport' : 'activityLogClassification',
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

  /**
   * Accept contributed image-classifier decisions.
   *
   * The client is not trusted to have enforced the privacy shape, so this is
   * the enforcement point: hosts are truncated, anything URL-shaped is dropped
   * rather than stored, vectors and image bytes are size-capped, and pixels are
   * accepted ONLY on a sample a person explicitly reported. A background sample
   * arriving with an image is a client bug — the image is discarded and the
   * rest of the row is kept.
   */
  async uploadImageClassificationSamples(
    ctx: RequestContext,
    data: UploadImageClassificationSamplesRequest,
  ): Promise<UploadImageClassificationSamplesResponse> {
    await this.assertClassificationEvalProgramAccess(ctx);

    const samples = Array.isArray(data?.samples) ? data.samples : [];
    const safeSamples = samples.slice(0, ActivityService.IMAGE_SAMPLE_MAX_PER_REQUEST);
    const datasetName = (data?.datasetName || 'image-nsfw').slice(0, 100);
    const datasetId = `${datasetName}-${new Date().toISOString().slice(0, 10)}`;

    await this.ensureClassificationDatasetRegistry(ctx, {
      datasetId,
      name: datasetName,
      description: 'Contributed image-classifier decisions.',
      role: 'mixed',
      task: 'image',
    });

    let inserted = 0;
    let deduped = 0;
    let rejected = 0;

    for (const sample of safeSamples) {
      const imageKey = this.normalizeDatasetText(sample?.imageKey, 400);
      if (!imageKey) {
        rejected++;
        continue;
      }

      const isReported = sample?.trigger === 'reported';

      const details = {
        source: {
          imageKey,
          // A host is a host. If something arrives carrying a path or query it
          // did not come from hostOnly(), so drop it rather than store it.
          sourceHost: this.normalizeHostOnly(sample?.sourceHost),
          pageHost: this.normalizeHostOnly(sample?.pageHost),
          capturedAt: typeof sample?.capturedAt === 'number' ? sample.capturedAt : null,
          trigger: this.normalizeDatasetText(sample?.trigger, 40),
        },
        classification: {
          flagged: sample?.flagged === true,
          reason: this.normalizeDatasetText(sample?.reason, 80),
          topClass: this.normalizeDatasetText(sample?.topClass, 40),
          band: this.normalizeDatasetText(sample?.band, 40),
          bandSignal: this.normalizeDatasetText(sample?.bandSignal, 60),
          bandDistance: typeof sample?.bandDistance === 'number' ? sample.bandDistance : null,
          predictions: Array.isArray(sample?.predictions) ? sample.predictions.slice(0, 10) : [],
          imageAggressionLevel: this.normalizeDatasetText(sample?.imageAggressionLevel, 20),
          thresholds: sample?.thresholds || null,
        },
        modelContext: {
          classifierType: 'image-nsfw',
          modelName: this.normalizeDatasetText(sample?.modelId, 120),
          modelVersion: this.normalizeDatasetText(sample?.modelVersion, 40),
          runLabel: this.normalizeDatasetText(sample?.runtime, 40),
        },
        imageData: {
          featureVector:
            Array.isArray(sample?.featureVector) &&
            sample.featureVector.length <= ActivityService.IMAGE_SAMPLE_MAX_VECTOR_DIMS
              ? sample.featureVector
              : null,
          featureVectorDims: typeof sample?.featureVectorDims === 'number' ? sample.featureVectorDims : null,
          // Pixels only for an explicit report. This is the line the whole
          // consent story rests on, so it is enforced here and not only client-side.
          imageDataUrl:
            isReported &&
            typeof sample?.imageDataUrl === 'string' &&
            sample.imageDataUrl.length <= ActivityService.IMAGE_SAMPLE_MAX_IMAGE_CHARS
              ? sample.imageDataUrl
              : null,
        },
      };

      // Keyed on the image and the model that judged it: the same picture
      // re-decided by a new model is a genuinely new data point, the same
      // picture seen twice by the same model is not.
      const dedupeKey = this.stringHash(
        `image:${datasetId}:${imageKey}:${details.modelContext.modelName || ''}@${details.modelContext.modelVersion || ''}`,
      );

      const existing = await this.classificationDatasetSampleRepo.findLatestByDedupeKey(dedupeKey);
      if (existing?._id) {
        await this.classificationDatasetSampleRepo.updateWithId(existing._id, {
          sampleCount: Number((existing as any)?.sampleCount || 1) + 1,
          lastSeenAt: new Date(),
        } as any);
        deduped++;
        continue;
      }

      await this.classificationDatasetSampleRepo.create({
        dedupeKey,
        datasetId,
        userId: ctx.currentUserId,
        sourceType: 'imageClassificationSample',
        sourceId: dedupeKey,
        details: details as any,
        sampleCount: 1,
        lastSeenAt: new Date(),
        createdAt: new Date(),
      } as any);
      inserted++;
    }

    return {datasetId, received: safeSamples.length, inserted, deduped, rejected};
  }

  /**
   * Keep a value only if it is genuinely just a host. Anything with a slash,
   * scheme, query, or credentials is discarded outright — a partial URL is a
   * privacy leak, and silently trimming one would hide the client bug that
   * produced it.
   */
  private normalizeHostOnly(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed.length > 255) return null;
    if (/[/\\?#@\s]/.test(trimmed) || trimmed.includes(':')) return null;
    if (!/^[a-z0-9.-]+$/.test(trimmed)) return null;
    return trimmed;
  }

  async uploadClassificationDatasetSamples(
    ctx: RequestContext,
    data: UploadClassificationDatasetSamplesRequest,
  ): Promise<UploadClassificationDatasetSamplesResponse> {
    await this.assertClassificationDatasetProgramAccess(ctx);

    const samples = Array.isArray(data?.samples) ? data.samples : [];
    const safeSamples = samples.slice(0, 500);
    const datasetName = (data?.datasetName || 'developer-dataset').slice(0, 100);
    const datasetId = `${datasetName}-${new Date().toISOString().slice(0, 10)}`;

    await this.ensureClassificationDatasetRegistry(ctx, {
      datasetId,
      name: datasetName,
      description: 'Imported from pipeline results.',
      role: 'mixed',
    });

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

      const allowedNavOrigins: ActivityNavOrigin[] = ['search', 'feed', 'direct', 'link', 'unknown'];
      const rawNavOrigin = this.normalizeDatasetText(sample?.sessionContext?.navSource?.origin, 20);
      const normalizedSessionContext = {
        sessionIntent: this.normalizeDatasetText(sample?.sessionContext?.sessionIntent, 60),
        sessionIntentConfidence:
          typeof sample?.sessionContext?.sessionIntentConfidence === 'number'
            ? Math.max(0, Math.min(1, sample.sessionContext.sessionIntentConfidence))
            : null,
        intent: this.normalizeDatasetText(sample?.sessionContext?.intent, 60),
        behaviorSignals: Array.isArray(sample?.sessionContext?.behaviorSignals)
          ? sample.sessionContext.behaviorSignals.slice(0, 20).sort()
          : [],
        socialLevel: typeof sample?.sessionContext?.socialLevel === 'number' ? sample.sessionContext.socialLevel : null,
        primaryContentKind: this.normalizeDatasetText(sample?.sessionContext?.primaryContentKind, 60),
        navSource: {
          origin: rawNavOrigin && (allowedNavOrigins as string[]).includes(rawNavOrigin) ? rawNavOrigin : null,
          searchProviderId: this.normalizeDatasetText(sample?.sessionContext?.navSource?.searchProviderId, 60),
        },
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
          sessionContext: normalizedSessionContext,
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
    const sinceApplied = resolveLogListSince(createdAt);
    const results = await this.userActivityLogRepo
      .findMany(selectBy)
      .where('createdAt', '>=', sinceApplied)
      .orderBy('createdAt', 'desc')
      .limit(ACTIVITY_LOGLIST_MAX_ROWS);

    return {
      invalidateBeforeCreatedAtMs,
      userActivityLog: results.filter((entry) => entry.type !== ActivityService.ACTIVITY_CONTROL_TYPE),
      // Both bounds are reported so a caller can tell a truly empty window
      // from one the server clipped, instead of caching a partial history as
      // if it were complete.
      sinceApplied: sinceApplied.toISOString(),
      truncated: results.length >= ACTIVITY_LOGLIST_MAX_ROWS,
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

    // startTime is client-supplied, so the floor can be pushed back to ~epoch.
    // Also clamp the floor to the same 180-day window logList uses: without
    // both bounds this query materializes the user's entire activity history
    // (the ~70mb-per-row monitor-session table) into heap.
    const requestedFloor = new Date(Math.max(0, startTime - 24 * 60 * 60 * 1000));
    const createdAtFloor = resolveLogListSince(requestedFloor);

    const loadRecentRows = async () => {
      return await this.userActivityLogRepo
        .findMany({userId: targetUserId, type: 'default'})
        .where('createdAt', '>=', createdAtFloor)
        .orderBy('createdAt', 'desc')
        .limit(ACTIVITY_LOGLIST_MAX_ROWS);
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
      .limit(clampPerPage(perPage, 100))
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
  /**
   * Apply a batch of item visits to `item_feedback`.
   *
   * Two fixed queries regardless of batch size. This used to be a loop doing a SELECT and an
   * UPDATE per entry, awaited sequentially — fine while only the webapp reached it, but the
   * client-side gate that kept the extension and Android silent is gone, so it now takes
   * traffic from the whole fleet. A long browsing session could otherwise arrive as one
   * request running hundreds of round trips.
   */
  async updateVisitHistoryForItems_deprecate(ctx: RequestContext, updateList: {id: string; visitTime: string}[]) {
    if (!Array.isArray(updateList) || updateList.length === 0) return null;
    // Deliberately the SERVER ceiling, not the client's flush cap. Clients that predate the
    // cap can hold more than `ITEM_VISIT_MAX_BATCH` queued, and rejecting those would wedge
    // them into retrying the same oversized request until the app updates.
    if (updateList.length > ITEM_VISIT_SERVER_MAX_BATCH) {
      throw new HttpException(400, `updateList must contain 1-${ITEM_VISIT_SERVER_MAX_BATCH} entries`);
    }

    const userId = ctx.currentUserId;

    // Collapse repeats, keeping the newest stamp per item. The client already dedups by id,
    // but this is unvalidated input and a duplicated id would otherwise make the upsert
    // reject the whole batch ("cannot affect row a second time").
    const newestByItemId = new Map<string, number>();
    for (const entry of updateList) {
      const ms = new Date(entry?.visitTime).getTime();
      if (!entry?.id || !Number.isFinite(ms)) continue;
      const prev = newestByItemId.get(entry.id);
      if (prev === undefined || ms > prev) newestByItemId.set(entry.id, ms);
    }
    if (newestByItemId.size === 0) return null;

    const itemIdByFeedbackId = new Map<string, string>();
    for (const itemId of newestByItemId.keys()) {
      itemIdByFeedbackId.set(this.feedbackService.feedbackId(userId, itemId), itemId);
    }

    const existingRows = await this.feedback.findWhereIdIn([...itemIdByFeedbackId.keys()]);
    const existingByFeedbackId = new Map<string, any>(existingRows.map((row: any) => [row._id, row]));

    const countThresholdMs = Date.now() - config.visitCountThresholdSec * 1000;
    const rows = [];
    for (const [feedbackId, itemId] of itemIdByFeedbackId) {
      const incomingMs = newestByItemId.get(itemId) as number;
      const next = resolveVisitRecord(existingByFeedbackId.get(feedbackId), incomingMs, countThresholdMs);
      rows.push({_id: feedbackId, userId, itemId, ...next});
    }

    await this.feedback.upsertVisitRecords(rows);
    return null;
  }

  private async updateLastVisited_deprecate(userId, itemId, visitTime = null) {
    const now = visitTime || new Date();
    const id = this.feedbackService.feedbackId(userId, itemId);
    const feedback = await this.feedbackService._getItemFeedbackById(id);
    const next = resolveVisitRecord(feedback, now.getTime(), Date.now() - config.visitCountThresholdSec * 1000);
    await this.feedback.upsertVisitRecords([{_id: id, userId, itemId, ...next}]);
    return;
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
