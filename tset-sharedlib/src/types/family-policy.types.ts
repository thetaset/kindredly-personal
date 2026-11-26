import type { EduValue } from '../content.types';

export const FAMILY_POLICY_RULE_TARGET_KINDS = [
  'domain',
  'url_prefix',
  'channel_id',
  'item_id',
  // A catalog (published) item, for a parent's own curation check. Never matched against
  // browsing: see `curation_checked` below.
  'published_id',
] as const;

export type FamilyPolicyRuleTargetKind = typeof FAMILY_POLICY_RULE_TARGET_KINDS[number];

export const FAMILY_POLICY_RULE_DECISION_KINDS = [
  'classify',
  'block',
  // A page or site a guardian allowed from History (HAT-1192). It lifts content
  // decisions only — the classifiers, image scanning, social media and short-form
  // blocks — and never an access decision: Library mode, a site block, time,
  // downtime, the check-in or Earn access keep their own answers. Read before the
  // content pipeline in `SentryProcessor` / `blockRuleGate` and in the pipeline
  // settings the content script runs with.
  'allow',
  'skip_image_scanning',
  // A parent checked a catalog item under curation review for their own family
  // (docs/specs/curation-review.md). Only with target `published_id`. It decides nothing about
  // browsing: blocking, classification and image scanning never see it, and it is not listed
  // with filtering rules. It lives here because a family policy rule is encrypted with the
  // account key and only a parent can write one.
  'curation_checked',
  // A page change (HAT-1232): CSS a parent had AI write for a site, applied on the pages of
  // that site for the people named in `userIds`. Only with target `domain`, and it decides
  // nothing about browsing: blocking, classification and image scanning never see it, and it
  // is not listed with filtering rules. Stored here for the same reasons as `curation_checked`.
  'page_change',
] as const;

export type FamilyPolicyRuleDecisionKind = typeof FAMILY_POLICY_RULE_DECISION_KINDS[number];

export const FAMILY_POLICY_RULE_TYPES = [
  'target_match',
  'term_override',
] as const;

export type FamilyPolicyRuleType = typeof FAMILY_POLICY_RULE_TYPES[number];

export const FAMILY_POLICY_TERM_SCOPES = [
  'explicit_severe',
  'adult_strong',
  'adult_medium',
  'adult_maybe',
  'adult_terms_short',
] as const;

export type FamilyPolicyTermScope = typeof FAMILY_POLICY_TERM_SCOPES[number];

export const FAMILY_POLICY_TERM_ACTIONS = [
  'add',
  'remove',
] as const;

export type FamilyPolicyTermAction = typeof FAMILY_POLICY_TERM_ACTIONS[number];

export const FAMILY_POLICY_TERM_MODES = [
  'allow',
  'block',
  'censor',
] as const;

export type FamilyPolicyTermMode = typeof FAMILY_POLICY_TERM_MODES[number];

export const FAMILY_POLICY_RULE_SOURCES = [
  'manual',
  // A guardian deliberately chose "Everyone in the family" for a site block.
  // Keep it distinct from old list mirrors so migration never narrows that choice.
  'manual_family_block',
  'migration_classification_override',
  'migration_blocked_pattern',
  'server_sync',
  // Written unattended by "Assistant reviews requests" when it decides a page was
  // being charged to the wrong category for one child. Distinct from 'manual' so
  // a rule nobody typed can be told apart from one a parent did.
  'assistant_review',
] as const;

export type FamilyPolicyRuleSource = typeof FAMILY_POLICY_RULE_SOURCES[number];

