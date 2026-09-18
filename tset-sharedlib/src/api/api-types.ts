import { UsageStatus, UsageSummaryData, TakeBreakAdvisory } from '../types';
import type { CategorySet } from '../types/categoryExplorer.types';
import type { FamilyDowntimeAdvisory } from '../restrictions/familyDowntime';
import type { SiteStyleEntryV1 } from '../types/item.types';
import type {
  AccountType,
  ActivityContentInfo,
  ActivityPipelineResultsEntry,
  ClientInfoView,
  DateString,
  EncInfo,
  FilePreview,
  Item,
  ItemFeedbackView,
  ItemInfoView,
  ItemMatchTypes,
  ItemMeta,
  ItemMetaFileInfo,
  ItemPermissionDetails,
  ItemRelTypes,
  ItemReaction,
  KeyEntry,
  LiveViewDeviceView,
  LiveViewFrameKind,
  LiveViewSessionView,
  PathTreeNode,
  PermissionType,
  PermissionWithUser,
  PluginInfo,
  Published,
  ReasonCode,
  StoredFamilyPolicyRule,
  ManagedRemoteActionCommandView,
  User,
  UserType,
  UserView
} from '../shared.types';
import type { ContentType, EduValue, MinAgeGroup, TopicTag } from '../content.types';
import type { SearchProviderId, SearchProviderPageState } from '../search-provider.utils';
import type { PostImportProcessingState, ResourceFetchInfoResponse } from '../types/item.types';
import { SystemOptions } from '../schemas/public/Account';
import type FamilyPolicyRuleRecord from '../schemas/public/FamilyPolicyRule';
import type UserActivityLog from '../schemas/public/UserActivityLog';
import type { TaskOccurrenceView } from '../types/task.types';
import type { DateOfBirth } from '../date.utils';
import type { StandaloneAppBootstrapResult, StandaloneAppCatalogEntry } from '../types/standalone-app.types';

export interface UserAuthInfo {
  user: User;
  userId: string;
  sessionId: string;
  accountId: string;
}

export interface RegisterResponse {
  user: User;
  tokenData: { token: string; expiresIn: number };
  passwordForClient?: string;
  recoveryKeyForClient?: string;
  message?: string;
}

export interface AuthResponse {
  user: UserView;
  tokenData: TokenData;
  passwordForClient?: string;
  recoveryKeyForClient?: string;
  message?: string;
  success: boolean;
  statusCode?: number;
}

// Passkey/WebAuthn types
export interface PasskeyCredential {
  credentialId: string; // Base64URL encoded
  publicKey: string; // Base64URL encoded COSE public key
  userId: string;
  createdAt: string;
  transports?: string[];
  prfSupported: boolean;
  deviceName?: string;
}

export interface PasskeyChallengeRequest {
  userId?: string;
  usernameOrEmail?: string;
  type: 'register' | 'authenticate';
  operation?: 'default' | 'remove-recovery-key';
}

export interface PasskeyChallengeResponse {
  challenge: string; // Base64URL encoded
  rpId: string;
  rpName: string;
  existingCredentialIds?: string[];
  credentialIds?: string[];
  timeout: number;
}

export interface PasskeyRegisterRequest {
  credential: {
    credentialId: string;
    publicKey: string;
    transports?: string[];
    prfSupported: boolean;
  };
  attestationObject: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  deviceName?: string;
}

export interface PasskeyRegisterResponse {
  success: boolean;
  credential?: PasskeyCredential;
}

export interface PasskeyAuthenticateRequest {
  credentialId: string;
  signature: string; // Base64URL encoded
  authenticatorData: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
}

export interface PasskeyAuthenticateResponse {
  success: boolean;
  userId?: string;
  verified: boolean;
}

export interface PasskeyListResponse {
  credentials: PasskeyCredential[];
}

export interface PasskeyDeleteRequest {
  credentialId: string;
}

export type RemoveRecoveryKeyFromServerRequest =
  | {
      method: 'password';
      password: string;
      userId?: string;
    }
  | {
      method: 'passkey';
      passkey: PasskeyAuthenticateRequest;
      userId?: string;
    };

export interface CreateCollectionOptions {
  collectionIds?: string[];
  permList?: Array<{ userId: string; permission: PermissionType }>;
  customPermissions?: boolean;
  skipNotifications?: boolean;
}

// Media catalog (default banner library)
export interface BannerAsset {
  id: string;
  title: string;
  filename: string;
  thumbFilename?: string;
  categories: string[];
  tags: string[];
  // Attribution for banners imported from free image sources (license compliance).
  attribution?: string; // photographer / creator credit
  sourceUrl?: string; // landing page of the original (e.g. for CC-BY)
  license?: string; // license name, e.g. 'CC0', 'CC-BY 4.0', 'Pexels'
  sourceProvider?: string; // free-image source the banner was imported from
}

