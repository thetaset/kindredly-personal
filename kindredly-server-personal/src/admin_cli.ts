import {config} from '@/config';
import fs from 'fs';

import {dropAllData, dropAllTables} from '@/db/dbadmin.util';
import {ReportProblemRepo} from '@/db/report_problem.repo';
import {ClassificationFeedbackReportRepo} from '@/db/classification_feedback_report.repo';
import {ClassificationDatasetSampleRepo} from '@/db/classification_dataset_sample.repo';
import AdminService from '@/services/_internal/admin.service';
import {RequestContext} from '@/base/request_context';

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return undefined;
  return next;
}

function getNumberArg(flag: string, fallback: number): number {
  const raw = getArgValue(flag);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function getRequiredArg(flag: string): string {
  const value = (getArgValue(flag) || '').trim();
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }
  return value;
}

function readOptionalConfigJson(): string | undefined {
  const inlineJson = (getArgValue('--model-config-json') || '').trim();
  if (inlineJson) return inlineJson;

  const configPath = (getArgValue('--model-config-file') || '').trim();
  if (!configPath) return undefined;
  return fs.readFileSync(configPath, 'utf-8');
}

async function backfillClassificationEvalData(dryRun = false) {
  const reportProblemRepo = new ReportProblemRepo();
  const feedbackRepo = new ClassificationFeedbackReportRepo();
  const sampleRepo = new ClassificationDatasetSampleRepo();

  const legacyRows = await reportProblemRepo
    .query()
    .whereIn('category', ['classificationIssue', 'classificationDatasetSample'])
    .orderBy('createdAt', 'asc');

  if (!legacyRows.length) {
    console.log('[classification-eval-backfill] no legacy rows found; nothing to migrate', {
      dryRun,
      totalLegacyRows: 0,
      note: 'Forward-only ingestion mode is active; client opt-in uploads can proceed without backfill.',
    });
    return;
  }

  let issuesMigrated = 0;
  let issueRowsUpdated = 0;
  let samplesMigrated = 0;
  let sampleRowsUpdated = 0;
  let skipped = 0;

  for (const row of legacyRows as any[]) {
    const adminInfo = row?.adminStatusInfo && typeof row.adminStatusInfo === 'object' ? row.adminStatusInfo : {};
    const dedupeKey = row?.sourceId || (adminInfo as any)?.dedupeKey || null;
    if (!dedupeKey) {
      skipped++;
      continue;
    }

    if (row.category === 'classificationIssue') {
      const existing = await feedbackRepo.findLatestByDedupeKey(dedupeKey);
      const legacyCount = Number((adminInfo as any)?.reportCount || 1);
      const legacyLastReportedAt = (adminInfo as any)?.lastReportedAt
        ? new Date((adminInfo as any).lastReportedAt)
        : row.createdAt
          ? new Date(row.createdAt)
          : new Date();

      if (existing?._id) {
        issueRowsUpdated++;
        if (!dryRun) {
          await feedbackRepo.updateWithId(existing._id, {
            reportCount: Math.max(Number((existing as any)?.reportCount || 1), legacyCount),
            lastReportedAt: legacyLastReportedAt,
          } as any);
        }
        continue;
      }

      issuesMigrated++;
      if (!dryRun) {
        await feedbackRepo.create({
          dedupeKey,
          userId: row.userId || null,
          sourceType: row.sourceType || 'activityLogClassification',
          sourceId: row.sourceId || dedupeKey,
          details: row.details || {},
          reportCount: legacyCount,
          lastReportedAt: legacyLastReportedAt,
          createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        } as any);
      }
      continue;
    }

    if (row.category === 'classificationDatasetSample') {
      const existing = await sampleRepo.findLatestByDedupeKey(dedupeKey);
      const legacyCount = Number((adminInfo as any)?.sampleCount || 1);
      const legacyLastSeenAt = (adminInfo as any)?.lastSeenAt
        ? new Date((adminInfo as any).lastSeenAt)
        : row.createdAt
          ? new Date(row.createdAt)
          : new Date();
      const datasetId =
        (adminInfo as any)?.datasetId || (row.details as any)?.datasetId || 'legacy-report-problem-backfill';

      if (existing?._id) {
        sampleRowsUpdated++;
        if (!dryRun) {
          await sampleRepo.updateWithId(existing._id, {
            datasetId,
            sampleCount: Math.max(Number((existing as any)?.sampleCount || 1), legacyCount),
            lastSeenAt: legacyLastSeenAt,
          } as any);
        }
        continue;
      }

      samplesMigrated++;
      if (!dryRun) {
        await sampleRepo.create({
          dedupeKey,
          datasetId,
          userId: row.userId || null,
          sourceType: row.sourceType || 'activityPipelineSample',
          sourceId: row.sourceId || dedupeKey,
          details: row.details || {},
          sampleCount: legacyCount,
          lastSeenAt: legacyLastSeenAt,
          createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        } as any);
      }
      continue;
    }
  }

  console.log('[classification-eval-backfill] complete', {
    dryRun,
    totalLegacyRows: legacyRows.length,
    issuesMigrated,
    issueRowsUpdated,
    samplesMigrated,
    sampleRowsUpdated,
    skipped,
  });
}

