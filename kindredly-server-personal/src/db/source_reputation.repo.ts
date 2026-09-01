import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';
import type {ReputationBias, ReputationCredibility, ReputationSource} from 'tset-sharedlib/types/articleTrust.types';

/** DB row shape for the source_reputation table. */
export interface SourceReputationRow {
  _id: string;
  domain: string;
  credibility: ReputationCredibility;
  bias: ReputationBias;
  category: string | null;
  confidence: number;
  notes: string | null;
  aliases: string[] | null;
  source: ReputationSource;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Repository for the owned source_reputation table (article-trust feature).
 */
export class SourceReputationRepo extends BaseRepo<SourceReputationRow> {
  constructor(db: Knex = knex) {
    super('source_reputation', db);
  }

  async getByDomain(domain: string): Promise<SourceReputationRow | null> {
    const result = await this.query().where('_id', domain).first();
    return (result as SourceReputationRow) || null;
  }

  /** Batch lookup by exact domain (used to cross-reference cited sources). */
  async getByDomains(domains: string[]): Promise<SourceReputationRow[]> {
    if (!domains.length) return [];
    return (await this.query().whereIn('_id', domains)) as SourceReputationRow[];
  }

  async upsert(row: SourceReputationRow): Promise<void> {
    const now = new Date();
    const record: SourceReputationRow = {
      ...row,
      aliases: row.aliases ?? null,
      updatedAt: now,
      createdAt: row.createdAt || now,
    };
    await this.query()
      .insert(record as any)
      .onConflict('_id')
      .merge({
        domain: record.domain,
        credibility: record.credibility,
        bias: record.bias,
        category: record.category,
        confidence: record.confidence,
        notes: record.notes,
        aliases: record.aliases,
        source: record.source,
        updatedAt: now,
      } as Partial<SourceReputationRow>);
  }
}
