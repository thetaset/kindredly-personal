import {plans} from '@/defaults/products_and_plans';
import ProductSubscriptionService from '@/services/_internal/product_subscription.service';

describe('ProductSubscriptionService.checkSubscriptionSyncState', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reprovisions when a plus account has stale persisted plan fields', async () => {
    const service = new ProductSubscriptionService();
    const plusMonthlyPlan = plans.find((plan) => plan.planId === 'sub_plus_monthly');

    (service as any).accountService = {
      _getAccountById: jest.fn().mockResolvedValue({
        _id: 'ac_1',
        stripeCustomerId: 'cus_1',
        accountType: 'plus',
        maxUsers: 5,
        maxCollections: 1000,
        maxItemsPerCollection: 10000,
        subscriptionInfo: {
          currentSubscription: {id: 'sub_1'},
          currentPlanId: 'sub_plus_monthly',
        },
      }),
    };
    (service as any).stripe = {
      subscriptions: {
        list: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'sub_1',
              items: {
                data: [{price: {id: plusMonthlyPlan?.paymentConfig?.stripe?.priceId}}],
              },
            },
          ],
        }),
      },
    };

    const provisionPlanSpy = jest.spyOn(service, 'provisionPlan').mockResolvedValue(undefined as never);

    const result = await service.checkSubscriptionSyncState('ac_1');

    expect(provisionPlanSpy).toHaveBeenCalledWith(
      expect.objectContaining({_id: 'ac_1'}),
      'sub_plus_monthly',
      expect.objectContaining({id: 'sub_1'}),
    );
    expect(result).toEqual(
      expect.objectContaining({
        planId: 'sub_plus_monthly',
        currentpublishId: 'sub_1',
        syncedState: false,
      }),
    );
  });

  it('reloads and normalizes account details after a forced subscription sync', async () => {
    const service = new ProductSubscriptionService();
    const getAccountById = jest
      .fn()
      .mockResolvedValueOnce({
        _id: 'ac_1',
        accountType: 'standard',
        maxUsers: 5,
        maxCollections: 250,
        maxItemsPerCollection: 1000,
        subscriptionInfo: {currentPlanId: 'sub_standard_free'},
      })
      .mockResolvedValueOnce({
        _id: 'ac_1',
        accountType: 'plus',
        maxUsers: 5,
        maxCollections: 250,
        maxItemsPerCollection: 1000,
        subscriptionInfo: {currentPlanId: 'sub_plus_monthly'},
      });

    (service as any).accountService = {
      _getAccountById: getAccountById,
      _updateAccountInfo: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(service, 'syncSubscriptionState').mockResolvedValue({
      syncedState: true,
      requiredSyncing: true,
    } as any);

    const result = await service.getAccountDetails({accountId: 'ac_1'} as any, true);

    expect(getAccountById).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        accountType: 'plus',
        maxUsers: 10,
        maxCollections: 5000,
        maxItemsPerCollection: 50000,
        subscriptionInfo: expect.objectContaining({
          currentPlanId: 'sub_plus_monthly',
          syncState: expect.objectContaining({syncedState: true}),
        }),
      }),
    );
  });
});
