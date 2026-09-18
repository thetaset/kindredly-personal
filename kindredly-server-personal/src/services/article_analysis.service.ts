import {ContentExtractionService, type ExtractedArticle} from './content_extraction.service';
import {SourceReputationService, normalizeHost} from './source_reputation.service';
import {getArticleInferenceProvider} from './inference/article_inference';
import type {RequestContext} from '@/base/request_context';
import {familyAiSetting, familyAllowsHostedAi} from 'tset-sharedlib/family-ai';
import type {
  ArticleAnalyzeRequest,
  ArticleSignal,
  ArticleTrustResult,
  ArticleTrustScore,
  ReputationRecord,
} from 'tset-sharedlib/types/articleTrust.types';

const MAX_CITED_LOOKUPS = 20;

const CLICKBAIT_PATTERNS: RegExp[] = [
  /you ?won'?t believe/i,
  /this one (weird |simple )?trick/i,
  /will blow your mind/i,
  /what happened next/i,
  /doctors hate/i,
  /\bgone wrong\b/i,
  /number \d+ will (shock|surprise)/i,
  /\bshocking\b/i,
  /\bjaw[- ]dropping\b/i,
];

const LISTICLE_TITLE = /^\s*\d+\s+(things|reasons|ways|signs|facts|times|secrets)\b/i;

const SENSATIONAL_WORDS = new Set([
  'shocking',
  'outrageous',
  'bombshell',
  'slammed',
  'destroyed',
  'insane',
  'unbelievable',
  'terrifying',
  'explosive',
  'meltdown',
  'furious',
  'blasted',
  'erupts',
  'chaos',
  'catastrophic',
  'miracle',
  'exposed',
  'horrifying',
  'disgraceful',
  'epic',
  'savage',
  'brutal',
  'stunning',
]);

// ---------------------------------------------------------------------------
// Pure checks (no I/O) — unit-testable in isolation.
// ---------------------------------------------------------------------------

export function sourceReputationCheck(source: ReputationRecord | null): ArticleSignal | null {
  if (!source || source.credibility === 'unknown') return null;
  const biasNote = source.bias !== 'na' && source.bias !== 'none' ? ` (${source.bias} lean)` : '';
  const base = `Source: ${source.domain}`;
  switch (source.credibility) {
    case 'high':
      return {
        id: 'source',
        label: `${base} — high credibility${biasNote}`,
        direction: 'positive',
        severity: 'positive',
        detail: source.notes || '',
      };
    case 'mostly':
      return {
        id: 'source',
        label: `${base} — generally reliable${biasNote}`,
        direction: 'positive',
        severity: 'positive',
        detail: source.notes || '',
      };
    case 'mixed':
      return {
        id: 'source',
        label: `${base} — mixed reliability${biasNote}`,
        direction: 'negative',
        severity: 'caution',
        detail: source.notes || '',
      };
    case 'low':
      return {
        id: 'source',
        label: `${base} — low credibility${biasNote}`,
        direction: 'negative',
        severity: 'warning',
        detail: source.notes || '',
      };
    case 'satire':
      return {
        id: 'source',
        label: `${base} — satire, not factual reporting`,
        direction: 'negative',
        severity: 'warning',
        detail: source.notes || '',
      };
    default:
      return null;
  }
}

export function bylineCheck(byline: string | null): ArticleSignal {
  if (byline && byline.trim()) {
    return {
      id: 'byline',
      label: 'Author/byline present',
      direction: 'positive',
      severity: 'positive',
      detail: byline.slice(0, 120),
    };
  }
  return {
    id: 'byline',
    label: 'No author/byline found',
    direction: 'negative',
    severity: 'caution',
    detail: 'Transparent reporting usually names an author.',
  };
}

export function dateCheck(publishedAt: string | null): ArticleSignal | null {
  if (publishedAt && publishedAt.trim()) {
    return {
      id: 'date',
      label: 'Publish date present',
      direction: 'positive',
      severity: 'positive',
      detail: publishedAt.slice(0, 40),
    };
  }
  return null; // Missing date is neutral — many legitimate pages omit it.
}

