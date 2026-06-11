import {config} from '@/config';
import {sharedPlanPolicies, type SharedPlanKey, getSharedPlanPolicy} from 'tset-sharedlib/plan-policy';

const productLookup = {
  standard: createProductDetails('standard'),
  plus: createProductDetails('plus'),
  superplus: createProductDetailsFromPolicy(getSharedPlanPolicy('superplus')),
};

function createProductDetails(planKey: SharedPlanKey) {
  const policy = sharedPlanPolicies[planKey];
  return createProductDetailsFromPolicy(policy);
}

function createProductDetailsFromPolicy(policy: ReturnType<typeof getSharedPlanPolicy>) {
  return {
    maxUsers: policy.seats.maxUsers,
    maxCollection: policy.library.maxCollections,
    maxTotalItems: policy.library.maxTotalItems,
    maxItemsPerCollection: policy.library.legacyMaxItemsPerCollection,
    maxVisibleStorageBytes: policy.files.maxVisibleStorageBytes,
    maxUploadBytes: policy.files.maxUploadBytes,
    quotaWarnAtPercent: policy.files.warnAtPercent,
    quotaUrgentWarnAtPercent: policy.files.urgentWarnAtPercent,
    quotaBlockAtPercent: policy.files.blockAtPercent,
    historyRetentionDays: policy.history.retentionDays,
    publicLabel: policy.publicLabel,
    publicLabelWithFree: policy.publicLabelWithFree || policy.publicLabel,
    marketingTier: policy.marketingTier,
    customerFacingCapacityLabel: policy.library.customerFacingCapacityLabel,
    readiness: policy.readiness,
  };
}

const plans = [
  {
    planId: 'sub_standard_free',
    planName: 'Standard Plan',
    productId: 'standard',
    planData: {
      freq: 'na',
      length_in_days: 0,
    },
    free: true,
    paymentConfig: {
      stripe: {
        priceId: config.live ? 'price_1LZfM7LkkpVW90AMqhlQFIiP' : 'price_1LUZ3tLkkpVW90AMrps4Xz0m',
      },
    },
    cost: null,
  },

  {
    planId: 'sub_plus_monthly',
    planName: 'Plus Subscription',
    productId: 'plus',
    planData: {
      freq: 'month',
      length_in_days: 30,
    },
    paymentConfig: {
      stripe: {
        priceId: config.live ? 'price_1PIbLdLkkpVW90AMzv6cBjqF' : 'price_1LTCAwLkkpVW90AMChQzU3Oe',
      },
    },
    cost: {USD: 5},
  },
  {
    planId: 'sub_plus_yearly',
    planName: 'Plus Subscription',
    productId: 'plus',
    planData: {
      freq: 'year',
      length_in_days: 365,
    },
    paymentConfig: {
      stripe: {
        priceId: config.live ? 'price_1PIbLdLkkpVW90AMbrKAZ8so' : 'price_1PIbKJLkkpVW90AMZfvfEige',
      },
    },
    cost: {USD: 49},
    savings: {USD: 11},
  },
];

const stripPlanLookup = Object.fromEntries(
  plans
    .filter((v) => v?.paymentConfig?.stripe?.priceId != null)
    .map((v) => [v.paymentConfig.stripe?.priceId, v.planId]),
);

function normalizeWritableAccountType(accountType: string | null | undefined): SharedPlanKey {
  return accountType === 'plus' || accountType === 'superplus' ? 'plus' : 'standard';
}

export function buildAccountPlanUpdate(accountType: string | null | undefined) {
  const normalizedAccountType = normalizeWritableAccountType(accountType);
  const details = getDetailsByAccountType(normalizedAccountType);

  return {
    accountType: normalizedAccountType,
    maxUsers: details?.maxUsers ?? null,
    maxCollections: details?.maxCollection ?? 0,
    maxItemsPerCollection: details?.maxItemsPerCollection ?? 0,
  };
}

export function accountMatchesPlanUpdate(
  account:
    | {
        accountType?: string | null;
        maxUsers?: number | null;
        maxCollections?: number | null;
        maxItemsPerCollection?: number | null;
      }
    | null
    | undefined,
  accountType: string | null | undefined,
) {
  const planUpdate = buildAccountPlanUpdate(accountType);

  return (
    account?.accountType === planUpdate.accountType &&
    account?.maxUsers === planUpdate.maxUsers &&
    account?.maxCollections === planUpdate.maxCollections &&
    account?.maxItemsPerCollection === planUpdate.maxItemsPerCollection
  );
}

export function getDetailsByAccountType(id: string) {
  return productLookup[id];
}

export {plans, stripPlanLookup, productLookup};
