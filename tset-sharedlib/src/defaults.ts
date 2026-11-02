/**
 * Default values shared between client and server to ensure consistency
 */

import { AccessControlSettings, LimitRule, RuleOverride, RuleOverrideSettings } from "./types";
import type { TemporaryLimitRule } from "./types";
import type { RewardSettings, DailyRewardStates } from './types/reward.types';
import type { AllowList } from './restrictions/alwaysAllowed';
import type { SocialMediaSettings } from './restrictions/socialMedia';


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
  /**
   * "Open other apps", stored inverted: true keeps links inside Kindredly. Absent means allowed for an
   * adult and not for a child — read it through `personAllowsOtherApps` (other-apps.ts), never directly.
   */
  containLinksInternally?: boolean;
  /** "Open YouTube in the YouTube app". Absent means off — read it through `personAllowsYouTubeApp`. */
  openYouTubeInApp?: boolean;
  usageLimitsData?: UsageLimitData;
  /**
   * Always allowed: sites, library items and apps that open whatever this person's time (HAT-152).
   * Its own key, not inside `usageLimitsData`, which several writers replace whole. See
   * `restrictions/alwaysAllowed.ts`.
   */
  alwaysAllowed?: AllowList;
  /** Block social media and its Exceptions (SMB). Absent = the older rules decide. See `restrictions/socialMedia.ts`. */
  socialMedia?: SocialMediaSettings;
  logActivity: boolean;
  aiChatEnabled?: boolean;
  /** AI tools, per person. Absent = on. See `types/user.types.ts`. */
  aiToolsEnabled?: boolean;
  /** Web search inside Kinbot, per person. Absent = off. See `family-ai.ts`. */
  aiWebSearchEnabled?: boolean;
  /** App Builder: create and edit the code behind Kindredly apps. Admin-granted per child. */
  appEditorEnabled?: boolean;
  /** Command bar: admin-granted per person. */
  commandBarEnabled?: boolean;
  /** Search your history: admin-granted per person. See `types/user.types.ts`. */
  historySearchEnabled?: boolean;
  /** Library-mode kids: allow browsing the published catalog and requesting adds. */
  explorePublishedEnabled?: boolean;
  /** Curated email, per person. Admin-granted — see `types/user.types.ts` for why these are here. */
  emailEnabled?: boolean;
  /** Speech mode: talk to the assistant and hear the reply. Admin-granted per person. */
  speechModeEnabled?: boolean;
  /** The wake word inside speech mode. Admin-granted per person. */
  wakeWordEnabled?: boolean;
  /** Explore's Community scope — collections other families published. Admin-granted per person. */
  communityContentEnabled?: boolean;
  /** Kindredly Guard: app time and limits on a child's phone. Admin-granted per person. */
  companionDevicesEnabled?: boolean;
  /** Remote actions into a managed child browser session. Admin-granted per person. */
  remoteChildActionsEnabled?: boolean;
  /** Shopping carts: products saved from stores, in a collection with a cart view. Admin-granted per person. */
  shoppingCartEnabled?: boolean;
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
  // Fail-closed seed for device-only mode, where no server record exists. It is NOT the live
  // default: an absent value resolves through the feature control's per-user-type default
  // (admin on, restricted off) in useFeatureToggle. See config/appEditorAccess.ts.
  appEditorEnabled: false,
  commandBarEnabled: false,
  historySearchEnabled: false,
  explorePublishedEnabled: false,
  // The optional features that used to be one family-wide switch. Same fail-closed seeding as
  // `appEditorEnabled` above: this is what device-only mode reads when there is no server record,
  // not the live default — an absent value resolves through the feature control.
  emailEnabled: false,
  speechModeEnabled: false,
  wakeWordEnabled: false,
  communityContentEnabled: false,
  companionDevicesEnabled: false,
  remoteChildActionsEnabled: false,
  shoppingCartEnabled: false,
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

