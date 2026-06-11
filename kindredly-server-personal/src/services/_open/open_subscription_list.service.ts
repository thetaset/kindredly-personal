import {RequestContext} from '@/base/request_context';

import SubscriptionManagerService from '../_interfaces/subscription_manager.service';
import ItemListService from '../item.list.service';
import {SubscriptionRepo} from '@/db/subscription.repo';

class OpenSubscriptionManagerService implements SubscriptionManagerService {
  private itemListService = new ItemListService();

  private subscriptionRepo = new SubscriptionRepo();

  async updateStats(ctx: RequestContext, sub) {}

  public async listSubscriptionsWithDetails(ctx: RequestContext, subList: any[]) {
    const itemIds = subList
      .filter((x) => x.refType == 'col' || x.refType == 'shared_col' || x.refType == 'item_feed')
      .map((x) => x.refId);
    const itemList = await this.itemListService.listItemsWithIdAndInAccount(ctx, itemIds);
    const itemLookup = Object.fromEntries(itemList.map((x) => [x._id, x]));
    const subWithDetailsList = [];
    for (const sub of subList) {
      if (sub.refType == 'col') {
        const item = itemLookup[sub.refId];
        subWithDetailsList.push({
          ...sub,
          item: item,
        });
      } else if (sub.refType == 'shared_col') {
        const item = itemLookup[sub.refId];
        subWithDetailsList.push({
          ...sub,
          item: item,
        });
      } else if (sub.refType == 'item_feed') {
        const item = itemLookup[sub.refId];
        subWithDetailsList.push({
          ...sub,
          item: item,
        });
      } else if (sub.refType == 'custom') {
        subWithDetailsList.push({
          ...sub,
        });
      }
    }
    return subWithDetailsList;
  }
}

export default OpenSubscriptionManagerService;
