import { RequestContext } from "@/base/request_context";

import { SubscriptionRefType } from "@/types";
import SubscriptionManagerService from "../_interfaces/subscription_manager.service";
import ItemListService from "../item.list.service";
import { SubscriptionRepo } from "@/db/subscription.repo";



class OpenSubscriptionManagerService implements SubscriptionManagerService {

  private itemListService = new ItemListService();


  private subscriptionRepo = new SubscriptionRepo();
  
  async updateStats(ctx: RequestContext, sub) {

  }

  public async listSubscriptionsWithDetails(ctx: RequestContext, subList: any[], ) {
    const itemIds = subList.filter((x) => x.refType == SubscriptionRefType.col || x.refType == SubscriptionRefType.item_feed).map((x) => x.refId);
    const itemList = await this.itemListService.listItemsWithIdAndInAccount(ctx, itemIds);
    const itemLookup = Object.fromEntries(itemList.map((x) => [x._id, x]));
    const subWithDetailsList = [];
    for (const sub of subList) {
      if (sub.refType == SubscriptionRefType.col) {
        const item = itemLookup[sub.refId];
        subWithDetailsList.push({
          ...sub,
          item: item,
        });
      } else if (sub.refType == SubscriptionRefType.item_feed) {
        const item = itemLookup[sub.refId];
        subWithDetailsList.push({
          ...sub,
          item: item,
        });
      
      } else if (sub.refType == SubscriptionRefType.custom) {
        subWithDetailsList.push({
          ...sub,
        });
      }
    }
    return subWithDetailsList;
  }

}

export default OpenSubscriptionManagerService;
