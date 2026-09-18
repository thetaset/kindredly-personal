import type { AssistantReviewConfig } from '../../restrictions/assistantReview';
import type { FamilyDowntimeSettings } from '../../restrictions/familyDowntime';
import type { FamilyAiSetting } from '../../family-ai';

export interface AccountOptions {
  setupComplete?: boolean;

  /**
   * "Assistant reviews requests" — the family's guidelines, plus a per-child
   * replacement for any child a parent wants judged differently.
   *
   * Admin-write already: `updateAccountOptions` requires `ctx.isAdmin()`. But this
   * is also the one field on the account that must be WITHHELD from a restricted
   * user, and `getAccountDetails` strips it for them. Reading it would tell a child
   * exactly what to claim to get a site approved; the previous home on their own
   * user pref let them rewrite it outright.
   *
   * Per-child on/off is NOT here — it is `assistantReviewEnabled` on user.options,
   * because the child legitimately needs to know whether a check will happen.
   */
  assistantReview?: AssistantReviewConfig | null;

  /**
   * The family's timezone, an IANA id such as `America/Los_Angeles` (decision D3, DCP-5). Device
   * apps evaluate schedules in it, so a child changing a phone's timezone cannot slide out of
   * bedtime. Filled in from the first guardian's device; a guardian changes it. Validated on write,
   * and changing it raises every family member's device settings version.
   */
  familyTimeZone?: string | null;

  /**
   * Family Downtime: one schedule that locks screens and apps for the whole family
   * (`restrictions/familyDowntime.ts`). Admin-write through its own routes, never the generic options
   * patch. Readable by every member, since each device enforces it and every usage summary shows
   * it, except `dismissals`, which is withheld from non-admins.
   */
  familyDowntime?: FamilyDowntimeSettings | null;

  /**
   * The family AI setting (PLN-3, `family-ai.ts`): Off, Private AI only or On. Absent reads as Off,
   * which is where every family starts. Admin-write through `updateAccountOptions`, which refuses a
   * value not offered yet. Readable by every member, since each AI entry point checks it.
   */
  aiSetting?: FamilyAiSetting | null;
}


export interface SystemOptions {
  aiChatSupported?: boolean;
  extendedFeatures?: Record<string, boolean>;
  /**
   * No longer read. The monthly AI budget it overrode was replaced by 5-hour and weekly AI
   * limits; an account whose override was 0 was migrated to `aiHostedStopped`.
   */
  aiBudgetUsdMonthly?: number | null;
  /** Kindredly staff turned hosted AI off for this family. Direct and local models are unaffected. */
  aiHostedStopped?: boolean;
  /**
   * Family-wide key custody policy (D5). When true the server refuses to hold key
   * material for any member of this account -- no recovery-key escrow, no password copy.
   * Unset or false keeps the default, where Kindredly backup is available.
   *
   * Enforced server-side on purpose: the guarantee has to be a property of the system,
   * not a promise the client makes. See docs/trackers/key-custody-and-recovery-tracker.md.
   */
  noServerKeyStorage?: boolean;
}

export type AccountType = 'standard' | 'plus' | 'superplus';

export default interface Account {
  
  _id?: string;

  userCount?: number | null;

  ownerUserId?: string | null;

  collectionCount?: number | null;

  maxUsers?: number | null;

  maxCollections?: number | null;

  maxItemsPerCollection?: number | null;

  accountType?: AccountType | null;

  options?: AccountOptions | null;

  sysOptions?: SystemOptions | null;

  createdAt?: Date | null;

  updatedAt?: Date | null;

  /** Default value: false */
  deleted?: boolean | null;

  /** Default value: false */
  disabled?: boolean | null;

  stripeCustomerId?: string | null;

  subscriptionInfo?: Record<string, any> | null;

  encEnabled?: boolean | null;

  encConfig?: null | Record<string, any>;
}
