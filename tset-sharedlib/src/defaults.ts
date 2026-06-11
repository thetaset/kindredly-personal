/**
 * Default values shared between client and server to ensure consistency
 */

import { AccessControlSettings, LimitRule, RuleOverride, RuleOverrideSettings } from "./types";
import type { TemporaryLimitRule } from "./types";
import type { RewardSettings, DailyRewardStates } from './types/reward.types';


export interface UsageLimitData{
      contentUsageLimits?: LimitRule[];
      timeLimitOverrides?: RuleOverride[];
      /** Temporary rules minted by the reward system; expire at `expiresAtMs`. */
      temporaryRules?: TemporaryLimitRule[];
      version: number;
    }
export interface UserOptions{
  whitelistingEnabled: boolean;
  codeInjectionEnabled: boolean;
  contentFilteringEnabled: boolean;
  usageLimitsData?: UsageLimitData;
  logActivity: boolean;
  aiChatEnabled?: boolean;
  accessControlSettings?: AccessControlSettings;
  ruleOverrideSettings?: RuleOverrideSettings
  /** Reward rules and categories configured for this user. */
  rewardSettings?: RewardSettings;
  /** Per-day earned/claimed state for the reward rules above. */
  dailyRewardStates?: DailyRewardStates;
}
/**
 * Default user options for new users or local-mode users
 * These should match the server's default user options structure
 */
export const DEFAULT_USER_OPTIONS:UserOptions = {
  usageLimitsData: {
    version: 2,
    contentUsageLimits: [],
  },
  ruleOverrideSettings: { ruleOverrides: [] } as RuleOverrideSettings,
  whitelistingEnabled: false,
  codeInjectionEnabled: false,
  contentFilteringEnabled: false,
  logActivity: false,
  accessControlSettings: {
    takeBreakSettings: {
      enabled: true,
      consecutiveUseMinutes: 30,
      breakMinutes: 5,
      includeAllTypes: false,
      appliesToEduValues: ['eduval_fun', 'eduval_edutainment'],
    },
  },
} ;

