import {BaseRepo} from './base.repo';
import type {Knex} from 'knex';
import knex from './knex_config';

export type SecuritySeverity = 'info' | 'warn' | 'critical';

export type SecurityEventRow = {
  _id: string;
  eventType: string;
  severity: SecuritySeverity;
  actorUserId?: string | null;
  actorAccountId?: string | null;
  clientId?: string | null;
  ipHash?: string | null;
  ipPrefix?: string | null;
  route?: string | null;
  /** Counts, status codes and IDs only — never URLs or user text. */
  detail?: any;
  createdAt: Date;
};

/** One aggregated bucket, as returned to the ops dashboard and admin UI. */
export type SecurityEventCount = {
  eventType: string;
  severity: SecuritySeverity;
  /** Sum of `detail.count` across coalesced rows, not a plain row count. */
  occurrences: number;
  rows: number;
};

export class SecurityEventRepo extends BaseRepo<SecurityEventRow> {
  constructor(db: Knex = knex) {
    super('security_event', db);
  }

  async insertMany(rows: SecurityEventRow[]) {
    if (!rows.length) return;
    await this.query().insert(rows);
  }

  /**
   * Occurrence totals per event type in a window.
   *
   * Sums `detail.count` rather than counting rows: rows are coalesced on write, so a row
   * count would under-report a burst by whatever the coalescing factor happened to be.
   * COALESCE covers rows written before a count was set.
   */
  async countsByType(input: {start: Date; end: Date}): Promise<SecurityEventCount[]> {
    const rows = await this.query()
      .select('eventType', 'severity')
      .where('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({occurrences: knex.raw("COALESCE((detail->>'count')::int, 1)") as any})
      .count({rows: '_id'})
      .groupBy('eventType', 'severity')
      .orderBy('eventType');

    return (rows as any[]).map((r) => ({
      eventType: r.eventType,
      severity: r.severity,
      occurrences: Number(r.occurrences || 0),
      rows: Number(r.rows || 0),
    }));
  }

  /** Top source subnets in a window — for spotting a single noisy origin. */
  async topSources(input: {start: Date; end: Date; limit?: number}) {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));
    const rows = await this.query()
      .select('ipPrefix')
      .whereNotNull('ipPrefix')
      .andWhere('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({occurrences: knex.raw("COALESCE((detail->>'count')::int, 1)") as any})
      .groupBy('ipPrefix')
      .orderBy('occurrences', 'desc')
      .limit(limit);

    return (rows as any[]).map((r) => ({
      ipPrefix: r.ipPrefix as string,
      occurrences: Number(r.occurrences || 0),
    }));
  }

  /** Most recent events, newest first. */
  async listRecent(input: {limit?: number; eventType?: string}) {
    const limit = Math.max(1, Math.min(input.limit || 100, 500));
    const q = this.query().orderBy('createdAt', 'desc').orderBy('_id', 'desc').limit(limit);
    if (input.eventType) q.where('eventType', input.eventType);
    return (await q) as unknown as SecurityEventRow[];
  }
}
