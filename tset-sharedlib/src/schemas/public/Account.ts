export interface AccountOptions {
  setupComplete?: boolean;

}


export interface SystemOptions {
  aiChatSupported?: boolean;
  extendedFeatures?: Record<string, boolean>;
  /**
   * Admin override for this family's monthly AI spend allowance, in USD.
   * Unset means the plan default applies. 0 is a valid value meaning "no AI spend".
   */
  aiBudgetUsdMonthly?: number | null;
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
