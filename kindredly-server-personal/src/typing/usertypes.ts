export interface UserOptions {
  whitelistingEnabled: boolean;
  codeInjectionEnabled: boolean;
  contentFilteringEnabled: boolean;
  logActivity: boolean;
  /** Keep all links inside the in-app browser instead of opening external apps. */
  containLinksInternally?: boolean;
  /**
   * Admin override for this individual's monthly AI spend allowance, in USD.
   *
   * Unset means no per-user cap — the family budget is the only limit. When set, it is
   * additionally clamped to the family's remaining budget at spend time, so one member
   * can never be granted more than the family actually has.
   */
  aiBudgetUsdMonthly?: number | null;
}
