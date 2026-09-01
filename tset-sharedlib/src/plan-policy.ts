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
    /**
     * AI-assisted content authoring (the collection builder / "Creating with AI").
     * Kept separate from `aiChat`, which is still off on every plan.
     */
    contentAuthoring: boolean;
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
      // 2GB / 100MB, not 500MB / 35MB. A single phone video is 45-100MB/minute, so the old
      // upload cap was about 45 seconds of 1080p and the old storage cap was ten of them for
      // the life of the account. Raising the upload limit without the storage limit only
      // moves where the wall is.
      maxVisibleStorageBytes: 2 * GB,
      maxUploadBytes: 100 * MB,
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
      contentAuthoring: false,
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
      // Gates Tasks. Was false here as well as on standard, which meant Tasks
      // could only ever be on in Developer Mode (the only path that skips the
      // plan check). Tasks already declares requiresPaid, so Plus is the tier
      // that gets it and standard stays blocked by requiresPaid regardless.
      calendar: true,
      advancedInsights: true,
      advancedScheduleTools: false,
      // Gates AI Chat, Wake Word (Companion), and Entity Notes AI Suggest.
      // Was false here as well as on standard, which blocked all three on every
      // plan — Plus included. AI features are a paid-tier feature, so Plus is true.
      aiChat: true,
      advancedStandaloneApps: false,
      contentAuthoring: true,
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