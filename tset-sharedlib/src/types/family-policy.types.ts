import type { EduValue } from '../content.types';

export const FAMILY_POLICY_RULE_TARGET_KINDS = [
  'domain',
  'url_prefix',
  'channel_id',
  'item_id',
] as const;

export type FamilyPolicyRuleTargetKind = typeof FAMILY_POLICY_RULE_TARGET_KINDS[number];

export const FAMILY_POLICY_RULE_DECISION_KINDS = [
  'classify',
  'block',
  'skip_image_scanning',
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
  'migration_classification_override',
  'migration_blocked_pattern',
  'server_sync',
] as const;

export type FamilyPolicyRuleSource = typeof FAMILY_POLICY_RULE_SOURCES[number];

interface FamilyPolicyRuleBase {
  _id: string;
  accountId?: string;
  ruleType?: FamilyPolicyRuleType;
  enabled?: boolean;
  source?: FamilyPolicyRuleSource;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyPolicyTargetMatchRule extends FamilyPolicyRuleBase {
  ruleType?: 'target_match';
  targetKind: FamilyPolicyRuleTargetKind;
  targetValue: string;
  includeSubdomains?: boolean;
  decisionKind: FamilyPolicyRuleDecisionKind;
  eduValue?: EduValue;
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
}

export interface FamilyPolicyMatchResult {
  rule: StoredFamilyPolicyTargetMatchRule;
  precedence: number;
}