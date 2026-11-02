import {RequestContext} from '@/base/request_context';
import {SubscriptionRepo} from '@/db/subscription.repo';
import {TYPES} from '@/types';
import {SubscriptionRefType, SUBSCRIPTION_REF_TYPES} from 'tset-sharedlib/shared.types';
import {v4 as uuidv4} from 'uuid';
import PublishedService from './_interfaces/published.service';
import SubscriptionManagerService from './_interfaces/subscription_manager.service';
import PermissionService from './permission.service';
// TYPE-ONLY — erased at compile time, so it emits no require(). The lazy getter
// below is what resolves it, and only on a code path a self-hosted server never
// takes. See services/import_export.service.ts for the full reasoning.
import type InternalPublishedService from './_internal/internal_published.service';
import {inject, injectable} from 'inversify';
import Subscription from 'tset-sharedlib/schemas/public/Subscription';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';
import {HttpException} from '@/exceptions/HttpException';
import SSEManager from './sse.manager';

/**
 * Postgres unique_violation. Rediscover has a partial unique index on ("userId"), and every other
 * refType but `item_feed` one on ("userId", "refType", "refId"), so a losing insert in a create race
 * reports this rather than writing a second copy — the caller reads the winner's row instead.
 */
function isUniqueViolation(e: any): boolean {
  return e?.code === '23505';
}

/**
 * The refTypes a person can hold only one subscription to per target. `item_feed` is the exception:
 * an item can carry several feeds, and which one a row follows is inside its encrypted `data`.
 */
function isOnePerTarget(refType: string): boolean {
  return refType !== 'item_feed';
}

/** What `/subscription/edit` answers. `conflict` means the row changed since `expectedUpdatedAt`. */
export type SubscriptionEditResult = {updated: boolean; conflict?: boolean; updatedAt?: string | null};

/** The event a person's other devices get when their subscriptions change, so they re-read the list. */
export const SUBSCRIPTIONS_UPDATE_EVENT = 'subscriptionsUpdate';

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

@injectable()
class SubscriptionService {
  constructor(@inject(TYPES.SubscriptionManagementService) private subManService: SubscriptionManagerService) {}

  private subscriptionRepo = new SubscriptionRepo();
  private permissionService = new PermissionService();
  private sseManager = SSEManager.getInstance();

  /** Tell the person's other devices to re-read their subscriptions. Never fails the write. */
  private announceChange(userId: string | null | undefined) {
    if (!userId) return;
    this.sseManager.broadcastToUser(userId, SUBSCRIPTIONS_UPDATE_EVENT, {}).catch((e) => {
      console.error('Could not announce a subscription change', e);
    });
  }
  /** Cloud-only: `services/_internal` is withheld from the published Kindredly
   *  Personal repo, and this file cannot be — routes/subscription.route.ts is
   *  registered there. Its one caller checks whether a subscription target is
   *  viewable published content, and a personal server has no published content
   *  at all. */
  private _publishedService: InternalPublishedService | null = null;
  private get publishedService(): InternalPublishedService {
    if (!this._publishedService) {
      // personal-optional: guarded, never reached on a self-hosted server
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./_internal/internal_published.service');
      this._publishedService = new (mod.default || mod)();
    }
    return this._publishedService as InternalPublishedService;
  }

