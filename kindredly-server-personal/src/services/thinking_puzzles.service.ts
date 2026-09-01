import {HttpException} from '@exceptions/HttpException';
import {
  PuzzleContentRepo,
  PuzzleContentVersionConflictError,
  type PuzzleContentRow,
  type PuzzleContentWriteRow,
} from '@/db/puzzle_content.repo';
import type {
  AdminPuzzleContentDeleteResponse,
  AdminPuzzleContentImportSeedRequest,
  AdminPuzzleContentImportSeedResponse,
  AdminPuzzleContentListRequest,
  AdminPuzzleContentListResponse,
  AdminPuzzleContentSaveRequest,
  AdminPuzzleContentSaveResponse,
  PuzzleContentImportStatusPolicy,
  PuzzleContentKind,
  PuzzleContentStatus,
  PuzzleContentView,
  ThinkingPuzzlesCatalogResponse,
} from 'tset-sharedlib/api';

/**
 * The Thinking Puzzles content store.
 *
 * The server validates the ENVELOPE only — id shape, kind, status, parent existence and type, and
 * a payload size cap. It deliberately does not validate `data`: the payload shape belongs to the
 * client's standalone puzzle module, which is free of Kindredly imports, and the client
 * re-validates every record on read anyway. That keeps the trust boundary where it belongs and
 * means a new puzzle primitive ships without touching the server.
 *
 * Exported as a module singleton, not instantiated per route. The public catalog route and the
 * admin routes live in different route files, and a per-route instance would mean an admin save
 * invalidated a cache the public route never shared.
 */

const CATALOG_CACHE_TTL_MS = 60_000;
const VALID_KINDS: PuzzleContentKind[] = ['strand', 'concept', 'puzzle'];
const VALID_STATUSES: PuzzleContentStatus[] = ['draft', 'live', 'retired'];
const VALID_STATUS_POLICIES: PuzzleContentImportStatusPolicy[] = ['fromRecord', 'draftNewKeepExisting'];
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_DATA_BYTES = 256 * 1024;

/** Which kind a record's parent must be. A strand sits at the root. */
const PARENT_KIND: Record<PuzzleContentKind, PuzzleContentKind | null> = {
  strand: null,
  concept: 'strand',
  puzzle: 'concept',
};

