/**
 * classificationMetrics — the single, model-agnostic metric implementation.
 *
 * Every classifier family (anchor sets, learned logreg/NN artifacts, pure-LLM
 * candidates) is scored through THIS function so a leaderboard number means the
 * same thing regardless of how the prediction was produced. The anchor scorer
 * ({@link scoreAnchorSet}), the offline `ds:eval` script, and the in-browser
 * evaluation harness all feed `(actual, predicted)` pairs here and read back one
 * shape — accuracy, coverage, macro-F1, per-class P/R/F1, and a confusion matrix.
 *
 * Nothing here is eduValue-specific: callers pass `classOrder`, so the same code
 * scores a binary kid-safety target or a different `task` classifier unchanged.
 *
 * Conventions (load-bearing for comparability):
 *  - Gold label = `groundTruth.humanOverride ?? groundTruth[target]` — see
 *    {@link goldLabel}. A human correction always wins over the LLM label.
 *  - A `null` prediction is an ABSTENTION (the candidate declined to label): it
 *    counts against overall accuracy and recall, but is excluded from coverage
 *    and accuracy-on-labeled. This is what lets abstaining anchor sets compare
 *    fairly against full-coverage candidates.
 *  - Macro-F1 averages over classes with support > 0 (sklearn default), so a
 *    class never seen in the test set doesn't drag the average toward zero.
 */

export type PerClassMetric = {
  precision: number;
  recall: number;
  f1: number;
  support: number;
  tp: number;
  fp: number;
  fn: number;
};

export type Prediction = {
  rowId: number;
  actual: string;
  /** `null` = the candidate abstained (no label above its threshold). */
  predicted: string | null;
  score: number;
};

export type ScoreResult = {
  /** Overall accuracy = correct / total. Abstentions count as wrong. */
  accuracy: number;
  /** Accuracy over only the rows the candidate actually labeled. */
  accuracyOnLabeled: number;
  /** Fraction of rows the candidate labeled (predicted != null). */
  coverage: number;
  /** Macro-averaged F1 over classes with support > 0. */
  macroF1: number;
  correct: number;
  total: number;
  /** Count of non-abstaining predictions. */
  predictedCount: number;
  perClass: Record<string, PerClassMetric>;
  /** confusion[actual][predicted] = count. `__none__` captures abstentions. */
  confusion: Record<string, Record<string, number>>;
  predictions: Prediction[];
};

/** Confusion-matrix key for an abstention (predicted = null). */
export const ABSTAIN = '__none__';

/**
 * The unified gold-label rule. A human override always wins over the LLM label.
 * `target` selects which label dimension to read (defaults to eduValue); v1 only
 * ever passes eduValue, but the seam keeps a future kid-safety / category target
 * additive. Returns null when the sample is unlabeled for this target.
 */
export function goldLabel(details: any, target = 'eduValue'): string | null {
  const gt = details?.groundTruth;
  if (!gt) return null;
  const override = gt.humanOverride;
  if (typeof override === 'string' && override.trim()) return override.trim();
  const base = gt[target];
  return typeof base === 'string' && base.trim() ? base.trim() : null;
}

/**
 * Score a set of `(actual, predicted)` predictions. `classOrder`, when given,
 * fixes the rows of the per-class table and confusion matrix (so 0-support
 * classes still appear); otherwise it's derived from the actual labels present.
 */
export function computeMetrics(predictions: Prediction[], classOrder?: string[]): ScoreResult {
  const classes =
    classOrder && classOrder.length
      ? classOrder
      : Array.from(new Set(predictions.map((p) => p.actual))).sort();

  const tp: Record<string, number> = {};
  const fp: Record<string, number> = {};
  const fn: Record<string, number> = {};
  const support: Record<string, number> = {};
  const confusion: Record<string, Record<string, number>> = {};
  for (const c of classes) {
    tp[c] = 0;
    fp[c] = 0;
    fn[c] = 0;
    support[c] = 0;
  }

  let correct = 0;
  let predictedCount = 0;
  for (const p of predictions) {
    const actual = p.actual;
    const predicted = p.predicted;
    support[actual] = (support[actual] ?? 0) + 1;
    if (predicted != null) predictedCount++;
    const predKey = predicted ?? ABSTAIN;
    (confusion[actual] ??= {})[predKey] = ((confusion[actual] ??= {})[predKey] ?? 0) + 1;

    if (predicted === actual) {
      correct++;
      tp[actual] = (tp[actual] ?? 0) + 1;
    } else {
      fn[actual] = (fn[actual] ?? 0) + 1;
      if (predicted) fp[predicted] = (fp[predicted] ?? 0) + 1;
    }
  }

  const perClass: Record<string, PerClassMetric> = {};
  for (const c of classes) {
    const t = tp[c] ?? 0;
    const f = fp[c] ?? 0;
    const n = fn[c] ?? 0;
    const precision = t + f > 0 ? t / (t + f) : 0;
    const recall = t + n > 0 ? t / (t + n) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    perClass[c] = { precision, recall, f1, support: support[c] ?? 0, tp: t, fp: f, fn: n };
  }

  const withSupport = classes.filter((c) => (perClass[c]?.support ?? 0) > 0);
  const macroF1 = withSupport.length
    ? withSupport.reduce((s, c) => s + perClass[c].f1, 0) / withSupport.length
    : 0;

  const total = predictions.length;
  return {
    accuracy: total > 0 ? correct / total : 0,
    accuracyOnLabeled: predictedCount > 0 ? correct / predictedCount : 0,
    coverage: total > 0 ? predictedCount / total : 0,
    macroF1,
    correct,
    total,
    predictedCount,
    perClass,
    confusion,
    predictions,
  };
}

export type RunChurn = { shared: number; changed: number; fixed: number; broke: number };

/**
 * Row-level diff between two runs keyed by a stable id (URL offline, sampleId in
 * the UI). Reports how many shared rows changed prediction, and of those how many
 * the second run newly got right (`fixed`) vs newly got wrong (`broke`). This is
 * the "which rows did A get wrong that B got right" comparison.
 */
export function diffRuns(
  a: { key: string | number; gold: string; pred: string | null }[],
  b: { key: string | number; gold: string; pred: string | null }[],
): RunChurn {
  const bByKey = new Map(b.map((p) => [p.key, p]));
  let shared = 0;
  let changed = 0;
  let fixed = 0;
  let broke = 0;
  for (const pa of a) {
    const pb = bByKey.get(pa.key);
    if (!pb) continue;
    shared++;
    if (pa.pred !== pb.pred) {
      changed++;
      const aOk = pa.gold === pa.pred;
      const bOk = pb.gold === pb.pred;
      if (!aOk && bOk) fixed++;
      if (aOk && !bOk) broke++;
    }
  }
  return { shared, changed, fixed, broke };
}