export interface BannerCatalogSearchRequest {
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface BannerCatalogSearchResponse {
  items: BannerAsset[];
  total: number;
  page: number;
  pageSize: number;
  categories?: Array<{ key: string; label: string; count: number }>;
}

// Named style preset (client-safe; the prompt suffix stays server-side).
export interface BannerStyle {
  id: string;
  name: string;
  custom?: boolean; // admin-defined (deletable) vs code preset
}

export interface BannerCategory {
  key: string;
  label: string;
}

// A named image-generation endpoint the admin can switch between.
export interface GeneratorSource {
  id: string;
  name: string;
  provider: 'openai' | 'local';
  url?: string; // required for provider 'local'
}

export interface GeneratorSettings {
  sources: GeneratorSource[];
  selectedId?: string;
}

export interface BannerRecommendRequest {
  context: {
    kind: 'collection' | 'item';
    name: string;
    tags?: string[];
  };
}

export interface BannerRecommendResponse {
  items: BannerAsset[];
}

// Admin: curated banner library generate/publish console.
// Image cropping/encoding happens in the admin browser; the server generates the
// raw AI image and stores the client-processed JPEGs.
// One row in the admin console: the editable catalog entry + publish state.
export interface AdminBannerItem extends BannerAsset {
  prompt: string;
  styleId: string;
  custom: boolean;
  hidden: boolean;
  published: boolean;
  // Which generator source produced the current image (recorded at publish time).
  generatorSourceId?: string;
  generatorName?: string;
}

export interface AdminBannerListResponse {
  items: AdminBannerItem[];
  styles: BannerStyle[];
  categories: BannerCategory[];
  generator: GeneratorSettings;
}

export interface AdminBannerGeneratorSaveRequest {
  id?: string;
  name: string;
  provider: 'openai' | 'local';
  url?: string;
}

export interface AdminBannerGeneratorSelectRequest {
  id: string;
}

export interface AdminBannerGeneratorDeleteRequest {
  id: string;
}

export interface AdminBannerGeneratorResponse {
  generator: GeneratorSettings;
}

// Returned by the per-banner mutating endpoints (save/create/hide).
export interface AdminBannerMutateResponse {
  item: AdminBannerItem;
}

export interface AdminBannerSaveRequest {
  id: string;
  title?: string;
  prompt?: string;
  styleId?: string;
  categories?: string[];
  tags?: string[];
}

export interface AdminBannerCreateRequest {
  title: string;
  prompt: string;
  styleId: string;
  category: string;
  tags?: string[];
  // Set when the banner is imported from a free image source rather than generated.
  attribution?: string;
  sourceUrl?: string;
  license?: string;
  sourceProvider?: string;
}

// ---- Free image sources (admin importer): search open/free libraries and
// import a chosen image into the curated catalog. ----
export type FreeImageProvider = 'openverse' | 'pexels' | 'wikimedia';

export interface FreeImageSearchRequest {
  provider: FreeImageProvider;
  q: string;
  page?: number;
  pageSize?: number;
  // When true, only return images that need no attribution (CC0 / public domain;
  // Pexels' license also requires none). Filters out CC-BY and similar.
  attributionFree?: boolean;
}

export interface FreeImageResult {
  id: string;
  provider: FreeImageProvider;
  title: string;
  thumbUrl: string; // small preview for the picker
  fullUrl: string; // full image re-hosted on import
  sourceUrl?: string; // original landing page (attribution)
  author?: string;
  license?: string;
  width?: number;
  height?: number;
}

export interface FreeImageSearchResponse {
  items: FreeImageResult[];
  page: number;
  hasMore: boolean;
  providersAvailable: FreeImageProvider[]; // which providers are configured/usable
}

export interface FreeImageFetchRequest {
  imageUrl: string;
}

export interface FreeImageFetchResponse {
  imageData: string; // base64 data URL of the downloaded image
}

// ---- Category Explorer sets (admin-curated defaults). The admin store is seeded
// from the built-in sets, then becomes the source of truth users load. ----
export interface AdminCategorySetsResponse {
  sets: CategorySet[];
  // Set when a save was held back because it would orphan published content (see below).
  requiresConfirmation?: boolean;
  // Leaf IDs this save would remove (delete/rename) that still have published items tagged.
  orphans?: { id: string; label: string; count: number }[];
}

export interface AdminCategorySetSaveRequest {
  set: CategorySet;
  // Proceed even though the save removes/renames categories that still have published content
  // (the UI sets this after the admin confirms the orphan warning).
  force?: boolean;
}

export interface AdminCategorySetDeleteRequest {
  id: string;
}

// Upload a custom node icon image. The client sends a small, already-resized
// image; the server stores it as a public asset and returns its filename
// (served via /image/get/:filename, like Banner Library images).
export interface AdminCategorySetUploadIconRequest {
  /** Base64 data URL (or raw base64) of a small, client-resized image. */
  fileData: string;
}

export interface AdminCategorySetUploadIconResponse {
  filename: string;
}

// Public projection consumed by the Category Explorer.
export interface CategorySetsResponse {
  sets: CategorySet[];
}

// ---- Category coverage: which parts of the taxonomy actually have published content.
// The public shape carries no numbers (users only need to know what's worth showing);
// the admin shape carries the counts that say where to publish next. ----

/** Node ids worth showing, per set. Consumed by the published Category Explorer. */
export interface PublishedCategoryCoverageResponse {
  /**
   * Set id -> ids of nodes with at least one visible published item behind them.
   * Includes group nodes (a group is listed when any descendant leaf has content) so the
   * client can prune at every level. Counts respect each set's `minAgeGroups` filter, so a
   * topic empty for Kids but full for adults is absent from `kids` and present in `general`.
   */
  populated: Record<string, string[]>;
}

export interface AdminCategoryCoverageLeaf {
  id: string;
  label: string;
  /** Canonical `gen_*` ids this leaf queries (itself, for general-set leaves). */
  sourceCategoryIds: string[];
  /** Visible published items behind this leaf, under the set's age filter — what users see. */
  count: number;
  /** Same, ignoring the age filter. Higher than `count` means content exists but isn't age-tagged. */
  countAllAges: number;
  /**
   * Of `count`, how many are `curated`. This is what a parent's chip actually returns, because
   * the Explore search behind it sends `curated: true` by default — so the Category Explorer
   * prunes on this, while the admin page reads `count` to see the uncurated backlog.
   * `countCurated < count` means the topic has content nobody has curated yet.
   */
  countCurated: number;
}

export interface AdminCategoryCoverageGroup {
  id: string;
  label: string;
  /** Flat sets (e.g. Kids) report a single synthetic group holding every top-level leaf. */
  leaves: AdminCategoryCoverageLeaf[];
  /** Distinct items reachable through this group — not the sum of its leaves, which double-counts. */
  itemCount: number;
}

export interface AdminCategoryCoverageSet {
  id: string;
  name: string;
  enabled: boolean;
  minAgeGroups: string[];
  groups: AdminCategoryCoverageGroup[];
  /** Distinct items reachable anywhere in this set, under its age filter. */
  itemCount: number;
}

export interface AdminCategoryCoverageResponse {
  sets: AdminCategoryCoverageSet[];
  /** Visible published rows in total, and how many carry no category at all. */
  totalPublished: number;
  uncategorized: number;
  /** Ids tagged on published rows that no current set contains — stale tags to remap. */
  orphanCategoryIds: { id: string; count: number }[];
  /** ISO timestamp the underlying scan ran (results are cached briefly). */
  generatedAt: string;
}

export interface AdminBannerBulkStyleRequest {
  ids: string[];
  styleId: string;
}

export interface AdminBannerBulkStyleResponse {
  items: AdminBannerItem[];
}

// Image-to-image enhance: turn a seed image (e.g. a low-res logo) into a banner.
// Provide either an uploaded `imageData` or a `sourceFilename` already in image
// storage (a published item's imageFilename or a banner's filename).
export interface AdminBannerEnhanceRequest {
  imageData?: string; // seed image, base64 or data URL
  sourceFilename?: string; // OR an existing stored image filename
  styleId: string;
  prompt?: string;
  strength?: number; // 0 keeps the seed, 1 fully reinvents (default ~0.55)
  width?: number; // optional output size (preserve source aspect)
  height?: number;
}

export interface AdminBannerEnhanceResponse {
  imageData: string; // raw enhanced base64 (no data: prefix)
}

// Inpaint: repaint only the masked region (white = repaint) of a seed image.
export interface AdminBannerInpaintRequest {
  imageData?: string;
  sourceFilename?: string;
  maskData: string; // mask PNG (base64 or data URL); white = repaint
  styleId: string;
  prompt?: string;
  strength?: number;
  width?: number;
  height?: number;
}

export interface AdminBannerInpaintResponse {
  imageData: string;
}

export interface AdminBannerStyleAddRequest {
  name: string;
  promptSuffix: string; // the style description appended to the prompt
  negativePrompt?: string;
}

export interface AdminBannerStyleDeleteRequest {
  id: string;
}

export interface AdminBannerStylesResponse {
  styles: BannerStyle[];
}

export interface AdminBannerCategoryAddRequest {
  key: string;
  label: string;
}

export interface AdminBannerCategoryAddResponse {
  categories: BannerCategory[];
}

// A curated seed template not yet added to the library (admin-only; includes prompt).
export interface AdminBannerSuggestion extends BannerAsset {
  prompt: string;
}

export interface AdminBannerSuggestionsRequest {
  category?: string;
}

export interface AdminBannerSuggestionsResponse {
  suggestions: AdminBannerSuggestion[];
}

export interface AdminBannerSuggestionAddRequest {
  id: string;
}

export interface AdminBannerHideRequest {
  id: string;
  hidden: boolean;
}

export interface AdminBannerDeleteRequest {
  id: string;
}

export interface AdminBannerDeleteResponse {
  id: string;
  deleted: true;
}

export interface AdminBannerGenerateRequest {
  id: string;
}

export interface AdminBannerGenerateResponse {
  id: string;
  imageData: string; // raw base64 from the image model (no data: prefix)
}

// Generate a fresh image from an arbitrary prompt (not tied to a banner id) — used
// to create an image for a published item, or any free-form generation.
export interface AdminBannerGenerateFromPromptRequest {
  prompt: string;
  styleId: string;
}

export interface AdminBannerGenerateFromPromptResponse {
  imageData: string; // raw base64 (no data: prefix)
  sourceName?: string; // the generator source that produced it (for display)
}

// LLM-suggested text-to-image prompts for the admin image tools.
export interface AdminBannerSuggestPromptRequest {
  styleId?: string;
  name?: string;
  description?: string;
  categories?: string[];
  currentPrompt?: string;
}

export interface AdminBannerSuggestPromptResponse {
  suggestions: string[];
  shortReason: string;
}

export interface AdminBannerPublishRequest {
  id: string;
  bannerData: string; // client-processed banner JPEG (data URL or base64)
  thumbData: string; // client-processed thumbnail JPEG (data URL or base64)
  // Stamp the active generator's name as this image's provenance. True for AI
  // generate/enhance; pass false for free-image imports / uploads (they carry
  // their own source) so the card doesn't mislabel them as AI-generated.
  recordGeneratorSource?: boolean;
}

export interface AdminBannerPublishResponse {
  id: string;
  filename: string;
  thumbFilename: string;
  published: boolean;
}

export interface AdminBannerTestLocalRequest {
  url?: string; // test this endpoint; omit to test the active source
}

export interface AdminBannerTestLocalResponse {
  reachable: boolean;
  provider: string; // 'openai' | 'local'
  url: string;
  message: string;
}

// Admin AI Tools configuration. Affects only admin-console AI workflows
// (content enrichment/classification/cleanup + banner image generation).
// Persisted as an overlay file over code defaults; unset fields fall back.
export type AdminAiPromptKey =
  | 'cleanupData'
  | 'collectionInfo'
  | 'reorganizeCollections'
  | 'discussSite'
  | 'contentClassification'
  // Judges a child's site request against the parent's written guidelines.
  // Unlike contentClassification, this one returns a VERDICT, so its output is
  // parsed strictly and a malformed answer defers to the parent.
  | 'accessRequestReview'
  | 'feedGenOutline'
  | 'feedGenPost'
  | 'feedGenExtract'
  | 'lessonGenLesson'
  | 'lessonGradeAnswer'
  // The collection builder's copy/paste authoring prompt. Only `prompt` is used
  // (it carries the JSON format spec); `system` is unused.
  | 'collectionAuthoring'
  // Drafts a curation review's answers for a curator to confirm. Framing only: the checks and
  // their instructions are always appended from tset-sharedlib/src/curation.checklist.ts.
  | 'curationReviewDraft';

export interface AdminAiPromptOverride {
  system?: string;
  prompt?: string;
}

export interface AdminAiImageGenSettings {
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  negativePrompt: string;
}

/**
 * What one model costs, in USD. Set from the provider's public pricing page.
 *
 * Ships as zero. Zero is treated as "not configured" and surfaces as a warning in the
 * admin UI rather than silently computing a $0 spend — an unpriced model must look broken,
 * not free.
 */
export interface AdminAiModelPrice {
  inputPerMillion: number; // USD per 1M prompt tokens
  outputPerMillion: number; // USD per 1M completion tokens
  /**
   * Where the rates came from: the list price shipped in code (`stamped`, dated by
   * `AdminAiPricing.pricesAsOf`) or a figure an admin typed. Set on configs the server returns.
   */
  source?: 'stamped' | 'admin';
}

/** Per-image price for image generation, which bills per image rather than per token. */
export interface AdminAiImagePrice {
  perImage: number; // USD
  /**
   * Price for a named image model, used before `perImage`. Two hosted image models do not
   * cost the same, and a family is shown the dollars this produces, so one blended price
   * would report the cheaper model's spend as the dearer one's and back.
   *
   * Always present on a config the server returns — `mergePricing` fills every known model,
   * so a config saved before this existed comes back complete rather than half-typed.
   */
  byModel: Record<string, number>;
}

export interface AdminAiPricing {
  models: Record<string, AdminAiModelPrice>;
  image: AdminAiImagePrice;
  /** When an admin last saved prices. */
  updatedAt: string | null;
  /** The date the list prices shipped in code were checked against the provider's pricing page. */
  pricesAsOf?: string | null;
}

/** One plan's hosted AI limits, in USD of spend. */
export interface AdminAiPlanLimits {
  /** Spend allowed in a 5-hour window, which starts with the first request and lasts 5 hours. */
  fiveHourUsd: number;
  /** Spend allowed in a weekly window, which starts with the first request and lasts 7 days. */
  weeklyUsd: number;
}

/**
 * The hosted AI limits per plan. A family may spend while both windows have room; past either,
 * requests use the family's extra AI usage balance, and without one they are refused until the
 * window resets.
 */
export interface AdminAiLimits {
  standard: AdminAiPlanLimits;
  plus: AdminAiPlanLimits;
  /** Percent of a limit at which the family is warned. */
  warnAtPercent: number;
  urgentWarnAtPercent: number;
}

export interface AdminAiConfig {
  model: string; // model used for admin text tasks (within the allowlist)
  prompts: Record<AdminAiPromptKey, AdminAiPromptOverride>;
  policyPrompt: string; // global enrichment/classification policy guidance
  imageGen: AdminAiImageGenSettings;
  pricing: AdminAiPricing;
  limits: AdminAiLimits;
}

// Returned by get/save/reset — the effective config plus the metadata the UI
// needs to render controls (allowed models + code defaults for "reset").
export interface AdminAiConfigResponse {
  config: AdminAiConfig;
  modelAllowlist: string[];
  defaults: AdminAiConfig;
}

// Partial update; only provided fields are persisted.
export interface AdminAiConfigSaveRequest {
  model?: string;
  prompts?: Partial<Record<AdminAiPromptKey, AdminAiPromptOverride>>;
  policyPrompt?: string;
  imageGen?: Partial<AdminAiImageGenSettings>;
  pricing?: Partial<AdminAiPricing>;
  limits?: {
    standard?: Partial<AdminAiPlanLimits>;
    plus?: Partial<AdminAiPlanLimits>;
    warnAtPercent?: number;
    urgentWarnAtPercent?: number;
  };
}

// Lightweight aggregated counts for the admin dashboard landing page.
export interface AdminDashboardStatsResponse {
  userCount: number;
  publishedCount: number;
  pendingQueueCount: number; // items awaiting metadata/curation
  recentAiTaskCount: number; // AI task activity in the recent window
}

// Whole-dataset summary counts for the admin user list page.
export interface AdminUserStatsResponse {
  total: number;
  active7: number;
  active30: number;
  new30: number;
  disabled: number;
}

export interface SaveItemRequest {
  itemId?: string;
  details: Partial<Item>;
  isNew?: boolean;
  collectionIds?: string[];
  bannerQuery?: string;
  removeMissingCollections?: boolean;
  quickShareUserIds?: string[];
  accessRequestId?: string;
  feedbackUpdate?: { attr: string; value: any };
  options?: CreateCollectionOptions;
  targetUserId?: string;
  tempAuthToken?: TokenData;
}

export interface SavePostAttachmentToLibraryRequest {
  postId: string;
  bundleId: string;
  saveRequest: SaveItemRequest;
  bundleSource?: SaveItemRequest['details'];
}

export interface SavePostAttachmentToLibraryResponse {
  action: 'saved' | 'request-required';
  itemId?: string | null;
  requestPrefill?: {
    key: string;
    type: 'url' | 'item';
    details?: AccessRequestDetails;
    allowSwitchType?: boolean;
  } | null;
}

export interface UpdateItemRequest {
  itemId: string;
  data: Partial<Item>;
  encInfo?: EncInfo;
  allowDecrypt?: boolean;
  skipEncUpdate?: boolean;
  tempAuthToken?: TokenData;
}

export interface UpdatePostEncInfoRequest {
  postId: string;
  encInfo: EncInfo;
}

export interface RemoveItemFromUserLibraryRequest {
  itemIds: string[];
}

export interface AddItemToUserLibraryRequest {
  itemIds: string[];
  /**
   * Whose library. The server reads it through getTargetUserId: absent, the caller's own;
   * set, an admin approving a child's access request adds the item to the child's library.
   */
  userId?: string;
}

export interface StandaloneAppBootstrapRequest {
  slug: string;
  redirectPath?: string | null;
}

export type StandaloneAppBootstrapResponse = StandaloneAppBootstrapResult;

export interface StandaloneAppListRequest {
}

export interface StandaloneAppListResponse {
  apps: StandaloneAppCatalogEntry[];
}

export type ItemImageApproval = {
  approved: boolean;
  updatedAt?: number;
  updatedByUserId?: string | null;
}

export interface ItemImageApprovalGetRequest {
  itemId: string;
}

export interface ItemImageApprovalGetResponse {
  itemId: string;
  approval: ItemImageApproval | null;
}

export interface ItemImageApprovalSetRequest {
  itemId: string;
  approved: boolean;
}

export interface ItemImageApprovalSetResponse {
  itemId: string;
  approval: ItemImageApproval | null;
}

export interface ItemImageApprovalListByIdsRequest {
  itemIds: string[];
}

export interface ItemImageApprovalListByIdsResponse {
  approvedItemIds: string[];
  approvals: Array<{
    itemId: string;
    approval: ItemImageApproval;
  }>;
}



export interface GetItemRelationshipInfoRequest {
  itemId: string;
  collectionId: string;
  userId?: string;
}

export interface ItemRelationshipInfo {
  parents: ItemInfoView[];
  children: ItemInfoView[];
}

export interface GetItemsWithInfoRequest {
  userId?: string;
  ids?: string[];
}

export interface ListItemsWithFeedbackRequest {
  userId?: string;
  feedbackType?: string;
  limit?: number;
}

export interface SaveCollectionItemDetailsRequest {
  collectionId: string;
  itemId: string;
  details?: {
    name?: string;
    description?: string;
    comment?: string;
  };
  order?: number;
  dontEncrypt?: boolean;
  publishedAvailableAt?: string | Date;
  encInfo?: EncInfo | {decrypt: true};
}

export interface CollectionListByUserRequest {
  userId?: string;
  includePath?: boolean;
  includeParents?: boolean;
  permissionsIncluded?: string[];
  sharedOnly?: boolean;
  includeUserPermissions?: boolean;
}

export interface CollectionListByIdsRequest {
  ids: string[];
  userId?: string;
  allowListAll?: boolean;
  includePath?: boolean;
  includeUserPermissions?: boolean;
  tempAuthToken?: TokenData;
}



export interface SuggestCollectionsResponse {
  suggestions: Array<{
    collectionId?: string;
    title: string;
    reason?: string;
    confidence?: number;
  }>;
}

export interface MetadataResponse {
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  siteName?: string;
  type?: string;
  [key: string]: unknown;
}

export interface UrlContentSuggestionRequest {
  url: string;
  metadata?: {
    title?: string;
    description?: string;
    extractedText?: string;
    channelId?: string;
  };
  options?: {
    fetchMetadata?: boolean;
    runLocalClassification?: boolean;
    runRemoteClassification?: boolean;
    includeLibraryLookup?: boolean;
  };
}

export type UrlSuggestionSource = 'library' | 'local-classifier' | 'remote-classifier' | 'none';

export interface UrlSuggestedCriteria {
  eduValue?: EduValue;
  minAgeGroup?: MinAgeGroup;
  contentTypes?: ContentType[];
  topics?: TopicTag[];
}

export interface UrlContentSuggestionLibraryMatch {
  itemId: string;
  name?: string | null;
  url?: string | null;
  rel: ItemRelTypes;
  matchType: ItemMatchTypes;
  suggestedCriteria: UrlSuggestedCriteria;
}

export interface UrlContentSuggestionResponse {
  suggestedCriteria: UrlSuggestedCriteria;
  meta?: ItemMeta | null;
  libraryMatch?: UrlContentSuggestionLibraryMatch | null;
  provenance: {
    source: UrlSuggestionSource;
    confidence?: number | null;
    metadataFieldsUsed?: string[];
  };
  skippedReasons?: string[];
}

export interface SourcePriorityClassificationResponse {
  classification: string;
  confidence?: number;
  details?: {
    eduValue?: { value: string; confidence: number } | null;
    categories?: Array<{ value: string; confidence: number }>;
    contentTypes?: Array<{ value: string; confidence: number }>;
    flags?: Array<{ value: string; confidence: number }>;
    topics?: Array<{ value: string; confidence: number }>;
    shortReason?: string;
    provenance?: {
      sourceUsed: string;
      sourcesChecked: string[];
      fallbackReason?: string | null;
      cacheAgeMs?: number | null;
      policyVersion?: string | null;
    };
  };
}

export interface ContentLookupRequest {
  url: string;
  features?: {
    title?: string;
    description?: string;
    extractedText?: string;
    channelId?: string;
  };
  options?: {
    includeMetadata?: boolean;
    includeResourceInfo?: boolean;
    includeClassification?: boolean;
    forceRefresh?: boolean;
  };
}

export interface ContentLookupResponse {
  canonicalUrl: string;
  meta?: ItemMeta | null;
  /**
   * Present when the URL serves a file rather than a page — a PDF, a zip, a direct
   * image. Lifted out of `meta` so callers that only need "is this a file?" do not
   * have to reach into metadata. Populated from the metadata fetch already being
   * made, so it costs no extra request.
   */
  fileInfo?: ItemMetaFileInfo | null;
  resourceInfo?: ResourceFetchInfoResponse | null;
  classification?: SourcePriorityClassificationResponse | null;
  lookupMeta: {
    resourceType?: string | null;
    metadataSourceId?: string | null;
    requestedMetadata: boolean;
    usedMetadata: boolean;
    metadataStatus: 'not-requested' | 'available' | 'unavailable';
    requestedResourceInfo: boolean;
    usedResourceInfo: boolean;
    resourceInfoStatus: 'not-requested' | 'available' | 'unavailable';
    requestedClassification: boolean;
    usedClassification: boolean;
    classificationStatus: 'not-requested' | 'available' | 'unavailable';
    libraryMatchLocation: 'client-only';
    libraryMatchReason: 'client-side-encryption';
  };
}

export interface SearchItemsResponse {
  items: ItemInfoView[];
  total?: number;
  hasMore?: boolean;
}

export interface SearchMainRequest {
  searchType: string;
  searchLookupValue: string;
  filters?: any;
}


export interface EncryptionStatusResponse {
  enabled: boolean;
  hasUserSecret: boolean;
  hasAccountSecret: boolean;
  keyCount?: number;
  lastRotated?: string;
}

export interface ListKeysWithStatusResponse {
  keys: KeyEntry[];
  statuses: Record<string, string>;
  primary?: string;
}

export interface CreateAccountBackupKeyRequest {
  password: string;
  userId?: string;
}

export type ListKeysResponse = KeyEntry[];

export interface ActivityMonitorEvidence {
  hasRecentTrustedInteraction?: boolean;
  hasEstablishedActivitySession?: boolean;
  pageVisible?: boolean;
  pageFocused?: boolean;
  playbackDetected?: boolean;
  playbackSessionActive?: boolean;
}

export interface UpdateActivityLogRequest {
  url?: string;
  userId?: string;
  targetUserId?: string;
  type?: string;
  title?: string;
  trigger?: string;
  activityEvidence?: ActivityMonitorEvidence;
  data?: any;
}

// First-party in-app usage signal (from the app's own UI, not a content script).
// `kind: 'video'` = in-app YouTube playback (attributes to the real youtube URL,
// optionally a library itemId); `kind: 'audio'` = in-app podcast/music playback;
// `kind: 'app-usage'` = general app foreground time.
export interface RecordInAppActivityRequest {
  kind: 'video' | 'audio' | 'app-usage';
  url: string;
  title?: string;
  itemId?: string;
  videoId?: string;
  targetUserId?: string;
}

export interface GetUsageSummaryRequest {
  url: string;
  userId?: string;
  exact_match?: boolean;
  localOnlyCurrentUser?: boolean;
}

export interface UsageSummaryResponse {
    usageSummary: UsageSummaryData;
    selectedUsage: UsageStatus | null;
}

export type UsageInsightsPreset = '7d' | '30d';

export type UsageInsightsSyncStatus = 'fresh' | 'stale' | 'not-applicable';

export type UsageInsightsEntityType = 'platform' | 'creator' | 'resource' | 'domain' | 'site' | 'activity';

export type UsageInsightsResolverSource =
  | 'log-item'
  | 'log-channel'
  | 'platform-map'
  | 'domain'
  | 'url';

export interface GetUsageInsightsReportRequest {
  userId?: string;
  preset?: UsageInsightsPreset;
  syncCurrentUser?: boolean;
  viewerRestricted?: boolean;
}

export interface UsageInsightsMetricSummary {
  totalActiveMs: number;
  sessionCount: number;
  entryCount: number;
  activeDayCount: number;
}

export interface UsageInsightsTreeNode extends UsageInsightsMetricSummary {
  id: string;
  parentId: string | null;
  label: string;
  shortLabel?: string | null;
  entityType: UsageInsightsEntityType;
  resolverSource: UsageInsightsResolverSource;
  childCount: number;
  sampleUrl?: string | null;
  visitUrl?: string | null;
  redacted?: boolean;
}

export interface UsageInsightsLeaderboardEntry extends UsageInsightsMetricSummary {
  nodeId: string;
  label: string;
  shortLabel?: string | null;
  entityType: UsageInsightsEntityType;
  resolverSource: UsageInsightsResolverSource;
  visitUrl?: string | null;
  /** A creator's display name, when the log, the library or an earlier lookup on this device knows it. */
  displayName?: string | null;
}

export interface GetUsageInsightsReportResponse {
  preset: UsageInsightsPreset;
  generatedAt: number;
  window: {
    startTime: number;
    endTime: number;
  };
  syncStatus: UsageInsightsSyncStatus;
  lastSyncedAt: number | null;
  partialData: boolean;
  redactionApplied: boolean;
  hiddenNodeCount: number;
  totals: UsageInsightsMetricSummary;
  rootNodeIds: string[];
  tree: UsageInsightsTreeNode[];
  topPlatformsByTime: UsageInsightsLeaderboardEntry[];
  topResourcesByTime: UsageInsightsLeaderboardEntry[];
  topPlatformsBySessions: UsageInsightsLeaderboardEntry[];
  topResourcesBySessions: UsageInsightsLeaderboardEntry[];
  topChannelsByTime: UsageInsightsLeaderboardEntry[];
  topChannelsBySessions: UsageInsightsLeaderboardEntry[];
}

export interface GetTopicAttentionRequest {
  userId?: string;
  preset?: UsageInsightsPreset;
  topicSetId?: string;
  viewerRestricted?: boolean;
}

export interface TopicAttentionTopicInfo {
  id: string;
  label: string;
  icon?: string;
  /** Top-level group this leaf topic rolls up into; null for flat sets. */
  parentId?: string | null;
}

export interface TopicAttentionDay {
  dayKey: string;
  dayStartTime: number;
  totalMs: number;
  /** Interval-merged wall-clock active ms for the day (context denominator; totalMs is attributed ms). */
  activeMs: number;
  entryCount: number;
  /** Sparse: only topics with > 0 ms. */
  topicMs: Record<string, number>;
  status: 'ready' | 'pending';
}

export interface GetTopicAttentionResponse {
  preset: UsageInsightsPreset;
  generatedAt: number;
  window: {
    startTime: number;
    endTime: number;
  };
  topicSet: {
    topicSetId: string;
    version: string;
    /** Leaf topics — attribution keys in TopicAttentionDay.topicMs. */
    topics: TopicAttentionTopicInfo[];
    /** Top-level groups leaves roll up into (empty for flat sets). */
    groups: TopicAttentionTopicInfo[];
    otherTopicId: string;
  };
  availableTopicSetIds: { id: string; name: string }[];
  days: TopicAttentionDay[];
  /** Window per-topic ms over ready days. */
  totals: Record<string, number>;
  partial: boolean;
  embeddingsDegraded: boolean;
  redactionApplied: boolean;
  hiddenEntryCount: number;
}

export interface GetUrlRuleExplanationRequest {
  url: string;
  userId?: string;
  exact_match?: boolean;
}

export type UrlRuleExplanationCategorySource =
  | 'custom-rule'
  | 'library-item'
  | 'search-provider'
  | 'recent-classification'
  | 'built-in-rule'
  | 'none';

export type UrlRuleExplanationAccessSource =
  | 'custom-rule'
  | 'usage-limit'
  | 'short-form-video'
  | 'none';

export interface UrlRuleExplanationSearchProviderInfo {
  id: SearchProviderId;
  displayName: string;
  pageState: SearchProviderPageState;
  query: string | null;
}

export interface GetUrlRuleExplanationResponse {
  url: string;
  contentInfo: ActivityContentInfo | null;
  selectedUsage: UsageStatus | null;
  matchingUsageRules: UsageStatus[];
  matchedFamilyPolicyRule: StoredFamilyPolicyRule | null;
  matchingFamilyPolicyRules: StoredFamilyPolicyRule[];
  effectiveEduValue: EduValue | null;
  effectiveEduSource: 'family-policy' | 'content-info' | 'none';
  categorySource: UrlRuleExplanationCategorySource;
  categorySourceNote: string | null;
  accessSource: UrlRuleExplanationAccessSource;
  accessSourceNote: string | null;
  searchProvider: UrlRuleExplanationSearchProviderInfo | null;
}

export type AccessEvaluationState = 'allowed' | 'blocked' | 'unknown';

/**
 * "Assistant reviews requests", per child. Stored at `filters.autoApprovalSettings`
 * (the key predates the feature's current shape and is kept so existing rows and
 * the settings-copy list keep working).
 *
 * Two fields on purpose. The retired shape carried a criteria object of checkboxes
 * beside a prompt that could not affect the outcome; the guidelines ARE the
 * criteria now, so there is nothing for a second field to say.
 */
export interface LibraryAutoApprovalSettings {
  enabled: boolean;
  /** The parent's own words. Capped at ASSISTANT_GUIDELINES_MAX by the normalizer. */
  guidelines: string;
}

/**
 * The assistant approves or steps aside. It has no verdict for "no".
 *
 * A model that could deny would be making the decision a parent is entitled to
 * make, and a child would have no way to reach a person past it. Everything that
 * is not a confident yes therefore lands in the parent's queue exactly as it does
 * with the feature turned off.
 */
export type AccessRequestAiDecision =
  /** The site goes into the child's library, as a parent's own yes would. */
  | 'approve'
  /**
   * The page was charged to the wrong category, and the category is corrected for
   * this child only. Not an approval: nothing is added to the library and no
   * other block is lifted. A page that is really a lesson stops being spent out
   * of an entertainment budget, and if that budget was the only thing in the way
   * the child carries on.
   */
  | 'reclassify'
  | 'leave_for_parent';

/**
 * Why the review came out the way it did — which is not the same as what the model
 * said, because most `leave_for_parent` outcomes never reach a model.
 *
 * Recorded so a parent reading their history can tell "the assistant looked and
 * was not sure" from "the assistant never looked", and so we can see which guard
 * is firing without instrumenting each one separately.
 */
export type AccessRequestAiReviewSource =
  /** A model ran and returned a usable verdict. */
  | 'model'
  /** Same question, already answered within the cache window. */
  | 'cached'
  /** This host was left for the parent recently; not asked again. */
  | 'cooldown'
  /** The child has used this week's reviews. */
  | 'weekly-cap'
  /** The family's AI budget is spent. */
  | 'budget'
  /** Our own content check already flagged this URL. */
  | 'unsafe-cache'
  /** Timeout, malformed output, or a failure applying an approval. */
  | 'error';

/**
 * What the assistant did, stored on the request row and shown to the parent.
 *
 * Written for EVERY outcome, including the ones where no model ran, because
 * "nothing was checked, and here is why" is information the parent needs in order
 * to trust the ones that were.
 */
export interface AccessRequestAiReview {
  decision: AccessRequestAiDecision;
  source: AccessRequestAiReviewSource;
  /** The model's own confidence, or null when no model ran. */
  confidence: number | null;
  /** One sentence for the parent, <= 240 chars. Always present. */
  reasonForParent: string;
  /** One kind sentence for the child, <= 120 chars. Null when no model ran. */
  reasonForChild: string | null;
  /** The guideline line the model says decided it, when it named one. */
  matchedGuideline?: string | null;
  /**
   * How wide the assistant acted, after `resolveAssistantScope` capped what the
   * model proposed: what an approval opened, or what a `reclassify` recategorized.
   * Null on a hand-off, which changed nothing.
   *
   * Stored rather than re-derived so a parent reading the record sees the scope
   * that was actually written, even after the capping rules change underneath it.
   */
  grantedScope?: 'specific' | 'site' | null;
  /**
   * A rule the parent could add so this kind of request answers itself next time,
   * in their own voice and ready to paste. Present only on a hand-off — an
   * approval means the guidelines already covered it.
   */
  suggestedGuideline?: string | null;
  /**
   * The category written for this child, on a `reclassify` only.
   *
   * Narrowed to the two the assistant may move a page INTO. The asymmetry is the
   * same one that stops the model saying no: it may widen what a child can reach,
   * never narrow it, so a proposal outside this pair is not applied at all.
   */
  reclassifiedEduValue?: 'eduval_educational' | 'eduval_task' | null;
  /** The rule id the reclassify wrote, so a parent can undo exactly that rule. */
  reclassifyRuleId?: string | null;
  model: string | null;
  checkedAt: string;
  /**
   * First 16 hex of sha256 over the guidelines the verdict was judged against.
   * Lets a cached verdict be discarded once the parent rewrites their rules,
   * without storing the rules themselves twice.
   */
  guidelinesHash: string;
  /** Exactly what the model was shown about the page, for the parent's record. */
  inputs: {
    title: string | null;
    description: string | null;
    siteName: string | null;
    labels: string[];
  };
}

/**
 * What `/access_request/add` now answers with.
 *
 * `aiReview` is absent when the assistant had no business looking (feature off,
 * a reason it may not review, a request that is not for a site). `checked: false`
 * with a decision present means a guard answered without a model — see
 * `AccessRequestAiReviewSource`. The child-facing copy is the only part of the
 * review that crosses to the requester; the parent's reasoning stays on the row.
 */
export interface AccessRequestAddResponse {
  /** Absent when nothing was filed — see `limited`. */
  requestId?: string;
  /**
   * The ask was not filed because this child has already asked too many times
   * today. Not an error: the child is told, in `message`, and can ask again
   * tomorrow or find a parent now.
   */
  limited?: {
    reason: 'daily-cap';
    /** One sentence for the child. */
    message: string;
  };
  aiReview?: {
    checked: boolean;
    decision: AccessRequestAiDecision | null;
    reasonForChild: string | null;
    /** Reviews left in this child's week, after this one. Null when not counted. */
    remainingThisWeek: number | null;
  };
}

export interface AccessEvaluateRequest {
  url: string;
  userId?: string;
  exact_match?: boolean;
  meta?: any;
  denyAction?: 'redirectBlockedPage';
}

export interface AccessEvaluateResponse {
  allowedNow: boolean;
  state: AccessEvaluationState;
  reasonCode?: ReasonCode | null;
  /**
   * Set when an "allowed" verdict comes from a device-wide override that also
   * suppresses content-scan blocking (the pipeline skips blockRequest under the
   * same conditions). Callers that hold a page open on a content-derived block
   * reason may trust this allow and navigate; a plain URL-level "allowed" must
   * not clear those, because the scan would re-block.
   */
  clearedByOverride?: 'restrictions-paused' | 'privileged-temp-access' | null;
  libraryPermitted: boolean | null;
  /**
   * May this URL be added to (or re-saved in) the user's own library?
   *
   * Deliberately NOT `allowedNow`. Bookmarking is a library-membership
   * question; running out of screen time or owing a check-in are time gates
   * that must not stop a child from saving content their library already
   * approves. Blocking answers still win — a blocked URL is not bookmarkable,
   * and an unsynced library cannot vouch for anything.
   */
  saveAllowed: boolean;
  usageAllowed: boolean | null;
  selectedUsage?: UsageStatus | null;
  noUsageLimits?: boolean;
  takeBreakAdvisory?: TakeBreakAdvisory | null;
  /**
   * Family Downtime for this person, whatever the verdict above. Null when the family has none
   * coming up. An open page sets one timer for `nextChangeMs` from it instead of polling faster.
   */
  familyDowntime?: FamilyDowntimeAdvisory | null;
  /**
   * The usage-status script on the asking page is there only because Family Downtime is scheduled:
   * nothing else about this person needs it. The page then keeps its downtime timer and does not
   * poll usage.
   */
  onlyFamilyDowntime?: boolean;
}

export interface LogVisitRequest {
  url?: string;
  matchingItemIds?: string[];
  context?: any;
  tabDetails?: any;

}

export interface ListRecentVisitHistoryRequest {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface RemoveLogEntryRequest {
  entryId?: string;
  userId: string;
  url: string;
  startTime?: number;
  clientId?: string;
}

export interface InvalidateActivityMonitorsRequest {
  userId?: string;
}

export interface InvalidateActivityMonitorsResponse {
  invalidateBeforeCreatedAtMs: number;
}

export interface UserActivityLogListResponse {
  userActivityLog: UserActivityLog[];
  invalidateBeforeCreatedAtMs: number;
  /**
   * The server bounds this list two ways: a 180-day floor on the requested
   * since-timestamp and a cap on the number of rows returned (newest first).
   * `sinceApplied` is the floor actually used, and `truncated` is true when the
   * row cap dropped older rows inside the window — without these a caller
   * cannot tell "no activity" from "the server refused to look that far back",
   * and caching the result as complete silently loses history.
   */
  sinceApplied?: string;
  truncated?: boolean;
}

export interface SaveUserActivityLogResponse {
  saved?: boolean;
  flushRequired?: boolean;
  invalidateBeforeCreatedAtMs?: number;
}

export type UsageSessionGroupBy = 'tab' | 'domain' | 'tab+domain';
export type UsageLogCollapseMode = 'raw' | 'redirect-burst';
export type UsageSummaryPhase = 'browsing' | 'video' | 'audio' | 'search';

export interface GetGroupedEntriesSinceRequest {
  createdAt: number;
  userId?: string;
  inactivityGapMs?: number;
  includeEntries?: boolean;
}

export interface GroupedEntryView {
  id: string;
  startTime: number;
  endTime: number;
  clientId: string;
  tabId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  originGroup: string | null;
  entryCount: number;
  blockedCount: number;
  hasEduValue: boolean;
  activeDurationMs: number;
  spanDurationMs: number;
  activityPhases?: UsageSummaryPhase[];
  entries?: any[];
}

export interface GetGroupedEntriesSinceResponse {
  entries: GroupedEntryView[];
}

export interface GetUsageSessionsSinceRequest {
  createdAt: number;
  userId?: string;
  groupBy?: UsageSessionGroupBy;
  sessionGapMs?: number;
  includeEntries?: boolean;
  collapseMode?: UsageLogCollapseMode;
}

export interface UsageSessionView {
  id: string;
  startTime: number;
  endTime: number;
  tabId: string;
  originGroups: string[];
  entryCount: number;
  blockedCount: number;
  hasEduValue: boolean;
  totalDurationMs: number;
  activityPhases?: UsageSummaryPhase[];
  entries?: any[];
}

export interface GetUsageSessionsSinceResponse {
  sessions: UsageSessionView[];
}

export interface SessionSummarySnapshotView {
  key: string;
  startedAt: number;
  lastSeenAt: number;
  totalActiveMs: number;
  intentDurationsMs: Record<string, number>;
  behaviorCounts: Record<string, number>;
}

export interface GetSessionSummarySnapshotRequest {
  sourceKey?: string;
  url?: string;
}

export interface GetSessionSummarySnapshotResponse {
  sourceKey: string | null;
  summary: SessionSummarySnapshotView | null;
}

export interface ReportClassificationIssueRequest {
  targetUserId?: string;
  source: {
    /**
     * `activity-log` — an admin reviewing history after the fact.
     * `page-report`  — someone on the page saying this call looks wrong. Anyone
     *                  can send this, including a restricted user.
     */
    kind: 'activity-log' | 'page-report';
    logRefId?: string | null;
    url?: string | null;
    startTime?: number;
    endTime?: number;
    clientId?: string | null;
    /**
     * The report was made from a block page. Marked because these are the
     * reports a stronger model would be worth re-running: the person was
     * stopped, and the evidence is captured while it still exists.
     */
    duringBlock?: boolean;
  };
  /**
   * Who reported it. Recorded because a report from the person being filtered
   * is evidence, not ground truth — they have an obvious reason to want a
   * different answer, so these must be weighted separately, never applied.
   */
  reporterRole?: 'restricted' | 'guardian' | 'admin';
  /**
   * What a later re-examination would need, captured now because the reporter
   * will not be there to re-fetch it. Image bytes are NOT here: reported image
   * samples travel on the opt-in sample upload, which already caps and gates them.
   */
  evidence?: {
    pageTitle?: string | null;
    pageDescription?: string | null;
    /** Local sample ids for the images on this page, if any were kept. */
    imageSampleKeys?: string[];
    imagesBlocked?: number | null;
    imagesTotal?: number | null;
  };
  /**
   * Outcome of the report. Always `recorded` today — reports change nothing.
   * The slot exists so a later re-check can write a verdict here without a
   * contract change.
   */
  verdict?: {
    status: 'recorded';
  };
  classification: {
    restricted?: boolean | null;
    reasonCode?: string | null;
    eduValue?: string | null;
    flags?: string[];
    contentTypes?: string[];
    categories?: string[];
    topics?: string[];
  };
  feedback: {
    issueType:
      | 'wrong_edu_value'
      | 'wrong_blocking'
      | 'missing_flag'
      | 'false_positive'
      // Images that were hidden and should not have been.
      | 'wrong_image_blocked'
      // Images that should have been hidden and were not.
      | 'missed_inappropriate_image'
      | 'other';
    comment?: string;
    expectedEduValue?: string | null;
    expectedRestricted?: boolean | null;
  };
  context?: {
    pipelineSummary?: {
      hasPipelineResult: boolean;
      contentInfoKeys?: string[];
      hasDebugInfo?: boolean;
      extractedTextLength?: number;
    };
  };
}

export interface ReportClassificationIssueResponse {
  reportId: number;
  deduped: boolean;
  reportCount: number;
}

/**
 * One image-classifier decision, as contributed for model improvement.
 *
 * Carries no image bytes unless a person explicitly reported that decision as
 * wrong — background samples describe the decision only. `featureVector` is the
 * model's own summary of the image; it cannot be viewed, but it is not
 * anonymous either, so it is treated as sensitive wherever it lands.
 */
export interface ImageClassificationDatasetSample {
  imageKey: string;
  /** Host only, never a full image URL. */
  sourceHost?: string | null;
  pageHost?: string | null;
  capturedAt: number;
  /** Why the sample was kept: near-threshold, undecided, random, reported. */
  trigger: string;