interface FamilyPolicyRuleBase {
  _id: string;
  accountId?: string;
  ruleType?: FamilyPolicyRuleType;
  enabled?: boolean;
  source?: FamilyPolicyRuleSource;
  note?: string;
  // Which children this rule applies to. Absent or empty means the whole
  // account, which is what every rule written before this field was added is.
  //
  // The rule table is keyed by `accountId` and nothing else, so an override one
  // child needs used to be an override every child got. That is what made a
  // misfiled Educational page unfixable without changing the category for the
  // whole family.
  //
  // A scoped rule needs a known user to apply, so a caller that cannot say who
  // it is evaluating for gets only the account-wide rules. For a `classify` rule
  // that means falling back to ordinary classification; a `block` rule scoped
  // this way must therefore never be the only thing blocking a site.
  userIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FamilyPolicyTargetMatchRule extends FamilyPolicyRuleBase {
  ruleType?: 'target_match';
  targetKind: FamilyPolicyRuleTargetKind;
  targetValue: string;
  // Full pattern set covered by this rule (e.g. every URL/pattern of a library
  // item). `targetValue` remains the primary/back-compat entry and is always
  // included here; older clients that only read `targetValue` still match it.
  // Only used for domain/url_prefix target kinds; each entry's kind is inferred
  // (a value containing '/' is a url_prefix, otherwise a domain).
  targetValues?: string[];
  includeSubdomains?: boolean;
  decisionKind: FamilyPolicyRuleDecisionKind;
  eduValue?: EduValue;
  // Title words that must ALSO be present for the rule to apply, so a rule can
  // say "on this site, but only when the title contains one of these words".
  // AND-ed with the target; any single term is enough. Stored lowercase and
  // compared against a lowercased title, so matching is case-insensitive.
  //
  // A caller that cannot supply a title gets NO match from a rule that carries
  // terms. The navigation gate decides before a page has a title, so matching on
  // the target alone there would turn "YouTube when the title says Minecraft"
  // into "all of YouTube".
  terms?: string[];
  // Only on a `page_change` rule: the CSS, its short name, and the parent's own words.
  pageChange?: FamilyPolicyPageChange;
}

/** What a `page_change` rule does to its site's pages (HAT-1232). */
export interface FamilyPolicyPageChange {
  /** Sanitized with `sanitizeSiteStyleCss`: no `url()`, `@import` or script hooks. */
  css: string;
  /** "Hide the comments": the name a parent sees in settings. */
  label: string;
  /** What the parent asked for, so the change can be redone from the same words. */
  request?: string;
  /**
   * Which of the site's pages it covers (HAT-1239): one page (`youtube.com/watch?v=abc`) or the
   * pages whose address starts with `address` (`youtube.com/watch`). None: every page of the site.
   * No scheme and no `www.`; lower case but for a query's values.
   */
  pages?: { kind: 'page' | 'prefix'; address: string };
}

export interface FamilyPolicyTermOverrideRule extends FamilyPolicyRuleBase {
  ruleType: 'term_override';
  termMode: FamilyPolicyTermMode;
  termScope?: FamilyPolicyTermScope;
  termAction?: FamilyPolicyTermAction;
  terms: string[];
}

export type FamilyPolicyRule = FamilyPolicyTargetMatchRule | FamilyPolicyTermOverrideRule;

interface StoredFamilyPolicyRuleBase {
  dirty?: number;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
}

export type StoredFamilyPolicyTargetMatchRule = FamilyPolicyTargetMatchRule & StoredFamilyPolicyRuleBase;

export type StoredFamilyPolicyTermOverrideRule = FamilyPolicyTermOverrideRule & StoredFamilyPolicyRuleBase;

export type StoredFamilyPolicyRule = StoredFamilyPolicyTargetMatchRule | StoredFamilyPolicyTermOverrideRule;

export interface FamilyPolicyMatchContext {
  url?: string | null;
  channelId?: string | null;
  itemId?: string | null;
  /**
   * The page title, for rules that carry `terms`. Absent wherever the title is
   * not known yet — a rule with terms does not match without it.
   */
  title?: string | null;
}

export interface FamilyPolicyMatchResult {
  rule: StoredFamilyPolicyTargetMatchRule;
  precedence: number;
}