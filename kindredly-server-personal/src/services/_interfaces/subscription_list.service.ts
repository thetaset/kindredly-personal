import { RequestContext } from "@/base/request_context";




interface SubscriptionListService {

  listSubscriptionsWithDetails(ctx: RequestContext, subList: any[], ): Promise<any[]>;

}

export default SubscriptionListService;
