/**
 * Activity monitoring, content matching, and restriction types
 */

import type { ItemResourceType } from '../constants';
import type { DynObj, DateString } from './common.types';
import type { ContentType, EduValue, IntentTag, MinAgeGroup, TopicTag } from '../content.types';
import { ItemInfoView } from './item.types';

export type ActivitySourceType = 'tab' | 'frame' | 'page' | 'app' | 'extension' | 'other' | 'monitor';

export type ItemSourceType = 'library' | 'metadata' | 'classifier' | 'unknown' | 'internal' | 'external';

export type ReasonCode =
  | 'restrict-all'
  | 'inappropriate'
  | 'adult-content'
  | 'strong-language'
  | 'inappropriate-topic'
  | 'short-form-video'
  | 'social-media'
  | 'custom-blocked-url'
  | 'violence'
  | 'extremism'
  | 'no-time-given'
  | 'time-exceeded'
  | 'other'
  | 'not-in-library'
  | 'reqs-not-met'
  | 'out-of-time-range'
  | 'no-matching-rule';

export type ActivityResultType = 'block' | 'replace' | 'notify' | null;
export type InterventionMode = 'block' | 'warn' | 'reminder' | 'track-only';

export interface ActivityDecisionTrace {
  decisionSource: 'usage-limit' | 'pipeline' | 'library' | 'sentry' | 'system';
  interventionMode: InterventionMode;
  reasonCode?: ReasonCode | null;
  selectedUsageRuleId?: string | null;
  usageAllowed?: boolean | null;
  libraryPermitted?: boolean | null;
  sessionIntent?: IntentTag | null;
  behaviorSignals?: string[];
  timestamp: number;
}

export type ActivityProcessors = 'page-activity-monitor' | 'content-pipeline' | 'sentry' | 'content-checker' | 'other';

export type ItemRelTypes = 'exact' | 'similar' | 'parent' | 'child' | 'other';

export type ItemMatchTypes = 'pattern' | 'attribute' | 'id_exact';

export interface MatchDetails {
  adminOwned?: boolean;
  hasContentInfo?: boolean;
  rel: ItemRelTypes;
  type: ItemMatchTypes;
  srcType: ItemSourceType;
  valid?: boolean;
}

export interface MatchResult {
  details: MatchDetails;
  item: ItemInfoView;
}

export interface ContentInfoSrc {
  srcType?: ItemSourceType;
  srcId?: string;
  rel?: ItemRelTypes;
  mtype?: ItemMatchTypes;
  itemId?: string;
}

export interface SocialDesignation {
  isSocial: boolean;
  /**
   * Discrete social intensity level.
   * 0 = none, 1 = light, 2 = core social, 3 = highly social/feed-driven
   */
  level: 0 | 1 | 2 | 3;
  /**
   * Optional evidence/source values such as: url-pattern, topic, flag, content-type.
   */
  signals?: string[];
}

export type PrimaryContentKind =
  | 'article'
  | 'video-detail'
  | 'product'
  | 'reference'
  | 'tool'
  | 'feed'
  | 'mixed'
  | 'unknown';

export interface PrimaryContentInfo {
  kind: PrimaryContentKind;
  confidence: number;
  hasStableCenter: boolean;
  dominantContainerReason?: string;
  containerHints?: string[];
}

export interface PageStructureSignals {
  adSlotsEstimated?: number;
  recommendationModuleCount?: number;
  continuousContentAffordanceScore?: number;
  continuousContentObservedCycles?: number;
  centerContentChurnScore?: number;
  dominantTextBlockRatio?: number;
  recommendationToPrimaryRatio?: number;
  adToPrimaryProminenceRatio?: number;
  evidence?: string[];
}

export interface ActivityContentInfo {
  title?: string;
  cats?: string[];
  contentTypes?: ContentType[];
  eduValue?: EduValue;
  /** Optional event-level intent/context (e.g. learn vs play vs doomscroll). */
  intent?: IntentTag;
  /** Optional event-level topic signals (usually inferred, not manually set). */
  topics?: TopicTag[];
  /** Optional rolled session-level intent (can differ from page-level intent). */
  sessionIntent?: IntentTag;
  /** Confidence score for sessionIntent from 0..1. */
  sessionIntentConfidence?: number;
  /** Optional behavior tags (e.g. compulsive-refresh, rapid-context-switch). */
  behaviorSignals?: string[];
  minAgeGroup?: MinAgeGroup;
  rtype?: ItemResourceType;
  meta?: DynObj;
  srcInfo?: ContentInfoSrc;
  flags?: string[];
  social?: SocialDesignation;
  primaryContent?: PrimaryContentInfo;
  pageStructureSignals?: PageStructureSignals;
}