  flagged: boolean;
  predictions: Array<{className: string; probability: number}>;
  reason: string;
  topClass?: string | null;
  band: string;
  bandSignal?: string | null;
  bandDistance?: number | null;
  imageAggressionLevel?: string | null;
  thresholds?: Record<string, number | boolean> | null;

  runtime?: string | null;
  modelId?: string | null;
  modelVersion?: string | null;

  featureVector?: number[] | null;
  featureVectorDims?: number | null;

  /** Only present for a reported decision. Downscaled, and capped server-side. */
  imageDataUrl?: string | null;
}

export interface UploadImageClassificationSamplesRequest {
  targetUserId?: string;
  datasetName?: string;
  samples: ImageClassificationDatasetSample[];
}

export interface UploadImageClassificationSamplesResponse {
  datasetId: string;
  received: number;
  inserted: number;
  deduped: number;
  rejected: number;
}

export interface UploadClassificationDatasetSamplesRequest {
  targetUserId?: string;
  datasetName?: string;
  samples: Array<{
    source: {
      pipelineResultId?: string | null;
      url?: string | null;
      normalizedUrl?: string | null;
      timestamp?: number;
      tabId?: string | null;
    };
    classification: {
      restricted?: boolean | null;
      reasonCode?: string | null;
      eduValue?: string | null;
      flags?: string[];
      contentTypes?: string[];
      categories?: string[];
      topics?: string[];
    };
    pageData?: {
      pageTitle?: string | null;
      description?: string | null;
      extractedText?: string | null;
      imageAltText?: string | null;
      canonicalUrl?: string | null;
    };
    modelContext?: {
      classifierType?: string | null;
      modelName?: string | null;
      modelVersion?: string | null;
      runLabel?: string | null;
      modelConfigJson?: string | null;
      modelConfigHash?: string | null;
    };
    sessionContext?: {
      sessionIntent?: string | null;
      sessionIntentConfidence?: number | null;
      intent?: string | null;
      behaviorSignals?: string[];
      socialLevel?: number | null;
      primaryContentKind?: string | null;
      navSource?: { origin?: string | null; searchProviderId?: string | null } | null;
    };
    summary?: {
      hasPipelineResult?: boolean;
      hasDebugInfo?: boolean;
      extractedTextLength?: number;
      titleLength?: number;
      descriptionLength?: number;
    };
  }>;
}

export interface UploadClassificationDatasetSamplesResponse {
  datasetId: string;
  received: number;
  inserted: number;
  deduped: number;
}

/** A multinomial (one-vs-rest stacked) logistic head over a fixed class list. */
export interface LearnedLogisticHead {
  classes: string[];
  /** weights[classIndex][featureIndex] */
  weights: number[][];
  /** biases[classIndex] */
  biases: number[];
}

/** A single binary logistic head (weights over the feature vector + bias). */
export interface LearnedBinaryHead {
  weights: number[];
  bias: number;
}

/**
 * Trained-in-browser classifier artifact. Produced by the admin trainer,
 * stored server-side, and downloaded by clients. Content heads (eduValue,
 * restricted) use the page embedding only; the alignment head additionally
 * consumes the ordered session features named in `alignment.sessionFeatureSpec`.
 */
export interface LearnedClassifierArtifact {
  schemaVersion: number;
  embeddingModelId: string;
  /** Embedding dimensionality the heads were trained on. */
  dim: number;
  eduValue: {
    head: LearnedLogisticHead;
    /** Training example counts per class — drives the per-class gate. */
    perClassCounts: Record<string, number>;
    minCountToGate: number;
  };
  restricted?: {
    head: LearnedBinaryHead;
    positiveCount: number;
    negativeCount: number;
    minCountToGate: number;
  };
  alignment?: {
    head: LearnedBinaryHead;
    /** Ordered names of the session features appended after the embedding. */
    sessionFeatureSpec: string[];
    positiveCount: number;
    negativeCount: number;
    minCountToGate: number;
  };
  hyperparams: { l2: number; lr: number; epochs: number; seed: number };
}

/** Sampled training-loss trajectory for one head (for the convergence sparkline). */
export interface LearnedTrainingLossHistory {
  /** Epoch index of each recorded point (0-based). */
  sampledEpochs: number[];
  /** Mean (sample-weighted) cross-entropy loss at each recorded epoch. */
  loss: number[];
}

export interface LearnedHeadMetrics {
  /** Samples in the train split. */
  trainN: number;
  /** Samples in the held-out validation split (0 when n < 10). */
  valN: number;
  /** Accuracy on the validation split (null when valN is 0). */
  valAccuracy: number | null;
  /** Accuracy on the train split — train−val gap is the overfitting signal. */
  trainAccuracy: number | null;
}

/**
 * Training-time diagnostics produced by the in-browser trainer, stored alongside
 * the artifact and rendered by the admin model dashboard. Not used for inference.
 */
export interface LearnedClassifierMetrics {
  eduValue: LearnedHeadMetrics & { perClassCounts: Record<string, number> };
  restricted: LearnedHeadMetrics & { positiveCount: number };
  alignment: LearnedHeadMetrics & { positiveCount: number };
  /** eduValue classes whose training count met the gate threshold. */
  gatedEduClasses: string[];
  /** Per-head loss curves (sampled to ~30 points regardless of epoch count). */
  trainingHistory?: {
    eduValue: LearnedTrainingLossHistory;
    restricted: LearnedTrainingLossHistory;
    alignment: LearnedTrainingLossHistory;
  };
  /** Rows dropped before training (surfaced so the denominator isn't a mystery). */
  dropped?: { quality: number; emptyEmbedding: number };
}

export interface GetClassificationEvalProgramStatusRequest {
  targetUserId?: string;
}

export interface GetClassificationEvalProgramStatusResponse {
  enabled: boolean;
  reason: 'enabled' | 'developer_mode_required' | 'not_allowlisted';
}

export interface RemoveActivityLogEntryRequest {
  entryId: string;
  userId?: string;
}

export interface SaveMetaTempRequest {
  url: string;
  meta: any;
  userId?: string;
}

export interface ImageClassifyResponse {
  results: Array<{
    id?: string;
    classification: string;
    confidence: number;
    details?: any;
  }>;
}

// The /content/listPipelineResults BG handler returns the locally-stored
// pipeline entries directly (data is JSON-parsed back into an object).
export type PipelineResultsResponse = ActivityPipelineResultsEntry[];

export interface TempDisableBlockingStatusResponse {
  disabled: boolean;
  expiresAt?: string;
  minutesRemaining?: number;
}

export interface AISendMessageRequest {
  sessionId?: string;
  message?: string;
  messages?: Array<{role: string; content: string}>;
  userId?: string;
  context?: Record<string, any>;
  mode?: string;
  /** Optional model override (DEV/debug). */
  model?: string;
}

export interface AISendMessageResponse {
  response: string;
  sessionId: string;
  messageId: string;
}

export interface AIItemSuggestRequest {
  itemId?: string;
  url?: string;
  context?: string;
  userId?: string;
  instructions?: string;
  numItems?: string;
  collectionDetails?: any;
  previousItems?: any[];
}

export interface AIItemSuggestResponse {
  items: Array<{
    title: string;
    description?: string;
    url?: string;
    reason?: string;
  }>;
}

export interface AIItemUpdateRequest {
  itemId?: string;
  updates?: Record<string, any>;
  userId?: string;
  actionId?: string;
  itemDetails?: any;
  instructions?: string;
}

export interface AIItemUpdateResponse {
  updates: Record<string, any>;
  applied: boolean;
  reason?: string;
}

export interface AITextRequest {
  prompt?: string;
  instructions?: string;
  userId?: string;
  context?: any;
  schema?: any;
}

export interface AITextResponse {
  text: string;
  usage?: any;
}

// ---------------------------------------------------------------------------
// AI Usage Metering
// ---------------------------------------------------------------------------

export interface AIUsageGetSummaryRequest {
  /** ISO date string used to select the month (defaults to now). */
  forDate?: string;
}

export interface AIUsageGetSummaryResponse {
  period: 'month';
  periodStart: string;
  periodEnd: string;
  promptTokensUsed: number;
  completionTokensUsed: number;
  tokensUsed: number;
  /** Null means no limit configured yet. */
  limitTokens: number | null;
  /**
   * Kept only for installed clients from before the AI limits (2026-09-13), which render a monthly
   * dollar budget from it. Families never see what AI costs Kindredly (PLN-7), so the server sends
   * every dollar as zero and `pricingConfigured: false`, which makes those clients show token and
   * picture counts instead. Current clients read `limits`.
   */
  spend?: AIUsageSpendSummary;
  /**
   * The same window, split by what the money went on. The settings page reports each figure
   * beside the control that spends it — a family that is out of budget needs to know whether
   * it was the assistant or the pictures.
   */
  breakdown?: AIUsageBreakdown;
  /**
   * The family's 5-hour and weekly AI limits and extra AI usage, which is what requests are
   * actually admitted against, in AI requests. Null on a device-only install.
   */
  limits?: AiRequestLimitState | null;
}

/** Which hosted AI limit window. */
export type AiLimitWindowKind = '5h' | 'week';

export interface AiLimitWindowState {
  limitUsd: number;
  /** Plan spend in the open window. Zero when the window has not started. */
  usedUsd: number;
  /** Rounded; 100 or more means this limit is reached. */
  percentUsed: number;
  /** When the open window ends, ISO. Null when no window is open — the next request starts one. */
  resetsAt: string | null;
}

export interface AiLimitState {
  plan: 'standard' | 'plus';
  /** Kindredly staff turned hosted AI off for this family. */
  hostedStopped: boolean;
  fiveHour: AiLimitWindowState;
  weekly: AiLimitWindowState;
  /** The limit that currently stops plan usage, or null while both have room. */
  limitReached: AiLimitWindowKind | null;
  extraUsage: {
    /** What is left across grants that have not expired or been revoked. */
    balanceUsd: number;
    /** The soonest expiry among grants with a balance left, ISO. */
    nextExpiresAt: string | null;
    /** Whether the family has ever been given extra AI usage, so the page knows to show the row. */
    hasGrants: boolean;
  };
  warnAtPercent: number;
  urgentWarnAtPercent: number;
}

/** One limit window as a family's device receives it: AI requests, never dollars (PLN-7). */
export interface AiRequestWindowState {
  /** How many AI requests the window holds. */
  limitRequests: number;
  /** Requests used in the open window, rounded down, and `limitRequests` once the limit is reached. */
  usedRequests: number;
  /** 0 to 100; 100 means this limit is reached. */
  percentUsed: number;
  /** When the open window ends, ISO. Null when no window is open — the next request starts one. */
  resetsAt: string | null;
}

/**
 * A family's hosted AI limits as its devices receive them.
 *
 * Families never see what AI costs Kindredly (founder decision 2026-09-15, PLN-7), so every amount
 * is in AI requests. The admin console reads `AiLimitState`, in dollars, through an admin route.
 */
export interface AiRequestLimitState {
  plan: 'standard' | 'plus';
  /** Kindredly staff turned hosted AI off for this family. */
  hostedStopped: boolean;
  /** False when a hosted model has no price, so use cannot be counted and must not read as zero. */
  measured: boolean;
  fiveHour: AiRequestWindowState;
  weekly: AiRequestWindowState;
  /** The limit that currently stops plan usage, or null while both have room. */
  limitReached: AiLimitWindowKind | null;
  extraUsage: {
    /** AI requests left across grants that have not expired or been revoked, rounded down. */
    requestsLeft: number;
    /** The soonest expiry among grants with a balance left, ISO. */
    nextExpiresAt: string | null;
    /** Whether the family has ever been given extra AI usage, so the page knows to show the row. */
    hasGrants: boolean;
  };
  warnAtPercent: number;
  urgentWarnAtPercent: number;
}

/** A grant of extra AI usage, as the admin console lists it. */
export interface AiExtraUsageGrantView {
  _id: string;
  accountId: string;
  source: 'staff' | 'purchase';
  amountUsd: number;
  remainingUsd: number;
  expiresAt: string | null;
  note: string | null;
  grantedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface AIUsageBreakdown {
  /** Everything that is not image generation: chat, suggestions, enrichment. */
  textSpendUsd: number;
  textTokens: number;
  /** Image generation calls in the window, and what they cost. */
  imageSpendUsd: number;
  imageCount: number;
}

export interface AIUsageSpendSummary {
  /** This user's own spend, and their override if one is set. */
  userSpendUsd: number;
  userBudgetUsd: number | null;
  /** The family pool. A user is allowed to spend only while BOTH have room. */
  accountSpendUsd: number;
  accountBudgetUsd: number;
  accountBudgetSource: 'user_override' | 'account_override' | 'plan_default';
  /** False means no model price is set, so the dollar figures are unmeasured, not zero. */
  pricingConfigured: boolean;
  /** Calls in the window that recorded no cost because their model had no price. */
  unpricedRows: number;
  warnAtPercent: number;
  urgentWarnAtPercent: number;
}

/**
 * Session summary returned by the (client-background) /ai/sessionList route.
 * Sessions are device-local; there is no server-side session storage.
 */
export interface AISessionResponse {
  id: string;
  name: string;
  sessionType: 'general' | 'app-editor';
  step: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserTaskRequest 
{ taskname: string; data: any; system?: string; prompt?: string, maxTokens?: number; model?: string }

/** Request type for streaming AI tasks */
export interface UserTaskStreamRequest {
  taskname: 'agentInteraction';
  data: { messages: Array<{ role: string; content: string }> };
}

/** A single tool (function) declaration passed through to the provider. */
export interface AIToolDeclaration {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: any; // JSON Schema
  };
}

/** Chat message shapes for the streaming endpoint (native tool-calling adds
 * assistant tool_calls and role:'tool' result messages). */
export type AIChatWireMessage =
  | { role: string; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    }
  | { role: 'tool'; tool_call_id: string; content: string };

/** Request type for streaming chat messages */
export interface AISendMessageStreamRequest {
  sessionId?: string;
  messageId?: string;
  messages: AIChatWireMessage[];
  /** Optional model override (DEV/debug). */
  model?: string;
  /** Optional mode hint (e.g., 'app-editor') for server-side response formatting. */
  mode?: string;
  /**
   * Native tool-calling: tool schemas offered to the model. When present the
   * server passes them through (and does NOT force a JSON-object response).
   * Absent = legacy JSON-envelope behavior, byte-identical to before.
   */
  tools?: AIToolDeclaration[];
  toolChoice?: 'auto' | 'none' | 'required';
}

/** SSE events from streaming chat endpoint */
export interface ChatStreamStartEvent {
  sessionId: string;
  messageId: string;
  timestamp: string;
}

export interface ChatStreamChunkEvent {
  sessionId: string;
  messageId: string;
  content: string;      // The new chunk content
  accumulated: string;  // Full accumulated content so far
}

/** Emitted once per tool call as soon as its name is known (progress UI). */
export interface ChatStreamToolCallEvent {
  index: number;
  id: string;
  name: string;
}

export interface ChatStreamCompleteEvent {
  sessionId: string;
  messageId: string;
  content: string;
  finishReason: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  duration: number;
  /** Native tool-calling: fully-accumulated tool calls (arguments = raw JSON string). */
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
}

export interface ChatStreamErrorEvent {
  sessionId: string;
  messageId: string;
  message: string;
  timestamp: string;
}

/** SSE chunk events from streaming AI endpoint */
export interface StreamChunkEvent {
  content: string;
  accumulated: number;
}

export interface StreamCompleteEvent {
  content: string;
  finishReason: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  duration: number;
}


export interface GenerateImageRequest {
  prompt: string;
  /**
   * A hosted image model from `AI_IMAGE_MODELS`. Outside that list, or absent, the server
   * uses the default — the allowlist is a ceiling, exactly as it is for text models.
   */
  model?: string;
  options?: any;
  userId?: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
  imageData?: string;
  taskId: string;
}

export const MAX_POST_ATTACHMENTS = 20;

/**
 * Biggest single attachment a post can carry, in bytes of original file.
 *
 * Roughly two minutes of phone 1080p, which is the size a family video actually is.
 *
 * This is no longer bounded by /post/create's JSON body limit: attachments upload ahead of
 * the post through /userfile/uploadBinary (or chunked, above 16mb) and the post itself only
 * carries fileIds. It is a client-side gate for a clear up-front message; the server's
 * per-plan `maxUploadBytes` is the authority, and Plus allows more for library items than a
 * post will offer.
 */
export const MAX_POST_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export type CreatePostResponse = string | {
  postId: string;
  encInfo?: any;
};

export interface CreatePostRequest {
  postType?: string;

