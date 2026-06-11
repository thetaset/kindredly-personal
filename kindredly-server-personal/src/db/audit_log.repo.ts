import {BaseRepo} from './base.repo';
import type {Knex} from 'knex';
import knex from './knex_config';

export type AuditLogRow = {
  _id: string;
  actorUserId: string;
  actorAccountId: string;
  action: string;
  entityType: string;
  entityId: string;
  relatedIds?: any;
  createdAt: Date;
};

export type AuditLogListCursor = {
  createdAt: string;
  id: string;
};

export type AuditLogEntryView = {
  _id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  relatedIds?: any;
  createdAt: string;
};

export class AuditLogRepo extends BaseRepo<AuditLogRow> {
  constructor(db: Knex = knex) {
    super('audit_log', db);
  }

  async insertMany(rows: AuditLogRow[]) {
    if (!rows.length) return;
    await this.query().insert(rows);
  }

  async listForUser(
    userId: string,
    options: {limit: number; cursor?: AuditLogListCursor},
  ): Promise<{entries: AuditLogEntryView[]; nextCursor?: AuditLogListCursor}> {
    const limit = Math.max(1, Math.min(options.limit || 50, 200));

    const q = this.query()
      .select(['_id', 'actorUserId', 'action', 'entityType', 'entityId', 'relatedIds', 'createdAt'])
      .where((qb) => {
        qb.where('actorUserId', userId)
          .orWhereRaw('"relatedIds"->>\'targetUserId\' = ?', [userId])
          .orWhereRaw('"relatedIds"->>\'ownerUserId\' = ?', [userId])
          .orWhereRaw('"relatedIds"->>\'oldOwnerUserId\' = ?', [userId])
          .orWhereRaw('"relatedIds"->>\'newOwnerUserId\' = ?', [userId]);
      });

    if (options.cursor?.createdAt && options.cursor?.id) {
      const cursorCreatedAt = new Date(options.cursor.createdAt);
      const cursorId = options.cursor.id;

      q.andWhere((qb) => {
        qb.where('createdAt', '<', cursorCreatedAt).orWhere((qb2) => {
          qb2.where('createdAt', '=', cursorCreatedAt).andWhere('_id', '<', cursorId);
        });
      });
    }

    const rows = await q.orderBy('createdAt', 'desc').orderBy('_id', 'desc').limit(limit);
    const entries: AuditLogEntryView[] = (rows as any[]).map((r) => ({
      _id: r._id,
      actorUserId: r.actorUserId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      relatedIds: r.relatedIds,
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    }));

    const last = entries.at(-1);
    const nextCursor = last ? {createdAt: last.createdAt, id: last._id} : undefined;
    return {entries, nextCursor};
  }
}
