import type { AssistantReviewConfig } from '../../restrictions/assistantReview';
import type { FamilyDowntimeSettings } from '../../restrictions/familyDowntime';
import type { SchoolDaysSettings } from '../../restrictions/schoolDays';
import type { FamilyAiSetting } from '../../family-ai';
import type { OwnAiStored } from '../../own-ai';

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
   * School days (HAT-1283, `restrictions/schoolDays.ts`): the family's school week and its breaks and
   * days off, one for every child. Admin-write through `updateAccountOptions`, which normalizes it and
   * raises every member's device settings version. Readable by every member, since each device works
   * out from it which schedule applies today.
   */
  schoolDays?: SchoolDaysSettings | null;

  /**
   * The family AI setting (PLN-3, `family-ai.ts`): Off, Private AI only or On. Absent reads as Off,
   * which is where every family starts. Admin-write through `updateAccountOptions`, which refuses a
   * value not offered yet. Readable by every member, since each AI entry point checks it.
   */
  aiSetting?: FamilyAiSetting | null;

  /**
   * Connected AI apps (HAT-616, docs/proposals/connected-ai-apps.md): an outside AI app, like Claude,
   * may look things up through Kindredly's relay. Absent reads as Off. Written only by
   * `/mcpRelay/setEnabled` — `updateAccountOptions` drops it, since clients send whole cached
   * objects — and refused there unless Kindredly granted the family (`SystemOptions.connectedAiApps`)
   * and Family AI is On. Turning Family AI off clears it, so turning AI back on never re-enables it.
   */
  mcpRelayEnabled?: boolean;

  /**
   * The family's own AI account (HAT-966, `own-ai.ts`): provider, key and model, encrypted with the
   * family's account key, so the server stores it but cannot read it. Readable by every member, since
   * each device calls the provider itself. Admin-write through `updateAccountOptions`, which refuses
   * anything not shaped like `OwnAiStored`; null removes it.
   */
  ownAi?: OwnAiStored | null;
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
  /**
   * Kindredly staff made Connected AI apps available to this family (HAT-616). Set only through the
   * admin console's `/admin/account/changeSysOptions`. Deliberately NOT a key in `extendedFeatures`,
   * which the family's own admin can write through `/account/extendedFeatures/update`
   * (agent observation 153). Absent reads as not granted: the family sees nothing.
   */
  connectedAiApps?: boolean;
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