  data: any;
  attachedItems?: Array<{
    itemId?: string;
    bundleId?: string;
    type: string;
    data: any;
  }>;
  sharedWith?: string[];
  visibility?: 'public' | 'private' | 'friends';
  userId?: string;
  encInfo?: EncInfo;
  // Grouped ("Separate recipients") sharing: siblings created for one authoring action
  // share a shareGroupId; each sibling's sharedWith is only its group's members.
  shareGroupId?: string;
  groupLabel?: string | null;
}
//{ postType: string; data: any; attachedItems?: any[]; sharedWith?: string[]; encInfo?: any }

// One ad-hoc recipient group assembled at post time (not persisted as a reusable circle in v1).
export interface GroupedPostGroup {
  groupId: string; // client-side ad-hoc id, e.g. "g1"
  label?: string | null;
  memberUserIds: string[];
}

export interface CreateGroupedPostRequest {
  postType?: string;
  data: any;
  attachedItems?: CreatePostRequest['attachedItems'];
  groups: GroupedPostGroup[];
}

export interface CreateGroupedPostResponse {
  shareGroupId: string;
  postIds: string[];
}

export interface ListByShareGroupRequest {
  shareGroupId: string;
}

export interface PostReadReceiptMarkRequest {
  postId: string;
  isRead?: boolean;
}

export interface PostReadReceiptMarkResponse {
  postId: string;
  readAt: string | null;
}

export interface PostReadReceiptListRequest {
  postId: string;
}

export interface PostReadReceiptListResponse {
  readers: Array<{
    userId: string;
    displayedName?: string;
    username: string;
    profileImage?: Record<string, any>;
    readAt: string;
  }>;
  count: number;
}

export interface CreateCommentRequest {
  refType: 'post' | 'item';
  refId: string;
  parentId?: string;
  data: any;
  comment?: string;
  userId?: string;
  encInfo?: EncInfo;
}

export interface FeedListCursor {
  createdAt: string;
  feedId: string;
}

export interface ListFeedItemsRequest {
  userId?: string;
  pageInfo?: {
    currentPage?: number;
    perPage?: number;
    includeTotalRows?: boolean;
  };
  includeComments?: boolean;
  newOnly?: boolean;
}

export interface SearchFeedPostsRequest {
  userId?: string;
  limit?: number;
  includeComments?: boolean;
  createdAfter?: string;
  cursor?: FeedListCursor;
}

export interface SharedFeedbackFeedListRequest {
  sinceDays?: number;
  onlyAfterLastSeen?: boolean;
  limit?: number;
}

export interface SharedFeedbackFeedEvent {
  eventId: string;
  actor: {
    userId: string;
    displayedName?: string;
    username: string;
    profileImage?: Record<string, any>;
  };
  item: {
    id: string;
    type: string;
    url?: string;
    name?: string;
  };
  feedback: {
    type: 'reaction';
    reaction: string;
    at: string;
  };
}

export interface SharedFeedbackFeedListResponse {
  events: SharedFeedbackFeedEvent[];
  prefs?: {
    lastSeenAt?: string;
    lastDismissedAt?: string;
  };
}

export interface SharedFeedbackFeedMarkSeenRequest {
  seenAt: string;
  dismissedAt?: string;
}

export interface SharedFeedbackFeedMarkSeenResponse {
  success: true;
}

export interface PublishedWithItems {
  published: Published;
  items: ItemInfoView[];
}

export interface PublishedFeedItem {
  published: Published;
  item: ItemInfoView;
}

export interface GetPublishedViewRequest {
  pubId?: string;
  itemId?: string;
}

export interface SubscribeToPublishedRequest {
  collectionId: string;
  userIds?: string[];
  forceClientImport?: boolean;
  pinToHome?: boolean;
  /**
   * Opt into a richer response: `{ collectionId, childFailures }` instead of the bare
   * collection id.
   *
   * The client import swallows per-child errors so that one bad item cannot lose the other
   * twenty-nine. That is right for the import, and a lie to whoever asked for it: a collection
   * where 20 of 30 children failed reports plain success. The background job runner needs the
   * truth, because it must not record the entry as applied — a resume would otherwise see the
   * collection exists, skip it, and strand the missing children forever.
   *
   * Opt-in rather than a shape change: `AddPublishedToLibrary` reads `result` as the item id.
   */
  reportChildFailures?: boolean;
}

/** Response shape when `SubscribeToPublishedRequest.reportChildFailures` is set. */
export interface SubscribeToPublishedDetailedResult {
  collectionId: string;
  childFailures: number;
}

export interface ImportFromPublishedRequest {
  itemId: string;
  collectionIds?: string[];
  userIds?: string[];
  targetUserId?: string;
  forceClientImport?: boolean;
  pinToHome?: boolean;
}

export interface RecommendContentBundlesRequest {
  age?: number | null;
  limitPerBundle?: number;
}

export interface ContentBundleLinkItem {
  linkId: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  categories?: string[];
}

export type ContentBundleSectionSelectionMode = 'multiple' | 'single';

export interface ContentBundleSelectionEntry {
  entryId: string;
  kind: 'published' | 'link';
  title: string;
  itemId?: string;
  publishedType?: string;
  url?: string;
  description?: string;
}

export interface ContentBundleSectionView {
  sectionId: string;
  title: string;
  description: string;
  kind: 'published' | 'links';
  selectionMode: ContentBundleSectionSelectionMode;
  defaultSelectedEntryIds: string[];
  items?: Published[];
  links?: ContentBundleLinkItem[];
}

export interface ContentBundleView {
  bundleId: string;
  title: string;
  description: string;
  recommendedAgesLabel: string;
  minAge: number;
  maxAge: number;
  itemLimit: number;
  source: 'dynamic_curated' | 'manual';
  sections: ContentBundleSectionView[];
}

export interface RecommendContentBundlesResponse {
  recommendedBundleId: string | null;
  bundles: ContentBundleView[];
}

export interface AdminContentBundleDefinition {
  bundleId: string;
  title: string;
  description: string;
  recommendedAgesLabel: string;
  minAge: number;
  maxAge: number;
  minAgeGroups?: MinAgeGroup[];
  itemLimit?: number;
  itemIds?: string[];
  curated?: boolean;
  source: 'dynamic_curated' | 'manual';
  sections?: AdminContentBundleSectionDefinition[];
}

export interface AdminContentBundleSectionDefinition {
  sectionId: string;
  title: string;
  description?: string;
  kind: 'published' | 'links';
  selectionMode?: ContentBundleSectionSelectionMode;
  source?: 'dynamic_curated' | 'manual';
  minAgeGroups?: MinAgeGroup[];
  itemLimit?: number;
  itemIds?: string[];
  curated?: boolean;
  links?: ContentBundleLinkItem[];
}

export interface AdminContentBundleCatalogEntry extends AdminContentBundleDefinition {
  sections: AdminContentBundleCatalogSectionEntry[];
}

export interface AdminContentBundleCatalogSectionEntry extends AdminContentBundleSectionDefinition {
  itemPreviews: Published[];
}

export interface AdminContentBundleCatalogResponse {
  bundles: AdminContentBundleCatalogEntry[];
  usesDefaultCatalog: boolean;
}

export interface AdminUpdateContentBundleCatalogRequest {
  bundles: AdminContentBundleDefinition[];
}

// ---- Setup Catalog (adult "Set up my user" onboarding) ----
// A parallel, page-keyed sibling of the Content Bundle catalog. Pages are fixed
// in the wizard (apps/interests/fun); their groups + cards are admin-configurable
// and server-persisted (one sysinfo blob). Adds an `apps` card kind that carries a
// taskbar target so a picked app is dropped into the right Taskbar category.

export type SetupCardKind = 'apps' | 'links' | 'published';
export type SetupSelectionMode = ContentBundleSectionSelectionMode;
export type SetupTaskbarTarget = 'search' | 'chat' | 'email' | 'photos' | 'files' | 'music' | 'calendar';

export interface SetupAppItem {
  appId: string;
  label: string;
  url: string;
  icon?: string;
  description?: string;
  taskbarTarget: SetupTaskbarTarget;
}

export interface SetupGroupDefinition {
  groupId: string;
  title: string;
  description?: string;
  kind: SetupCardKind;
  selectionMode?: SetupSelectionMode;
  // apps
  apps?: SetupAppItem[];
  // links
  links?: ContentBundleLinkItem[];
  // published
  source?: 'dynamic_curated' | 'manual';
  itemIds?: string[];
  itemLimit?: number;
  curated?: boolean;
  interestTags?: string[];
}

export interface SetupPageDefinition {
  pageId: string;
  title: string;
  description?: string;
  // Whether this page is shown during onboarding. Defaults to false (off) — admins
  // opt a page in from the Setup Catalog admin page.
  enabled?: boolean;
  groups: SetupGroupDefinition[];
}

export interface SetupGroupView {
  groupId: string;
  title: string;
  description?: string;
  kind: SetupCardKind;
  selectionMode: SetupSelectionMode;
  defaultSelectedEntryIds: string[];
  apps?: SetupAppItem[];
  links?: ContentBundleLinkItem[];
  items?: Published[];
}

export interface SetupPageView {
  pageId: string;
  title: string;
  description?: string;
  groups: SetupGroupView[];
}

export interface GetSetupCatalogRequest {}

export interface GetSetupCatalogResponse {
  pages: SetupPageView[];
  // Whether the "Advanced features" onboarding step should be shown. Not a catalog
  // page — a standalone toggle. Defaults to false (off).
  featuresStepEnabled: boolean;
}

export interface AdminSetupCatalogGroupEntry extends SetupGroupDefinition {
  itemPreviews: Published[];
}

export interface AdminSetupCatalogPageEntry extends SetupPageDefinition {
  groups: AdminSetupCatalogGroupEntry[];
}

export interface AdminSetupCatalogResponse {
  pages: AdminSetupCatalogPageEntry[];
  usesDefaultCatalog: boolean;
  featuresStepEnabled: boolean;
}

export interface AdminUpdateSetupCatalogRequest {
  pages: SetupPageDefinition[];
  featuresStepEnabled?: boolean;
}

export interface AdminContentLoaderManifestFeed {
  feedId?: string;
  type: 'rss' | 'atom' | 'json' | 'other';
  title?: string;
  description?: string;
  /** 'audio' marks a podcast feed (episodes carry audio enclosures). */
  mediaKind?: 'audio';
  /** Human home page for the feed (optional; the record `url` is the usual home). */
  url?: string;
  feedURL: string;
}

export interface AdminContentLoaderManifestRecord {
  localId: string;
  itemId?: string;
  easyId?: string;
  sourceItemId?: string;
  type: string;
  /** Secondary type (e.g. website/podcast/yt_channel/app for the `link` primary type). */
  subType?: string | null;
  name: string;
  description?: string;
  url?: string;
  categories: string[];
  useCriteria: string[];
  childLocalIds: string[];
  /**
   * Existing published children referenced by easyId (col records only) —
   * lets an expansion manifest keep a feed's current posts without re-emitting
   * them. Resolved children are ordered childEasyIds first, then childLocalIds.
   */
  childEasyIds?: string[];
  imageAssetId?: string | null;
  imageFilename?: string | null;
  attachments?: AdminContentLoaderAttachmentEntry[];
  data?: Record<string, any>;
  meta?: Record<string, any>;
  /** Provenance record (kindredly.provenance.v1); copied to Published.sourceInfo at import. */
  sourceInfo?: Record<string, any> | null;
  /** Rich markdown body for `information`/`note` posts; stored on the item's `info.value`. */
  textContent?: string | null;
  /**
   * RSS/Atom feeds attached to the record; written to `info.feeds[]` + `info.hasFeeds`
   * (same shape as `ItemFeed`). Podcasts set `mediaKind: 'audio'` + `subType: 'podcast'`.
   */
  feeds?: AdminContentLoaderManifestFeed[] | null;
  /** Marks a collection as a subscribable feed (e.g. 'feed'). */
  publishType?: string | null;
  /** ISO date controlling when the record/relation becomes available (daily rotation). */
  availableAt?: string | null;
  published: boolean;
}

export type AdminContentLoaderAssetKind = 'banner_image' | 'published_attachment';

export interface AdminContentLoaderManifestAsset {
  assetId: string;
  ownerLocalId: string;
  kind: AdminContentLoaderAssetKind;
  filename?: string | null;
  fileType?: string | null;
  tempUploadId?: string | null;
  remoteUrl?: string | null;
  meta?: Record<string, any> | null;
}

export interface AdminContentLoaderAttachmentEntry {
  id?: string;
  type: 'file' | 'snapshot' | 'snip' | 'uri';
  filename?: string;
  fileType: string;
  fileId?: string;
  info?: Record<string, any>;
  meta?: Record<string, any>;
  previews?: Array<Record<string, any>>;
  encryptedInfo?: boolean;
  createDate?: number;
  assetId?: string | null;
}

export interface AdminContentLoaderManifest {
  records: AdminContentLoaderManifestRecord[];
  assets?: AdminContentLoaderManifestAsset[];
}

export interface AdminContentLoaderDryRunRequest {
  manifestText: string;
}

export interface AdminContentLoaderMatchPreview {
  _id: string;
  name?: string;
  easyId?: string;
  type?: string;
  url?: string;
}

export type AdminContentLoaderDryRunDecision = 'create' | 'update' | 'conflict' | 'invalid';

export type AdminContentLoaderAdvisoryStatus = 'clear' | 'suggested' | 'review' | 'warning';

export interface AdminContentLoaderAdvisory {
  status: AdminContentLoaderAdvisoryStatus;
  notes: string[];
  moderation: {
    approved: boolean;
    severity: string;
    suggestedAction?: string;
    flags: string[];
  } | null;
  enrichment: {
    suggestedUseCriteria: string[];
    reasons: string[];
    resourceHints: {
      rtype?: string | null;
      hasLookupData?: boolean;
      madeForKids?: boolean;
      ageRestricted?: boolean;
    } | null;
  } | null;
}

export interface AdminContentLoaderDryRunRecordResult {
  localId: string;
  decision: AdminContentLoaderDryRunDecision;
  issues: string[];
  matchedPublishedIds: string[];
  matchedRecords: AdminContentLoaderMatchPreview[];
  normalizedRecord: AdminContentLoaderManifestRecord | null;
  advisory: AdminContentLoaderAdvisory | null;
}

export interface AdminContentLoaderDryRunResponse {
  manifestHash: string;
  manifest: AdminContentLoaderManifest;
  summary: {
    totalRecords: number;
    createCount: number;
    updateCount: number;
    conflictCount: number;
    invalidCount: number;
    advisorySuggestedCount: number;
    advisoryReviewCount: number;
    advisoryWarningCount: number;
  };
  results: AdminContentLoaderDryRunRecordResult[];
}

export type AdminContentLoaderVerificationStatus = 'checked' | 'failed' | 'skipped';

export interface AdminContentLoaderVerification {
  status: AdminContentLoaderVerificationStatus;
  checkedUrl?: string | null;
  resourceType?: string | null;
  hasMetadata: boolean;
  notes: string[];
}

export type AdminContentLoaderEnrichmentSource = 'metadata' | 'deterministic' | 'ai';

export interface AdminContentLoaderEnrichmentPatch {
  field: string;
  operation: 'set' | 'merge';
  source: AdminContentLoaderEnrichmentSource;
  value: unknown;
  /** Current stored value this patch would replace, for a before→after review. Set patches only. */
  currentValue?: string | null;
  reason: string;
  confidence?: number | null;
}

export interface AdminContentLoaderEnrichRowResult extends AdminContentLoaderDryRunRecordResult {
  verification: AdminContentLoaderVerification;
  patches: AdminContentLoaderEnrichmentPatch[];
}

export interface AdminContentLoaderExecuteRequest {
  manifestText: string;
  expectedManifestHash?: string;
  selectedLocalIds?: string[];
  importVisibility?: 'inactive' | 'live';
  batchLabel?: string;
}

export interface AdminContentLoaderExecuteRowResult {
  localId: string;
  publishId: string;
  action: 'created' | 'updated';
  type: string;
  name: string;
  processingState: PostImportProcessingState;
  importedAssetCount?: number;
}

export interface AdminContentLoaderExecuteResponse {
  summary: {
    createdCount: number;
    updatedCount: number;
    relationCount: number;
    pendingProcessingCount: number;
    importedBannerCount: number;
    importedAttachmentCount: number;
    // Rows the content-safety gate held back from going live (flagged); they
    // land in the needs_review queue instead of publishing.
    heldForReviewCount: number;
    batchId: string;
  };
  dryRun: AdminContentLoaderDryRunResponse;
  results: AdminContentLoaderExecuteRowResult[];
}

export interface AdminContentLoaderUploadAssetRequest {
  ownerLocalId: string;
  kind: AdminContentLoaderAssetKind;
  filename: string;
  fileType: string;
  fileData: string;
}

export interface AdminContentLoaderUploadAssetResponse {
  asset: AdminContentLoaderManifestAsset;
}

// ---------------------------------------------------------------------------
// Content Source importer — external-source connectors + staging drafts.
// Agents (Claude Code via MCP, or an in-app assistant) pull candidate content
// from external sources, accumulate it in a draft, then promote the draft to a
// normal content-loader manifest that rides the existing dry-run/enrich/approve
// pipeline. Nothing publishes without admin review.
// ---------------------------------------------------------------------------

export type ContentSourceKind = 'itunes' | 'podcastindex' | 'feed' | 'url';

/**
 * A normalized, manifest-ready candidate emitted by a source connector.
 * Promotes into an AdminContentLoaderManifestRecord (published: false).
 */
export interface ContentSourceCandidate {
  source: ContentSourceKind;
  /** Stable per-source reference (feed url, itunes collection id, etc). */
  sourceRef?: string | null;
  name: string;
  description?: string | null;
  /** Canonical URL — website, feed, or channel. */
  url?: string | null;
  /** website | podcast | feed | yt_channel | app | ... */
  resourceKind?: string | null;
  imageSrc?: string | null;
  provider?: string | null;
  suggestedCategories?: string[];
  suggestedUseCriteria?: string[];
  /** Raw source payload, retained for debugging/enrichment. */
  raw?: Record<string, any> | null;
}

export interface AdminContentSourceSearchPodcastsRequest {
  term: string;
  provider?: ContentSourceKind; // 'itunes' (default) | 'podcastindex'
  limit?: number;
  country?: string;
}

export interface AdminContentSourceSearchPodcastsResponse {
  provider: ContentSourceKind;
  candidates: ContentSourceCandidate[];
  warnings?: string[];
}

/**
 * Resolve a podcast's RSS feed from an Apple Podcasts show id (or, failing that,
 * a show name). Unlike the admin-only content-source connectors this is
 * available to any signed-in user, because it is what makes a saved
 * `podcasts.apple.com/…/id123` link repairable — those pages declare no feed.
 */
export interface PodcastFeedLookupRequest {
  /** Numeric Apple Podcasts collection id, as found in a podcasts.apple.com URL. */
  appleId?: string;
  /** Show name, used when there is no id to work from. */
  term?: string;
  limit?: number;
  country?: string;
}

export interface PodcastFeedLookupResponse {
  provider: ContentSourceKind;
  candidates: ContentSourceCandidate[];
  warnings?: string[];
}

export interface AdminContentSourceParseFeedRequest {
  feedUrl: string;
  maxItems?: number;
}

export interface AdminContentSourceParseFeedResponse {
  candidate: ContentSourceCandidate;
  recentItems: Array<{title: string; url?: string | null; publishedAt?: string | null}>;
}

export interface AdminContentSourceFetchUrlsRequest {
  urls: string[];
}

export interface AdminContentSourceFetchUrlsResponse {
  candidates: ContentSourceCandidate[];
  errors: Array<{url: string; error: string}>;
}

export interface AdminContentSourceDraftSummary {
  draftId: string;
  label: string | null;
  status: string;
  candidateCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdminContentSourceDraft extends AdminContentSourceDraftSummary {
  candidates: ContentSourceCandidate[];
}

export interface AdminContentSourceCreateDraftRequest {
  label?: string;
}

export interface AdminContentSourceCreateDraftResponse {
  draft: AdminContentSourceDraft;
}

export interface AdminContentSourceListDraftsResponse {
  drafts: AdminContentSourceDraftSummary[];
}

export interface AdminContentSourceGetDraftRequest {
  draftId: string;
}

export interface AdminContentSourceGetDraftResponse {
  draft: AdminContentSourceDraft;
}

export interface AdminContentSourceAppendCandidatesRequest {
  draftId: string;
  candidates: ContentSourceCandidate[];
  /** Default categories/useCriteria applied to candidates that lack their own. */
  defaults?: {categories?: string[]; useCriteria?: string[]};
}

export interface AdminContentSourceAppendCandidatesResponse {
  draft: AdminContentSourceDraft;
  addedCount: number;
  skippedDuplicateCount: number;
}

export interface AdminContentSourceRemoveCandidateRequest {
  draftId: string;
  /** Dedupe key of the candidate to remove (normalized url or source:ref). */
  candidateKey: string;
}

export interface AdminContentSourceRemoveCandidateResponse {
  draft: AdminContentSourceDraft;
}

export interface AdminContentSourcePromoteDraftRequest {
  draftId: string;
}

export interface AdminContentSourcePromoteDraftResponse {
  /** A content-loader manifest JSON string, ready for /admin/contentLoader/dryRun. */
  manifestText: string;
  recordCount: number;
}

// ---- Admin feed generation (AI-generated subscribable feeds) --------------
// See docs/guides/feed-content-standard.md §5/§6 for the post format and
// extraction modes this flow produces.

/** Source-strictness for AI feed generation (Standard §6). */
export type FeedExtractionMode = 'verbatim' | 'light_edit' | 'paraphrase';

/**
 * The shape of a generated post (Standard §5). Drives what the generator emits:
 * - `facts`   — 1–2 sentence intro + fact bullets (the default).
 * - `verse`   — one complete poem/song reproduced exactly, plus attribution.
 * - `passage` — one notable exact excerpt/quote, plus attribution.
 * `verse` and `passage` are always verbatim (extracted, never written) — the
 * body is sliced straight from the cited source, so there is nothing to invent.
 */
export type FeedPostType = 'facts' | 'verse' | 'passage';

/** Wikimedia + open-text projects the generator can source from, plus a generic URL fallback. */
export type FeedGenerationSourceKind = 'wikipedia' | 'wikisource' | 'wikiquote' | 'gutenberg' | 'url';

/** A source the generator may extract from — doubles as the admin input schema. */
export interface FeedGenerationSource {
  url: string;
  kind: FeedGenerationSourceKind;
  /** Wikipedia revision pin; recorded in provenance (resolved live when omitted). */
  revisionId?: number;
  licenseNote?: string;
}

/** A source after server-side fetch: pinned revision, retrieval date, banner candidate. */
export interface AdminFeedGenResolvedSource extends FeedGenerationSource {
  title?: string | null;
  /** Work author, parsed from source metadata (Wikisource header) — used for verse/passage attribution. */
  author?: string | null;
  /** Work/publication year, best-effort from source metadata — used for verse/passage attribution. */
  workYear?: string | null;
  retrievedAt: string;
  bannerImageSrc?: string | null;
  /** Characters of plaintext fetched (0 = fetch failed; see warnings). */
  textLength: number;
}

/** One planned post: which concept, from which resolved source(s). */
export interface AdminFeedGenConcept {
  /** Kebab-case slug — becomes the localId/easyId tail. */
  slug: string;
  title: string;
  /** URLs of the resolved sources this post extracts from (first = primary). */
  sourceUrls: string[];
  /** One line on what the post covers. */
  angle?: string;
  /** Auto-discovery: the Wikipedia search phrase the outline proposed for this concept. */
  searchQuery?: string;
}

/** A search hit from the source finder (Wikipedia / Wikisource / Wikiquote / Gutenberg). */
export interface AdminFeedGenSourceCandidate {
  url: string;
  kind: FeedGenerationSourceKind;
  title: string;
  snippet?: string;
}

export interface AdminFeedGenSearchSourcesRequest {
  query: string;
  kind: 'wikipedia' | 'wikisource' | 'wikiquote' | 'gutenberg';
  limit?: number;
}

export interface AdminFeedGenSearchSourcesResponse {
  candidates: AdminFeedGenSourceCandidate[];
}

export interface AdminFeedGenPlanRequest {
  /** Primary gen_* leaf, e.g. gen_weather. */
  topic: string;
  /** Series slug, e.g. foundations. */
  series: string;
  /** Human feed title, e.g. "Weather Foundations". */
  title: string;
  sources: FeedGenerationSource[];
  /** Desired number of posts (concepts) across the run. */
  postCount: number;
  /** minage_* appropriateness floor. */
  minAge: string;
  /** ta_* framing band(s). */
  audiences: string[];
  extractionMode: FeedExtractionMode;
  /** Post shape (facts / verse / passage). Verse & passage force verbatim extraction. Defaults to facts. */
  postType?: FeedPostType;
  /** Canonical gen_* category ids for the records. */
  categories: string[];
  /** Extra useCriteria tags (topic_* etc.) beyond the generated baseline. */
  extraUseCriteria?: string[];
  /** Editorial guidance folded into the AI prompts (outline + posts). */
  notes?: string;
  /** The creative brief — what this feed should be (e.g. "famous poetry classics for kids"). */
  directions?: string;
  /** Feed description; when omitted the outline proposes one (suggestedDescription). */
  description?: string;
  /** Allowlisted model override for this run (falls back to the admin AI config). */
  model?: string;
  /**
   * Let the outline propose concepts beyond the provided sources; the server
   * then searches Wikipedia per concept and fetches the top article. Sources
   * become optional when set.
   */
  autoDiscover?: boolean;
  /** Expand mode: easyId of an existing feed col — existing posts are excluded from the outline. */
  expandFeedEasyId?: string;
}

export interface AdminFeedGenPlanResponse {
  resolvedSources: AdminFeedGenResolvedSource[];
  concepts: AdminFeedGenConcept[];
  warnings: string[];
  /** LLM-proposed feed description (used when the request had none). */
  suggestedDescription?: string;
  /** LLM-proposed canonical gen_* category ids (validated server-side). */
  suggestedCategories?: string[];
}

export interface AdminFeedGenGeneratePostsRequest {
  topic: string;
  series: string;
  minAge: string;
  audiences: string[];
  extractionMode: FeedExtractionMode;
  /** Post shape (facts / verse / passage). Verse & passage force verbatim extraction. Defaults to facts. */
  postType?: FeedPostType;
  categories: string[];
  extraUseCriteria?: string[];
  /** Editorial guidance folded into the post-writing prompt. */
  notes?: string;
  /** The creative brief — echoed from the plan form. */
  directions?: string;
  /** Allowlisted model override for this run (falls back to the admin AI config). */
  model?: string;
  /** Echoed from the plan response (the server is stateless between calls). */
  resolvedSources: AdminFeedGenResolvedSource[];
  /** The batch to generate this call (server caps the batch size). */
  concepts: AdminFeedGenConcept[];
}

export interface AdminFeedGenPostFlag {
  localId: string;
  severity: 'error' | 'warning';
  /**
   * verbatim_mismatch = a generated line does not appear in the source (light_edit check);
   * unlocatable_excerpt = a verbatim anchor could not be found in the source text to slice.
   */
  kind: 'verbatim_mismatch' | 'unlocatable_excerpt' | 'format' | 'generation';
  message: string;
}

export interface AdminFeedGenGeneratePostsResponse {
  records: AdminContentLoaderManifestRecord[];
  flags: AdminFeedGenPostFlag[];
  warnings: string[];
}

/** Published feed cols with an easyId — the Expand-existing-feed picker. */
export interface AdminFeedGenListFeedsResponse {
  feeds: Array<{easyId: string; publishId: string; name: string; itemCount: number}>;
}

export interface AdminFeedGenLoadFeedRequest {
  easyId: string;
}

/** An existing feed parsed back into Generate-form fields (expand mode prefill). */
export interface AdminFeedGenLoadFeedResponse {
  feed: {
    easyId: string;
    publishId: string;
    title: string;
    description: string;
    /** Parsed from the official-feed-<topic>-<series>-v1 easyId pattern (best effort). */
    topic: string | null;
    series: string | null;
    categories: string[];
    minAge: string | null;
    audiences: string[];
    paceIntervalDays: number | null;
  };
  /** Current children in feed order; slugs guard against duplicate concepts. */
  existingPosts: Array<{easyId: string; slug: string; name: string}>;
}

export type AdminPublishedPackageAssetKind = 'banner_image' | 'published_attachment';

export interface AdminPublishedPackageAsset {
  assetId: string;
  ownerLocalId: string;
  ownerPublishedId?: string | null;
  kind: AdminPublishedPackageAssetKind;
  filename?: string | null;
  sourceRuntimeRef?: string | null;
  bundlePath?: string | null;
  byteSize?: number | null;
  checksumSha256?: string | null;
  attachmentId?: string | null;
  fileType?: string | null;
  meta?: Record<string, any> | null;
}

export interface AdminPublishedPackageAttachmentEntry {
  id?: string;
  type: 'file' | 'snapshot' | 'snip' | 'uri';
  filename?: string;
  fileType: string;
  fileId?: string;
  info?: Record<string, any>;
  meta?: Record<string, any>;
  previews?: Array<Record<string, any>>;
  encryptedInfo?: boolean;
  createDate?: number;
  assetId?: string | null;
}

export interface AdminPublishedPackageRecord {
  localId: string;
  publishId?: string | null;
  easyId?: string | null;
  sourceItemId?: string | null;
  type: string;
  subType?: string | null;
  name: string;
  description?: string | null;
  url?: string | null;
  categories?: string[];
  useCriteria?: string[];
  imageFilename?: string | null;
  imageAssetId?: string | null;
  published?: boolean | null;
  blockedAt?: string | null;
  blockContext?: Record<string, any> | null;
  visibilityCode?: number | null;
  curated?: boolean | null;
  curationStatus?: string | null;
  publishType?: string | null;
  publishConfig?: Record<string, any> | null;
  excludeFromSearch?: boolean | null;
  curatorComment?: string | null;
  availableAt?: string | null;
  data?: Record<string, any> | null;
  meta?: Record<string, any> | null;
  info?: Record<string, any> | null;
  sysInfo?: Record<string, any> | null;
  sourceInfo?: Record<string, any> | null;
  attachments?: AdminPublishedPackageAttachmentEntry[];
}

export interface AdminPublishedPackageRelation {
  parentLocalId: string;
  childLocalId: string;
  order?: number | null;
  details?: Record<string, any> | null;
  availableAt?: string | null;
}

export interface AdminPublishedPackageDataManifest {
  kind: 'published-package-data';
  packageVersion: 1 | 2;
  exportedAt: string;
  records: AdminPublishedPackageRecord[];
  relations: AdminPublishedPackageRelation[];
  assets: AdminPublishedPackageAsset[];
}

export interface AdminPublishedPackageExportRequest {
  publishedIds: string[];
  includeChildren?: boolean;
}

export interface AdminPublishedPackageExportResponse {
  manifest: AdminPublishedPackageDataManifest;
  bundleBase64?: string | null;
  bundleFileName?: string | null;
  bundleMimeType?: string | null;
  summary: {
    requestedCount: number;
    recordCount: number;
    relationCount: number;
    assetCount: number;
    childInclusionCount: number;
  };
  warnings: string[];
}

export interface AdminPublishedPackageImportRequest {
  packageText?: string;
  packageDataBase64?: string;
  packageFileName?: string | null;
  dryRun?: boolean;
  importVisibility?: 'inactive' | 'preserve';
  batchLabel?: string;
  /**
   * When true (the default), records that match an existing published item (by publishId,
   * easyId, sourceItemId, or normalized url) are skipped instead of overwriting it. Set false to
   * update the existing rows in place (the legacy upsert behavior) for an intentional re-import.
   */
  skipDuplicates?: boolean;
}

export interface AdminPublishedPackageImportRowResult {
  localId: string;
  publishId: string | null;
  action: 'created' | 'updated' | 'skipped';
  type: string;
  name: string;
  importedAssetCount: number;
  existingName?: string | null;
}

export interface AdminPublishedPackageImportResponse {
  manifest: AdminPublishedPackageDataManifest;
  dryRun?: boolean;
  batchId?: string | null;
  summary: {
    createdCount: number;
    updatedCount: number;
    relationCount: number;
    relationDeletedCount: number;
    importedBannerCount: number;
    importedAttachmentCount: number;
    pendingBannerAssetCount?: number;
    pendingAttachmentCount?: number;
    skippedRelationCount: number;
    // Duplicate rows skipped instead of overwritten (when skipDuplicates is on).
    skippedDuplicateCount?: number;
    // Rows the content-safety gate held back from going live (flagged).
    heldForReviewCount?: number;
  };
  results: AdminPublishedPackageImportRowResult[];
  warnings: string[];
}

export interface AdminPublishedEnrichRequest {
  itemIds: string[];
  /**
   * 'source' pulls fresh title/description/image from the origin URL only (no AI),
   * surfacing overwrites of existing values. 'ai' (default) also runs AI category /
   * use-criteria gap-fill on blank fields.
   */
  mode?: 'ai' | 'source';
  /**
   * When true (AI mode only), also ask AI to rewrite/clean up the title and
   * description, surfaced as reviewable overwrite patches. Off by default.
   */
  aiCleanupText?: boolean;
}

export interface AdminPublishedEnrichItemResult {
  itemId: string;
  name: string;
  verification: AdminContentLoaderVerification;
  patches: AdminContentLoaderEnrichmentPatch[];
  /** Live image URL fetched from the source, shown in review even when unchanged. */
  sourceImageUrl?: string | null;
}

export interface AdminPublishedEnrichResponse {
  summary: {
    requestedCount: number;
    enrichedCount: number;
    patchCount: number;
  };
  results: AdminPublishedEnrichItemResult[];
}

export interface AdminPublishedApplyPatchesRequest {
  itemId: string;
  patches: AdminContentLoaderEnrichmentPatch[];
  markState?: PostImportProcessingState;
}

export interface AdminPublishedApplyPatchesResponse {
  itemId: string;
  appliedCount: number;
  item: Published;
}

export interface AdminPublishedImportBatchesRequest {
  limit?: number;
}

export interface AdminPublishedImportBatchSummary {
  batchId: string;
  batchLabel: string | null;
  batchSource: string | null;
  importedAt: string | null;
  total: number;
  stateCounts: Record<string, number>;
  publishedCount: number;
}

export interface AdminPublishedImportBatchesResponse {
  batches: AdminPublishedImportBatchSummary[];
}

export interface AdminPublishedApproveBatchRequest {
  batchId?: string;
  itemIds?: string[];
  /**
   * Publish even if the item hasn't finished metadata processing (bypasses the
   * "not ready" gate). This is the "Publish anyway" escape hatch.
   */
  force?: boolean;
  /**
   * Publish even if the content-safety gate flags the item. Requires an explicit
   * admin confirm; the flag is still recorded in moderation reporting.
   */
  overrideSafety?: boolean;
}

export interface AdminPublishedApproveBatchResponse {
  approvedCount: number;
  skippedBlockedCount: number;
  skippedNotReadyCount: number;
  // Items held back by the content-safety gate (flagged at/above threshold);
  // they stay in the needs_review queue instead of going live.
  skippedFlaggedCount: number;
  // Flagged items published anyway because overrideSafety was set.
  safetyOverriddenCount?: number;
  // Per-item safety-flag details for items skipped this call, so the client can
  // show the reason and offer "publish flagged content anyway".
  flaggedItems?: Array<{itemId: string; reason: string}>;
  itemIds: string[];
}

export interface AdminPublishedModerationReport {
  _id?: number;
  category?: string;
  adminStatus?: string | null;
  createdAt?: Date | string;
  details?: Record<string, any> | null;
}

export interface AdminPublishedInfoResponse {
  published: Published | null;
  children: Published[];
  moderationReport: AdminPublishedModerationReport | null;
}

export interface AdminPublishedChangeTypeRequest {
  itemId: string;
  type: string;
  subType?: string | null;
}

export interface AdminPublishedChangeTypeResponse {
  type: string;
  subType: string | null;
}

export interface AdminPublishedReplaceImageRequest {
  itemId: string;
  imageData: string;
  // Provenance: the generator source name when the image came from the enhancer
  // (generate/enhance/inpaint). Omitted for a plain manual upload.
  imageSource?: string;
}

export interface AdminPublishedReplaceImageResponse {
  imageFilename: string;
}

// Assign an existing banner-library image to a published item (copies the bytes).
export interface AdminPublishedAssignBannerImageRequest {
  itemId: string;
  bannerId: string;
}

export interface AdminPublishedDeleteRequest {
  itemId: string;
}

export interface AdminPublishedDeleteResponse {
  deleted: boolean;
}

export type AdminPublishedProcessAction = 'reload_metadata' | 'verify_source';

export interface AdminPublishedProcessRequest {
  itemIds: string[];
  action: AdminPublishedProcessAction;
}

export interface AdminPublishedProcessRowResult {
  itemId: string;
  status: 'processed' | 'failed' | 'skipped';
  state: PostImportProcessingState;
  message: string;
  processedUrl?: string | null;
}

export interface AdminPublishedProcessResponse {
  summary: {
    requestedCount: number;
    processedCount: number;
    failedCount: number;
    skippedCount: number;
  };
  results: AdminPublishedProcessRowResult[];
}

export interface GetItemByPubOrSubIdRequest {
  pubId?: string;
  subId?: string;
}

export interface AddSubscriptionRequest {
  refId: string;
  refType: string;
  userId?: string;
  data?: any;
  encInfo?: any;
}

export interface EditSubscriptionRequest {
  subscriptionId: string;
  data?: any;
  encInfo?: any;
}

export interface ListSubscriptionsForUserRequest {
  userId?: string;
  targetUserId?: string;
}

export interface ListSubscriptionsForRefRequest {
  refId: string;
  refType: string;
}

// RefState (generic encrypted/plaintext state storage)
export type RefStateOwnerType = 'user' | 'account' | 'session';
export type RefStateRefType = 'item' | 'post' | 'feed_item' | 'app_global' | 'device-guard' | 'agent-changeset' | 'job';

export type RefStateEntry = {
  _id: string;
  refType: RefStateRefType;
  refId: string;
  ownerType: RefStateOwnerType;
  ownerId: string;
  stateKey: string;
  stateSubKey?: string | null;
  data?: any;
  encrypted?: boolean;
  encInfo?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type RefStateUpsertRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey: string;
  stateSubKey?: string | null;
  data?: any;
  ownerId?: string;
  /**
   * Write only if the stored row is still end-to-end encrypted; otherwise change nothing and return
   * the stored row. For a one-time rewrite of an old encrypted row as readable (DCP-5), so the
   * rewrite can never overwrite a newer readable save. Honoured for `device-guard` `appPolicy`.
   */
  onlyIfEncrypted?: boolean;
};

export type SiteStyleListRequest = {
  userId?: string | null;
  userType?: string | null;
};

export type SiteStyleListResponse = {
  success: boolean;
  items: Array<{
    itemId: string;
    itemName: string;
    itemUrl: string | null;
    entries: Array<SiteStyleEntryV1 & { enabled: boolean; locked: boolean; surfaces: string[] }>;
  }>;
  settings: Record<string, boolean>;
  locks: Record<string, boolean>;
};

export type SiteStyleReportMatchRequest = {
  styleId: string;
  hostname: string;
  total: number;
  matched: number;
  unsupported: number;
  matchRate: number | null;
  deadSamples: string[];
};

export type SiteStyleReportMatchResponse = { success: boolean };

export type SiteStyleMatchReportsRequest = Record<string, never>;

export type SiteStyleMatchReportsResponse = {
  success: boolean;
  reports: Array<{
    styleId: string;
    hostname: string;
    matchRate: number | null;
    matched: number;
    total: number;
    unsupported: number;
    deadSamples: string[];
    updatedAt: number;
  }>;
};

export type SiteStyleSaveEntryRequest = {
  itemId: string;
  entryId: string;
  label?: string;
  css: string;
  category?: 'safety' | 'usability';
  surface?: 'all' | 'mobile' | 'desktop';
  source?: 'manual' | 'agent';
  allowBrittle?: boolean;
};

export type SiteStyleSaveEntryResponse = {
  success: boolean;
  issues?: Array<{ selector: string; rule: string; detail: string }>;
  error?: string;
};

export type SiteStyleRevertEntryRequest = {
  itemId: string;
  entryId: string;
  surface?: 'all' | 'mobile' | 'desktop';
  toVersion: number;
};

export type SiteStyleRevertEntryResponse = { success: boolean; error?: string };

export type SiteStyleGenerateRequest = {
  outline: {
    url: string;
    title?: string;
    landmarks?: Array<{ role?: string; label?: string; tag?: string; textPreview?: string }>;
  };
  instructions?: string;
};

export type SiteStyleGenerateResponse = {
  success: boolean;
  ok: boolean;
  css: string;
  label: string;
  rationale?: string;
  issues: Array<{ selector: string; rule: string; detail: string }>;
  error?: string;
};

export type SiteStyleForUrlRequest = { url: string };

export type SiteStyleForUrlResponse = {
  success: boolean;
  entries: SiteStyleEntryV1[];
};

export type RefStateUpsertResponse = { entry: RefStateEntry };

export type RefStateListRequest = {
  refType: RefStateRefType;
  /** Single-ref read. Required unless `refIds` is supplied. */
  refId?: string;
  /**
   * Batch read, capped at 200 ids server-side. Mutually exclusive with `refId`.
   * Entries carry their own `refId`, so callers group the results themselves.
   * Ids the caller cannot access are omitted from the response rather than
   * failing the request — one stale id must not blank a whole page.
   */
  refIds?: string[];
  stateKey?: string;
  stateSubKey?: string | null;
  /**
   * Inclusive lexicographic bounds on `stateSubKey`. Callers that key subkeys on
   * a fixed-width number (e.g. `occ:<epochMs>`) can select a real range this way
   * instead of paging "the most recent N" and silently losing older rows.
   */
  stateSubKeyGte?: string;
  stateSubKeyLte?: string;
  limit?: number;
  /** Single-ref path only (rows ordered `updatedAt` desc). */
  cursorUpdatedAt?: string;
  /** Batch path only (rows ordered `refId` asc, then `stateSubKey` asc). */
  cursorRefId?: string;
  cursorStateSubKey?: string;
  ownerId?: string;
};

export type RefStateListResponse = {
  entries: RefStateEntry[];
  nextCursorUpdatedAt?: string;
  nextCursorRefId?: string;
  nextCursorStateSubKey?: string;
};

export type RefStateDeleteRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey: string;
  stateSubKey?: string | null;
  ownerId?: string;
};

export type RefStateDeleteResponse = { deletedCount: number };

export type FamilyPolicyRuleUpsertRequest = {
  _id?: string;
  data: StoredFamilyPolicyRule;
  encInfo?: EncInfo | null;
};

export type FamilyPolicyRuleUpsertResponse = {
  entry: FamilyPolicyRuleRecord;
};

export type FamilyPolicyRuleListRequest = {};

export type FamilyPolicyRuleListResponse = {
  entries: FamilyPolicyRuleRecord[];
};

export type FamilyPolicyRuleDeleteRequest = {
  ruleId: string;
};

export type FamilyPolicyRuleDeleteResponse = {
  deleted: boolean;
};

// Artifacts (local-first, sync via RefState)
// Artifacts are stored per ref (typically an item) and are namespaced by (artifactType, artifactKey)
// so new item subtypes (ebooks, podcasts, videos, games, todos, feeds) can persist state cleanly.
export type ArtifactRefType = 'item' | 'app_global';

export type ArtifactEntry = {
  _id: string;
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
  data?: any;
  createdAt?: string;
  updatedAt?: string;

  // Client-local bookkeeping (not stored on server)
  dirty?: boolean;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
};

export type ArtifactUpsertRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
  data?: any;
  sync?: boolean;
};

export type ArtifactUpsertResponse = {
  entry: ArtifactEntry;
  synced?: boolean;
};

export type ArtifactGetRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
  forceRemote?: boolean;
};

export type ArtifactGetResponse = {
  entry: ArtifactEntry | null;
};

export type ArtifactListRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType?: string;
  forceRemote?: boolean;
};

