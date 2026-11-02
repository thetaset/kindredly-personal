import {RequestContext} from '@/base/request_context';

import SubscriptionManagerService from '../_interfaces/subscription_manager.service';
import ItemListService from '../item.list.service';
import {SubscriptionRepo} from '@/db/subscription.repo';

const ITEM_REF_TYPES = ['col', 'shared_col', 'item_feed'];

/**
 * The Kindredly Personal list. A personal server holds no published content, so `pub_col` rows are
 * left out of the list (the client hides published subscriptions there too), and there are no
 * subscriber counts to keep.
 */
class OpenSubscriptionManagerService implements SubscriptionManagerService {
  private itemListService = new ItemListService();

  private subscriptionRepo = new SubscriptionRepo();

  async updateStats(ctx: RequestContext, sub) {}

  public async listSubscriptionsWithDetails(ctx: RequestContext, subList: any[]) {
    const itemIds = subList.filter((x) => ITEM_REF_TYPES.includes(x.refType)).map((x) => x.refId);
    const itemList = await this.itemListService.listItemsWithIdAndInAccount(ctx, itemIds);
    const itemLookup = Object.fromEntries(itemList.map((x) => [x._id, x]));
    const existingItemIds = await this.subscriptionRepo.existingIds('item', itemIds);
    const subWithDetailsList = [];
    for (const sub of subList) {
      if (ITEM_REF_TYPES.includes(sub.refType)) {
        subWithDetailsList.push({
          ...sub,
          item: itemLookup[sub.refId],
          ...(existingItemIds.has(sub.refId) ? {} : {sourceMissing: true}),
        });
      } else if (sub.refType == 'custom' || sub.refType == 'rediscover') {
        subWithDetailsList.push({
          ...sub,
        });
      }
    }
    return subWithDetailsList;
  }
}

export default OpenSubscriptionManagerService;
