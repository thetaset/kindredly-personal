import {Knex} from 'knex';
import knex from './knex_config';
import type {PuzzleContentKind, PuzzleContentStatus} from 'tset-sharedlib/api';
import type PuzzleContentRecord from 'tset-sharedlib/src/schemas/public/PuzzleContent';

export type PuzzleContentRow = PuzzleContentRecord & {
  _id: string;
  kind: PuzzleContentKind;
  parentId: string | null;
  status: PuzzleContentStatus;
  sortOrder: number;
  data: Record<string, any>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PuzzleContentWriteRow = {
  _id: string;
  kind: PuzzleContentKind;
  parentId: string | null;
  status: PuzzleContentStatus;
  sortOrder: number;
  data: Record<string, any>;
  updatedBy: string | null;
};

/**
 * Raised when an optimistic update inside `bulkApply` finds the row already moved on. It exists so
 * the transaction can roll back from inside the loop while the caller can still tell a concurrent
 * edit apart from a genuine database failure and answer 409 rather than 500.
 */
export class PuzzleContentVersionConflictError extends Error {
  constructor(public readonly id: string) {
    super(`"${id}" changed while the import was running.`);
    this.name = 'PuzzleContentVersionConflictError';
  }
}

/** Kinds come back in spine order so a client can build the tree in one pass. */
const KIND_ORDER: PuzzleContentKind[] = ['strand', 'concept', 'puzzle'];

function orderClause(): Array<{column: string; order: 'asc'}> {
  return [
    {column: 'kind', order: 'asc'},
    {column: 'sortOrder', order: 'asc'},
    {column: '_id', order: 'asc'},
  ];
}

function bySpine(rows: PuzzleContentRow[]): PuzzleContentRow[] {
  return rows.sort((a, b) => {
    const kind = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    if (kind !== 0) return kind;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a._id.localeCompare(b._id);
  });
}

export class PuzzleContentRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async listByStatus(status: PuzzleContentStatus): Promise<PuzzleContentRow[]> {
    const rows = await this.knex<PuzzleContentRow>('puzzle_content').where({status}).orderBy(orderClause());
    return bySpine(rows);
  }

  /**
   * Retired records, reduced to what a label needs. Progress rows in `ref_state` reference concept
   * ids that may since have been retired; without these the progress map renders blank entries for
   * work a learner actually did.
   */
  async listRetiredStubs(): Promise<
    Array<{id: string; kind: PuzzleContentKind; parentId: string | null; title: string | null}>
  > {
    const rows = await this.knex<PuzzleContentRow>('puzzle_content')
      .where({status: 'retired'})
      .select('_id', 'kind', 'parentId', 'data')
      .orderBy('_id', 'asc');
    return rows.map((r) => ({
      id: r._id,
      // `kind` and `parentId` cost nothing here and are the only way a client can put a retired
      // concept back under its strand when rendering a learner's history.
      kind: r.kind,
      parentId: r.parentId ?? null,
      // Strands carry `label`; concepts and puzzles carry `title`.
      title: (r.data?.title as string) ?? (r.data?.label as string) ?? null,
    }));
  }

  async listAll(filter: {kind?: PuzzleContentKind; status?: PuzzleContentStatus} = {}): Promise<PuzzleContentRow[]> {
    const query = this.knex<PuzzleContentRow>('puzzle_content');
    if (filter.kind) query.andWhere({kind: filter.kind});
    if (filter.status) query.andWhere({status: filter.status});
    const rows = await query.orderBy(orderClause());
    return bySpine(rows);
  }

  async findById(id: string): Promise<PuzzleContentRow | undefined> {
    return await this.knex<PuzzleContentRow>('puzzle_content').where({_id: id}).first();
  }

  async findManyByIds(ids: string[]): Promise<PuzzleContentRow[]> {
    if (!ids.length) return [];
    return await this.knex<PuzzleContentRow>('puzzle_content').whereIn('_id', ids);
  }

  async insert(row: PuzzleContentWriteRow): Promise<PuzzleContentRow> {
    const now = this.knex.fn.now();
    await this.knex('puzzle_content').insert({
      _id: row._id,
      kind: row.kind,
      parentId: row.parentId,
      status: row.status,
      sortOrder: row.sortOrder,
      // Always stringify for jsonb: knex treats a bare array as multi-row values.
      data: JSON.stringify(row.data ?? {}),
      version: 1,
      createdAt: now,
      updatedAt: now,
      updatedBy: row.updatedBy,
    });
    return await this.requireById(row._id);
  }

  /**
   * Optimistic update. Returns undefined when `expectedVersion` no longer matches, so the caller
   * can report a conflict rather than silently clobbering a concurrent edit.
   */
  async updateIfVersion(
    id: string,
    expectedVersion: number,
    patch: Omit<PuzzleContentWriteRow, '_id'>,
  ): Promise<PuzzleContentRow | undefined> {
    const updated = await this.knex('puzzle_content')
      .where({_id: id, version: expectedVersion})
      .update({
        kind: patch.kind,
        parentId: patch.parentId,
        status: patch.status,
        sortOrder: patch.sortOrder,
        data: JSON.stringify(patch.data ?? {}),
        version: expectedVersion + 1,
        updatedAt: this.knex.fn.now(),
        updatedBy: patch.updatedBy,
      });
    if (!updated) return undefined;
    return await this.requireById(id);
  }

  async setStatus(
    id: string,
    status: PuzzleContentStatus,
    updatedBy: string | null,
  ): Promise<PuzzleContentRow | undefined> {
    const updated = await this.knex('puzzle_content')
      .where({_id: id})
      .update({
        status,
        updatedBy,
        updatedAt: this.knex.fn.now(),
        // Raw rather than .increment(): chaining update+increment produces two statements and the
        // second would overwrite `updatedAt` semantics in ways easy to get subtly wrong.
        version: this.knex.raw('version + 1'),
      });
    if (!updated) return undefined;
    return await this.requireById(id);
  }

  async deleteById(id: string): Promise<number> {
    return await this.knex('puzzle_content').where({_id: id}).delete();
  }

  async countChildren(parentId: string): Promise<number> {
    const row = await this.knex('puzzle_content').where({parentId}).count<{count: string}>('* as count').first();
    return Number(row?.count ?? 0);
  }

  /**
   * Apply a whole import — new rows and optimistic updates together — in ONE transaction.
   *
   * Both halves have to share the transaction, not just the inserts. A batch that creates a
   * concept and re-parents a puzzle onto it is only coherent as a unit: if the update lands and
   * the insert does not, the store is left holding a record pointing at a parent that never
   * arrived, which the client then drops as an orphan with nothing anywhere explaining why.
   */
  async bulkApply(batch: {
    inserts: PuzzleContentWriteRow[];
    updates: Array<{expectedVersion: number; row: PuzzleContentWriteRow}>;
  }): Promise<{inserted: number; updated: number}> {
    const {inserts, updates} = batch;
    if (!inserts.length && !updates.length) return {inserted: 0, updated: 0};

    return await this.knex.transaction(async (trx) => {
      if (inserts.length) {
        const now = trx.fn.now();
        await trx('puzzle_content').insert(
          inserts.map((r) => ({
            _id: r._id,
            kind: r.kind,
            parentId: r.parentId,
            status: r.status,
            sortOrder: r.sortOrder,
            data: JSON.stringify(r.data ?? {}),
            version: 1,
            createdAt: now,
            updatedAt: now,
            updatedBy: r.updatedBy,
          })),
        );
      }

      let updated = 0;
      for (const {expectedVersion, row} of updates) {
        const count = await trx('puzzle_content')
          .where({_id: row._id, version: expectedVersion})
          .update({
            kind: row.kind,
            parentId: row.parentId,
            status: row.status,
            sortOrder: row.sortOrder,
            data: JSON.stringify(row.data ?? {}),
            version: expectedVersion + 1,
            updatedAt: trx.fn.now(),
            updatedBy: row.updatedBy,
          });
        // Throwing rolls the batch back, which is the point: counting a conflict as a success
        // would report an import that partly did not happen.
        if (!count) throw new PuzzleContentVersionConflictError(row._id);
        updated++;
      }

      return {inserted: inserts.length, updated};
    });
  }

  private async requireById(id: string): Promise<PuzzleContentRow> {
    const result = await this.findById(id);
    if (!result) throw new Error('Failed to load puzzle_content row');
    return result;
  }
}
