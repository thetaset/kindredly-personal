import {RequestContext} from '@/base/request_context';
import {SubscriptionRepo} from '@/db/subscription.repo';
import {TYPES} from '@/types';
import {SubscriptionRefType, SUBSCRIPTION_REF_TYPES} from 'tset-sharedlib/shared.types';
import {v4 as uuidv4} from 'uuid';
import PublishedService from './_interfaces/published.service';
import SubscriptionManagerService from './_interfaces/subscription_manager.service';
import PermissionService from './permission.service';
import {inject, injectable} from 'inversify';
import Subscription from 'tset-sharedlib/schemas/public/Subscription';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';

@injectable()
class SubscriptionService {
  constructor(@inject(TYPES.SubscriptionManagementService) private subManService: SubscriptionManagerService) {}

  private subscriptionRepo = new SubscriptionRepo();
  private permissionService = new PermissionService();

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

    // Non-admin users can only manage their own subscriptions for library items.
    if (!isAdmin) {
      if (!isSelf) throw new Error('User auth error');
      if (refType !== 'item_feed' && refType !== 'col' && refType !== 'shared_col') {
        throw new Error('You do not have permission to manage subscriptions');
      }
      if (refType === 'shared_col') {
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

    const results = await this.subscriptionRepo.create(info);

    this.subManService.updateStats(ctx, info).catch((e) => console.error('Error updating stats', e));

    return _id;
  }

  // ROUTE-METHOD
  async removeEntry(ctx: RequestContext, targetUserId: string, refId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    await this.subscriptionRepo.where({userId: targetUserId, refId: refId}).delete();
    return;
  }

  // ROUTE-METHOD
  async removeSubscriptionById(ctx: RequestContext, subscriptionId: string) {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);
    if (!currentSub) throw new Error('Subscription not found');

    await ctx.verifySelfOrAdmin(currentSub.userId);

    await this.subscriptionRepo.where({_id: subscriptionId}).delete();

    this.subManService.updateStats(ctx, currentSub).catch((e) => console.error('Error updating stats', e));

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

    const subList = await this.subscriptionRepo.listByUserId(targetUserId);

    const subWithDetailsList = await this.subManService.listSubscriptionsWithDetails(ctx, subList);

    return subWithDetailsList;
  }
}

export default SubscriptionService;