  private async _canViewCollectionForSubscription(ctx: RequestContext, collectionId: string): Promise<boolean> {
    const item = await ctx.getItemById(collectionId);
    if (!item) return false;
    if ((item as any)?.type !== 'col') return false;

    // An admin of the collection's own family, never any admin (CLN-75).
    if (await ctx.isAdminInAccount(item.accountId)) return true;

    // Match ItemService.getItemInfoById collection visibility rules.
    const sameAccountVisible =
      item.accountId === ctx.accountId && (item.visibility === 'shared' || item.visibility === 'network');
    if (sameAccountVisible) return true;

    // Cross-account discoverability only applies for network visibility.
    if (item.visibility === 'network') {
      const ownerUserId = item.userId;
      if (ownerUserId && (await ctx.isInNetwork(ownerUserId))) return true;
    }

    // Finally, direct permission grants view.
    return await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, collectionId);
  }

  // ROUTE-METHOD
  async addEntry(
    ctx: RequestContext,
    targetUserId: string,
    refType: SubscriptionRefType,
    refId: string,
    data: any,
    encInfo: any,
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    // Rediscover was a subscription (SL-280) and is a place of its own again (HAT-453): rows made
    // before then stay in the table, left out of every list, and no new one is made.
    if (refType === 'rediscover') throw new Error('Rediscover is not a subscription');

    const isAdmin = await ctx.isAdmin();
    const isSelf = targetUserId === ctx.currentUserId;

    // Non-admin users can only manage their own subscriptions for library items and for
    // published collections they are allowed to view.
    if (!isAdmin) {
      if (!isSelf) throw new Error('User auth error');
      if (refType !== 'item_feed' && refType !== 'col' && refType !== 'shared_col' && refType !== 'pub_col') {
        throw new Error('You do not have permission to manage subscriptions');
      }
      if (refType === 'pub_col') {
        // Checked below, for admins too.
      } else if (refType === 'shared_col') {
        const canView = await this._canViewCollectionForSubscription(ctx, refId);
        if (!canView) throw new Error('You do not have permission to subscribe to this collection');
      } else {
        const inLibrary = await this.permissionService.isInLibraryForUser(ctx, targetUserId, refId);
        if (!inLibrary) {
          throw new Error('Subscriptions are only available for items in your library');
        }
      }
    }

    if (!SUBSCRIPTION_REF_TYPES.includes(refType)) throw new Error('Invalid refType');

    if (refType === 'pub_col') {
      // Published collections are authorized via published visibility rules, not library
      // membership. refId must be a published id: an admin's subscribe once stored a library
      // collection id here, which no published-collection read can resolve.
      const info = await this.publishedService.assertCanViewPublishedById(ctx, refId);
      if ((info as any)?.type !== 'col') {
        throw new Error('You do not have permission to subscribe to this collection');
      }
    }

    // A second Subscribe to the same target hands back the subscription that already exists.
    if (isOnePerTarget(refType)) {
      const existing = await this.subscriptionRepo.findForUserAndRef(targetUserId, refType, refId);
      if (existing?._id) return existing._id;
    }

    if (refType == 'item_feed') {
      const hasViewPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId);
      if (!hasViewPermission) throw new Error('You do not have permission to view this item feed');
    }

    if (refType == 'shared_col') {
      const canView = await this._canViewCollectionForSubscription(ctx, refId);
      if (!canView) throw new Error('You do not have permission to subscribe to this collection');
    }

    let _id = 'sub_' + uuidv4();
    const info = {
      _id: _id,
      userId: targetUserId,
      refType: refType,
      refId: refId,
      data: data,
      encInfo: encInfo,
      encrypted: encInfo != null,
    };

    try {
      await this.subscriptionRepo.create(info);
    } catch (e) {
      // Two Subscribe presses, or a press racing the default-source create, and the
      // database refused the twin. Hand back the row that won, which is what the caller
      // asked for anyway.
      if (isUniqueViolation(e) && isOnePerTarget(refType)) {
        const winner = await this.subscriptionRepo.findForUserAndRef(targetUserId, refType, refId);
        if (winner?._id) return winner._id;
      }
      throw e;
    }

    this.subManService.updateStats(ctx, info).catch((e) => console.error('Error updating stats', e));
    this.announceChange(targetUserId);

    return _id;
  }

  // ROUTE-METHOD
  async removeEntry(ctx: RequestContext, targetUserId: string, refId: string, refType?: string | null) {
    await ctx.verifySelfOrAdmin(targetUserId);
    const query = this.subscriptionRepo.query().where({userId: targetUserId, refId: refId});
    // Older clients send no refType; a refId alone is then the whole match, as it always was.
    if (refType) query.andWhere({refType});
    const removed: Subscription[] = await query.delete().returning('*');
    for (const sub of removed) {
      this.subManService.updateStats(ctx, sub).catch((e) => console.error('Error updating stats', e));
    }
    if (removed.length) this.announceChange(targetUserId);
    return;
  }

  // ROUTE-METHOD
  async removeSubscriptionById(ctx: RequestContext, subscriptionId: string) {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);
    if (!currentSub) throw new Error('Subscription not found');

    await ctx.verifySelfOrAdmin(currentSub.userId);

    await this.subscriptionRepo.where({_id: subscriptionId}).delete();

    this.subManService.updateStats(ctx, currentSub).catch((e) => console.error('Error updating stats', e));

    this.announceChange(currentSub.userId);

    return;
  }

  /**
   * Replace a subscription's `data`. `data` is encrypted on the client, so the server cannot merge
   * two writes; it can only refuse a stale one. A caller that sends `expectedUpdatedAt` (the
   * `updatedAt` it read) is refused with `conflict: true` when the row has been written since, so a
   * second device or an old cached copy cannot put back an earlier place in a course. Callers that
   * send nothing get the old behaviour: the write always lands.
   */
  // ROUTE-METHOD
  async editSubscriptionById(
    ctx: RequestContext,
    subscriptionId: string,
    data: any,
    encInfo: any,
    expectedUpdatedAt?: string | null,
  ): Promise<SubscriptionEditResult> {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);
    if (!currentSub) throw new HttpException(404, 'Subscription not found');

    await ctx.verifySelfOrAdmin(currentSub.userId);

    assertEncryptedUpdateHasEncInfo({
      currentEncInfo: currentSub?.encInfo,
      nextEncInfo: encInfo,
      context: '/subscription/edit',
    });

    if (currentSub?.encInfo && encInfo != null) {
      assertEncInfoUpdateIsSafe({
        currentEncInfo: currentSub.encInfo,
        nextEncInfo: encInfo,
        context: '/subscription/edit',
        payloadForCiphertextCheck: {data},
      });
    }

    const updatedAt = new Date();
    const info = {
      data: data,
      encInfo: encInfo,
      encrypted: encInfo != null,
      updatedAt,
    };

    const written = await this.subscriptionRepo.updateWithIdIfUnchangedSince(subscriptionId, info, expectedUpdatedAt);
    if (!written) {
      const latest = await this.subscriptionRepo.findById(subscriptionId);
      if (!latest) throw new HttpException(404, 'Subscription not found');
      return {updated: false, conflict: true, updatedAt: toIso(latest.updatedAt)};
    }

    this.announceChange(currentSub.userId);
    return {updated: true, updatedAt: updatedAt.toISOString()};
  }

  // ROUTE-METHOD
  async listWithDetailByRef(ctx: RequestContext, refId: string, refType: string): Promise<Subscription[]> {
    const userIds = await ctx.getAccountUserIds();
    const lst = await this.subscriptionRepo.listWhereUserIdsIn(refId, refType, userIds);
    return lst;
  }

  // TODO: add item and pub_item
  // ROUTE-METHOD
  async listWithDetailsByUserId(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    // A Rediscover row made before HAT-453 is left out; Rediscover is a place of its own.
    const subList = (await this.subscriptionRepo.listByUserId(targetUserId)).filter(
      (sub) => sub.refType !== 'rediscover',
    );

    const subWithDetailsList: Array<Subscription & {item?: any; sourceMissing?: boolean; sourceNoAccess?: boolean}> =
      await this.subManService.listSubscriptionsWithDetails(ctx, subList);

    // Another person's collection can stop being shared with this one: a permission removed, its
    // visibility changed, a friend gone from the network. Checked at read time rather than deleted
    // when it happens, because access can come back and there are many ways to lose it.
    for (const sub of subWithDetailsList) {
      if (sub.refType !== 'shared_col' || sub.sourceMissing) continue;
      if (await this._canViewCollectionForSubscription(ctx, sub.refId)) continue;
      sub.sourceNoAccess = true;
      delete sub.item;
    }

    return subWithDetailsList;
  }
}

export default SubscriptionService;
