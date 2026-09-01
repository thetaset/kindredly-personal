import {RequestContext} from '@/base/request_context';
import {RefStateRepo} from '@/db/ref_state.repo';
import PermissionService from '@/services/permission.service';
import SSEManager from './sse.manager';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_BATCH_REFS = 200;
const MAX_BATCH_LIMIT = 500;
const ACCESS_CHECK_CONCURRENCY = 16;
const MAX_DATA_BYTES = 64 * 1024; // guardrail against abuse

function approxBytes(value: any): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
  } catch {
    return MAX_DATA_BYTES + 1;
  }
}

function buildRefStateId(parts: {
  ownerType: string;
  ownerId: string;
  refType: string;
  refId: string;
  stateKey: string;
  stateSubKey: string;
}): string {
  // Matches repo patterns: deterministic composite IDs.
  // Use a delimiter that won't collide with normal IDs.
  const d = '_0-0_';
  return [parts.ownerType, parts.ownerId, parts.refType, parts.refId, parts.stateKey, parts.stateSubKey].join(d);
}

export class RefStateService {
  private sseManager = SSEManager.getInstance();

  constructor(
    private repo = new RefStateRepo(),
    private permissionService = new PermissionService(),
  ) {}

  private async resolveOwnerForWrite(
    ctx: RequestContext,
    ownerType: 'user' | 'account',
    input: {
      refType: string;
      refId: string;
      stateKey: string;
      ownerId?: string;
    },
    options: {
      // When true, we allow setting ownerId != current user for user-scoped ref_state,
      // as long as the target user is in the same account.
      allowUserOwnerOverrideInAccount?: boolean;
    } = {},
  ) {
    const userId = ctx.getCurrentUserId();
    if (!userId) throw new Error('Unauthenticated');

    if (
      ownerType === 'user' &&
      input.ownerId &&
      input.ownerId !== userId &&
      options.allowUserOwnerOverrideInAccount === true
    ) {
      await ctx.verifyInAccount(input.ownerId, 'Invalid ownerId for user-scoped ref_state');
      return {ownerType, ownerId: input.ownerId};
    }

    return await this.resolveOwner(ctx, ownerType, input.ownerId);
  }

  private async assertCanAccessRef(
    ctx: RequestContext,
    refType: string,
    refId: string,
    ownerType?: 'user' | 'account',
  ) {
    // For this first pass we keep access checks conservative but minimal.
    // Authentication is enforced by the route middleware. This method exists
    // so we can harden per-refType ACLs over time.
    if (refType === 'item') {
      const hasPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId);
      if (!hasPermission) {
        throw new Error('No permission to access ref item');
      }
      return;
    }
    if (refType === 'app_global') return;
    if (refType === 'post' || refType === 'feed_item') return;
    // Companion device-guard state (provisioning record, app inventory, status):
    // ownership + parent-over-child access is enforced by resolveOwner (owner is
    // the child user; only the child or a managing admin may read/write it).
    if (refType === 'device-guard') return;

    /**
     * The record of what the AI agent changed about a family's parental controls.
     *
     * Account-scoped, and account scope is otherwise ungated: `resolveOwner` pins the
     * ownerId to `ctx.accountId` and asks nothing else, so ANY account member — a
     * restricted child included — can read, overwrite and delete account rows. That is
     * fine for a shared kanban board and disqualifying here twice over: the record says
     * what a child's own limits were changed to, and the child it constrains could edit
     * or delete the entry proving it happened.
     *
     * Gated here rather than in `upsert` (where the sibling `device-guard`/`appPolicy`
     * check lives) because this refType must be closed to reads too, and this method is
     * the one point upsert, both list paths and delete all pass through.
     */
    if (refType === 'agent-changeset') {
      if (!(await ctx.isAdmin())) {
        throw new Error('Only a parent can read or change the agent record');
      }
      return;
    }

    /**
     * Background job records written by the client-side job runner (long imports that
     * survive navigation, reload and a device switch).
     *
     * User-scoped ONLY, and that is the whole access check: `resolveOwner` pins `ownerId`
     * to the initiating guardian, and only an admin over a *managed* user may name someone
     * else's id. So a restricted user can neither read nor overwrite another person's jobs.
     *
     * Deliberately NOT account-scoped. Account scope is ungated (see `agent-changeset`
     * above -- any account member, child included, can read and delete account rows), and a
     * job record names a child and what is being added to their library.
     */
    if (refType === 'job') {
      if (ownerType === 'account') {
        throw new Error('Background jobs are user-scoped; account scope is not allowed');
      }
      return;
    }

