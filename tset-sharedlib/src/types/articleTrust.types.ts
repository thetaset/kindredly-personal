/**
 * Article-trust types — shared between the client Monitor widget and the
 * server article-trust services.
 *
 * The trust signal is owned by us: a source-reputation lookup (a simple
 * URL→domain database) plus a rule-based analysis pipeline. Neither depends on
 * an LLM; the optional `llm` enrichment is off by default behind a provider
 * seam (so a future local-inference engine can fill it). Pages that aren't
 * articles are never labelled untrustworthy — they return status `no-article`.
 */

/** Coarse credibility band for a known source/domain. */
export type ReputationCredibility = 'high' | 'mostly' | 'mixed' | 'low' | 'satire' | 'unknown';

/** Coarse political/ideological lean for a known source/domain. */
export type ReputationBias =
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right'
  | 'none'
  | 'na';

/** Where a reputation record came from. */
export type ReputationSource = 'seed' | 'admin' | 'imported';

/** A single known-source reputation record (one row of the owned database). */
export interface ReputationRecord {
  domain: string;
  credibility: ReputationCredibility;
  bias: ReputationBias;
  /** Free-form category, e.g. 'news', 'reference', 'science', 'social'. */
  category: string | null;
  /** 0..1 confidence in this record. */
  confidence: number;
  notes: string | null;
  source: ReputationSource;
}

/** Whether a signal pushes trust up, down, or is neutral context. */
export type ArticleSignalDirection = 'positive' | 'negative' | 'neutral';

export type ArticleSignalSeverity = 'positive' | 'info' | 'caution' | 'warning';

/** One rule-pipeline check result. */
export interface ArticleSignal {
  id: string;
  label: string;
  direction: ArticleSignalDirection;
  severity: ArticleSignalSeverity;
  detail: string;
}

/** Coarse aggregate trust label. */
export type ArticleTrustLabel = 'low' | 'mixed' | 'high';

export interface ArticleTrustScore {
  label: ArticleTrustLabel;
  reasons: string[];
}

export interface ArticleInfo {
  hasArticle: boolean;
  title?: string | null;
  byline?: string | null;
  publishedAt?: string | null;
  wordCount: number;
}

/** Optional LLM enrichment (off by default; populated only when enabled). */
export interface ArticleTrustLlm {
  summary?: string | null;
  notes?: string[];
  model?: string | null;
}

export type ArticleTrustStatus = 'ok' | 'no-article' | 'offline' | 'error';

export interface ArticleTrustResult {
  url: string;
  domain: string | null;
  /** Reputation record for the source, or null when unknown. */
  source: ReputationRecord | null;
  article: ArticleInfo;
  signals: ArticleSignal[];
  /** Aggregate score; null when there is no article to score. */
  score: ArticleTrustScore | null;
  /** Optional, off-by-default enrichment. */
  llm?: ArticleTrustLlm | null;
  status: ArticleTrustStatus;
}

export interface ArticleAnalyzeRequest {
  url: string;
  title?: string;
  /**
   * Client-extracted fields from the live rendered DOM — the primary path. The
   * server analyzes these directly and NEVER fetches the page itself.
   */
  text?: string;
  byline?: string;
  publishedAt?: string;
  /** Outbound absolute links from the article body (for citation cross-reference). */
  links?: string[];
  /**
   * Optional rendered-HTML fallback. Parsed server-side only if provided; still
   * never fetched. The client normally sends structured fields instead.
   */
  html?: string;
}

export type ArticleAnalyzeResponse = ArticleTrustResult;