function toView(row: PuzzleContentRow): PuzzleContentView {
  return {
    id: row._id,
    kind: row.kind,
    parentId: row.parentId,
    status: row.status,
    sortOrder: row.sortOrder,
    data: row.data ?? {},
    version: row.version,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

class ThinkingPuzzlesService {
  private repo = new PuzzleContentRepo();
  private catalogCache: {at: number; value: ThinkingPuzzlesCatalogResponse} | null = null;

  /**
   * In-process only. The server runs multiple instances, so another instance can serve a stale
   * catalog for up to the TTL after an edit — the same accepted trade-off as the category-set and
   * AI-config stores. Puzzle content changes rarely, so this is cheap insurance rather than a
   * correctness problem.
   */
  invalidateCatalog(): void {
    this.catalogCache = null;
  }

  async getCatalog(): Promise<ThinkingPuzzlesCatalogResponse> {
    if (this.catalogCache && Date.now() - this.catalogCache.at < CATALOG_CACHE_TTL_MS) {
      return this.catalogCache.value;
    }

    const [live, retired] = await Promise.all([this.repo.listByStatus('live'), this.repo.listRetiredStubs()]);

    const value: ThinkingPuzzlesCatalogResponse = {
      records: live.map(toView),
      retired,
      revision: live.reduce((max, r) => Math.max(max, new Date(r.updatedAt ?? 0).getTime() || 0), 0),
    };
    this.catalogCache = {at: Date.now(), value};
    return value;
  }

  // --- admin ------------------------------------------------------------------------------------

  async list(filter: AdminPuzzleContentListRequest = {}): Promise<AdminPuzzleContentListResponse> {
    if (filter.kind && !VALID_KINDS.includes(filter.kind)) {
      throw new HttpException(400, `Unknown kind "${filter.kind}"`);
    }
    if (filter.status && !VALID_STATUSES.includes(filter.status)) {
      throw new HttpException(400, `Unknown status "${filter.status}"`);
    }
    const records = await this.repo.listAll({kind: filter.kind, status: filter.status});
    return {records: records.map(toView)};
  }

  async save(input: AdminPuzzleContentSaveRequest, updatedBy: string | null): Promise<AdminPuzzleContentSaveResponse> {
    this.assertEnvelope(input);
    await this.assertParent(input.kind, input.parentId ?? null);
    // Same rule as setStatus, checked on both paths: the client saves a dirty record rather than
    // calling setStatus, so enforcing this in only one place would let an author publish an
    // orphan that the app then silently drops with no explanation anywhere.
    if (input.status === 'live') await this.assertParentIsLive(input.parentId ?? null);

    const existing = await this.repo.findById(input.id);
    const write: PuzzleContentWriteRow = {
      _id: input.id,
      kind: input.kind,
      parentId: input.parentId ?? null,
      status: input.status,
      sortOrder: input.sortOrder ?? 0,
      data: input.data ?? {},
      updatedBy,
    };

    if (!existing) {
      const created = await this.repo.insert(write);
      this.invalidateCatalog();
      return {record: toView(created)};
    }

    // Ids are permanent once a record has been live: progress is keyed on concept id, so changing
    // a kind under an existing id is the same hazard as a rename.
    if (existing.kind !== input.kind) {
      throw new HttpException(400, `"${input.id}" already exists as a ${existing.kind}.`);
    }

    const expected = input.version ?? 0;
    if (expected !== existing.version) {
      throw new HttpException(
        409,
        `This record changed since you loaded it (expected version ${expected}, found ${existing.version}). Reload before saving.`,
      );
    }

    const updated = await this.repo.updateIfVersion(input.id, expected, write);
    if (!updated) throw new HttpException(409, 'This record changed since you loaded it. Reload before saving.');
    this.invalidateCatalog();
    return {record: toView(updated)};
  }

  async setStatus(
    id: string,
    status: PuzzleContentStatus,
    updatedBy: string | null,
  ): Promise<AdminPuzzleContentSaveResponse> {
    if (!VALID_STATUSES.includes(status)) throw new HttpException(400, `Unknown status "${status}"`);

    const existing = await this.repo.findById(id);
    if (!existing) throw new HttpException(404, `No record "${id}"`);

    if (status === 'live') await this.assertParentIsLive(existing.parentId);

    // Retiring a parent would orphan its children on the next read. Retire the subtree explicitly.
    if (status !== 'live' && existing.kind !== 'puzzle') {
      const children = await this.repo.listAll();
      const liveChildren = children.filter((c) => c.parentId === id && c.status === 'live');
      if (liveChildren.length > 0) {
        throw new HttpException(
          400,
          `${liveChildren.length} live record(s) sit under this one. Take them down first: ${liveChildren
            .map((c) => c._id)
            .join(', ')}`,
        );
      }
    }

    const updated = await this.repo.setStatus(id, status, updatedBy);
    if (!updated) throw new HttpException(404, `No record "${id}"`);
    this.invalidateCatalog();
    return {record: toView(updated)};
  }

  async delete(id: string): Promise<AdminPuzzleContentDeleteResponse> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new HttpException(404, `No record "${id}"`);

    const children = await this.repo.countChildren(id);
    if (children > 0) {
      throw new HttpException(400, `Cannot delete: ${children} record(s) sit under this one.`);
    }
    // Deleting a concept that has ever been live orphans the progress recorded against it. Retire
    // it instead — that is exactly what the status is for.
    if (existing.kind === 'concept' && existing.status !== 'draft') {
      throw new HttpException(
        400,
        'A concept that has been published cannot be deleted — progress is keyed on its id. Retire it instead.',
      );
    }

    const deleted = await this.repo.deleteById(id);
    this.invalidateCatalog();
    return {deleted};
  }

  /**
   * Import a batch of records — the bundled seed into an empty store, or a catalog exported from
   * another environment. Existing ids are left alone unless `overwrite` is set, so a re-import can
   * never clobber authored edits by accident.
   *
   * `statusPolicy` decides what happens to status; see the type for why the distinction matters.
   */
  async importSeed(
    input: AdminPuzzleContentImportSeedRequest,
    updatedBy: string | null,
  ): Promise<AdminPuzzleContentImportSeedResponse> {
    const records = Array.isArray(input?.records) ? input.records : [];
    if (!records.length) throw new HttpException(400, 'Nothing to import.');

    const policy = input.statusPolicy ?? 'fromRecord';
    if (!VALID_STATUS_POLICIES.includes(policy)) {
      throw new HttpException(400, `Unknown status policy "${policy}"`);
    }

    // Validate the WHOLE batch before writing any of it — a half-applied seed is worse than a
    // rejected one, and parents must be checkable against the batch as well as the store.
    const batchIds = new Set(records.map((r) => r?.id));
    if (batchIds.size !== records.length) throw new HttpException(400, 'The batch contains duplicate ids.');

    for (const record of records) {
      this.assertEnvelope(record);
      const parentKind = PARENT_KIND[record.kind];
      const parentId = record.parentId ?? null;
      if (!parentKind) continue;
      if (!parentId) throw new HttpException(400, `"${record.id}" needs a ${parentKind} parent.`);
      const inBatch = records.find((r) => r.id === parentId);
      if (inBatch) {
        if (inBatch.kind !== parentKind) {
          throw new HttpException(400, `"${record.id}" points at "${parentId}", which is a ${inBatch.kind}.`);
        }
        continue;
      }
      await this.assertParent(record.kind, parentId);
    }

    const existing = await this.repo.findManyByIds(records.map((r) => r.id));
    const existingById = new Map(existing.map((r) => [r._id, r]));

    const inserts: PuzzleContentWriteRow[] = [];
    const updates: Array<{expectedVersion: number; row: PuzzleContentWriteRow}> = [];
    let skipped = 0;

    records.forEach((record, i) => {
      const current = existingById.get(record.id);

      if (!current) {
        inserts.push({
          _id: record.id,
          kind: record.kind,
          parentId: record.parentId ?? null,
          status: policy === 'draftNewKeepExisting' ? 'draft' : record.status,
          sortOrder: record.sortOrder ?? i,
          data: record.data ?? {},
          updatedBy,
        });
        return;
      }

      if (!input.overwrite) {
        skipped++;
        return;
      }

      // Same rule as save(): ids are permanent once a record has been live, because progress is
      // keyed on concept id. Changing the kind under an existing id is the same hazard as a rename.
      if (current.kind !== record.kind) {
        throw new HttpException(400, `"${record.id}" already exists as a ${current.kind}.`);
      }

      updates.push({
        expectedVersion: current.version,
        row: {
          _id: record.id,
          kind: record.kind,
          parentId: record.parentId ?? null,
          status: policy === 'draftNewKeepExisting' ? current.status : record.status,
          sortOrder: record.sortOrder ?? current.sortOrder,
          data: record.data ?? {},
          updatedBy,
        },
      });
    });

    await this.assertNoLiveOrphansAfter(inserts, updates);

    try {
      const {inserted, updated} = await this.repo.bulkApply({inserts, updates});
      this.invalidateCatalog();
      return {imported: inserted, updated, skipped};
    } catch (e) {
      if (e instanceof PuzzleContentVersionConflictError) {
        throw new HttpException(409, `${e.message} Nothing was imported — reload the list and try again.`);
      }
      throw e;
    }
  }

  /**
   * A live record under a parent that is not live is dropped by the client as an orphan, silently.
   * `save` and `setStatus` each refuse to create that shape, but an import can reach it without
   * going through either — by re-parenting a live puzzle onto a concept that arrives in the same
   * file as a draft, say. So the check has to run against the state the batch will PRODUCE rather
   * than the state it found.
   */
  private async assertNoLiveOrphansAfter(
    inserts: PuzzleContentWriteRow[],
    updates: Array<{expectedVersion: number; row: PuzzleContentWriteRow}>,
  ): Promise<void> {
    const resulting = new Map<string, PuzzleContentWriteRow>();
    for (const row of inserts) resulting.set(row._id, row);
    for (const {row} of updates) resulting.set(row._id, row);

    for (const row of resulting.values()) {
      if (row.status !== 'live' || !row.parentId) continue;

      // A parent the batch does not touch keeps whatever it has in the store — including one whose
      // record was skipped because `overwrite` is off.
      const inBatch = resulting.get(row.parentId);
      const parentStatus = inBatch ? inBatch.status : (await this.repo.findById(row.parentId))?.status;

      if (parentStatus !== 'live') {
        throw new HttpException(
          400,
          `"${row._id}" would be live under "${row.parentId}", which is ${parentStatus ?? 'missing'}.`,
        );
      }
    }
  }

  // --- envelope checks --------------------------------------------------------------------------

  private assertEnvelope(input: AdminPuzzleContentSaveRequest): void {
    if (typeof input?.id !== 'string' || !ID_PATTERN.test(input.id)) {
      throw new HttpException(400, 'Id must be a lowercase slug (letters, digits, hyphens), up to 80 characters.');
    }
    if (!VALID_KINDS.includes(input.kind)) throw new HttpException(400, `Unknown kind "${input.kind}"`);
    if (!VALID_STATUSES.includes(input.status)) throw new HttpException(400, `Unknown status "${input.status}"`);
    if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) {
      throw new HttpException(400, 'data must be an object.');
    }
    const size = Buffer.byteLength(JSON.stringify(input.data), 'utf8');
    if (size > MAX_DATA_BYTES) {
      throw new HttpException(400, `data is ${size} bytes, over the ${MAX_DATA_BYTES} byte limit.`);
    }
  }

  private async assertParent(kind: PuzzleContentKind, parentId: string | null): Promise<void> {
    const expected = PARENT_KIND[kind];
    if (!expected) {
      if (parentId) throw new HttpException(400, 'A strand cannot have a parent.');
      return;
    }
    if (!parentId) throw new HttpException(400, `A ${kind} must belong to a ${expected}.`);

    const parent = await this.repo.findById(parentId);
    if (!parent) throw new HttpException(400, `No ${expected} "${parentId}".`);
    if (parent.kind !== expected) {
      throw new HttpException(400, `"${parentId}" is a ${parent.kind}, not a ${expected}.`);
    }
  }

  /**
   * Going live under a parent that is not live produces a record the client drops as an orphan on
   * the next read — invisibly, and with nothing anywhere to explain why the puzzle never appeared.
   * Refuse it at the point of release instead.
   */
  private async assertParentIsLive(parentId: string | null): Promise<void> {
    if (!parentId) return;
    const parent = await this.repo.findById(parentId);
    if (!parent) throw new HttpException(400, `Its parent "${parentId}" no longer exists.`);
    if (parent.status !== 'live') {
      throw new HttpException(400, `Cannot go live: its ${parent.kind} "${parent._id}" is ${parent.status}.`);
    }
  }
}

export const thinkingPuzzlesService = new ThinkingPuzzlesService();
export default thinkingPuzzlesService;