async function verifyClassificationEvalIngestion() {
  const reportProblemRepo = new ReportProblemRepo();
  const feedbackRepo = new ClassificationFeedbackReportRepo();
  const sampleRepo = new ClassificationDatasetSampleRepo();

  const [
    legacyIssueCount,
    legacySampleCount,
    legacyIssueWithSourceIdCount,
    legacySampleWithSourceIdCount,
    dedicatedIssueCount,
    dedicatedSampleCount,
  ] = await Promise.all([
    reportProblemRepo.query().where({category: 'classificationIssue'}).count().first(),
    reportProblemRepo.query().where({category: 'classificationDatasetSample'}).count().first(),
    reportProblemRepo.query().where({category: 'classificationIssue'}).whereNotNull('sourceId').count().first(),
    reportProblemRepo.query().where({category: 'classificationDatasetSample'}).whereNotNull('sourceId').count().first(),
    feedbackRepo.query().count().first(),
    sampleRepo.query().count().first(),
  ]);

  const [
    legacyDistinctIssueDedupe,
    legacyDistinctSampleDedupe,
    dedicatedDistinctIssueDedupe,
    dedicatedDistinctSampleDedupe,
  ] = await Promise.all([
    reportProblemRepo
      .query()
      .where({category: 'classificationIssue'})
      .whereNotNull('sourceId')
      .countDistinct({count: 'sourceId'})
      .first(),
    reportProblemRepo
      .query()
      .where({category: 'classificationDatasetSample'})
      .whereNotNull('sourceId')
      .countDistinct({count: 'sourceId'})
      .first(),
    feedbackRepo.query().countDistinct({count: 'dedupeKey'}).first(),
    sampleRepo.query().countDistinct({count: 'dedupeKey'}).first(),
  ]);

  const summary = {
    legacy: {
      issueRows: Number((legacyIssueCount as any)?.count || 0),
      sampleRows: Number((legacySampleCount as any)?.count || 0),
      issueRowsWithSourceId: Number((legacyIssueWithSourceIdCount as any)?.count || 0),
      sampleRowsWithSourceId: Number((legacySampleWithSourceIdCount as any)?.count || 0),
      distinctIssueDedupeKeys: Number((legacyDistinctIssueDedupe as any)?.count || 0),
      distinctSampleDedupeKeys: Number((legacyDistinctSampleDedupe as any)?.count || 0),
    },
    dedicated: {
      issueRows: Number((dedicatedIssueCount as any)?.count || 0),
      sampleRows: Number((dedicatedSampleCount as any)?.count || 0),
      distinctIssueDedupeKeys: Number((dedicatedDistinctIssueDedupe as any)?.count || 0),
      distinctSampleDedupeKeys: Number((dedicatedDistinctSampleDedupe as any)?.count || 0),
    },
  };

  const verdict = {
    issueDedupeCoverage: summary.dedicated.distinctIssueDedupeKeys >= summary.legacy.distinctIssueDedupeKeys,
    sampleDedupeCoverage: summary.dedicated.distinctSampleDedupeKeys >= summary.legacy.distinctSampleDedupeKeys,
  };

  const mode = {
    hasLegacyRows: summary.legacy.issueRows + summary.legacy.sampleRows > 0,
    interpretation:
      summary.legacy.issueRows + summary.legacy.sampleRows > 0
        ? 'Legacy migration verification mode'
        : 'Forward-only ingestion mode (no legacy migration required)',
  };

  console.log('[classification-eval-ingestion] verification', {
    summary,
    verdict,
    mode,
  });
}

async function listClassificationEvalRunHistory() {
  const datasetId = getRequiredArg('--dataset-id');
  const maxSamples = Math.max(1, Math.min(50000, getNumberArg('--max-samples', 5000)));
  const sampleRepo = new ClassificationDatasetSampleRepo();

  const rows = await sampleRepo
    .query()
    .where('datasetId', datasetId)
    .orderBy('_id', 'asc')
    .limit(maxSamples)
    .select('_id', 'details');

  const byRunId = new Map<
    string,
    {
      runId: string;
      classifierType?: string;
      modelVersion?: string;
      runLabel?: string;
      modelConfigHash?: string;
      modelConfigJson?: string;
      sampleCount: number;
      mismatchCandidateCount: number;
      latestClassifiedAt: string | null;
    }
  >();

  for (const row of rows as any[]) {
    const details = row?.details || {};
    const runs = Array.isArray(details?.modelRuns) ? details.modelRuns : [];

    for (const run of runs as any[]) {
      const runId = typeof run?.runId === 'string' ? run.runId.trim() : '';
      if (!runId) continue;

      const current = byRunId.get(runId) || {
        runId,
        classifierType: run?.classifierType,
        modelVersion: run?.modelVersion,
        runLabel: run?.runLabel,
        modelConfigHash: run?.modelConfigHash,
        modelConfigJson: run?.modelConfigJson,
        sampleCount: 0,
        mismatchCandidateCount: 0,
        latestClassifiedAt: null,
      };

      current.sampleCount += 1;
      if (run?.predictedEduValue) current.mismatchCandidateCount += 1;

      const classifiedAt = typeof run?.classifiedAt === 'string' ? run.classifiedAt : null;
      if (classifiedAt && (!current.latestClassifiedAt || classifiedAt > current.latestClassifiedAt)) {
        current.latestClassifiedAt = classifiedAt;
      }

      byRunId.set(runId, current);
    }
  }

  const runs = Array.from(byRunId.values()).sort((a, b) => {
    if (a.latestClassifiedAt && b.latestClassifiedAt) return a.latestClassifiedAt < b.latestClassifiedAt ? 1 : -1;
    if (a.latestClassifiedAt) return -1;
    if (b.latestClassifiedAt) return 1;
    return a.runId < b.runId ? 1 : -1;
  });

  console.log('[classification-eval-runs] history', {
    datasetId,
    scanned: rows.length,
    distinctRunIds: runs.length,
    runs,
  });
}

