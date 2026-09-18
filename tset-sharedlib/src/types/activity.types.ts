/**
 * Activity monitoring, content matching, and restriction types
 */

import type { ItemResourceType } from '../constants';
import type { DynObj, DateString } from './common.types';
import type { ContentType, EduValue, IntentTag, MinAgeGroup, TopicTag } from '../content.types';
import { ItemInfoView } from './item.types';
// Type-only, so the api <-> types cycle is erased at compile time (same shape as
// user.types.ts importing TokenData).
import type { AccessRequestAiReview } from '../api';

export type ActivitySourceType = 'tab' | 'frame' | 'page' | 'app' | 'extension' | 'other' | 'monitor';

export type ItemSourceType = 'library' | 'metadata' | 'classifier' | 'unknown' | 'internal' | 'external';

export type ReasonCode =
  // Family Downtime is on (`restrictions/familyDowntime.ts`). Above every other reason: extra time,
  // a pause and temporary access do not get past it, and a parent cannot lift it for one child.
  | 'family-downtime'
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
  // Library lookup missed because this device has no completed library sync yet —
  // distinct from "not in library" so a child isn't told their own content isn't theirs.
  | 'library-syncing'
  | 'reqs-not-met'
  // A parent set a checkpoint on this user and has not released it for the
  // current period. Distinct from time reasons: waiting out the clock does not
  // clear it, only a parent does.
  | 'checkpoint-pending'
  | 'out-of-time-range'
  | 'no-matching-rule';

export type ActivityResultType = 'block' | 'replace' | 'notify' | null;
export type InterventionMode = 'block' | 'warn' | 'reminder' | 'track-only';

export interface ActivityDecisionTrace {
  decisionSource: 'usage-limit' | 'pipeline' | 'library' | 'sentry' | 'system' | 'checkpoint';
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

/**
 * How the user arrived at this content — the strongest single signal of intent.
 * `search` = came from a search engine results/homepage; `feed` = clicked from a
 * recommendation/social feed; `direct` = typed/bookmark/no referrer; `link` =
 * followed an ordinary inbound link; `unknown` = could not be determined.
 */
export type ActivityNavOrigin = 'search' | 'feed' | 'direct' | 'link' | 'unknown';

export interface ActivityNavSource {
  origin: ActivityNavOrigin;
  /** Search provider id when origin is `search` (e.g. google, bing). */
  searchProviderId?: string;
  /** Host of the referrer when known (used to infer feed vs link). */
  referrerHost?: string;
}

export interface PageStructureSignals {
  adSlotsEstimated?: number;
  /** Fraction of the viewport (0..1) covered by likely ad elements. */
  adViewportCoverage?: number;
  /** Composite 0..1 score of how invasive the ad load is (coverage + count + sticky/overlay). */
  adInvasivenessScore?: number;
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
  /** How the user navigated to this content (search vs feed vs direct/link). */
  navSource?: ActivityNavSource;
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
  /**
   * For type 'checkpoint': a copy of the parent's checkpoint note as it read
   * when the kid asked. Carried on the request so the approval panel shows what
   * was asked of them next to the kid's reply — the parent may be approving on
   * a phone weeks after writing it.
   */
  checkpointNote?: string;
  /**
   * For type 'item' (a child asking for a library item): the item and its name. The
   * approval panel links to the item and names it, and the server names it in the
   * "Request GRANTED" notification.
   */
  itemId?: string;
  name?: string;
  /** For type 'appCapability': the app's display name, shown beside the capability asked for. */
  itemName?: string;
  /** Optional visibility/variant for the action (e.g. link-only vs friends & family). */
  publishVisibilityCode?: number;
  /** For published-catalog add requests (type 'publishedItem'): the Published item id. */
  publishId?: string;
  /**
   * For type 'emailSender': the address a restricted user is asking to write to, plus
   * what they wrote. The guardian is approving a person AND a message, so the subject and
   * body travel with the request — a parent should not have to approve a letter sight
   * unseen. The message itself is held as a draft in the child's own mailbox and is sent
   * by their client once the address is allowlisted; `emailDraftId` links the two.
   *
   * Note this body is stored in plaintext on the server for as long as the request is
   * open. That is bounded: answering a request deletes the row.
   */
  emailAddress?: string;
  emailSubject?: string;
  emailBody?: string;
  emailDraftId?: string;
  /**
   * What the assistant did with this request, when the family has "Assistant
   * reviews requests" on. Present on rows it approved AND on rows it handed to
   * the parent, so the parent's queue can show its reasoning either way.
   *
   * This is the decision record: an approved row is KEPT rather than deleted
   * (unlike a parent's approval, which closes the row) precisely so this survives.
   */
  aiReview?: AccessRequestAiReview;
  /** Item created by an assistant approval, for a later undo. */
  libraryItemId?: string;
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

// `videoPlaying` and `audioPlaying` are separate on purpose: usage rules can
// target video playback (`attribute: 'videoPlaying'`), and folding podcast/music
// listening into the same type would make audio consume a video budget.
export type ActivityEventType = 'active' | 'videoPlaying' | 'audioPlaying' | 'visit' | 'query';

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
