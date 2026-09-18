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
  /**
   * How long a person's activity history is kept: each person's "Keep history for" setting, up to
   * the plan's maximum (founder decision 2026-09-15, PLN-9). The server's purge enforces it.
   */
  history: {
    /** The longest a person's history may be kept on this plan, in days. */
    maxRetentionDays: number;
    /** How long it is kept until an admin changes the setting. The same on both plans. */
    defaultRetentionDays: number;
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
    /**
     * The assistant: AI Chat, Wake Word (Companion) and Entity Notes AI Suggest.
     *
     * True on BOTH plans. The plan is not what decides whether a family has the
     * assistant — it decides which hosted model they reach and how much hosted
     * spend they get (`AI_MODEL_ALLOWLIST_BY_PLAN` and `DEFAULT_BUDGETS` on the
     * server). A family that runs Ollama or the browser's built-in model is not
     * limited by either, because those never reach our server.
     */
    aiChat: boolean;
    advancedStandaloneApps: boolean;
    /**
     * AI-assisted content authoring (the collection builder / "Creating with AI").
     * Kept separate from `aiChat`: this one is genuinely Plus-only.
     */
    contentAuthoring: boolean;
  };
  assistantReview: {
    /**
     * Site-approval reviews the assistant will run for one child in one week.
     *
     * Deliberately non-zero on the free tier, unlike every other AI-backed
     * readiness flag. This is the one AI feature whose value is obvious in a
     * single use — a child asks, the answer comes back before they lose
     * interest — so a small weekly allowance is the demonstration. The cap is
     * per CHILD, not per account: a family with four children is answering four
     * children's questions.
     */
    weeklyPerChild: number;
  };
  aiImages: {
    /**
     * Pictures Kindredly.ai's image service makes for one family in any 7 days.
     *
     * One pool for the whole family account, like the AI limits. A picture spends a credit
     * and nothing else: it never uses the AI limits chat runs on, so "2 left" is always true
     * (founder, 2026-09-15). Each credit comes back 7 days after it was used
     * (`computeAiImageCredits`). A picture from an image server the family runs never reaches
     * our server and uses none.
     */
    creditsPerWeek: number;
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
      maxRetentionDays: 14,
      defaultRetentionDays: 14,
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
      // The assistant is a free-tier feature. What Standard gets is the cheapest
      // model and the smallest hosted allowance, not a locked door — the same
      // reasoning as `assistantReview.weeklyPerChild` below, whose value is
      // obvious in a single use.
      aiChat: true,
      advancedStandaloneApps: false,
      contentAuthoring: false,
    },
    assistantReview: {
      weeklyPerChild: 3,
    },
    aiImages: {
      creditsPerWeek: 2,
    },
  },
  plus: {
    publicLabel: 'Plus',
    marketingTier: 'paid',
    seats: {
      maxUsers: 10,
    },
    history: {
      maxRetentionDays: 365,
      defaultRetentionDays: 14,
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
      // Gates AI Chat, Wake Word (Companion), and Entity Notes AI Suggest — now
      // true on both plans. Plus's advantage is the better model and the larger
      // hosted budget, not access.
      aiChat: true,
      advancedStandaloneApps: false,
      contentAuthoring: true,
    },
    assistantReview: {
      weeklyPerChild: 20,
    },
    aiImages: {
      creditsPerWeek: 6,
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

/** Every "Keep history for" choice, in days. A plan offers the ones up to its maximum. */
export const HISTORY_RETENTION_CHOICES = [1, 7, 14, 30, 90, 180, 365] as const;

/** The "Keep history for" choices this plan offers: Standard 1, 7 or 14 days; Plus up to 365. */
export function historyRetentionChoicesFor(accountType: string | null | undefined): number[] {
  const max = getSharedPlanPolicy(accountType).history.maxRetentionDays;
  return HISTORY_RETENTION_CHOICES.filter((days) => days <= max);
}

/**
 * How many days of a person's history are actually kept: their saved setting, capped at the plan's
 * maximum and snapped down to a choice the plan offers, or the plan's default when nothing usable is
 * saved. A family that moves from Plus to Standard is capped at 14 by this, whatever was saved.
 */
export function effectiveHistoryRetentionDays(accountType: string | null | undefined, saved: unknown): number {
  const policy = getSharedPlanPolicy(accountType).history;
  const days = typeof saved === 'number' ? saved : typeof saved === 'string' ? Number(saved) : NaN;
  if (!Number.isFinite(days) || days < HISTORY_RETENTION_CHOICES[0]) return policy.defaultRetentionDays;
  const offered = historyRetentionChoicesFor(accountType).filter((choice) => choice <= days);
  return offered.length ? offered[offered.length - 1] : policy.defaultRetentionDays;
}