export type ArtifactListResponse = {
  entries: ArtifactEntry[];
};

export type ArtifactDeleteRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
};

export type ArtifactDeleteResponse = {
  deletedCount: number;
};

export type ArtifactSyncPendingRequest = {
  limit?: number;
};

export type ArtifactSyncPendingResponse = {
  attempted: number;
  synced: number;
  failed: number;
};

export interface AccountInfoResponse {
  _id: string;
  accountType: AccountType;
  subscriptionInfo?: any;
  sysOptions?: SystemOptions;
  options?: any;
}





export interface UserPreferences {
  [key: string]: unknown;
}

export type GetUserPrefsResponse = UserPreferences;

export type UserSettingsCopyGroup = 'contentFiltering' | 'usageLimits' | 'websiteSettings';

export type UserSettingsCopySourceSnapshot = {
  optionsPatch?: Record<string, unknown>;
  preferenceUpdates?: Record<string, unknown>;
};

export interface CopyUserSettingsRequest {
  sourceUserId: string;
  targetUserId: string;
  groups: UserSettingsCopyGroup[];
}

export interface CopyUserSettingsResponse {
  targetUserId: string;
  sourceUserId: string;
  appliedGroups: UserSettingsCopyGroup[];
  appliedSnapshot: Partial<Record<UserSettingsCopyGroup, UserSettingsCopySourceSnapshot>>;
}

