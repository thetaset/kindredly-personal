import {RequestContext} from '@/base/request_context';
import {SubscriptionRepo} from '@/db/subscription.repo';
import {TYPES} from '@/types';
import {
  REDISCOVER_SOURCE_PREF_KEY,
  REDISCOVER_SUBSCRIPTION_DEFAULT_DATA,
  REDISCOVER_SUBSCRIPTION_REF_ID,
  SubscriptionRefType,
  SUBSCRIPTION_REF_TYPES,
} from 'tset-sharedlib/shared.types';
import {v4 as uuidv4} from 'uuid';
import PublishedService from './_interfaces/published.service';
import SubscriptionManagerService from './_interfaces/subscription_manager.service';
import PermissionService from './permission.service';
import UserService from './user.service';
// TYPE-ONLY — erased at compile time, so it emits no require(). The lazy getter
// below is what resolves it, and only on a code path a self-hosted server never
// takes. See services/import_export.service.ts for the full reasoning.
import type InternalPublishedService from './_internal/internal_published.service';
import {inject, injectable} from 'inversify';
import Subscription from 'tset-sharedlib/schemas/public/Subscription';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';

/**
 * Postgres unique_violation. The Rediscover source has a partial unique index on
 * ("userId") WHERE refType = 'rediscover', so a losing insert in the create race reports
 * this rather than writing a second copy — the caller reads the winner's row instead.
 */
function isUniqueViolation(e: any): boolean {
  return e?.code === '23505';
}

@injectable()
class SubscriptionService {
  constructor(@inject(TYPES.SubscriptionManagementService) private subManService: SubscriptionManagerService) {}

  private subscriptionRepo = new SubscriptionRepo();
  private permissionService = new PermissionService();
  private userService = new UserService();
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

    const isAdmin = await ctx.isAdmin();
    if (isAdmin) return true;

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

    const isAdmin = await ctx.isAdmin();
    const isSelf = targetUserId === ctx.currentUserId;

    // Non-admin users can only manage their own subscriptions for library items, for
    // published collections they are allowed to view, and for the built-in Rediscover source.
    if (!isAdmin) {
      if (!isSelf) throw new Error('User auth error');
      if (
        refType !== 'item_feed' &&
        refType !== 'col' &&
        refType !== 'shared_col' &&
        refType !== 'pub_col' &&
        refType !== 'rediscover'
      ) {
        throw new Error('You do not have permission to manage subscriptions');
      }
      if (refType === 'rediscover') {
        // Built-in: its items are the person's own library, so there is nothing to be
        // allowed to view.
      } else if (refType === 'pub_col') {
        // Published collections are authorized via published visibility rules, not
        // library membership (refId is a published id, not a library item id).
        const info = await this.publishedService.assertCanViewPublishedById(ctx, refId);
        if ((info as any)?.type !== 'col') {
          throw new Error('You do not have permission to subscribe to this collection');
        }
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

    if (refType === 'rediscover') {
      // One per user, addressed by a fixed refId so removeEntry can find it. A second
      // Subscribe hands back the row that already exists rather than creating a twin.
      if (refId !== REDISCOVER_SUBSCRIPTION_REF_ID) throw new Error('Invalid refId');
      const existing = (await this.subscriptionRepo.listByUserId(targetUserId)).find(
        (sub) => sub.refType === 'rediscover',
      );
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
      if (refType === 'rediscover' && isUniqueViolation(e)) {
        const winner = (await this.subscriptionRepo.listByUserId(targetUserId)).find(
          (sub) => sub.refType === 'rediscover',
        );
        if (winner?._id) return winner._id;
      }
      throw e;
    }

    this.subManService.updateStats(ctx, info).catch((e) => console.error('Error updating stats', e));

    // A manual re-subscribe means the earlier removal no longer stands.
    if (refType === 'rediscover') await this.setRediscoverRemoved(ctx, targetUserId, null);

    return _id;
  }

  /**
   * The sources every user starts with. Today that is Rediscover alone: created the first time
   * a user lists their own subscriptions, and never re-created once they have removed it —
   * the removal is remembered in a user pref, because "on by default" must not mean "cannot
   * be turned off". Best-effort: a failure here must never fail the listing.
   */
  private async ensureDefaultSubscriptions(ctx: RequestContext, userId: string) {
    try {
      const existing = await this.subscriptionRepo.listByUserId(userId);
      if (existing.some((sub) => sub.refType === 'rediscover')) return;

      const pref = await this.userService.getUserPrefsValue(ctx, userId, REDISCOVER_SOURCE_PREF_KEY);
      if ((pref?.value as {removedAt?: string | null} | null)?.removedAt) return;

      await this.subscriptionRepo.create({
        _id: 'sub_' + uuidv4(),
        userId,
        refType: 'rediscover',
        refId: REDISCOVER_SUBSCRIPTION_REF_ID,
        data: {...REDISCOVER_SUBSCRIPTION_DEFAULT_DATA},
        encInfo: null,
        encrypted: false,
      });
    } catch (e) {
      // The other request creating the same default source is the expected outcome of a
      // concurrent listing, not a failure worth logging.
      if (isUniqueViolation(e)) return;
      console.error('ensureDefaultSubscriptions failed', e);
    }
  }

  private async setRediscoverRemoved(ctx: RequestContext, userId: string, removedAt: string | null) {
    try {
      await this.userService.updateUserPrefs(ctx, userId, {[REDISCOVER_SOURCE_PREF_KEY]: {removedAt}});
    } catch (e) {
      console.error('Could not record the Rediscover source removal', e);
    }
  }

  // ROUTE-METHOD
  async removeEntry(ctx: RequestContext, targetUserId: string, refId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    await this.subscriptionRepo.where({userId: targetUserId, refId: refId}).delete();
    if (refId === REDISCOVER_SUBSCRIPTION_REF_ID) {
      await this.setRediscoverRemoved(ctx, targetUserId, new Date().toISOString());
    }
    return;
  }

  // ROUTE-METHOD
  async removeSubscriptionById(ctx: RequestContext, subscriptionId: string) {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);
    if (!currentSub) throw new Error('Subscription not found');

    await ctx.verifySelfOrAdmin(currentSub.userId);

    await this.subscriptionRepo.where({_id: subscriptionId}).delete();

    this.subManService.updateStats(ctx, currentSub).catch((e) => console.error('Error updating stats', e));

    if (currentSub.refType === 'rediscover') {
      await this.setRediscoverRemoved(ctx, currentSub.userId, new Date().toISOString());
    }

    return;
  }

  // ROUTE-METHOD
  async editSubscriptionById(ctx: RequestContext, subscriptionId: string, data: any, encInfo: any) {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);

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

    const info = {
      data: data,
      encInfo: encInfo,
      encrypted: encInfo != null,
    };

    const results = await this.subscriptionRepo.updateWithId(subscriptionId, info);
    return results;
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

    // Only for the person's own list: an admin reading a child's subscriptions must not
    // create anything on the child's behalf.
    if (targetUserId === ctx.currentUserId) await this.ensureDefaultSubscriptions(ctx, targetUserId);

    const subList = await this.subscriptionRepo.listByUserId(targetUserId);

    const subWithDetailsList = await this.subManService.listSubscriptionsWithDetails(ctx, subList);

    return subWithDetailsList;
  }
}

export default SubscriptionService;