export function clickbaitHeadlineCheck(title: string | null): ArticleSignal | null {
  if (!title) return null;
  const words = title.split(/\s+/).filter(Boolean);
  const capsWords = words.filter((w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  const allCaps = words.length >= 4 && capsWords.length / words.length > 0.4;
  const exclaim = (title.match(/!/g) || []).length >= 2;
  const pattern = CLICKBAIT_PATTERNS.some((re) => re.test(title)) || LISTICLE_TITLE.test(title);
  if (allCaps || exclaim || pattern) {
    return {
      id: 'clickbait',
      label: 'Headline uses clickbait / sensational phrasing',
      direction: 'negative',
      severity: 'warning',
      detail: 'Sensational headlines are a weak signal of reliability.',
    };
  }
  return null;
}

export function sensationalLanguageCheck(text: string, wordCount: number): ArticleSignal | null {
  if (!text || wordCount < 50) return null;
  const tokens = text.toLowerCase().match(/[a-z']+/g) || [];
  let matches = 0;
  for (const t of tokens) if (SENSATIONAL_WORDS.has(t)) matches++;
  const ratio = matches / Math.max(wordCount, 1);
  if (matches >= 3 && ratio > 0.012) {
    return {
      id: 'sensational',
      label: 'Frequent sensational/charged language',
      direction: 'negative',
      severity: 'caution',
      detail: `${matches} charged terms (${(ratio * 100).toFixed(1)}% of words).`,
    };
  }
  return null;
}

export function citationCheck(links: string[], cited: ReputationRecord[]): ArticleSignal[] {
  const out: ArticleSignal[] = [];
  if (!links.length) {
    out.push({
      id: 'citations-none',
      label: 'No outbound citations',
      direction: 'negative',
      severity: 'caution',
      detail: 'Sourced reporting usually links to references.',
    });
    return out;
  }
  const reputable = cited.filter((c) => c.credibility === 'high' || c.credibility === 'mostly').length;
  const low = cited.filter((c) => c.credibility === 'low' || c.credibility === 'satire').length;
  if (reputable > 0) {
    out.push({
      id: 'citations-reputable',
      label: `Cites ${reputable} reputable source${reputable > 1 ? 's' : ''}`,
      direction: 'positive',
      severity: 'positive',
      detail: '',
    });
  }
  if (low > 0) {
    out.push({
      id: 'citations-low',
      label: `Links to ${low} low-credibility source${low > 1 ? 's' : ''}`,
      direction: 'negative',
      severity: 'warning',
      detail: '',
    });
  }
  if (reputable === 0 && low === 0) {
    out.push({
      id: 'citations-unknown',
      label: `${links.length} outbound link${links.length > 1 ? 's' : ''}; none rated`,
      direction: 'neutral',
      severity: 'info',
      detail: '',
    });
  }
  return out;
}

export function runArticleChecks(ctx: {
  extraction: Pick<ExtractedArticle, 'title' | 'byline' | 'publishedAt' | 'text' | 'wordCount' | 'links'>;
  source: ReputationRecord | null;
  cited: ReputationRecord[];
}): ArticleSignal[] {
  const {extraction, source, cited} = ctx;
  const signals: Array<ArticleSignal | null> = [
    sourceReputationCheck(source),
    bylineCheck(extraction.byline),
    dateCheck(extraction.publishedAt),
    clickbaitHeadlineCheck(extraction.title),
    sensationalLanguageCheck(extraction.text, extraction.wordCount),
    ...citationCheck(extraction.links, cited),
  ];
  return signals.filter((s): s is ArticleSignal => s !== null);
}

export function aggregateScore(signals: ArticleSignal[], source: ReputationRecord | null): ArticleTrustScore {
  let base = 1.0; // neutral baseline for unknown sources
  if (source) {
    if (source.credibility === 'high' || source.credibility === 'mostly') base = 2.0;
    else if (source.credibility === 'mixed') base = 1.0;
    else if (source.credibility === 'low' || source.credibility === 'satire') base = 0.0;
  }

  let positive = 0;
  let negative = 0;
  for (const s of signals) {
    if (s.direction === 'positive') positive += 0.4;
    else if (s.direction === 'negative') negative += s.severity === 'warning' ? 1.0 : 0.4;
  }
  const adjust = Math.max(-2.0, Math.min(1.0, Math.min(positive, 1.0) - negative));
  const final = Math.max(0, Math.min(2, base + adjust));

  let label: ArticleTrustScore['label'] = final >= 1.6 ? 'high' : final >= 0.8 ? 'mixed' : 'low';
  // Low-credibility / satire sources are a hard anchor — never lift above "low".
  if (source && (source.credibility === 'low' || source.credibility === 'satire')) label = 'low';
  // An unknown source can't be called "high" on on-page signals alone — source
  // trust must anchor that. Cap at "mixed" until we actually know the source.
  else if ((!source || source.credibility === 'unknown') && label === 'high') label = 'mixed';

  const reasons: string[] = [];
  const sourceSignal = signals.find((s) => s.id === 'source');
  if (sourceSignal) reasons.push(sourceSignal.label);
  for (const s of signals) {
    if (s.severity === 'warning' && s.id !== 'source') reasons.push(s.label);
  }
  if (label === 'high' && reasons.every((r) => !/low|clickbait|sensational/i.test(r))) {
    reasons.push('No major credibility red flags detected.');
  }
  return {label, reasons: Array.from(new Set(reasons)).slice(0, 4)};
}

// ---------------------------------------------------------------------------
// Orchestrator (I/O): extraction + reputation + checks + optional inference.
// ---------------------------------------------------------------------------

class ArticleAnalysisService {
  private extraction = ContentExtractionService.instance;
  private reputation = SourceReputationService.instance;

  private static _instance: ArticleAnalysisService | null = null;
  static get instance(): ArticleAnalysisService {
    if (!this._instance) this._instance = new ArticleAnalysisService();
    return this._instance;
  }

  private async citedReputations(links: string[]): Promise<ReputationRecord[]> {
    const hosts: string[] = [];
    const seen = new Set<string>();
    for (const link of links) {
      const host = normalizeHost(link);
      if (host && !seen.has(host)) {
        seen.add(host);
        hosts.push(host);
        if (hosts.length >= MAX_CITED_LOOKUPS) break;
      }
    }
    const records = await Promise.all(hosts.map((h) => this.reputation.lookup(h)));
    return records.filter((r): r is ReputationRecord => r !== null);
  }

  /**
   * The hosted summary goes to Kindredly.ai, so a family gets one only when its AI setting is On
   * (PLN-3). Without a family (no account on `ctx`) it is not a family's request.
   */
  private async familyAllowsHostedSummary(ctx?: RequestContext): Promise<boolean> {
    if (!ctx?.accountId) return true;
    const account = (await ctx.getAccount().catch(() => null)) as {options?: {aiSetting?: unknown} | null} | null;
    return familyAllowsHostedAi(familyAiSetting(account?.options));
  }

  /** `ctx` is the family asking; an optional hosted summary is charged to them. */
  async analyze(req: ArticleAnalyzeRequest, ctx?: RequestContext): Promise<ArticleTrustResult> {
    const url = String(req?.url || '');
    const domain = normalizeHost(url);

    const extraction = await this.extraction.extract({
      url,
      title: req.title,
      text: req.text,
      byline: req.byline,
      publishedAt: req.publishedAt,
      links: req.links,
      html: req.html,
    });
    const source = url ? await this.reputation.lookup(url) : null;

    // Not an article → informational, NOT a negative trust verdict.
    if (!extraction.hasArticle) {
      return {
        url,
        domain,
        source,
        article: {
          hasArticle: false,
          title: extraction.title,
          byline: null,
          publishedAt: null,
          wordCount: extraction.wordCount,
        },
        signals: [],
        score: null,
        llm: null,
        status: 'no-article',
      };
    }

    const cited = await this.citedReputations(extraction.links);
    const signals = runArticleChecks({extraction, source, cited});
    const score = aggregateScore(signals, source);

    let llm = null;
    const provider = getArticleInferenceProvider();
    if (provider.isEnabled() && (await this.familyAllowsHostedSummary(ctx))) {
      llm = await provider.analyze({url, title: extraction.title, text: extraction.text, source, signals}, ctx);
    }

    return {
      url,
      domain,
      source,
      article: {
        hasArticle: true,
        title: extraction.title,
        byline: extraction.byline,
        publishedAt: extraction.publishedAt,
        wordCount: extraction.wordCount,
      },
      signals,
      score,
      llm,
      status: 'ok',
    };
  }
}

export default ArticleAnalysisService;
export {ArticleAnalysisService};