export interface SendManagedClientDebugToastRequest {
  userId?: string;
  clientIds?: string[];
  encryptedPayload: string;
}

export interface SendManagedClientDebugToastResponse {
  targetUserId: string;
  deliveredClientIds: string[];
  skippedTargets: Array<{
    clientId: string;
    reason: 'offline' | 'unsupported' | 'unknown-client';
  }>;
}

export interface QueueManagedRemoteActionRequest {
  userId?: string;
  clientId: string;
  kind: 'openUrl' | 'forceSyncSettings' | 'syncActivity' | 'getScreenshot';
  encryptedPayload: string;
}

export interface QueueManagedRemoteActionResponse {
  action: ManagedRemoteActionCommandView;
  deliveredClientIds: string[];
  skippedTargets: Array<{
    clientId: string;
    reason: 'offline' | 'unsupported' | 'unknown-client';
  }>;
}

export interface GetManagedRemoteActionStatusRequest {
  actionId: string;
}

export interface GetManagedRemoteActionStatusResponse {
  action: ManagedRemoteActionCommandView | null;
}

export interface AckManagedRemoteActionRequest {
  actionId: string;
  status: 'completed' | 'failed';
  errorMessage?: string;
  screenshotDataUrl?: string;
}

export interface AckManagedRemoteActionResponse {
  action: ManagedRemoteActionCommandView;
}

