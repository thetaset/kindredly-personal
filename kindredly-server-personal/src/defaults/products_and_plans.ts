import { config } from '@/config';
const productLookup = {
  standard: {
    maxUsers: 5,
    maxCollection: 800,
    maxItemsPerCollection: 50,
  },
  plus: {
    maxUsers: 10,
    maxCollection: 2000,
    maxItemsPerCollection: 200,
  },
  superplus: {
    maxUsers: 16,
    maxCollection: 10000,
    maxItemsPerCollection: 1000,
  },
};

const plans = [
  {
    planId: 'sub_standard_free',
    planName: 'Basic Plan',
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
    cost: { USD: 5 },
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
    cost: { USD: 49 },
    savings: { USD: 11 },
  },

];

const stripPlanLookup = Object.fromEntries(
  plans
    .filter((v) => v?.paymentConfig?.stripe?.priceId != null)
    .map((v) => [v.paymentConfig.stripe?.priceId, v.planId]),
);


export function getDetailsByAccountType(id: string) {
  return productLookup[id];
}

export { plans, stripPlanLookup, productLookup };
