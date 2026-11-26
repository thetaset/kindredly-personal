import {createHash} from 'crypto';

/**
 * A dataset sample's gold ("Final") eduValue label: the human override when set, else the LLM
 * ground-truth label. The admin pages' accuracy, the test-set signature and the classifier
 * scorecards (CLS-7) all read it through this expression, so they agree on what is right.
 */
export const FINAL_LABEL_SQL = `COALESCE(NULLIF(details->'groundTruth'->>'humanOverride', ''), details->'groundTruth'->>'eduValue')`;

/**
 * A sample's gold topics (CLS-11): a person's `humanTopics` when they are a list (an empty list
 * included: no topic fits), else the AI's `topics`. A cleared `humanTopics` is JSON null, which
 * COALESCE alone would keep. Selected as jsonb; `goldTopicsOf` reads it.
 */
export const FINAL_TOPICS_SQL = `COALESCE(CASE WHEN jsonb_typeof(details->'groundTruth'->'humanTopics') = 'array' THEN details->'groundTruth'->'humanTopics' END, details->'groundTruth'->'topics')`;

export function goldTopicsOf(value: unknown): string[] {
  const parsed = typeof value === 'string' ? safeJson(value) : value;
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}
function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * A dataset's signature: sha256 over its labelled samples' `id:gold` pairs in id order, a page's
 * gold topics added after its pair when it has any. It changes when a sample is added, removed,
 * relabelled or given other topics, so a score taken before the change no longer counts. A set
 * with no topics signs as it did before topics existed. `rows` must already be in id order.
 */
export function datasetSignature(rows: Array<{_id: number | string; gold: string | null; goldTopics?: string[]}>): {
  signature: string;
  labeledCount: number;
} {
  const hasGold = (row: {gold: string | null}) => row.gold != null && String(row.gold).length > 0;
  const signed = rows.filter((row) => hasGold(row) || row.goldTopics?.length);
  const signature = createHash('sha256')
    .update(
      signed
        .map((row) => `${row._id}:${row.gold ?? ''}${row.goldTopics?.length ? `:t=${row.goldTopics.join(',')}` : ''}`)
        .join('|'),
    )
    .digest('hex');
  return {signature, labeledCount: rows.filter(hasGold).length};
}

/** The page's address as a sample recorded it: its canonical address, else the address it was read at. */
export function sampleUrl(details: any): string | null {
  for (const url of [details?.pageData?.canonicalUrl, details?.source?.url]) {
    if (typeof url === 'string' && url.trim()) return url;
  }
  return null;
}