export interface StartLiveViewRequest {
  /** Children whose devices are listed. */
  userIds: string[];
  cadenceMs?: number;
  /**
   * The ONE device to watch. Omitted lists the child's devices and captures nothing at all —
   * a guardian picks a screen, and only that screen is captured and sent. Watching every device
   * a child owns at once spent their battery and our bandwidth on pictures nobody asked to see.
   */
  clientId?: string;
}

export interface StartLiveViewResponse {
  session: LiveViewSessionView;
  devices: LiveViewDeviceView[];
}

export interface GetLiveViewFramesRequest {
  sessionId: string;
  /** Narrow to one device for the focused view; omit for the whole grid. */
  clientId?: string;
  cadenceMs?: number;
}

export interface GetLiveViewFramesResponse {
  session: LiveViewSessionView;
  devices: LiveViewDeviceView[];
}

export interface StopLiveViewRequest {
  sessionId: string;
}

export interface StopLiveViewResponse {
  stopped: boolean;
}

export interface PushLiveViewFrameRequest {
  frameId: string;
  kind: LiveViewFrameKind;
  width: number;
  height: number;
  encryptedFrame: string;
}

export interface PushLiveViewFrameResponse {
  /** The child's only stop signal. False means: clear the capture loop now. */
  keepGoing: boolean;
  cadenceMs: number;
}

export interface RequestActivitySyncAllRequest {
  userId: string;
  encryptedPayload: string;
}

export interface RequestActivitySyncAllResponse {
  actions: Array<{
    actionId: string;
    clientId: string;
    deviceName?: string | null;
    status: 'sent';
  }>;
  skippedTargets: Array<{
    clientId: string;
    reason: 'offline' | 'unsupported' | 'unknown-client';
  }>;
}




export type ProfileImageUpdateData =
  | string
  | { type: 'path'; data: string }
  | { type: 'base64'; data: string }
  | { type: 'data'; data: any }
  | Record<string, any>;

export interface UpdateProfileImageRequest {
  imageData: ProfileImageUpdateData;
  userId?: string;
}

export interface UpdatePublicProfileRequest {
  username?: string;
  fullName?: string;
  enabled?: boolean;
  about?: string;
  profileImage?: {
    type: string;
    filename: string;
  };
}

export interface MiscNotificationStats {
  unreadCount: number;
  unreadFeedCount: number;
}

export interface FriendListResponse {
  friends: Array<{
    userId: string;
    _id?: string;
    username?: string;
    displayedName?: string;
    email?: string;
    profileImage?: any;
    friendshipCreatedAt?: string;
  }>;

  requestedOutBound: Array<{
    userId: string;
    inviteCode?: string;
    username?: string;
    displayedName?: string;
    email?: string;
    profileImage?: any;
    createdAt?: string;
    expiresAt?: string;
  }>;

  requestedInBound: Array<{
    userId: string;
    username?: string;
    displayedName?: string;
    email?: string;
    profileImage?: any;
    createdAt?: string;
  }>;
}


export interface FriendTakeActionRequest {
  requestId?: string;
  friendUserId?: string;
  action: 'accept' | 'reject' | 'remove' | 'confirm' | 'deny' | 'cancel';
  userId?: string;
}

/** Request with userId - client caching options passed separately */
export interface UserScopedRequest {
  userId?: string;
}

/** Request with itemId and optional userId */
export interface ItemScopedRequest {
  itemId: string;
  userId?: string;
}


export interface GetLoggedInfoForItemIdRequest {
  itemId: string;
  targetUserId?: string;
}

export interface RefreshItemMetaRequest {
  itemIds: string[];
  updateSubType?: boolean;
}

export interface SimilarItemsByURLRequest {
  url: string;
  itemId?: string;
  needOwnerUserType?: boolean;
  targetUserId?: string;
}

export interface ListItemsByFilterRequest {
  filter?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchItemsRequest {
  searchTerm: string;
  userId?: string;
}
export interface UpdateItemFeedbackRequest {
  itemId: string;
  attr?: string;
  value?: number | boolean;
}
export interface GetItemInfoById {
  itemId: string;
  userId?: string;
  includeUserPermissions?: boolean;
  includeFeedback?: boolean;
}
//{ userId?: string; collectionId: string; includeUserPermissions?: boolean; includeFeedback?: boolean }

export interface ListItemsWithInfoByUserRequest {
  collectionId: string;
  userId?: string;
  typeFilter?: string;
}


export interface AddItemAttachmentRequest {
  itemId: string;
  attachment: {
    type: string;
    url?: string;
    fileId?: string;
    data?: Record<string, any>;
  };
}


export interface SignInRequest {
  username?: string;
  password?: string;
  loginType?: string;
  loginPayload?: any;
  recaptchaToken?: string;
  clientInfoData?: ClientInfoView;
}

export interface RegisterRequest {
  username: string;
  displayedName?: string;
  email: string;
  type: UserType;
  loginType?: string;
  loginPayload?: any;
  serverCopyOfPassword?: string;
  password?: string;
  inviteVerification?: {
    code: string | null;
  };
  refData?: {
    inviteCode: string | null;
    accessToken?: string;
    sessionToken?: string;
  };
  recaptchaToken?: string;
  /** If true, skip automatic server backup of encryption key - user will use passkey instead */
  deferEncryptionBackup?: boolean;
}

export interface SavePipelineResultsRequest {
  id?: string;
  url: string;
  userId: string;
  results?: any;
  metadata?: any;
}

export interface SwitchUserRequest {
  userId: string;
  pinpass?: string;
  clientInfo?: ClientInfoView;
}



export interface UpdateUserInfoRequest {
  userId?: string;
  data: {
    displayedName?: string;
    email?: string;
    avatar?: string;
    /**
     * Date of birth, in the shape it is stored in. Admin-only on the server: it drives
     * age-based restrictions, so a restricted user who could write their own would be
     * setting their own screen-time tier. Children created before SL-169 have none at
     * all, and had no way to be given one (UX-028).
     */
    dob?: DateOfBirth;
  };
}


export interface CreateUserRequest {
  username: string;
  displayedName?: string;
  email: string;
  type: UserType;
  localUser?: boolean;
  loginType?: string;
  loginPayload?: any;
  serverCopyOfPassword?: string;
  password?: string;
  inviteVerification?: {
    code: string | null;
  };
  refData?: {
    inviteCode: string | null;
    accessToken?: string;
    sessionToken?: string;
  };
  recaptchaToken?: string;
  /**
   * Extra profile fields the server folds in at creation. `birthYear` is what
   * becomes the stored `dob` (with `birthMonth`, defaulting server-side to 12) —
   * without it a child has no date of birth and every age-based recommendation
   * silently has nothing to work from.
   */
  otherSettings?: {
    birthYear?: number;
    birthMonth?: number;
  };
}


export type PluginListResponse = PluginInfo[];

export interface InviteCreateRequest {
  inviteData: {
    email: string;
    inviterName: string;
    message: string;
    type?: string;
  };
}


export interface PermissionOverrideRequest {
  // Admin user id to verify PIN/password for.
  overrideUserId: string;
  pinpass: string;
  password?: string;
  pin?: string;
}


export interface GetRankedMatchesForURLRequest {
  url: string;
  itemId?: string;
  targetUserId?: string;
}



export interface CreatePageSnapshotRequest {
  itemId: string;
  snapshot: any;
}


export interface FileUploadRequest {
  ufId?: string;        // If updating existing file (optional)
  refId: string;        // What this file belongs to (itemId, postId, etc)
  refType: string;      // Type of reference: 'item', 'post', 'profile', etc

  filename: string;     // Original filename
  fileType: string;     // MIME type
  fileData: string;     // Base64 encoded file content

  previews?: FilePreview[];     // Optional thumbnails/previews
  encInfo?: EncInfo | null;     // Encryption info if encrypted
  secure?: boolean;             // If true, file will be uploaded to secure storage
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

// One definition, in types/activity.types.ts. A second copy lived here until 2026-09-02 and
// had already drifted (no checkpointNote, no emailSender fields, no item fields), so which
// fields a component could see depended on which module it happened to import from.
import type { AccessRequestDetails } from '../types/activity.types';
export type { AccessRequestDetails };

// ============================================================================
// MISSING API REQUEST/RESPONSE TYPES
// ============================================================================

// User-related requests
export interface GetMiscStatsRequest {
  userId?: string;
}

export interface GetAccountInfoRequest {
  userId?: string;
}

export interface ListAccountUsersRequest {
  userId?: string;
}

export interface GetUserInfoRequest {
  userId: string;
}




export interface GetUserPrefValueRequest {
  key: string;
  userId?: string;
}

export interface TokenLoginRequest {
  token: string;
  clientInfoData?: ClientInfoView;
}

export interface DesktopAuthHandoffCreateResponse {
  tokenData: TokenData;
}

export interface ResetPasswordRequest {
  email?: string;
  token?: string;
  newPassword?: string;
}

export interface UpdatePasswordRequest {
  password: string;
  passwordCopy: string;
  userId?: string;
}

export interface UpdatePINRequest {
  userId: string;
  pin: string;
}

export interface GetUserOptionsRequest {
  userId?: string;
}

export interface ListTaskOccurrencesByRangeRequest {
  userId: string;
  startMs: number;
  endMs: number;
  nowMs?: number;
  includeCompleted?: boolean;
}

export interface ListTaskOccurrencesByRangeResponse {
  nowMs: number;
  occurrences: TaskOccurrenceView[];
}



export interface RefreshServerSettingsRequest {
  [key: string]: any;
}

export interface GetServerSettingsRequest {
  [key: string]: any;
}

/** What the device has stored, unresolved -- null apiURL means "use the built-in server". */
export interface ServerSettingsView {
  apiURL?: string | null;
  isCustomServer?: boolean;
  syncMode?: 'online-only' | 'offline-first';
}

export interface UpdateServerSettingsRequest {
  serverSettings: {
    apiURL: string | null;
    isCustomServer: boolean;
  };
}

export interface DiscoverServersRequest {
  /**
   * A private /24 to sweep, e.g. '192.168.1.'. Omitted or null means this machine and any named
   * box only -- the sweep is hundreds of requests and is never implied.
   */
  subnetPrefix?: string | null;
}

export interface DiscoveredServerView {
  /** Ready to store as the custom server address -- API version segment included. */
  apiURL: string;
  origin: string;
  source: 'localhost' | 'hostname' | 'lan';
  serverVersion?: string;
  latencyMs: number;
}

export interface DiscoverServersResponse {
  servers: DiscoveredServerView[];
  /** The subnet actually swept, or null when only this machine was checked. */
  scannedSubnet: string | null;
}

export interface CheckServerUrlRequest {
  apiURL: string;
}

export interface CheckServerUrlResponse {
  reachable: boolean;
  serverVersion?: string;
  origin?: string;
  /** The address that was actually tested -- normalized to the versioned API base. */
  apiURL?: string;
  /** A personal box says who it is (BOX-1/3): the `.local` name it announced, and its own authority's SHA-256. */
  boxName?: string;
  boxCaSha256?: string;
}


// Item-related requests
export interface CreateCollectionRequest {
  details: Partial<Item>;
  options?: {
    collectionIds?: string[];
    permList?: any[];
    customPermissions?: boolean;
    skipNotifications?: boolean;
  };
}

export interface SaveItemResponse {
  itemId: string;
  encInfo?: any;
  feedback?: ItemFeedbackView;
}

export interface ListPermissionsAndReactionsResponse {
  permissions: PermissionWithUser[];
  reactions: ItemReaction[];
}

export interface GetArchivedItemsRequest {
  userId?: string;
}

export interface GetHiddenItemsRequest {
  userId?: string;
}

export interface GetUncategorizedItemsRequest {
  userId?: string;
}

export interface ListLibraryRootRequest {
  userId?: string;
  includeUserPermissions?: boolean;
  limit?: number;
}

export interface GetItemPathTreeRequest {
  itemId: string;
  userId?: string;
}

export interface GetItemParentsRequest {
  itemId: string;
  userId?: string;
  includePath?: boolean;
}

export interface ListSharedWithUserRequest {
  userId?: string;
  sharedByUserId?: string;
}

export interface ListSharedByUserRequest {
  userId?: string;
}

export interface ListRecentAccessibleByUserRequest {
  userId?: string;
  limit?: number;
}

export interface ListCommentsRequest {
  refId: string;
  refType: 'post' | 'item';
}

export interface ListFilesByRefRequest {
  refId: string;
  refType: string;
}

export interface RediscoverQueueRequest {
  timeFrameDays?: number,
  showReadLater?: boolean,
  showCollections?: boolean,
}

export interface LibraryCleanupCandidatesRequest {
  limit?: number,
  minItemAgeDays?: number,
  minSinceTouchedDays?: number,
  includeCollections?: boolean,
  includeReadLater?: boolean,
  includeStarred?: boolean,
  onlyKept?: boolean,
}

/** One exact canonical-URL duplicate set surfaced by the stable cleanup flow. */
export interface LibraryDuplicateGroup {
  key: string;
  items: ItemInfoView[];
  recommendedSurvivorId: string;
  supported: boolean;
  unsupportedReason?: string;
}

export interface LibraryDuplicateCandidatesRequest {
  includeArchived?: boolean;
  /** Groups per page. Defaults to 20; the detector always scans the whole library. */
  limit?: number;
  /** Zero-based index of the first group on the requested page. */
  offset?: number;
}

export interface LibraryDuplicateCandidatesResponse {
  groups: LibraryDuplicateGroup[];
  totalGroups: number;
  /** True when groups exist beyond this page. */
  truncated: boolean;
  /** The page actually returned, which is clamped into range when the caller overshoots. */
  offset: number;
  limit: number;
}

export interface MergeLibraryDuplicatesRequest {
  survivorItemId: string;
  duplicateItemIds: string[];
  /**
   * The client can read plaintext item content; the server often cannot. The encryption
   * request wrapper encrypts these unioned details before they cross the wire.
   */
  mergedDetails?: Partial<Item>;
}

export interface MergeLibraryDuplicatesResponse {
  survivorItemId: string;
  /** Everything the caller should now treat as gone, including copies removed by an earlier merge. */
  removedItemIds: string[];
  /**
   * The subset that was already absent server-side. A client whose local index still lists them
   * prunes them from this, rather than re-offering a group that can never merge.
   */
  alreadyGoneItemIds?: string[];
  mergedCollectionIds: string[];
  permissionCount: number;
  feedbackCount: number;
}

export interface ReadLaterFeedRequest {
  limit?: number,
  showCollections?: boolean,
  hideArchived?: boolean,
  hideHidden?: boolean,
  includeSnoozed?: boolean,
}

// Text Embedding Service API Types
export interface GenerateEmbeddingRequest {
  text: string;
  options?: {
    normalize?: boolean;
    pooling?: 'mean' | 'cls';
    useFallback?: boolean;
  };
}

export interface GenerateEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  cached?: boolean;
  error?: string;
}

export interface BatchEmbeddingsRequest {
  texts: Array<{ id: string; text: string }>;
  options?: {
    normalize?: boolean;
    pooling?: 'mean' | 'cls';
    useFallback?: boolean;
  };
}

export interface BatchEmbeddingsResponse {
  results: Array<{
    id: string;
    embedding: number[];
    dimensions: number;
    model: string;
    cached?: boolean;
    error?: string;
  }>;
}

export interface FindSimilarRequest {
  queryText: string;
  candidates: Array<{
    id: string;
    text: string;
    embedding?: number[];
  }>;
  topK?: number;
}

export interface FindSimilarResponse {
  results: Array<{
    id: string;
    score: number;
    text?: string;
  }>;
}

// Server-side Embedding Vector Cache API Types
//
// DORMANT / encryption-only: this cache has no client caller yet. By design the server stores
// ONLY encrypted vectors — the plaintext `number[]` never leaves the device. The future client
// caller must, per item, AES-GCM-encrypt the vector (recommended: JSON.stringify the number[]
// and encrypt as a single blob, NOT element-wise) and attach the `encInfo` needed to decrypt.
// Contract: namespace='item', cacheKey=itemId (already server-known; more private than a content
// hash), explicit `dimensions`, and chunk puts to MAX_PUT_ITEMS (500) / gets to MAX_GET_KEYS (2000).

/** An embedding vector encrypted client-side. The server treats this as an opaque blob. */
export interface EncryptedEmbeddingBlob {
  encryptedData: string;
  iv: string;
}

export interface EmbeddingCacheGetRequest {
  modelId: string;
  namespace?: string;
  cacheKeys: string[];
}

export interface EmbeddingCacheGetResponse {
  items: Array<{
    cacheKey: string;
    embedding: EncryptedEmbeddingBlob;
    dimensions: number;
    /** Decryption metadata (wrapped key + iv); shape matches the client EncInfo. */
    encInfo: unknown;
    encrypted: true;
    updatedAt: string;
  }>;
}

export interface EmbeddingCachePutRequest {
  modelId: string;
  namespace?: string;
  items: Array<{
    cacheKey: string;
    embedding: EncryptedEmbeddingBlob;
    dimensions: number;
    encInfo: unknown;
    encrypted: true;
  }>;
}

export interface EmbeddingCachePutResponse {
  stored: number;
}

export interface EmbeddingCacheStatsRequest {
  modelId?: string;
  namespace?: string;
}

export interface EmbeddingCacheStatsResponse {
  totalEntries: number;
  byModelId: Record<string, number>;
  byNamespace: Record<string, number>;
}

export interface EmbeddingCacheClearRequest {
  modelId?: string;
  namespace?: string;
}

export interface EmbeddingCacheClearResponse {
  deleted: number;
}

export interface EmbeddingSuggestCollectionsRequest {
  itemText: string;
  userId?: string;
  topK?: number;
}

export interface EmbeddingSuggestCollectionsResponse {
  suggestions: Array<{
    collectionId: string;
    collectionName: string;
    score: number;
  }>;
}

export interface SuggestTagsRequest {
  itemText: string;
  topK?: number;
}

export interface SuggestTagsResponse {
  suggestions: Array<{
    tag: string;
    tagName: string;
    score: number;
  }>;
}

// ============================================================================
// UNIFIED ITEM QUERY INTERFACE
// ============================================================================

export type ItemQuerySortField = 'created' | 'modified' | 'visited' | 'title' | 'order' | 'sharedAt' | 'name';
export type ItemQuerySortOrder = 'asc' | 'desc';

/**
 * Query modes determine the permission resolution and data shaping strategy.
 * - 'standard': Basic query with direct permission check (default)
 * - 'allUserItems': Two-phase query - items with direct permission UNION items in permitted collections
 * - 'libraryRoot': Root collections with permission propagation (no parent with permission)
 * - 'collectionItems': Items within a specific collection with relation details
 * - 'sharedWith': Items shared TO the user by others
 * - 'sharedBy': Items shared BY the user to others
 * - 'archived': Archived items across all accessible contexts
 * - 'withFeedback': Items filtered by a specific feedback field
 */
export type ItemQueryMode = 
  | 'standard'
  | 'allUserItems'
  | 'libraryRoot'
  | 'collectionItems'
  | 'sharedWith'
  | 'sharedBy'
  | 'archived'
  | 'withFeedback'
   | 'recent' | 'similar' | 'related' | 'suggestions' | 'inCollection'

export interface ItemQueryFilters {
  // Status filters
  archived?: boolean;
  hidden?: boolean;
  uncategorized?: boolean;

