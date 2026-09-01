import {SourceReputationRepo, type SourceReputationRow} from '@/db/source_reputation.repo';
import {findSourcePriorityDomainRule} from './source_priority_domain_policy';
import {SOURCE_REPUTATION_SEED} from './source_reputation_seed';
import type {ReputationBias, ReputationCredibility, ReputationRecord} from 'tset-sharedlib/types/articleTrust.types';

/** Extract a normalized hostname (lowercased, no leading www) from a URL or bare domain. */
export function normalizeHost(input: string): string | null {
  const raw = String(input || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  let host: string;
  try {
    const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    host = new URL(withScheme).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '');
  if (!host.includes('.')) return null;
  return host;
}

/**
 * Candidate domains to try, most-specific first: the full host, then progressively
 * strip the leftmost label down to (but not below) the registrable two labels.
 * e.g. news.bbc.co.uk -> [news.bbc.co.uk, bbc.co.uk, co.uk]
 */
export function domainCandidates(host: string): string[] {
  const parts = host.split('.').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i <= parts.length - 2; i++) {
    out.push(parts.slice(i).join('.'));
  }
  return out;
}

function eduValueToCredibility(eduValue: string): ReputationCredibility {
  if (eduValue === 'eduval_educational' || eduValue === 'eduval_task') return 'mostly';
  if (eduValue === 'eduval_junk') return 'mixed';
  return 'unknown';
}

function cleanCategory(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/^cat_/, '') || null;
}

/**
 * Owned source-reputation lookup. The DB (curated + admin-edited) is authoritative;
 * the static source_priority_domain_policy provides coarse runtime coverage for
 * domains not in the DB. Returns null when nothing is known — callers must treat
 * "unknown source" as neutral, never as untrustworthy.
 */
class SourceReputationService {
  private repo = new SourceReputationRepo();
  private seeded = false;

  private static _instance: SourceReputationService | null = null;
  static get instance(): SourceReputationService {
    if (!this._instance) this._instance = new SourceReputationService();
    return this._instance;
  }

  private rowToRecord(row: SourceReputationRow): ReputationRecord {
    return {
      domain: row.domain,
      credibility: row.credibility,
      bias: row.bias,
      category: row.category ?? null,
      confidence: typeof row.confidence === 'number' ? row.confidence : Number(row.confidence) || 0,
      notes: row.notes ?? null,
      source: row.source,
    };
  }

  /** Seed the DB from the curated list (idempotent). */
  async seed(): Promise<number> {
    let count = 0;
    for (const entry of SOURCE_REPUTATION_SEED) {
      await this.repo.upsert({
        _id: entry.domain,
        domain: entry.domain,
        credibility: entry.credibility,
        bias: entry.bias,
        category: entry.category,
        confidence: entry.confidence,
        notes: entry.notes ?? null,
        aliases: null,
        source: 'seed',
      });
      count++;
    }
    return count;
  }

  /** Seed lazily on first use when the table is empty. */
  private async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    try {
      const total = await this.repo.countAllRows();
      if (total === 0) await this.seed();
    } catch (e) {
      // Non-fatal: a lookup can still fall back to the static policy.
      console.warn('SourceReputationService.ensureSeeded failed', e);
    }
    this.seeded = true;
  }

  async lookup(urlOrDomain: string): Promise<ReputationRecord | null> {
    const host = normalizeHost(urlOrDomain);
    if (!host) return null;

    await this.ensureSeeded();

    for (const candidate of domainCandidates(host)) {
      const row = await this.repo.getByDomain(candidate);
      if (row) return this.rowToRecord(row);
    }

    // Static-policy fallback: broad coverage, but a coarse proxy (no bias signal,
    // reduced confidence) since that policy is about educational value, not credibility.
    const fullUrl = /^https?:\/\//.test(urlOrDomain) ? urlOrDomain : `https://${host}`;
    const ruleMatch = findSourcePriorityDomainRule(fullUrl);
    if (ruleMatch) {
      const {rule, matchedDomain} = ruleMatch;
      return {
        domain: matchedDomain,
        credibility: eduValueToCredibility(rule.eduValue),
        bias: 'na' as ReputationBias,
        category: cleanCategory(rule.categories?.[0]),
        confidence: Math.round(Math.min(0.6, rule.confidence ?? 0.5) * 100) / 100,
        notes: rule.shortReason,
        source: 'seed',
      };
    }

    return null;
  }

  /** Admin upsert for a single reputation record. */
  async upsertRecord(input: {
    domain: string;
    credibility: ReputationCredibility;
    bias: ReputationBias;
    category?: string | null;
    confidence?: number;
    notes?: string | null;
  }): Promise<ReputationRecord | null> {
    const host = normalizeHost(input.domain);
    if (!host) return null;
    await this.repo.upsert({
      _id: host,
      domain: host,
      credibility: input.credibility,
      bias: input.bias,
      category: input.category ?? null,
      confidence: typeof input.confidence === 'number' ? input.confidence : 0.7,
      notes: input.notes ?? null,
      aliases: null,
      source: 'admin',
    });
    const row = await this.repo.getByDomain(host);
    return row ? this.rowToRecord(row) : null;
  }
}

export default SourceReputationService;
export {SourceReputationService};
