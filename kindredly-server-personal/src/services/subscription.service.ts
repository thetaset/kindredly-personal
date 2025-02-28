import { RequestContext } from '@/base/request_context';
import { SubscriptionRepo } from '@/db/subscription.repo';
import { SubscriptionRefType, TYPES } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import PublishedService from './_interfaces/published.service';
import SubscriptionManagerService from './_interfaces/subscription_manager.service';
import PermissionService from './permission.service';
import { inject , injectable} from 'inversify';


const subscriptionRefTypes = Object.values(SubscriptionRefType);

@injectable()
class SubscriptionService {

  constructor(@inject(TYPES.SubscriptionManagementService) private subManService: SubscriptionManagerService) {}

  private subscriptionRepo = new SubscriptionRepo();
  private permissionService = new PermissionService();


  // ROUTE-METHOD
  async addEntry(ctx: RequestContext, targetUserId: string, refType: SubscriptionRefType, refId: string, data: any, encInfo: any) {
    await ctx.verifyAdminPermissions(targetUserId);

    if (!subscriptionRefTypes.includes(refType))
      throw new Error('Invalid refType');

    if (refType == SubscriptionRefType.item_feed) {
     const hasViewPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId);
      if (!hasViewPermission) throw new Error('You do not have permission to view this item feed');
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
    await ctx.verifyAdminPermissions(targetUserId);
    await this.subscriptionRepo.where({ userId: targetUserId, refId: refId }).delete();
    return;
  }


  // ROUTE-METHOD
  async removeSubscriptionById(ctx: RequestContext, subscriptionId: string) {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);

    await ctx.verifyAdminPermissions(currentSub.userId);

    await this.subscriptionRepo.where({ _id: subscriptionId }).delete();

    this.subManService.updateStats(ctx, currentSub).catch((e) => console.error('Error updating stats', e));

    return;
  }




  // ROUTE-METHOD
  async editSubscriptionById(ctx: RequestContext, subscriptionId: string, data: any, encInfo: any) {
    const currentSub = await this.subscriptionRepo.findById(subscriptionId);

    await ctx.verifyAdminPermissions(currentSub.userId);

    const info = {
      data: data,
      encInfo: encInfo,
      encrypted: encInfo != null,
    };

    const results = await this.subscriptionRepo.updateWithId(subscriptionId, info);
    return results;
  }


  // ROUTE-METHOD
  async listWithDetailByRef(ctx: RequestContext, refId: string, refType: string) {
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
