/**
 * Usage limits, parental controls, and access control types
 */

import type { ReasonCode, ActivityResultType, ActivityEventContext, InterventionMode } from './activity.types';
import type { EduValue } from '../content.types';

export interface TimeRange {
  start: string;
  end: string;
}

export interface LimitMatchCondition {
  type: 'eduValue' | 'intent' | 'sessionIntent' | 'urlPatterns' | 'itemIds' | 'attribute' | 'usageRequirement' | 'socialDesignation';
  values: string[];
  timeAmount?: number;
}

export interface TimeLimit {
  hours: number;
  daysOfWeek: number[];
  timeRanges?: TimeRange[];
}

export interface LimitReqs {
  conditions: LimitMatchCondition[];
  timeAmount?: number;
}

export interface LimitRule {
  id: string;
  name: string;
  type: 'all' | 'advanced' | 'usage_only';
  conditions?: LimitMatchCondition[];
  reqs?: LimitReqs;
  timeLimits: TimeLimit[];
}

export interface LimitRuleInfo {
  isOverride: boolean;
  timeLimit: TimeLimit;
  limitRule: LimitRule;
  origTimeLimit: TimeLimit | null;
}

export interface UsageStatus {
  limit?: LimitRule;
  timeLimit?: TimeLimit;
  isOverride?: boolean;
  origTimeLimit?: TimeLimit;
  reqStatus?: {
    timeLeft?: number;
  };
  reqsMet?: boolean;
  usage?: number;
  timeLeft?: number;
  limitExceeded: boolean;
  reasonCode?: ReasonCode;
  selectedByFilter?: boolean;
  logTimes?: { start: number; end: number }[];
}

export interface UsageSummaryData {
  overallUsage: UsageStatus;
  contentUsage: UsageStatus[];
  filterContext?: ActivityEventContext;
  noUsageLimits?: boolean;
  usageLimitsDisabled?: boolean;
}

export interface AccessControlSettings {
  disableRestrictions?: boolean;
  disableRestrictionsTimeStamp?: number;
  disableRestrictionsExpires?: number;
  disableUsageLimits?: boolean;
  disableUsageLimitsTimeStamp?: number;
  disableUsageLimitsExpires?: number;
  restrictAll?: boolean;
  restrictAllTimeStamp?: number;
  restrictAllExpires?: number;
  usageLimitInterventionMode?: InterventionMode;
  defaultInterventionMode?: InterventionMode;
  guidanceModeEnabled?: boolean;
  usageStatusIndicatorEnabled?: boolean;
  usageStatusIndicatorThresholdMin?: number;
  usageGuidanceMessage?: string;
  takeBreakSettings?: TakeBreakSettings;
  remoteActionSettings?: RemoteActionSettings;
}

export interface RemoteActionSettings {
  enabled?: boolean;
  allowOpenUrl?: boolean;
  allowResetToHome?: boolean;
  allowScreenshot?: boolean;
  requireVerifiedLive?: boolean;
}

export interface TakeBreakSettings {
  enabled?: boolean;
  consecutiveUseMinutes?: number;
  breakMinutes?: number;
  includeAllTypes?: boolean;
  appliesToEduValues?: EduValue[];
}

export interface TakeBreakAdvisory {
  triggered: boolean;
  globalConsecutiveUseMs: number;
  thresholdMs: number;
  consecutiveUseMinutes: number;
  breakMinutes: number;
  includeAllTypes: boolean;
  appliesToEduValues: EduValue[];
  matchedEduValue?: EduValue | null;
}

export interface PresetFeature {
  text: string;
  type?: 'allowed' | 'blocked';
}

export interface UsageLimitPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: (string | PresetFeature)[];
  rules: LimitRule[];
  successMessage: string;
}

export interface RuleOverride {
  ruleId: string;
  timeLimit: TimeLimit;
  expiresAt: number;
}

export interface RuleOverrideSettings {
  ruleOverrides: RuleOverride[];
  lastUpdated?: number;
}
