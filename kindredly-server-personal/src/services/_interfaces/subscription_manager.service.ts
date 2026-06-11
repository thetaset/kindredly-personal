import {RequestContext} from '@/base/request_context';
import Subscription from 'tset-sharedlib/schemas/public/Subscription';

interface SubscriptionManagerService {
  listSubscriptionsWithDetails(ctx: RequestContext, subList: any[]): Promise<Array<Subscription & {item?: any}>>;
  updateStats(ctx: RequestContext, info: any): Promise<void>;
}

export default SubscriptionManagerService;