    throw new Error(`Unsupported refType: ${refType}`);
  }

  private async resolveOwner(ctx: RequestContext, ownerType: 'user' | 'account', ownerId?: string) {
    const userId = ctx.getCurrentUserId();
    const accountId = ctx.accountId;
    if (!userId) throw new Error('Unauthenticated');
    if (!accountId) throw new Error('Missing accountId');

    if (ownerType === 'user') {
      const resolvedOwnerId = ownerId || userId;

      // Only allow overriding the user ownerId when the caller is an admin.
      // This prevents restricted users from writing state for sibling restricted users.
      if (resolvedOwnerId !== userId) {
        if (!(await ctx.isAdmin())) {
          throw new Error('Invalid ownerId for user-scoped ref_state');
        }
        const managedUserIds = new Set(await ctx.getManagedUserIds());
        if (!managedUserIds.has(resolvedOwnerId)) {
          throw new Error('Invalid ownerId for user-scoped ref_state');
        }
      }

      return {ownerType, ownerId: resolvedOwnerId};
    }

    // account: do not allow overriding the accountId.
    if (ownerId && ownerId !== accountId) {
      throw new Error('Invalid ownerId for account-scoped ref_state');
    }
    return {ownerType, ownerId: accountId};
  }

  async upsert(
    ctx: RequestContext,
    ownerType: 'user' | 'account',
    input: {
      refType: string;
      refId: string;
      stateKey: string;
      stateSubKey?: string | null;
      data?: any;
      ownerId?: string;
      encrypted?: boolean;
      encInfo?: any;
    },
  ) {
    await this.assertCanAccessRef(ctx, input.refType, input.refId, ownerType);

    /**
     * A child must never author their own app protections.
     *
     * `resolveOwner` below only checks admin when the row belongs to SOMEONE ELSE —
     * writing your own user-scoped row is always allowed, which is right for almost
     * every ref_state but catastrophic here: a restricted user could POST an empty
     * policy to their own row and their phone would compile it into "nothing
     * blocked" on the next sync. A parental control a child can switch off is not
     * one. Client-side gating cannot cover this; the route is reachable directly.
     *
     * Scoped to `appPolicy` on purpose. The sibling `appInventory` key is written BY
     * the child's own device reporting its installed apps, and must keep working.
     */
    if (input.refType === 'device-guard' && input.stateKey === 'appPolicy') {
      if (!(await ctx.isAdmin())) {
        throw new Error('Only a parent can change app protections');
      }
    }

    /**
     * Tamper incidents are server-owned and no client writes them — the tamper watch
     * job calls `refStateRepo.upsert` directly, so it never passes through here.
     *
     * Without this, the same self-write path that appPolicy had applies: the child
     * whose device is being flagged could POST a closed incident (or a large
     * `notifyCount`) to their own row and silence the alert that exists specifically
     * to survive them. Refuse every client, not just non-admins — a parent has no
     * reason to hand-author one either, and an admin-only check would leave the hole
     * open to any account where the child is an admin of their own sub-account.
     */
    if (input.refType === 'device-guard' && input.stateKey === 'tamperIncident') {
      throw new Error('Tamper incidents are managed by the server');
    }

    // For task assignment, require edit permission to the task definition item.
    // This prevents restricted users (viewer permission) from self-unassigning.
    if (input.refType === 'item' && input.stateKey === 'task_assignment') {
      const hasEdit = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, input.refId);
      if (!hasEdit) {
        throw new Error('No permission to change task assignment');
      }
    }

    const allowUserOwnerOverrideInAccount =
      input.refType === 'item' && input.stateKey === 'task_assignment' && ownerType === 'user';

    const resolvedOwner = await this.resolveOwnerForWrite(ctx, ownerType, input, {
      allowUserOwnerOverrideInAccount,
    });

    const size = approxBytes(input.data);
    if (size > MAX_DATA_BYTES) {
      throw new Error(`ref_state.data too large (${size} bytes)`);
    }

    const stateSubKey = input.stateSubKey ?? '';
    const id = buildRefStateId({
      ownerType: resolvedOwner.ownerType,
      ownerId: resolvedOwner.ownerId,
      refType: input.refType,
      refId: input.refId,
      stateKey: input.stateKey,
      stateSubKey,
    });

    /**
     * A device a parent removed must stay removed.
     *
     * `appInventory` is published by the child's OWN device on a periodic sync, under
     * the child's ordinary user token — not the device-agent token. So revoking the
     * device's credential does nothing to it: within one sync interval the row comes
     * back, `mergeCompanionDeviceState` treats `appInventory` as device-scoped, and the
     * removed device reappears as a ghost reading "never reported". The remove button
     * would silently undo itself a few hours later.
     *
     * The `provisioning` row is the record that this device is linked at all, and
     * removal deletes it. Its absence is therefore the durable "this device is gone"
     * fact — durable in a way session revocation is not, because it survives a device
     * that has never checked in, and it clears itself the moment a parent re-links
     * (which writes a fresh provisioning row before the first inventory sync).
     *
     * Deliberately NOT applied to `status`. That row is written by the heartbeat, and
     * the Companion fires its first heartbeat from `provision()` BEFORE the extension
     * has written the provisioning row — gating it would drop the first check-in of
     * every new link, which is the one that confirms linking worked (SL-086).
     */
    if (input.refType === 'device-guard' && input.stateKey === 'appInventory' && stateSubKey) {
      const provisioningId = buildRefStateId({
        ownerType: resolvedOwner.ownerType,
        ownerId: resolvedOwner.ownerId,
        refType: input.refType,
        refId: input.refId,
        stateKey: 'provisioning',
        stateSubKey,
      });
      if (!(await this.repo.findById(provisioningId))) {
        throw new Error('Unknown device — this device is not linked');
      }
    }

    // Guardrail: ref_state uses an upsert which can overwrite an existing encrypted entry.
    // Prevent accidental encInfo corruption by enforcing additive-only encInfo changes.
    const existing = await this.repo.findById(id);
    assertEncryptedUpdateHasEncInfo({
      currentEncInfo: existing?.encInfo,
      nextEncInfo: input.encInfo ?? null,
      context: `/ref_state/${ownerType}/upsert`,
    });
    if (existing?.encInfo && input.encInfo != null) {
      assertEncInfoUpdateIsSafe({
        currentEncInfo: existing.encInfo,
        nextEncInfo: input.encInfo,
        context: `/ref_state/${ownerType}/upsert`,
        payloadForCiphertextCheck: {data: input.data},
      });
    }

    const saved = await this.repo.upsert({
      _id: id,
      refType: input.refType,
      refId: input.refId,
      ownerType: resolvedOwner.ownerType,
      ownerId: resolvedOwner.ownerId,
      stateKey: input.stateKey,
      stateSubKey,
      data: input.data,
      // Derive from encInfo to avoid mismatches that can lead to corrupted reads.
      encrypted: input.encInfo != null,
      encInfo: input.encInfo ?? null,
    } as any);

    /**
     * Tell the child's device a parent just changed app protections.
     *
     * Usage limits travel through `/user/options/update`, which already broadcasts
     * `userOptionsUpdate`. App protections travel through here instead, and this
     * path broadcast nothing at all — so half a parent's control surface reached
     * the phone only when something else happened to trigger a rule push.
     *
     * Addressed to `resolvedOwner.ownerId`, NOT the caller: the row belongs to the
     * child and the writer is their parent, so broadcasting to the current user
     * would notify the wrong device entirely.
     *
     * Payload is deliberately empty — it is a nudge to recompile, not a carrier.
     * The policy itself stays encrypted and is read back through the normal path.
     */
    if (input.refType === 'device-guard' && input.stateKey === 'appPolicy') {
      this.sseManager.broadcastToUser(resolvedOwner.ownerId, 'deviceGuardPolicyUpdate', {}).catch((e) => {
        // Best-effort, exactly like broadcastUserSettingsRefresh: the write already
        // succeeded and a missed nudge costs latency, not correctness.
        console.warn('deviceGuardPolicyUpdate broadcast failed', e);
      });
    }

    return saved;
  }

  /**
   * Which of `refIds` the caller may read.
   *
   * Deliberately reuses the same per-ref check as the single-ref path rather
   * than reimplementing it as one batched query: the scalar check spans owner,
   * direct grants, parent-collection inheritance and admin-over-managed, and a
   * second implementation that drifts from it is a permission bypass. The win
   * being chased here is HTTP round trips (32 -> 1), not server-side queries, so
   * bounded concurrency is enough. Revisit only with a test proving set equality
   * against `assertCanAccessRef`.
   *
   * Filters rather than throws. A batch read must not let one stale or deleted
   * id fail the whole request — callers already treat a missing row as absent.
   */
  private async filterAccessibleRefIds(
    ctx: RequestContext,
    refType: string,
    refIds: string[],
    ownerType?: 'user' | 'account',
  ): Promise<string[]> {
    const allowed: string[] = [];

    for (let i = 0; i < refIds.length; i += ACCESS_CHECK_CONCURRENCY) {
      const slice = refIds.slice(i, i + ACCESS_CHECK_CONCURRENCY);
      const results = await Promise.all(
        slice.map(async (refId) => {
          try {
            await this.assertCanAccessRef(ctx, refType, refId, ownerType);
            return refId;
          } catch {
            return null;
          }
        }),
      );
      for (const refId of results) {
        if (refId) allowed.push(refId);
      }
    }

    return allowed;
  }

  async list(
    ctx: RequestContext,
    ownerType: 'user' | 'account',
    input: {
      refType: string;
      refId?: string;
      refIds?: string[];
      stateKey?: string;
      stateSubKey?: string | null;
      stateSubKeyGte?: string;
      stateSubKeyLte?: string;
      limit?: number;
      cursorUpdatedAt?: string;
      cursorRefId?: string;
      cursorStateSubKey?: string;
      ownerId?: string;
    },
  ) {
    // Resolve the owner before touching refs so an invalid ownerId fails fast and
    // a batch can never report which refIds exist to a caller who is not a valid
    // owner in the first place.
    const resolvedOwner = await this.resolveOwner(ctx, ownerType, input.ownerId);

    if (Array.isArray(input.refIds)) {
      const requestedRefIds = Array.from(new Set(input.refIds.filter((refId) => !!refId))).slice(0, MAX_BATCH_REFS);
      if (requestedRefIds.length === 0) return {entries: []};

      const refIds = await this.filterAccessibleRefIds(ctx, input.refType, requestedRefIds, ownerType);
      if (refIds.length === 0) return {entries: []};

      const limit = Math.max(1, Math.min(MAX_BATCH_LIMIT, input.limit ?? MAX_BATCH_LIMIT));
      const entries = await this.repo.listByRefs({
        refType: input.refType,
        refIds,
        ownerType: resolvedOwner.ownerType,
        ownerId: resolvedOwner.ownerId,
        stateKey: input.stateKey,
        stateSubKey: input.stateSubKey ?? undefined,
        stateSubKeyGte: input.stateSubKeyGte,
        stateSubKeyLte: input.stateSubKeyLte,
        limit,
        cursorRefId: input.cursorRefId,
        cursorStateSubKey: input.cursorStateSubKey,
      });

      const last = entries.length === limit ? entries[entries.length - 1] : undefined;
      return {
        entries,
        nextCursorRefId: last?.refId,
        nextCursorStateSubKey: last?.stateSubKey,
      };
    }

    if (!input.refId) throw new Error('RefState list: refId or refIds required');
    await this.assertCanAccessRef(ctx, input.refType, input.refId, ownerType);

    const limit = Math.max(1, Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT));
    const cursorUpdatedAt = input.cursorUpdatedAt ? new Date(input.cursorUpdatedAt) : undefined;

    const entries = await this.repo.listByRef({
      refType: input.refType,
      refId: input.refId,
      ownerType: resolvedOwner.ownerType,
      ownerId: resolvedOwner.ownerId,
      stateKey: input.stateKey,
      stateSubKey: input.stateSubKey ?? undefined,
      stateSubKeyGte: input.stateSubKeyGte,
      stateSubKeyLte: input.stateSubKeyLte,
      limit,
      cursorUpdatedAt,
    });

    const nextCursorUpdatedAt = entries.length === limit ? entries[entries.length - 1]?.updatedAt : undefined;
    return {
      entries,
      nextCursorUpdatedAt: nextCursorUpdatedAt ? nextCursorUpdatedAt.toISOString() : undefined,
    };
  }

  async delete(
    ctx: RequestContext,
    ownerType: 'user' | 'account',
    input: {
      refType: string;
      refId: string;
      stateKey: string;
      stateSubKey?: string | null;
      ownerId?: string;
    },
  ) {
    await this.assertCanAccessRef(ctx, input.refType, input.refId, ownerType);

    if (input.refType === 'item' && input.stateKey === 'task_assignment') {
      const hasEdit = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, input.refId);
      if (!hasEdit) {
        throw new Error('No permission to change task assignment');
      }
    }

    const allowUserOwnerOverrideInAccount =
      input.refType === 'item' && input.stateKey === 'task_assignment' && ownerType === 'user';

    const resolvedOwner = await this.resolveOwnerForWrite(ctx, ownerType, input, {
      allowUserOwnerOverrideInAccount,
    });
    const stateSubKey = input.stateSubKey ?? '';

    const deletedCount = await this.repo.deleteOne({
      refType: input.refType,
      refId: input.refId,
      ownerType: resolvedOwner.ownerType,
      ownerId: resolvedOwner.ownerId,
      stateKey: input.stateKey,
      stateSubKey,
    });
    return {deletedCount};
  }
}
