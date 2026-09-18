/**
 * "Assistant reviews requests" — judging a child's site request against the
 * parent's written guidelines, at the moment they ask.
 *
 * Three things about the shape of this are deliberate.
 *
 * **The decision runs on the server, not the device.** A child controls their own
 * browser: a client-side check could be skipped, and a client-supplied page
 * summary could be forged. Everything the model is shown about the page is
 * fetched here; the only thing the requester contributes is a note, which is
 * quoted to the model as a claim rather than as evidence.
 *
 * **The model cannot say no.** It approves, or it steps aside and a parent looks.
 * A denial from a model would be making a call the parent is entitled to make,
 * with no way for the child to reach a person past it. That asymmetry is what
 * makes the rest of the design safe: every failure here — a timeout, malformed
 * output, an exhausted budget, an unreachable Redis — lands on the same square as
 * the feature being switched off entirely, which is the parent's queue.
 *
 * **Answers are sticky.** The same question asked twice gets the same answer,
 * because the alternative is a child re-rolling the dice until the model has a
 * bad day. Cooldowns and the weekly allowance exist for the same reason.
 *
 * Replaces `library_auto_approval.service.ts`, which ran on every not-in-library
 * navigation, decided by keyword-matching classifier categories, and could not be
 * influenced by anything the parent wrote.
 */

import {createHash} from 'crypto';

import {getKeyValueStore} from '@/base/runtime.factory';
import {RequestContext} from '@/base/request_context';
import {config} from '@/config';
import {UserRepo} from '@/db/user.repo';
import ExternalDataService from './external_data.service';
import {FamilyPolicyRuleService} from './family_policy_rule.service';
import ItemService from './item.service';
import {findSourcePriorityDomainRule} from './source_priority_domain_policy';
import {isUnderAge} from 'tset-sharedlib/date.utils';
import {
  assistantReviewHostKey,
  assistantReviewWeekKey,
  getAssistantWeeklyAllowance,
  normalizeAssistantReviewConfig,
  resolveAssistantGuidelines,
  sanitizeAssistantRequesterNote,
} from 'tset-sharedlib/restrictions/assistantReview';
import {isLikelyChallengeTitle} from 'tset-sharedlib/extraction.pure.utils';
import {isAiReclassifyReasonCode, isAiReviewableReasonCode} from 'tset-sharedlib/types/reason-code.utils';
import {buildPatternsForUrlScope, resolveAssistantScope} from 'tset-sharedlib/url.utils';
import type {AssistantGrantScope} from 'tset-sharedlib/url.utils';
import type {
  AccessRequestAiDecision,
  AccessRequestAiReview,
  AccessRequestAiReviewSource,
  LibraryAutoApprovalSettings,
} from 'tset-sharedlib/api';
import type {AccessRequestDetails} from 'tset-sharedlib/types/activity.types';
import {ASSISTANT_REVIEW_NEVER_APPROVED} from 'tset-sharedlib/restrictions/assistantReview';
import {familyAiSetting, familyAllowsHostedAi} from 'tset-sharedlib/family-ai';
import type {DateOfBirth} from 'tset-sharedlib/date.utils';
import {UserType} from 'tset-sharedlib/shared.types';
import type {UrlScopeKind} from 'tset-sharedlib/types/item.types';

/*
 * The guidelines used to live at the pref key `filters.autoApprovalSettings`, read
 * from the child's own pref row. That key is now write-blocked in
 * `GUARDIAN_ONLY_PREF_KEYS` and read by nothing — see `getSettings` below for why
 * reintroducing a read of it would undo the fix.
 */

/** Below this the model's own answer is not good enough to act on unattended. */
const APPROVE_CONFIDENCE_FLOOR = 0.75;

/**
 * The only categories a `reclassify` may move a page into.
 *
 * The guardrail lives here rather than in the prompt because a prompt is a
 * request and this is an invariant: the assistant widens what a child can reach
 * and never narrows it, the same asymmetry that stops it saying no. A proposal
 * outside this pair is not corrected to the nearest allowed value — it is
 * treated as no proposal, and the request goes to the parent.
 */
const RECLASSIFY_TARGETS = ['eduval_educational', 'eduval_task'] as const;

export type AssistantReclassifyEduValue = (typeof RECLASSIFY_TARGETS)[number];

function parseReclassifyEduValue(value: unknown): AssistantReclassifyEduValue | null {
  return RECLASSIFY_TARGETS.includes(value as AssistantReclassifyEduValue)
    ? (value as AssistantReclassifyEduValue)
    : null;
}

/** How long the same question keeps its answer. */
const VERDICT_CACHE_DAYS = 7;

/** After a host is handed to a parent, how long before it may be asked about again. */
const HOST_COOLDOWN_SECONDS = 24 * 60 * 60;

/** The model call is raced against this; the child is watching a spinner. */
const MODEL_TIMEOUT_MS = 20_000;

/**
 * What one review is held at against the family's AI limits while it runs: its input cap of
 * roughly 20k tokens and 8k output on gpt-5.4-mini, the dearest model a Plus admin default is
 * likely to be, comes to about $0.05. Recorded spend replaces the hold when the review finishes.
 */