export interface AccessRequestView {
  _id?: string;
  userId?: string;
  status?: string;
  key?: string | null;
  type?: string | null;
  approverNote?: string | null;
  requesterNote?: string | null;
  requesterId?: string | null;
  createdAt?: DateString;
  updatedAt?: DateString;
  details?: AccessRequestDetails;
}

export interface AccessRequestDetails {
  url?: string;
  srcId?: string;
  srcType?: string;
  /** Optional user-friendly title for srcId (e.g. collection title) */
  srcTitle?: string;
  ts?: number;
  limitId?: string;
  reasonCode?: ReasonCode;
  contentInfo?: ActivityContentInfo;
  /** For non-URL access requests (e.g., approve a specific in-app action). */
  actionCode?: string;
  /** Optional visibility/variant for the action (e.g. link-only vs friends & family). */
  publishVisibilityCode?: number;
}

export interface ActivityContentInfoCollector {
  title?: { [src: string]: string };
  cats?: { [src: string]: string[] };
  contentTypes?: { [src: string]: ContentType[] };
  eduValue?: { [src: string]: EduValue };
  intent?: { [src: string]: IntentTag };
  topics?: { [src: string]: TopicTag[] };
  minAgeGroup?: { [src: string]: MinAgeGroup };
  rtype?: { [src: string]: ItemResourceType };
  meta?: { [src: string]: DynObj };
  srcInfo?: { [src: string]: ContentInfoSrc };
  flags?: { [src: string]: string[] };
  social?: { [src: string]: SocialDesignation };
}

export interface ActivityProcessingResult {
  restricted?: boolean;
  reasonDesc?: string;
  reasonCode?: ReasonCode;
  ruleId?: string;
  resultType?: ActivityResultType;
  interventionMode?: InterventionMode;
  decisionTrace?: ActivityDecisionTrace;
  refId?: string;
  processedBy: ActivityProcessors;
  /**
   * Human-readable explanation of why the content was blocked.
   * Only populated on blocked entries. Intended to be shown to
   * a parent/admin reviewing the usage log.
   * Example: "Page contained strong language: \"fuck\", \"porn\""
   */
  blockDetail?: string;
}

export type ActivityEventType = 'active' | 'videoPlaying' | 'visit' | 'query';

export interface ActivityLogInfoBase {
  type: ActivityEventType;
  url?: string;
  contentInfo?: ActivityContentInfo;
  result?: ActivityProcessingResult;
  activitySessionId?: string;
  pipelineRefId?: string;
  decisionRefId?: string;
  decisionSource?: ActivityDecisionTrace['decisionSource'];
  sourceInstanceId?: string;
  srcId?: string;
  srcType?: ActivitySourceType;
  pSrcId?: string;
  pSrcType?: ActivitySourceType;
  caller: string;
}

export interface ActivityEventContext extends ActivityLogInfoBase {
  timestamp: number;
}

export interface ActivityLogEntry extends ActivityLogInfoBase {
  startTime?: number;
  endTime?: number;
  monitorId?: string;
  clientId?: string;
  complete?: boolean;
  updates: number;
}

export interface ActivityMonitorData {
  monitorId: string;
  clientId?: string;
  lastSync: number;
  lastInvalidationCutoffMsApplied?: number;
  createdAt: number;
  updatedAt: number;
  activeLog: Record<string, ActivityLogEntry>;
  log: ActivityLogEntry[];
  type: string;
  schemaVer: number;
}

export interface ActivityPipelineResultDetails {
  url: string;
  actions: any[];
  resourceMeta?: { extractedInfo?: any; meta: any; rtype?: ItemResourceType };
  itemMatches?: { details: MatchDetails; itemId: string }[];
  extractedText?: string;
  runId: number;
  processingTime: number;
  debugInfo?: any;
}

export interface ActivityPipelineResults {
  creqId: string;
  runId: number;
  url: string;
  contentInfo?: ActivityContentInfo;
  restricted?: boolean;
  reasonDesc?: string;
  reasonCode: ReasonCode;
  resultType: ActivityResultType;
  restrictedWithRuleId?: string;
  /** Human-readable block explanation for parents. See ActivityProcessingResult.blockDetail. */
  blockDetail?: string;
  details?: ActivityPipelineResultDetails;
}

export interface ActivityPipelineResultsEntry {
  id: string;
  key: string;
  url: string;
  tabId: string;
  activitySessionId?: string;
  pipelineRefId?: string;
  decisionRefId?: string;
  decisionSource?: ActivityDecisionTrace['decisionSource'];
  sourceInstanceId?: string;
  timestamp: number;
  data: ActivityPipelineResults | string;
}

export interface MetaLookupEntry {
  id: string;
  metaType: string;
  data: any;
  timestamp: number;
}

export interface ClassificationRequestInfo {
  url: string;
  channelId?: string;
  itemId?: string;
  features?: {
    extractedText?: string;
    title?: string;
    description?: string;
    pageType?: string;
  };
}
