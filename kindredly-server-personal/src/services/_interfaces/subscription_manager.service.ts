import { RequestContext } from "@/base/request_context";




interface SubscriptionManagerService {

  listSubscriptionsWithDetails(ctx: RequestContext, subList: any[], ): Promise<any[]>;
  updateStats(ctx: RequestContext, info: any): Promise<void>;

}

export default SubscriptionManagerService;