const ACCESS_REVIEW_WORST_CASE_MICRO_USD = 50_000;

/** Metadata is worth waiting for, but not worth the whole budget. */
const METADATA_TIMEOUT_MS = 8_000;

/**
 * Whether hosted AI exists on this DEPLOYMENT.
 *
 * Not to be confused with the per-account `sysOptions.aiChatSupported` gate that
 * this feature deliberately no longer uses. That flag conflated an account
 * entitlement with a deployment fact; this is only the deployment fact, and the
 * two must not be merged back together.
 *
 * `services/_internal` is withheld from the published Personal repo, so the lazy
 * `require` in `aiTaskService` throws MODULE_NOT_FOUND on a self-hosted box. That
 * already fails closed to the parent's queue, but it would spend one of the
 * child's weekly checks and log a stack trace to get there, and it would have
 * promised the child a check that could never happen.
 */
function isHostedAiDeployment(): boolean {
  return config.privateServer !== true;
}

export type AssistantReviewSubject = {
  url: string;
  targetUserId: string;
  details?: AccessRequestDetails | null;
  note?: string | null;
  requestType?: string | null;
};

export type AssistantReviewOutcome =
  | {kind: 'skipped'; reason: 'not-url' | 'ineligible' | 'disabled' | 'account-not-eligible'}
  | {kind: 'decided'; aiReview: AccessRequestAiReview; remainingThisWeek: number | null};

type PageInputs = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  keywords: string | null;
  labels: string[];
  unsafeCacheHit: boolean;
};

type ParsedVerdict = {
  decision: AccessRequestAiDecision;
  confidence: number;
  reasonForParent: string;
  reasonForChild: string;
  matchedGuideline: string | null;
  /**
   * What the model asked for, before any cap. Deliberately kept separate from the
   * scope that gets written: `resolveAssistantScope` is what decides, and keeping
   * the proposal unresolved here means the parse stays a parse.
   */
  proposedScope: 'page' | 'site' | null;
  suggestedGuideline: string | null;
  /** Only ever one of the two widening categories — see `RECLASSIFY_TARGETS`. */
  reclassifiedEduValue: AssistantReclassifyEduValue | null;
};

/**
 * The age band shown to the model as context for "is this suitable?".
 *
 * An unknown birthday reads as `child`, which is the opposite of what the
 * retired auto-approval service did. This is advisory context, not a gate, and
 * it only ever makes the model more careful — so on a feature whose sole power
 * is to GRANT access, guessing "adult" for a user we cannot age is guessing in
 * the one direction that can do harm. The people this runs for are children by
 * definition; a missing date of birth is missing data, not evidence of an adult.
 */
function ageBandForDob(dob?: DateOfBirth | null): 'child' | 'teen' | 'adult' {
  if (!dob) return 'child';
  if (isUnderAge(dob, 13)) return 'child';
  if (isUnderAge(dob, 18)) return 'teen';
  return 'adult';
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function clampText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
}

