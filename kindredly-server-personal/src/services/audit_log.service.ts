import {v4 as uuidv4} from 'uuid';
import type {Knex} from 'knex';
import type {RequestContext} from '@/base/request_context';
import {AuditLogRepo, type AuditLogRow} from '@/db/audit_log.repo';

export type AuditLogEntityType = 'item' | 'collection' | 'user';

export type AuditLogAction =
  | 'item.create'
  | 'collection.create'
  | 'collection_item.add'
  | 'collection_item.remove'
  | 'permission.set'
  | 'permission.remove'
  | 'ownership.transfer'
  // A guardian started watching a child's screen. See docs/specs/live-view.md —
  // this is the durable counterpart to the on-screen notice the child sees.
  | 'live_view.start'
  // A parent disconnected and forgot one of a child's devices. Recorded because a
  // child holding a parent's PIN can reach the same button through "Unlock settings",
  // and removing your own monitoring should not be the one act that leaves no trace.
  | 'device.remove';

export class AuditLogService {
  private static _staticInstance: AuditLogService | null = null;

  static get instance(): AuditLogService {
    if (!this._staticInstance) this._staticInstance = new AuditLogService();
    return this._staticInstance;
  }

  async log(
    ctx: RequestContext,
    entry: Omit<AuditLogRow, '_id' | 'actorUserId' | 'actorAccountId' | 'createdAt'>,
    trx?: Knex.Transaction,
  ) {
    await this.logMany(ctx, [entry], trx);
  }

  async logMany(
    ctx: RequestContext,
    entries: Array<Omit<AuditLogRow, '_id' | 'actorUserId' | 'actorAccountId' | 'createdAt'>>,
    trx?: Knex.Transaction,
  ) {
    if (!entries.length) return;
    if (!ctx.currentUserId || !ctx.accountId) return;

    const now = new Date();
    const rows: AuditLogRow[] = entries.map((e) => ({
      _id: `audit_${uuidv4()}`,
      actorUserId: ctx.currentUserId as string,
      actorAccountId: ctx.accountId as string,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      relatedIds: e.relatedIds,
      createdAt: now,
    }));

    const repo = new AuditLogRepo();
    const txRepo = trx ? (repo.withTransaction(trx) as AuditLogRepo) : repo;
    await txRepo.insertMany(rows);
  }
}
