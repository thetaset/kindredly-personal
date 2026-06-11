import {RequestContext} from '@/base/request_context';
import {RefStateRepo} from '@/db/ref_state.repo';
import PermissionService from '@/services/permission.service';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
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

  private async assertCanAccessRef(ctx: RequestContext, refType: string, refId: string) {
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
    await this.assertCanAccessRef(ctx, input.refType, input.refId);

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

    return await this.repo.upsert({
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
  }

  async list(
    ctx: RequestContext,
    ownerType: 'user' | 'account',
    input: {
      refType: string;
      refId: string;
      stateKey?: string;
      stateSubKey?: string | null;
      limit?: number;
      cursorUpdatedAt?: string;
      ownerId?: string;
    },
  ) {
    await this.assertCanAccessRef(ctx, input.refType, input.refId);
    const resolvedOwner = await this.resolveOwner(ctx, ownerType, input.ownerId);

    const limit = Math.max(1, Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT));
    const cursorUpdatedAt = input.cursorUpdatedAt ? new Date(input.cursorUpdatedAt) : undefined;

    const entries = await this.repo.listByRef({
      refType: input.refType,
      refId: input.refId,
      ownerType: resolvedOwner.ownerType,
      ownerId: resolvedOwner.ownerId,
      stateKey: input.stateKey,
      stateSubKey: input.stateSubKey ?? undefined,
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
    await this.assertCanAccessRef(ctx, input.refType, input.refId);

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
