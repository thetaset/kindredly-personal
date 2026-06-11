const MB = 1024 * 1024;
const GB = 1024 * MB;

export type SharedPlanKey = 'standard' | 'plus';

export type SharedPlanPolicy = {
  publicLabel: string;
  publicLabelWithFree?: string;
  marketingTier: 'free' | 'paid' | 'internal';
  seats: {
    maxUsers: number;
  };
  history: {
    retentionDays: number;
  };
  library: {
    maxCollections: number;
    maxTotalItems: number;
    // Compatibility bridge while the server still persists a per-collection field.
    legacyMaxItemsPerCollection: number;
    customerFacingCapacityLabel: string;
  };
  files: {
    maxVisibleStorageBytes: number;
    maxUploadBytes: number;
    warnAtPercent: number;
    urgentWarnAtPercent: number;
    blockAtPercent: number;
  };
  readiness: {
    weeklyReports: boolean;
    calendar: boolean;
    advancedInsights: boolean;
    advancedScheduleTools: boolean;
    aiChat: boolean;
    advancedStandaloneApps: boolean;
  };
};

export const sharedPlanPolicies: Record<SharedPlanKey, SharedPlanPolicy> = {
  standard: {
    publicLabel: 'Standard',
    publicLabelWithFree: 'Standard (Free)',
    marketingTier: 'free',
    seats: {
      maxUsers: 5,
    },
    history: {
      retentionDays: 14,
    },
    library: {
      maxCollections: 250,
      maxTotalItems: 2000,
      legacyMaxItemsPerCollection: 1000,
      customerFacingCapacityLabel: 'Standard library capacity',
    },
    files: {
      maxVisibleStorageBytes: 500 * MB,
      maxUploadBytes: 35 * MB,
      warnAtPercent: 70,
      urgentWarnAtPercent: 85,
      blockAtPercent: 100,
    },
    readiness: {
      weeklyReports: false,
      calendar: false,
      advancedInsights: false,
      advancedScheduleTools: false,
      aiChat: false,
      advancedStandaloneApps: false,
    },
  },
  plus: {
    publicLabel: 'Plus',
    marketingTier: 'paid',
    seats: {
      maxUsers: 10,
    },
    history: {
      retentionDays: 365,
    },
    library: {
      maxCollections: 5000,
      maxTotalItems: 50000,
      legacyMaxItemsPerCollection: 50000,
      customerFacingCapacityLabel: 'High-capacity library',
    },
    files: {
      maxVisibleStorageBytes: 10 * GB,
      maxUploadBytes: 200 * MB,
      warnAtPercent: 70,
      urgentWarnAtPercent: 85,
      blockAtPercent: 100,
    },
    readiness: {
      weeklyReports: false,
      calendar: false,
      advancedInsights: false,
      advancedScheduleTools: false,
      aiChat: false,
      advancedStandaloneApps: false,
    },
  },
};

export function getSharedPlanPolicy(accountType: string | null | undefined): SharedPlanPolicy {
  if (accountType === 'plus' || accountType === 'superplus') {
    return sharedPlanPolicies.plus;
  }

  if (accountType === 'standard') {
    return sharedPlanPolicies.standard;
  }

  return sharedPlanPolicies.standard;
}