async function runClassificationEvalGroundTruthFromCli() {
  const datasetId = getRequiredArg('--dataset-id');
  const maxSamples = Math.max(1, Math.min(1000, getNumberArg('--max-samples', 200)));
  const model = getArgValue('--model');

  const adminService = new AdminService();
  const result = await adminService.runClassificationDatasetGroundTruth(datasetId, {
    maxSamples,
    model,
  });

  console.log('[classification-eval-ground-truth] complete', result);
}

async function runClassificationEvalReplayFromCli() {
  const datasetId = getRequiredArg('--dataset-id');
  const maxSamples = Math.max(1, Math.min(1000, getNumberArg('--max-samples', 200)));
  const classifierTypeArg = (getArgValue('--classifier-type') || '').trim();
  const classifierType = classifierTypeArg === 'task_runner' ? 'task_runner' : 'source_priority';
  const modelVersion = getArgValue('--model-version');
  const runLabel = getArgValue('--run-label');
  const modelConfigJson = readOptionalConfigJson();

  const adminService = new AdminService();
  const ctx = RequestContext.instanceForSystem();
  const result = await adminService.runClassificationDatasetReplay(ctx, datasetId, {
    maxSamples,
    classifierType,
    modelVersion,
    runLabel,
    modelConfigJson,
  });

  console.log('[classification-eval-replay] complete', result);
}

async function compareClassificationEvalRunsFromCli() {
  const datasetId = getRequiredArg('--dataset-id');
  const runIdA = getRequiredArg('--run-id-a');
  const runIdB = getRequiredArg('--run-id-b');
  const maxSamples = Math.max(1, Math.min(20000, getNumberArg('--max-samples', 5000)));

  const adminService = new AdminService();
  const result = await adminService.compareClassificationDatasetRuns(datasetId, {
    runIdA,
    runIdB,
    maxSamples,
  });

  console.log('[classification-eval-compare-runs] complete', result);
}

async function main() {
  //check command line arguments

  if (process.argv.length < 3) {
    console.log('Usage: node admin_cli.js <command> [options]');
    console.log('Commands:');
    console.log('  drop_all_tables');
    console.log('  drop_all_data');
    console.log('  backfill_classification_eval [--dry-run]  # optional: only for legacy report_problem migration');
    console.log(
      '  verify_classification_eval_ingestion       # primary verification for forward-only ingestion and legacy migration checks',
    );
    console.log('  classification_eval_list_runs --dataset-id <id> [--max-samples <n>]');
    console.log(
      '  classification_eval_ground_truth --dataset-id <id> [--max-samples <n>] [--model <gpt-4o-mini|o3-mini>]',
    );
    console.log(
      '  classification_eval_replay --dataset-id <id> [--max-samples <n>] [--classifier-type <source_priority|task_runner>] [--model-version <value>] [--run-label <value>] [--model-config-json <json> | --model-config-file <path>]',
    );
    console.log(
      '  classification_eval_compare_runs --dataset-id <id> --run-id-a <id> --run-id-b <id> [--max-samples <n>]',
    );
    return;
  }

  const command = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  switch (command) {
    case '--drop_all_tables':
      if (config.env == 'production') {
        console.log('Not allowed in production');
        return;
      }

      await dropAllTables();
      break;
    case '--drop_all_data':
      if (config.env == 'production') {
        console.log('Not allowed in production');
        return;
      }
      await dropAllData();
      break;
    case '--backfill_classification_eval':
      await backfillClassificationEvalData(dryRun);
      break;
    case '--verify_classification_eval_ingestion':
      await verifyClassificationEvalIngestion();
      break;
    case '--classification_eval_list_runs':
      await listClassificationEvalRunHistory();
      break;
    case '--classification_eval_ground_truth':
      await runClassificationEvalGroundTruthFromCli();
      break;
    case '--classification_eval_replay':
      await runClassificationEvalReplayFromCli();
      break;
    case '--classification_eval_compare_runs':
      await compareClassificationEvalRunsFromCli();
      break;
    default:
      console.log('Unknown command: ' + command);
  }

  process.exit(0);
}

main();