  // Feedback filters
  feedbackTypes?: string[]; // e.g., ['starred', 'visited', 'reactionDate']
  feedbackField?: string; // For 'withFeedback' mode - specific field to filter by

  // Item type filters
  itemTypes?: string[]; // e.g., ['col', 'item', 'feed']
  typeFilter?: string; // For collectionItems mode - filter by item_relation.itemType

  // Subtype filters (e.g. subType === 'task')
  subTypes?: string[];

  /**
   * Effective-type filter — matches resolveEffectiveItemType(), which reads meta/feeds
   * that the server cannot index (a podcast is derived from an audio feed and is never
   * stamped on item.subType, so `subTypes: ['podcast']` under-matches).
   *
   * CLIENT-LOCAL ONLY: the server ignores this. ItemQueryService throws rather than
   * fall back to the remote path, so a request can never come back unfiltered while
   * looking filtered. Never combine with `userId`.
   */
  effectiveTypes?: string[];

  /**
   * Educational-value filter for the "browse by usage" grid. Matches an item's `eduval_*`
   * entry in `details.useCriteria`, with 'eduval_unknown' selecting items that have none.
   *
   * CLIENT-LOCAL ONLY, like `effectiveTypes` — useCriteria is encrypted at rest, so the
   * server cannot evaluate it. ItemQueryService throws rather than fall back remotely.
   */
  eduValues?: string[];

  /**
   * Tag filter for the "browse by tag" view. Matched case-insensitively against
   * `details.tags`, mirroring ItemDataStore.getIdsByTagsIgnoreCase; an item matches if it
   * carries ANY of them.
   *
   * CLIENT-LOCAL ONLY, like `effectiveTypes` and `eduValues` — tags are E2E-encrypted, so
   * the server cannot evaluate them. ItemQueryService throws rather than fall back.
   */
  tags?: string[];

  // Collection context
  inCollections?: string[];
  collectionId?: string; // For 'collectionItems' mode

  // Visibility filters (for libraryRoot mode)
  visibility?: 'shared' | 'private' | 'all';

  // Sharing filters
  sharedOnly?: boolean;

  // Attribute filters
  attributeKey?: string;
  attributeValue?: string;

  // ID filters
  ids?: string[];
  idsRequired?: boolean;
  publishIds?: string[]; // Match by details.publishId
  urls?: string[]; // Match by exact URL

  // Archive behavior for collectionItems mode
  hideArchived?: boolean;
}

export interface ItemQueryIncludes {
  // Include additional data
  feedback?: boolean | string[]; // true = all, string[] = specific types
  permissions?: boolean;
  path?: boolean;
  parents?: boolean;
  allCollections?: boolean;
  
  // Extended includes for specialized queries
  userPermissions?: boolean; // All users' permissions on items (for libraryRoot)
  collectionRelation?: boolean; // Include item_relation details (order, publishedAt, etc.)
  sharerInfo?: boolean; // Include user info for sharer (sharedWith mode)
  recipientInfo?: boolean; // Include user info for recipient (sharedBy mode)
  parentCollectionIds?: boolean; // Include all parent collection IDs
}

export interface ItemQueryPagination {
  limit?: number;
  offset?: number;
  cursor?: string; // For cursor-based pagination (future)
}

export interface ItemQuerySort {
  field?: ItemQuerySortField;
  order?: ItemQuerySortOrder;
}

export interface ItemQueryRequest {
  userId?: string;
  
  // Query mode determines permission resolution and data shaping strategy
  // Defaults to 'standard' if not specified
  mode?: ItemQueryMode;
  
  filters?: ItemQueryFilters;
  includes?: ItemQueryIncludes;
  pagination?: ItemQueryPagination;
  sort?: ItemQuerySort;
  params?: Record<string, any>;


  // Post-processing for custom queries
  postProcess?: {
    additionalFilters?: ItemQueryFilters;
    transform?: 'preserveOrder' | 'deduplicate';
  };

  // Options
  tempAuthToken?: TokenData;

  /**
   * Client-only. Answer from this device's local index of `userId`'s library
   * rather than the server, when this device holds a hydrated copy of it.
   *
   * Only meaningful for a `userId` other than the signed-in user — own-library
   * queries already answer locally. Guardian devices already build and hold a
   * child's index for block decisions and URL matching, so this reuses a copy
   * that exists rather than making a new one; the point is coverage, because the
   * server clamps this route to ITEM_QUERY_MAX_LIMIT rows while the local index
   * can answer over the whole library.
   *
   * Best-effort by design: an index that has never fully synced here falls back
   * to the server rather than answering from a partial copy. Stripped before any
   * remote call — the server has no such mode.
   */
  preferLocalIndex?: boolean;
}

export interface ItemQueryResponse {
  items: ItemInfoView[];
  total?: number;
  hasMore?: boolean;
  cursor?: string;
}

// ============================================================================
// Attachment Types
// ============================================================================

export interface AttachmentAddResponse {
  attachmentId: string;
  url?: string;
  fileId?: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncStatusResponse {
  enabled: boolean;
  lastSync?: number;
  pendingOperations?: number;
  syncInProgress?: boolean;
  errors?: string[];
}export interface TokenData {
  token: string;
  expAtSec: number;
}


// ============================================================================
// Thinking Puzzles Content
// ============================================================================

// A self-contained content store for the Thinking Puzzles app — deliberately not tied to
// published or library items. Records are strands, concepts and puzzles in one kind-discriminated
// table, spined by `parentId`.
//
// `data` is intentionally `Record<string, any>`: the payload shape belongs to the client's
// standalone `thinkingPuzzles` module, which must stay free of Kindredly imports. Typing it here
// would couple the module to the monorepo, and would mean a new puzzle primitive could not ship
// without a server change.

export type PuzzleContentKind = "strand" | "concept" | "puzzle";
export type PuzzleContentStatus = "draft" | "live" | "retired";

export interface PuzzleContentView {
  id: string;
  kind: PuzzleContentKind;
  parentId: string | null;
  status: PuzzleContentStatus;
  sortOrder: number;
  data: Record<string, any>;
  version: number;
  updatedAt: string | null;
}

export interface ThinkingPuzzlesCatalogRequest {}

export interface ThinkingPuzzlesCatalogResponse {
  /** Live records only. Drafts never leave the server. */
  records: PuzzleContentView[];
  /**
   * Retired ids with just enough to render a label AND to attribute them. Progress is keyed on
   * concept id, so a retired concept still has to resolve or a learner's recorded history goes
   * blank. `kind` and `parentId` are what let a client tell a retired concept from a retired
   * puzzle and place it back under its strand — without them the history resolves a title but has
   * nowhere to render it.
   */
  retired: Array<{ id: string; kind: PuzzleContentKind; parentId: string | null; title: string | null }>;
  /** Newest `updatedAt` across live records — a cheap change detector for clients. */
  revision: number;
}

export interface AdminPuzzleContentListRequest {
  kind?: PuzzleContentKind;
  status?: PuzzleContentStatus;
}

export interface AdminPuzzleContentListResponse {
  records: PuzzleContentView[];
}

export interface AdminPuzzleContentSaveRequest {
  id: string;
  kind: PuzzleContentKind;
  parentId?: string | null;
  status: PuzzleContentStatus;
  sortOrder?: number;
  data: Record<string, any>;
  /** Omit to create. To update, must match the stored version or the save is rejected. */
  version?: number;
}

export interface AdminPuzzleContentSaveResponse {
  record: PuzzleContentView;
}

export interface AdminPuzzleContentSetStatusRequest {
  id: string;
  status: PuzzleContentStatus;
}

export interface AdminPuzzleContentDeleteRequest {
  id: string;
}

export interface AdminPuzzleContentDeleteResponse {
  deleted: number;
}

/**
 * How an import decides each record's status.
 *
 * `fromRecord` (the default) takes each record's own status, which is what the built-in seed
 * button relies on — it sends everything as a draft and means it.
 *
 * `draftNewKeepExisting` is for moving a catalog between environments. A new record lands as a
 * draft so an import never publishes anything on its own, and an existing record keeps whatever
 * status it already has *in the target*, so promoting an edit to a live puzzle updates it in place
 * instead of taking it down.
 */
export type PuzzleContentImportStatusPolicy = "fromRecord" | "draftNewKeepExisting";

export interface AdminPuzzleContentImportSeedRequest {
  records: AdminPuzzleContentSaveRequest[];
  /** When false (the default) existing records are left alone, so a re-import cannot clobber edits. */
  overwrite?: boolean;
  statusPolicy?: PuzzleContentImportStatusPolicy;
}

export interface AdminPuzzleContentImportSeedResponse {
  /** Records created. Updates are counted separately — they are a different thing to report. */
  imported: number;
  updated: number;
  skipped: number;
}

/** A user designated to receive platform alerts (bug reports), joined with user identity. */
export interface PlatformAlertReceiverView {
  userId: string;
  note: string | null;
  createdAt: string | Date;
  /** Null when the user record was deleted after being added. */
  username: string | null;
  email: string | null;
  accountId: string | null;
}

/**
 * What actually happened to a publish.
 *
 * The content-safety gate can quarantine a row at publish time (`published=false`,
 * `excludeFromSearch=true`, `postImportProcessing.state='needs_review'`). Before this
 * type existed the publish call still returned only the id, so a held publish was
 * indistinguishable from a live one and the caller handed the user a dead link.
 *
 * `status: 'held'` means the row exists but is NOT reachable — never surface a share
 * link for it.
 */
export interface PublishResult {
  publishId: string;
  status: 'live' | 'held';
  /** Human-readable reason, present only when held. */
  heldReason?: string | null;
}

/**
 * Where the caller's own publish of a collection stands. Read by the publish page and the
 * collection page so a family can see Submitted / In review / Added / Not added after a reload
 * -- the publish response used to be the only place 'held' existed.
 */
export type OwnerPublishStatusCode = 'none' | 'pending' | 'held' | 'live' | 'declined' | 'blocked';

export interface OwnerPublishStatus {
  status: OwnerPublishStatusCode;
  publishId?: string | null;
  visibilityCode?: number | null;
  /** The curator's line when declined, or the safety check's reason when held. */
  reason?: string | null;
  /** Short reason code when declined (see DECLINE_REASONS). */
  declineReason?: string | null;
  curatedDate?: string | null;
  updatedAt?: string | null;
}

/** One pending suggestion in a curator's queue: enough to pick it, not the whole row. */
export interface CurationQueueEntry {
  _id: string;
  name: string | null;
  imageFilename?: string | null;
  username?: string | null;
  publicUserId?: string | null;
  itemCount?: number | null;
  updatedAt?: string | null;
  /** The safety check held it before any curator saw it; approving overrides that. */
  flagged: boolean;
  heldReason?: string | null;
}

// ── Curation review (docs/specs/curation-review.md) ────────────────────────────────────────────

export type CurationReviewStatus = 'open' | 'finalized' | 'closed';
export type CurationReviewOpenReason = 'report' | 'scheduled' | 'backfill' | 'suggestion' | 'curator';
/** Where the curator's answer started: their own, an AI suggestion they confirmed, or the last review's. */
export type CurationReviewAnswerSource = 'human' | 'ai_confirmed' | 'previous_confirmed';

/** One check's answer as a review stores it. `value` follows tset-sharedlib/src/curation.checklist.ts. */
export interface CurationReviewStoredAnswer {
  value: string | string[];
  comment?: string | null;
  screenshots?: string[];
  source?: CurationReviewAnswerSource;
  /** On a finished review answered by several curators: each curator's comment, in finish order. */
  comments?: string[];
}

/** The AI's suggestions for an open review. Curators only; never returned to families. */
export interface CurationReviewAiDraft {
  status: 'queued' | 'running' | 'done' | 'failed' | 'skipped';
  /** Why it failed or was skipped, in words a curator can act on. */
  reason?: string | null;
  model?: string | null;
  requestedAt?: string | null;
  completedAt?: string | null;
  answers?: Record<
    string,
    {value: string | string[]; confidence?: number | null; rationale?: string | null; suggestedComment?: string | null}
  >;
  summary?: string | null;
  suggestedOutcome?: 'curate' | 'decline' | 'unsure' | null;
  suggestedDeclineReason?: string | null;
  reviewAgainMonths?: number | null;
}

/** A review as a curator sees it. */
export interface CurationReviewCuratorView {
  _id: string;
  publishedId: string;
  checklistVersion: number;
  status: CurationReviewStatus;
  openReason: CurationReviewOpenReason;
  underReview: boolean;
  answers: Record<string, CurationReviewStoredAnswer>;
  aiDraft: CurationReviewAiDraft | null;
  outcome: 'curate' | 'decline' | null;
  declineReason: string | null;
  summary: string | null;
  internalNote: string | null;
  reviewAgainMonths: number | null;
  nextReviewAt: string | null;
  curatorId: string | null;
  openedAt: string | null;
  finalizedAt: string | null;
  version: number;
}

/** A family's report as a curator sees it: what they said, never who they are. */
export interface CurationReviewReportView {
  reason: string | null;
  comment: string | null;
  /** 'guardian' | 'restricted' | 'admin' when known. */
  reporterRole: string | null;
  createdAt: string | null;
}

export interface CurationReviewForCuratorResponse {
  review: CurationReviewCuratorView | null;
  /** Finished reviews, newest first. */
  previous: CurationReviewCuratorView[];
  /** Reports attached to the open review. */
  reports: CurationReviewReportView[];
  /** A curator cannot finish a review of their own family's suggestion; the form says so. */
  ownSuggestion: boolean;
  /** How many curators this item needs, and where this curator's own answers stand. */
  signoffs?: CurationReviewSignoffState;
}

/** One curator's own answers to a review. Adding an item takes several (curation.signoff.ts). */
export type CurationSignoffStatus = 'draft' | 'finished' | 'superseded';

export interface CurationSignoffView {
  _id: string;
  status: CurationSignoffStatus;
  curatorId: string;
  /** The curator's public name. Sent to other curators only once they disagree. */
  curatorName?: string | null;
  answers: Record<string, CurationReviewStoredAnswer>;
  outcome: 'curate' | 'decline' | null;
  declineReason: string | null;
  summary: string | null;
  internalNote: string | null;
  reviewAgainMonths: number | null;
  version: number;
  finishedAt: string | null;
}

/** One check two curators answered differently. */
export interface CurationSignoffDifference {
  key: string;
  label: string;
  answers: Array<{signoffId: string; value: string | string[]}>;
}

export interface CurationReviewSignoffState {
  /** Curators needed to decide this item: the policy for a new item, 1 for one already curated. */
  required: number;
  finishedCount: number;
  mine: CurationSignoffView | null;
  /** Enough curators have finished and their answers differ. Only then are answers shared. */
  disagree: boolean;
  others: CurationSignoffView[];
  differences: CurationSignoffDifference[];
  /** My finished answers went back to a draft because the item changed since I read it. */
  stale: boolean;
  /** Another curator decided the review while I had a draft. */
  superseded: boolean;
}

export type CurationReviewFinishResult =
  | 'waiting'
  | 'disagree'
  | 'added'
  | 'not_added'
  | 'kept'
  | 'removed'
  | 'already_decided';

export interface CurationReviewFinishResponse {
  result: CurationReviewFinishResult;
  signoffs: CurationReviewSignoffState;
  review: CurationReviewCuratorView | null;
}

/** How many curators must agree before an item is added. An admin changes it. */
export interface CurationPolicyView {
  curatorsToAdd: number;
}

export interface AdminCurationPolicyResponse {
  policy: CurationPolicyView;
  defaults: CurationPolicyView;
  /** Curators whose profile is enabled and not blocked. */
  activeCurators: number;
  /** On a save: open reviews the new number added straight away. */
  addedCount?: number;
}

export interface CurationReviewSaveRequest {
  reviewId: string;
  /** The version the curator last read; a save against an older one is refused. */
  version: number;
  answers: Record<string, CurationReviewStoredAnswer>;
  outcome?: 'curate' | 'decline' | null;
  declineReason?: string | null;
  summary?: string | null;
  internalNote?: string | null;
  reviewAgainMonths?: number | null;
}

/** One open review in a curator's queue. */
export interface CurationReviewQueueEntry {
  reviewId: string;
  publishedId: string;
  name: string | null;
  imageFilename: string | null;
  type: string | null;
  openReason: CurationReviewOpenReason;
  underReview: boolean;
  openedAt: string | null;
  reportCount: number;
  reportReasons: string[];
  aiDraftStatus: CurationReviewAiDraft['status'] | null;
  /** Curators who have finished, and how many this item needs. */
  signoffsFinished?: number;
  signoffsRequired?: number;
  /** Where this curator stands on it. */
  mySignoff?: CurationSignoffStatus | 'none';
  /** Enough curators finished and their answers differ; it needs one of them to change. */
  disagree?: boolean;
}

/** A finished review as families read it: the answers a curator confirmed, nothing about who. */
export interface CurationReviewPublicView {
  _id: string;
  checklistVersion: number;
  outcome: 'curate' | 'decline' | null;
  declineReason: string | null;
  summary: string | null;
  finalizedAt: string | null;
  openReason: CurationReviewOpenReason;
  /** A curator confirmed at least one answer an AI suggested. */
  aiAssisted: boolean;
  answers: Record<
    string,
    {value: string | string[]; comment?: string | null; comments?: string[]; screenshots?: string[]}
  >;
  /** Curators who agreed on this review. Older reviews, finished by one curator, say 1. */
  curatorCount?: number;
}

export interface CurationReviewListForItemResponse {
  /** Finished reviews, newest first. Empty for an item no one has reviewed yet. */
  reviews: CurationReviewPublicView[];
  /** The review being worked now, if any. `reasons` are the report reason codes that opened it. */
  open: {openedAt: string | null; underReview: boolean; reasons: string[]} | null;
  nextReviewAt: string | null;
}