/**
 * A promise that gives up rather than holding the request open. Resolves with the
 * fallback instead of rejecting, because every timeout here has a defined
 * non-error meaning.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

class AccessRequestReviewService {
  /**
   * Built on first use, not at construction.
   *
   * `ItemService` reaches the Inversify container, which builds the notification
   * service, the SSE manager and a Redis connection behind it. Constructing all
   * of that to answer "is this feature even switched on?" — which is what most
   * calls here do — is waste on every request and makes the service impossible to
   * exercise without standing up the world.
   */
  private _externalDataService: ExternalDataService | null = null;
  private get externalDataService(): ExternalDataService {
    if (!this._externalDataService) this._externalDataService = new ExternalDataService();
    return this._externalDataService;
  }

  private _itemService: ItemService | null = null;
  private get itemService(): ItemService {
    if (!this._itemService) this._itemService = new ItemService();
    return this._itemService;
  }

  private _userRepo: UserRepo | null = null;
  private get userRepo(): UserRepo {
    if (!this._userRepo) this._userRepo = new UserRepo();
    return this._userRepo;
  }

  private _familyPolicyRuleService: FamilyPolicyRuleService | null = null;
  private get familyPolicyRuleService(): FamilyPolicyRuleService {
    if (!this._familyPolicyRuleService) this._familyPolicyRuleService = new FamilyPolicyRuleService();
    return this._familyPolicyRuleService;
  }

  private _aiLimitService: any = null;
  private get aiLimitService(): any {
    if (!this._aiLimitService) {
      // personal-optional: guarded, never reached on a self-hosted server
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this._aiLimitService = require('./_internal/ai_limit.service').AiLimitService.instance;
    }
    return this._aiLimitService;
  }

  /**
   * Cloud-only, resolved on first use. `services/_internal` is withheld from the
   * published Personal repo, and a top-level import would transpile there and then
   * die at runtime — see the same getter in `external_data.service.ts`.
   *
   * What keeps a self-hosted server out of here is `isHostedAiDeployment()`, via
   * `canAccountUseAssistantReview`. It used to be the per-account
   * `aiChatSupported` flag, which was never set on a personal box — when that gate
   * was removed the guard had to be replaced rather than simply dropped.
   */
  /** Run `fn` so its hosted spend is billed the way the review was admitted: limits or extra AI usage. */
  private withAdmission<T>(ctx: RequestContext, admission: any, fn: () => Promise<T>): Promise<T> {
    // personal-optional: guarded, never reached on a self-hosted server
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {withAiMetering} = require('./_internal/ai_metering');
    return withAiMetering(ctx, 'aitask.accessRequestReview', fn, {
      admission: admission ? {billedTo: admission.billedTo} : null,
    });
  }

  private _aiTaskService: any = null;
  private get aiTaskService(): any {
    if (!this._aiTaskService) {
      // personal-optional: guarded, never reached on a self-hosted server
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./_internal/aitask.service');
      this._aiTaskService = new (mod.default || mod)();
    }
    return this._aiTaskService;
  }

  /**
   * Fingerprint of the guidelines a verdict was judged against.
   *
   * Shared by the stored record and the cache lookup so the two cannot disagree
   * about what "the same rules" means.
   */
  guidelinesFingerprint(guidelines: string): string {
    return createHash('sha256')
      .update(guidelines || '')
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * The fingerprint of this child's CURRENT guidelines, or null when the feature
   * is off for them.
   *
   * Exists so a cached verdict can be thrown away the moment a parent rewrites
   * their rules. Without it, a parent who changes "no games" to "games are fine"
   * would watch their child re-ask and get the old refusal back out of the cache,
   * and the edit would look like it did nothing.
   */
  async currentGuidelinesFingerprint(ctx: RequestContext, userId: string): Promise<string | null> {
    const settings = await this.getSettings(ctx, userId);
    if (!settings.enabled || !settings.guidelines) return null;
    return this.guidelinesFingerprint(settings.guidelines);
  }

  /**
   * Is the assistant on for this child, and what rules is it judging against?
   *
   * Two stores, deliberately: the on/off is a per-child grant on `user.options`
   * (admin-write, and safe for the child to read — the block page has to know
   * whether to promise a check), and the guidelines are on the account record
   * (admin-write, and withheld from the child by `getAccountDetails`).
   *
   * The old home — the child's own `filters.autoApprovalSettings` pref — is NOT
   * read here, and that is the point of the change rather than an oversight.
   * `updateUserPrefs` authorizes with `verifySelfOrAdmin`, which counts a
   * restricted user editing their own prefs as "self", so that key let a child
   * both read the rules and rewrite them to approve anything. A fallback read
   * would hand the hole straight back; a dev account with the old pref written
   * re-enters its guidelines once instead.
   */
  async getSettings(ctx: RequestContext, targetUserId: string): Promise<LibraryAutoApprovalSettings> {
    try {
      const [account, targetUser] = await Promise.all([
        ctx.getAccount().catch(() => null),
        ctx.getUserById(targetUserId).catch(() => null),
      ]);

      if ((targetUser as any)?.options?.assistantReviewEnabled !== true) {
        return {enabled: false, guidelines: ''};
      }

      const config = normalizeAssistantReviewConfig((account as any)?.options?.assistantReview);
      const guidelines = resolveAssistantGuidelines(config, targetUserId);

      // Switched on with nothing written is not a state this can act in: the
      // guidelines ARE the decision procedure, so there is nothing to compare a
      // page against.
      return {enabled: guidelines.length > 0, guidelines};
    } catch {
      // Settings we cannot read are a feature we do not run.
      return {enabled: false, guidelines: ''};
    }
  }

  /**
   * Whether this account may use the assistant at all.
   *
   * Two account-level gates: the family AI setting and the plan allowance. The founder decided on
   * 2026-09-03 that this feature is independent of AI Chat, and it still is: a child's AI Chat
   * switch plays no part. The family AI setting (PLN-3, 2026-09-15) is not an AI Chat switch but
   * "no AI anywhere", so a family set to Off, or to Private AI only (a review always uses
   * Kindredly.ai today), has no review. It used to also require `sysOptions.aiChatSupported`, which
   * conflated two things — "Kindredly permits this account hosted AI" and "this
   * family wanted a chatbot" — and, because that flag is set only by platform
   * provisioning and nothing stages it, made the whole feature unreachable on a
   * local database (agent-observations #71) and so untestable.
   *
   * Cost is still bounded: each review is admitted against the family's AI limits,
   * and the weekly per-child allowance caps volume.
   * `ASSISTANT_REVIEW_DEVELOPER_ONLY` on the client is the kill line.
   */
  canAccountUseAssistantReview(account: any): boolean {
    if (!account) return false;
    if (!isHostedAiDeployment()) return false;
    if (!familyAllowsHostedAi(familyAiSetting(account?.options))) return false;
    return getAssistantWeeklyAllowance(account?.accountType) > 0;
  }

  /**
   * Is this a block the assistant may look at, and in which of the two ways?
   *
   * `'grant'` is the original job: a site request, for a block a parent could
   * have pre-answered in writing. `'reclassify'` is the category case — a child
   * out of time for one kind of screen time, on a page that may not be that kind
   * of thing. It arrives as a `time` request because that is what a usage-limit
   * block produces, and it carries a URL, which is what makes it answerable.
   *
   * A time request with no URL is a plain ask for more minutes and stays a
   * question for a parent: there is nothing to look at and nothing to correct.
   */
  eligibilityFor(subject: AssistantReviewSubject): 'grant' | 'reclassify' | null {
    const requestType = subject.requestType || 'url';
    const reasonCode = subject.details?.reasonCode ?? null;

    if (requestType === 'url') {
      return isAiReviewableReasonCode(reasonCode) ? 'grant' : null;
    }

    if (requestType === 'time' && subject.details?.url && isAiReclassifyReasonCode(reasonCode)) {
      return 'reclassify';
    }

    return null;
  }

  isEligible(subject: AssistantReviewSubject): boolean {
    return this.eligibilityFor(subject) !== null;
  }

  private weeklyCapKey(ctx: RequestContext, targetUserId: string): string {
    return `arq_ai_week:${ctx.accountId}:${targetUserId}:${assistantReviewWeekKey()}`;
  }

  private hostCooldownKey(ctx: RequestContext, targetUserId: string, host: string): string {
    return `arq_ai_host_cooldown:${ctx.accountId}:${targetUserId}:${host}`;
  }

  /**
   * Fail-closed on a Redis error, unlike the source-priority quota which lets the
   * call through. The cost of being wrong differs: there it is a missing
   * classification, here it is an unmetered path to automatic approvals.
   */
  async isHostCoolingDown(ctx: RequestContext, targetUserId: string, host: string): Promise<boolean> {
    if (!host) return false;
    try {
      const redis = getKeyValueStore();
      const hit = await redis.get(this.hostCooldownKey(ctx, targetUserId, host));
      return !!hit;
    } catch (error) {
      console.warn('[assistant-review] cooldown check failed; treating as cooling down', error);
      return true;
    }
  }

  async setHostCooldown(ctx: RequestContext, targetUserId: string, host: string): Promise<void> {
    if (!host) return;
    try {
      const redis = getKeyValueStore();
      await redis.set(this.hostCooldownKey(ctx, targetUserId, host), '1', 'EX', HOST_COOLDOWN_SECONDS);
    } catch (error) {
      // A cooldown we could not write means the next ask reaches the model again.
      // Survivable — the weekly allowance is the backstop.
      console.warn('[assistant-review] failed to set host cooldown', error);
    }
  }

  /**
   * Count this review against the child's week. Consumes on the way in, so a
   * crash mid-review costs the allowance rather than granting a free retry loop.
   */
  /**
   * How many checks this child has left, without spending one.
   *
   * A display value, not a gate — which is why it returns null on a Redis error
   * where `consumeWeeklyAllowance` returns "spent". Fail-closed is right for the
   * gate and wrong here: telling a child "no checks left" because a cache is down
   * states a reason that is not true, where showing no count at all just leaves
   * the promise unmade.
   */
  async remainingWeeklyAllowance(ctx: RequestContext, targetUserId: string, allowance: number): Promise<number | null> {
    if (allowance <= 0) return 0;
    try {
      const redis = getKeyValueStore();
      const raw = await redis.get(this.weeklyCapKey(ctx, targetUserId));
      const used = Number.parseInt(String(raw ?? '0'), 10);
      return Math.max(0, allowance - (Number.isFinite(used) && used > 0 ? used : 0));
    } catch (error) {
      console.warn('[assistant-review] could not read remaining allowance', error);
      return null;
    }
  }

  /**
   * What the child's own block page is allowed to know: whether a check will
   * happen, and how many they have left.
   *
   * Deliberately narrow. The page used to read the raw
   * `filters.autoApprovalSettings` pref to answer the first half, which handed the
   * requester the parent's guidelines — the very text they would need to know to
   * craft a matching claim. Nothing here reveals the rules.
   */
  async statusForUser(
    ctx: RequestContext,
    targetUserId: string,
  ): Promise<{enabled: boolean; remainingThisWeek: number | null}> {
    const settings = await this.getSettings(ctx, targetUserId);
    if (!settings.enabled) return {enabled: false, remainingThisWeek: null};

    const account = await ctx.getAccount().catch(() => null);
    if (!this.canAccountUseAssistantReview(account)) {
      return {enabled: false, remainingThisWeek: null};
    }

    const allowance = getAssistantWeeklyAllowance((account as any)?.accountType);
    return {
      enabled: true,
      remainingThisWeek: await this.remainingWeeklyAllowance(ctx, targetUserId, allowance),
    };
  }

  async consumeWeeklyAllowance(
    ctx: RequestContext,
    targetUserId: string,
    allowance: number,
  ): Promise<{allowed: boolean; remaining: number}> {
    if (allowance <= 0) return {allowed: false, remaining: 0};
    try {
      const redis = getKeyValueStore();
      const key = this.weeklyCapKey(ctx, targetUserId);
      const used = await redis.incr(key);
      if (used === 1) {
        // Slightly over a week, so the key cannot outlive its own bucket.
        await redis.expire(key, 8 * 24 * 60 * 60);
      }
      return {allowed: used <= allowance, remaining: Math.max(0, allowance - used)};
    } catch (error) {
      console.warn('[assistant-review] allowance check failed; treating as spent', error);
      return {allowed: false, remaining: 0};
    }
  }

  /**
   * What the model gets to see about the page. Server-fetched, with the device's
   * own labels folded in as hints only.
   *
   * `getResourceInfo` is not used here: it returns nulls for everything that is
   * not a YouTube URL. `fetchMetadata` is the call that actually reads the page.
   */
  async gatherInputs(subject: AssistantReviewSubject): Promise<PageInputs> {
    const url = subject.url;

    const [meta, negative] = await Promise.all([
      withTimeout(
        this.externalDataService.fetchMetadata(url).catch(() => ({}) as any),
        METADATA_TIMEOUT_MS,
        {} as any,
      ),
      withTimeout(
        this.externalDataService.hasNegativeClassification(url).catch(() => false),
        METADATA_TIMEOUT_MS,
        false,
      ),
    ]);

    const labels = new Set<string>();

    // Device-supplied hints. Untrusted — a child could forge them — but they can
    // only ever add a reason for caution, never remove one, so they are safe to
    // show the model alongside the server's own facts.
    const contentInfo: any = subject.details?.contentInfo || null;
    for (const value of Array.isArray(contentInfo?.labels) ? contentInfo.labels : []) {
      if (typeof value === 'string' && value.trim()) labels.add(value.trim().toLowerCase());
    }
    for (const value of Array.isArray(contentInfo?.flags) ? contentInfo.flags : []) {
      if (typeof value === 'string' && value.trim()) labels.add(value.trim().toLowerCase());
    }
    if (typeof contentInfo?.contentType === 'string' && contentInfo.contentType.trim()) {
      labels.add(contentInfo.contentType.trim().toLowerCase());
    }

    // The server's own view of the domain, which the device cannot influence.
    try {
      const domainRule = findSourcePriorityDomainRule(url);
      for (const value of domainRule?.rule?.categories || []) {
        if (typeof value === 'string') labels.add(value.toLowerCase());
      }
      for (const value of domainRule?.rule?.flags || []) {
        if (typeof value === 'string') labels.add(value.toLowerCase());
      }
    } catch {
      // A missing domain rule is the normal case.
    }

    return {
      title: clampText((meta as any)?.title, 200) || null,
      description: clampText((meta as any)?.description, 500) || null,
      siteName: clampText((meta as any)?.siteName, 100) || null,
      keywords: clampText((meta as any)?.keywords, 200) || null,
      labels: Array.from(labels).slice(0, 20),
      unsafeCacheHit: negative === true,
    };
  }

  /**
   * `categoryReview` is what unlocks the third verdict, and it is present only
   * for a block that a category could explain. A `grant` subject never sees the
   * field, so a model that has never been told about this page's budget cannot
   * offer to change it.
   *
   * The current category comes from the child's device, like the reason code and
   * the request type do. That is not evidence and is not treated as any: it tells
   * the model what the page is being charged as, while what the page IS still
   * comes from the server's own fetch. Forging it buys nothing a plain request
   * does not — the same weekly allowance, the same confidence floor, the same
   * two categories, and a parent who sees the result with one click to undo it.
   */
  buildModelInput(
    subject: AssistantReviewSubject,
    settings: LibraryAutoApprovalSettings,
    inputs: PageInputs,
    ageBand: 'child' | 'teen' | 'adult',
    mode: 'grant' | 'reclassify' = 'grant',
  ): {input: Record<string, unknown>; note: string} {
    return {
      input: {
        childAgeBand: ageBand,
        blockReason: subject.details?.reasonCode || 'unknown',
        parentGuidelines: settings.guidelines,
        /*
         * The floor, sent from here rather than written into the prompt, because the
         * prompt is an admin-editable overlay and this is not something an admin
         * should be able to delete by editing wording. It outranks the guidelines: a
         * parent cannot write a line that opens a pornography or gambling site
         * unattended, however loosely they phrase it.
         */
        neverApprove: ASSISTANT_REVIEW_NEVER_APPROVED,
        ...(mode === 'reclassify'
          ? {
              categoryReview: {
                currentCategory: (subject.details?.contentInfo as any)?.eduValue || 'unknown',
              },
            }
          : {}),
        site: {
          url: subject.url,
          host: hostFromUrl(subject.url),
          title: inputs.title,
          description: inputs.description,
          siteName: inputs.siteName,
          keywords: inputs.keywords,
          labels: inputs.labels,
        },
      },
      note: sanitizeAssistantRequesterNote(subject.note),
    };
  }

  /**
   * Read the model's answer, or decide it did not give one.
   *
   * Strict on purpose. Anything unexpected — a missing field, an unknown verdict,
   * a confidence that is not a number, a confident-sounding approval below the
   * floor — resolves toward the parent. The model is one input to a decision
   * whose safe direction is already known, so there is no reason to be generous
   * about what counts as an approval.
   */
  parseVerdict(raw: unknown): ParsedVerdict | null {
    let payload: any = raw;

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return null;
      }
    }
    if (!payload || typeof payload !== 'object') return null;

    const decision = payload.decision;
    if (decision !== 'approve' && decision !== 'reclassify' && decision !== 'leave_for_parent') return null;

    const confidenceRaw = Number(payload.confidence);
    const confidence = Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0;

    const reasonForParent = clampText(payload.reasonForParent, 240);
    const reasonForChild = clampText(payload.reasonForChild, 120);
    if (!reasonForParent) return null;

    // The guardrail, applied before the decision is read rather than after: a
    // reclassify with no allowed target is not a reclassify at all. Doing it here
    // means no later branch can act on a proposal we rejected.
    const reclassifiedEduValue = parseReclassifyEduValue(payload.eduValue);

    // A stated approval that does not clear the floor is a "not sure" wearing the
    // wrong label, so it is recorded as what it actually is. A reclassify is held
    // to the same floor, and additionally to naming a category we allow.
    const clearsFloor = confidence >= APPROVE_CONFIDENCE_FLOOR;
    const effective: AccessRequestAiDecision =
      decision === 'approve' && clearsFloor
        ? 'approve'
        : decision === 'reclassify' && clearsFloor && reclassifiedEduValue
          ? 'reclassify'
          : 'leave_for_parent';

    // Anything that is not one of the two words is no proposal at all, which
    // resolves to the narrow end rather than to an error — a model that forgets
    // the field should still be able to approve.
    const proposedScope = payload.scope === 'page' || payload.scope === 'site' ? payload.scope : null;

    return {
      decision: effective,
      confidence,
      reasonForParent,
      reasonForChild: reasonForChild || 'Sent to your parent to look at.',
      matchedGuideline: clampText(payload.matchedGuideline, 240) || null,
      proposedScope,
      // Only useful on a hand-off. On an approval the guidelines already covered
      // it, so a suggestion would be asking a parent to write a rule they have.
      suggestedGuideline: effective === 'leave_for_parent' ? clampText(payload.suggestedGuideline, 120) || null : null,
      reclassifiedEduValue: effective === 'reclassify' ? reclassifiedEduValue : null,
    };
  }

  private buildReview(input: {
    decision: AccessRequestAiDecision;
    source: AccessRequestAiReviewSource;
    reasonForParent: string;
    reasonForChild?: string | null;
    confidence?: number | null;
    matchedGuideline?: string | null;
    grantedScope?: AssistantGrantScope | null;
    suggestedGuideline?: string | null;
    reclassifiedEduValue?: AssistantReclassifyEduValue | null;
    reclassifyRuleId?: string | null;
    model?: string | null;
    guidelines: string;
    inputs?: PageInputs | null;
  }): AccessRequestAiReview {
    return {
      decision: input.decision,
      source: input.source,
      confidence: input.confidence ?? null,
      reasonForParent: input.reasonForParent,
      reasonForChild: input.reasonForChild ?? null,
      matchedGuideline: input.matchedGuideline ?? null,
      grantedScope: input.grantedScope ?? null,
      suggestedGuideline: input.suggestedGuideline ?? null,
      reclassifiedEduValue: input.reclassifiedEduValue ?? null,
      reclassifyRuleId: input.reclassifyRuleId ?? null,
      model: input.model ?? null,
      checkedAt: new Date().toISOString(),
      guidelinesHash: this.guidelinesFingerprint(input.guidelines),
      inputs: {
        title: input.inputs?.title ?? null,
        description: input.inputs?.description ?? null,
        siteName: input.inputs?.siteName ?? null,
        labels: input.inputs?.labels ?? [],
      },
    };
  }

  /**
   * The one entry point. Never throws: a review that blows up is a review that
   * hands the request to a parent, which is what happens without the feature.
   */
  async review(ctx: RequestContext, subject: AssistantReviewSubject): Promise<AssistantReviewOutcome> {
    // The admission is set partway through, once the cheap checks have passed; its hold is
    // released however the review ends.
    const held: {admission: any} = {admission: null};
    try {
      return await this.reviewHolding(ctx, subject, held);
    } finally {
      await this.aiLimitService.release(held.admission);
    }
  }

  private async reviewHolding(
    ctx: RequestContext,
    subject: AssistantReviewSubject,
    held: {admission: any},
  ): Promise<AssistantReviewOutcome> {
    const url = String(subject.url || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) return {kind: 'skipped', reason: 'not-url'};
    const mode = this.eligibilityFor(subject);
    if (!mode) return {kind: 'skipped', reason: 'ineligible'};

    const settings = await this.getSettings(ctx, subject.targetUserId);
    if (!settings.enabled || !settings.guidelines) return {kind: 'skipped', reason: 'disabled'};

    const account = await ctx.getAccount().catch(() => null);
    if (!this.canAccountUseAssistantReview(account)) {
      return {kind: 'skipped', reason: 'account-not-eligible'};
    }

    const guidelines = settings.guidelines;
    const defer = (
      source: AccessRequestAiReviewSource,
      reasonForParent: string,
      extra: Partial<Parameters<AccessRequestReviewService['buildReview']>[0]> = {},
      remaining: number | null = null,
    ): AssistantReviewOutcome => ({
      kind: 'decided',
      aiReview: this.buildReview({
        decision: 'leave_for_parent',
        source,
        reasonForParent,
        guidelines,
        ...extra,
      }),
      remainingThisWeek: remaining,
    });

    const host = assistantReviewHostKey(url) || '';
    if (await this.isHostCoolingDown(ctx, subject.targetUserId, host)) {
      return defer('cooldown', `Not checked: ${host || 'this site'} was already sent to you in the last day.`);
    }

    const allowance = getAssistantWeeklyAllowance((account as any)?.accountType);
    const {allowed, remaining} = await this.consumeWeeklyAllowance(ctx, subject.targetUserId, allowance);
    if (!allowed) {
      return defer('weekly-cap', `Not checked: this week's ${allowance} assistant checks have been used.`, {}, 0);
    }

    try {
      // Admitted against the family's AI limits like any other hosted request.
      held.admission = await this.aiLimitService.admit(ctx, ACCESS_REVIEW_WORST_CASE_MICRO_USD);
    } catch (error) {
      // By code, not instanceof: ai_usage.service is withheld from Kindredly
      // Personal, and importing its error class here would fail to load there.
      if ((error as {code?: unknown} | null)?.code === 'AI_BUDGET_EXCEEDED') {
        return defer('budget', "Not checked: the family's AI limit is used up for now.", {}, remaining);
      }
      return defer('error', 'The assistant could not check this one.', {}, remaining);
    }

    let inputs: PageInputs;
    try {
      inputs = await this.gatherInputs(subject);
    } catch (error) {
      console.warn('[assistant-review] failed to gather page inputs', error);
      return defer('error', 'The assistant could not read this page.', {}, remaining);
    }

    if (inputs.unsafeCacheHit) {
      await this.setHostCooldown(ctx, subject.targetUserId, host);
      return defer(
        'unsafe-cache',
        "Not approved: Kindredly's own content check has flagged this site.",
        {inputs, reasonForChild: 'Sent to your parent to look at.'},
        remaining,
      );
    }

    const targetUser = await ctx.getUserById(subject.targetUserId).catch(() => null);
    const ageBand = ageBandForDob(((targetUser as any)?.dob || null) as DateOfBirth | null);
    const {input, note} = this.buildModelInput(subject, settings, inputs, ageBand, mode);

    let verdict: ParsedVerdict | null = null;
    let model: string | null = null;
    try {
      const completion = await withTimeout(
        this.withAdmission(ctx, held.admission, () =>
          this.aiTaskService.taskRequest(ctx, {
            taskname: 'accessRequestReview',
            data: {input, note},
          }),
        ),
        MODEL_TIMEOUT_MS,
        null,
      );
      model = (completion as any)?.model || null;
      verdict = this.parseVerdict((completion as any)?.message?.content ?? completion);
    } catch (error) {
      console.warn('[assistant-review] model call failed', error);
      verdict = null;
    }

    if (!verdict) {
      // No cooldown here: the assistant did not form a view, so the next ask
      // deserves a real look rather than inheriting a non-answer.
      return defer('error', 'The assistant could not check this one.', {inputs, model}, remaining);
    }

    // The two jobs do not swap. A site request cannot come back as a category
    // correction — nothing asked about a category and the child is not out of
    // time — and a category correction cannot come back as a grant, which would
    // put a site in the library on the strength of a question about minutes.
    // Neither is a model failure worth an error; both are questions for a parent.
    const decisionFitsMode = mode === 'grant' ? verdict.decision !== 'reclassify' : verdict.decision !== 'approve';

    if (!decisionFitsMode) {
      verdict = {...verdict, decision: 'leave_for_parent', reclassifiedEduValue: null};
    }

    // Armed on an approval as well as a hand-off.
    //
    // It used to be set only when the assistant declined, which left the obvious
    // gap open: a yes on one page of a host meant the next page on the same host
    // got a fresh roll, so a child could walk a site path by path immediately
    // after being approved. A whole-site grant makes the second ask unnecessary
    // anyway; a page grant means the second page is a question for a parent.
    await this.setHostCooldown(ctx, subject.targetUserId, host);

    return {
      kind: 'decided',
      aiReview: this.buildReview({
        decision: verdict.decision,
        source: 'model',
        reasonForParent: verdict.reasonForParent,
        reasonForChild: verdict.reasonForChild,
        confidence: verdict.confidence,
        matchedGuideline: verdict.matchedGuideline,
        suggestedGuideline: verdict.suggestedGuideline,
        // How wide the assistant acted: what an approval opened, or what a
        // correction recategorized. A hand-off changed nothing, so it has no
        // width. Both go through the same cap, so the two answers to "how much
        // of this site" cannot drift apart.
        grantedScope:
          verdict.decision === 'leave_for_parent' ? null : resolveAssistantScope(verdict.proposedScope, url),
        reclassifiedEduValue: verdict.reclassifiedEduValue,
        model,
        guidelines,
        inputs,
      }),
      remainingThisWeek: remaining,
    };
  }

  /**
   * The guardian in whose name a grant is written.
   *
   * `applyApproval` runs inside the *child's* request, and an item is owned by
   * whoever `_createItem` sees as the acting user. Left alone that made the child
   * the owner of the rule that grants them access — which worked, in the sense
   * that access worked, and also handed them edit rights over its `patterns`.
   * The share to the child was a no-op for the same reason: `shareItemWithUsers`
   * skips a target that is already the acting user.
   *
   * So the context is swapped for an account admin before the write, exactly as
   * `saveItem` does for a parent approving through an override. An account with no
   * admin throws rather than falling back to the child: the caller turns a throw
   * into a hand-off, which is the safe direction.
   */
  private async resolveGrantOwnerContext(ctx: RequestContext, targetUserId: string): Promise<RequestContext> {
    const users = await this.userRepo.listByAccountId(ctx.accountId);
    const admin = (users || []).find((user: any) => user?.type === UserType.admin && user?._id !== targetUserId);

    if (!admin?._id) {
      throw new Error('No account admin to own the assistant grant');
    }

    return ctx.cloneWithActingUser(admin._id, {tempAuthUserId: admin._id});
  }

  /**
   * Do what a parent's approval does: put the site in the child's library.
   *
   * The scope is decided upstream by `resolveAssistantScope` and passed in, so the
   * width recorded on the request row is the width actually written. Patterns are
   * built explicitly because the server does not derive them; the client normally
   * does, and an item saved without them is in the library without matching
   * anything the child visits.
   *
   * **The name is not the fetched title.** A server-side fetch is answered by the
   * site's bot protection often enough that this is a normal case rather than an
   * edge one, and the interstitial has a perfectly good title — which is how a
   * child's approved site arrived in the library called "Client Challenge", with
   * the interstitial's text as its description. When the title looks like a
   * challenge page both it and the description are dropped, because they came from
   * the same response, and the host stands in.
   *
   * Throws on failure. The caller downgrades to leave-for-parent rather than
   * telling a child they were approved when nothing was written.
   */
  async applyApproval(
    ctx: RequestContext,
    targetUserId: string,
    url: string,
    inputs: {title?: string | null; description?: string | null; siteName?: string | null} | null,
    grantedScope: UrlScopeKind,
  ): Promise<string | null> {
    const host = hostFromUrl(url) || 'Allowed Link';
    const challenged = isLikelyChallengeTitle(inputs?.title);

    const name = challenged ? host : inputs?.title || inputs?.siteName || host;
    const description = challenged ? undefined : inputs?.description || undefined;

    const ownerCtx = await this.resolveGrantOwnerContext(ctx, targetUserId);

    const result = await this.itemService.saveItem(ownerCtx, {
      details: {
        // `link`, as a parent's own approval writes. The retired shape was
        // `thing`/`information`, which is a container the library hides and
        // renders as a bare "Info" card.
        type: 'link',
        name,
        description,
        url,
        patterns: buildPatternsForUrlScope(grantedScope, url),
        info: {accessScopeKind: grantedScope},
      } as any,
      quickShareUserIds: [targetUserId],
    });

    return (result as any)?.itemId || null;
  }

  /**
   * Correct the category of a page, for one child.
   *
   * This is not an approval and grants nothing: no library item is written and no
   * other block is lifted. It writes one family policy `classify` rule scoped to
   * the child who asked (ARR-17), which is why the correction reaches them in
   * seconds and reaches nobody else at all.
   *
   * Written through `FamilyPolicyRuleService.upsert` under an account admin's
   * context, the same swap `applyApproval` makes and for the same reason: the
   * rule that changes what a child may do must not be owned or editable by that
   * child. The write is admin-checked there, so the swap is also what makes it
   * legal rather than a bypass of the check.
   *
   * The id is derived from the child and the target, so a second correction of
   * the same page replaces the first instead of stacking rules that disagree.
   *
   * Throws on failure. The caller downgrades to leave-for-parent rather than
   * telling a child their page was recategorized when nothing was written.
   */
  async applyReclassify(
    ctx: RequestContext,
    targetUserId: string,
    url: string,
    eduValue: AssistantReclassifyEduValue,
    scope: AssistantGrantScope,
  ): Promise<string | null> {
    const host = hostFromUrl(url);
    if (!host) throw new Error('Cannot reclassify a URL with no host');

    // Same two widths the grant path uses, so "how much did the assistant open"
    // and "how much did the assistant recategorize" mean the same thing to a
    // parent reading either one.
    const targetKind = scope === 'site' ? 'domain' : 'url_prefix';
    const targetValue = scope === 'site' ? host : url;
    const safeValue = targetValue.replace(/[^a-zA-Z0-9:_-]+/g, '_').slice(0, 120);
    const now = new Date().toISOString();

    const {entry} = await this.familyPolicyRuleService.upsert(await this.resolveGrantOwnerContext(ctx, targetUserId), {
      _id: `assistant_reclassify:${targetUserId}:${targetKind}:${safeValue}`,
      data: {
        ruleType: 'target_match',
        targetKind,
        targetValue,
        ...(targetKind === 'domain' ? {includeSubdomains: true} : {}),
        decisionKind: 'classify',
        eduValue,
        userIds: [targetUserId],
        enabled: true,
        source: 'assistant_review',
        note: 'Set by the assistant when this page was asked about.',
        createdAt: now,
        updatedAt: now,
      },
    } as any);

    return (entry as any)?._id || null;
  }
}

export default AccessRequestReviewService;
