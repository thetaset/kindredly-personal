import {RequestContext} from '@/base/request_context';
import {config} from '@/config';
import {v4 as uuidv4} from 'uuid';

import {getKeyValueStore} from '@/base/runtime.factory';

import NotificationService from './notification.service';
import EventAuditService from './record_event.service';
import {AccessRequestRepo} from '@/db/access_request.repo';
import {NotificationType} from '@/typing/enum_strings';
import AccessRequestReviewService from './access_request_review.service';
import {
  ASSISTANT_APPROVER_ID,
  assistantReviewHostKey,
  normalizeAccessRequestUrlKey,
} from 'tset-sharedlib/restrictions/assistantReview';
import type {AccessRequestAddResponse, AccessRequestAiReview} from 'tset-sharedlib/api';
import User from 'tset-sharedlib/schemas/public/User';
import {container} from '@/inversify.config';

/** How long the assistant's answer to a given site stands. */
const ASSISTANT_VERDICT_CACHE_DAYS = 7;

/**
 * How many times one child may ask in a day.
 *
 * Nothing capped this before. The rate-limit middleware refuses nothing by
 * explicit policy, there was no row cap, and the assistant's own guards only
 * limit how often a *model* runs — so a child could file requests until a parent
 * gave up reading them, and every one of them raised a notification.
 *
 * Set well above ordinary use and well below probing. A child meeting a new
 * filter might legitimately ask five or six times in an afternoon; walking a site
 * path by path to find what gets approved looks nothing like that.
 */
const DAILY_REQUESTS_PER_CHILD = 10;

/**
 * How long an answered request stays readable as history.
 *
 * Longer than the thirty days `fetchAccessRequests` reaches back, so trimming is
 * never what makes a row disappear from the screen.
 */
const DECIDED_HISTORY_RETENTION_DAYS = 90;

class AccessRequestService {
  private notificationsService = container.resolve(NotificationService);
  private accessRequests = new AccessRequestRepo();
  private auditService = new EventAuditService();
  private reviewService = new AccessRequestReviewService();

  /**
   * What a requester's own block page may know about the assistant: whether a
   * check will happen, and how many they have left this week.
   *
   * Self-scoped by the route, and deliberately narrow — the page it feeds used to
   * read the guidelines pref directly, which told the child the exact rules their
   * request would be judged against.
   */
  // ROUTE-METHOD
  async getAssistantReviewStatus(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    return this.reviewService.statusForUser(ctx, targetUserId);
  }

  private _getLocalMidnight(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private _parseTimeReqDateFromKey(key?: string | null): Date | null {
    if (!key) return null;
    if (!key.startsWith('TIMEREQ_')) return null;
    // Key format: TIMEREQ_YYYY-M-D H:00
    const match = /^TIMEREQ_(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(key);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private _getExpiresAtTsFromDetails(details: any): number | null {
    if (!details) return null;
    const ts = (details as any).expiresAtTs;
    if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
    const iso = (details as any).expiresAt;
    if (typeof iso === 'string') {
      const parsed = Date.parse(iso);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private _shouldAutoExpire(accessRequest: any, now: Date): boolean {
    // Only auto-expire pending requests.
    if ((accessRequest?.status || null) !== 'requested') return false;

    const details = accessRequest?.details;
    const explicitExpiresAtTs = this._getExpiresAtTsFromDetails(details);
    if (explicitExpiresAtTs != null) {
      return explicitExpiresAtTs <= now.getTime();
    }

    // Backward compatibility: older time requests encode the date in the key.
    if (accessRequest?.type === 'time') {
      const reqDate = this._parseTimeReqDateFromKey(accessRequest?.key);
      if (!reqDate) return false;
      const todayStart = this._getLocalMidnight(now).getTime();
      return reqDate.getTime() < todayStart;
    }

    return false;
  }

  private async _autoExpireRequests(ctx: RequestContext): Promise<void> {
    if (!ctx.accountId) return;

    const now = new Date();

    // Keep the scan bounded; access requests should be low volume.
    const candidates = await this.accessRequests
      .findMany({accountId: ctx.accountId, status: 'requested'} as any)
      .orderBy('createdAt', 'asc')
      .limit(500);

    // Answered rows are kept as the history, but not forever. The list itself
    // only reaches back thirty days, so ninety is headroom rather than a limit
    // anyone will notice — and without it the table is the one place in the
    // product that grows on every decision and is never trimmed.
    try {
      await this.accessRequests
        .query()
        .from('access_request')
        .where({accountId: ctx.accountId} as any)
        .whereNot({status: 'requested'} as any)
        .andWhere('updatedAt', '<', new Date(now.getTime() - DECIDED_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000))
        .delete();
    } catch (err) {
      // Best-effort trim; listing should still succeed.
      console.warn('[access_request] Failed to trim decided history', err);
    }

    for (const request of candidates as any[]) {
      if (!this._shouldAutoExpire(request, now)) continue;
      try {
        await this._deleteAccessRequestRow(ctx, request._id);
      } catch (err) {
        // Best-effort cleanup; listing should still succeed.
        console.warn('[access_request] Failed to auto-expire request', {
          id: request?._id,
          type: request?.type,
          key: request?.key,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ROUTE-METHOD
  async listAllAccessRequestsInAccount(ctx: RequestContext) {
    await ctx.verifyCurrentUserIsAdmin();
    await this._autoExpireRequests(ctx);
    let allRecords = await this.accessRequests.fetchAccessRequests(ctx.accountId);
    return allRecords;
  }

  // ROUTE-METHOD
  /**
   * The sidebar badge: things still waiting on a person.
   *
   * Scoped to pending on purpose. Assistant-approved rows stay in the table as
   * the record of what was granted, and counting them would leave a parent with a
   * badge that never clears and nothing to click that would clear it.
   */
  async countAccessRequestsInAccount(ctx: RequestContext) {
    await this._autoExpireRequests(ctx);
    return await this.accessRequests.countRows({accountId: ctx.accountId, status: 'requested'} as any);
  }

  // ROUTE-METHOD
  /**
   * A requester's own list: what they are still waiting on.
   *
   * Pending only. The assistant tells a child its answer at the moment they ask,
   * so a decided row here would be old news carrying a Cancel button that now
   * (correctly) refuses to work. The parent's screen is where decided rows live.
   */
  async listAccessRequestsByRequesterId(ctx: RequestContext, requesterId: string) {
    if (ctx.currentUserId != requesterId) await ctx.verifyAdminPermissions(requesterId);
    await this._autoExpireRequests(ctx);
    return await this.accessRequests
      .findMany({requesterId, accountId: ctx.accountId, status: 'requested'} as any)
      .orderBy('createdAt', 'desc')
      .limit(100);
  }

  /** Unguarded delete, for the internal expiry and approval paths. */
  private async _deleteAccessRequestRow(ctx: RequestContext, id: string) {
    return await this.accessRequests.deleteWithId(id, {accountId: ctx.accountId});
  }

  // ROUTE-METHOD
  /**
   * Cancel a request.
   *
   * A child may withdraw their own ask while it is still pending, and nothing
   * else. This used to delete any row in the account for anyone who could name
   * an id, which was harmless while every row was a live question — and stopped
   * being harmless the moment an answered row became the RECORD of an assistant
   * approval, since the child it was granted to could then erase the evidence.
   *
   * The two cases now part company, because they are different acts. A pending
   * row nobody has answered is withdrawn — there is nothing to remember. An
   * answered row is a decision, so a guardian dismissing it is clearing their
   * queue, not erasing the record: it leaves the list and stays in the history.
   */
  async removeAccessRequestById(ctx: RequestContext, id: string) {
    const row = await this.accessRequests.findById(id, {accountId: ctx.accountId} as any);
    if (!row || row.accountId !== ctx.accountId) throw new Error('Request not found');

    const isAdmin = await ctx.isAdmin();
    const isPending = (row.status || 'requested') === 'requested';

    if (!isAdmin) {
      if (row.requesterId !== ctx.currentUserId) throw new Error('Request not found');
      if (!isPending) throw new Error('This request has already been answered');
    }

    if (!isPending) {
      await this.accessRequests.updateWithId(row._id, {
        details: {...((row as any).details || {}), dismissedAt: new Date().toISOString()},
        updatedAt: new Date(),
      } as any);
      return true;
    }

    return await this._deleteAccessRequestRow(ctx, id);
  }

  /**
   * Write the row and record the event. Split out of `addAccessRequest` because
   * the assistant needs to file a row that is already answered, and duplicating
   * the shape is how the two drift apart.
   */
  private async _createRow(
    ctx: RequestContext,
    input: {
      key: string;
      type: string;
      details: any;
      message: string;
      status?: string;
      approverId?: string | null;
      approverNote?: string | null;
    },
  ): Promise<string> {
    const accessRequestId = 'arq_' + uuidv4();
    const now = new Date();

    await this.accessRequests.create({
      _id: accessRequestId,
      key: input.key,
      type: input.type,
      accountId: ctx.accountId,
      requesterId: ctx.currentUserId,
      createdAt: now,
      updatedAt: now,
      status: input.status || 'requested',
      details: input.details,
      requesterNote: input.message,
      approverId: input.approverId ?? null,
      approverNote: input.approverNote ?? null,
    } as any);

    this.auditService.recordEvent({
      eventName: 'ACCESS_REQUEST',
      eventType: 'explicit',
      eventInfo: {
        key: input.key,
        requesterId: ctx.currentUserId,
        ...(input.approverId === ASSISTANT_APPROVER_ID ? {decidedBy: 'assistant'} : {}),
      },
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
    });

    return accessRequestId;
  }

  /**
   * What a child is told when they have used up the day's asks.
   *
   * Deliberately not an error and deliberately not a 429. The rate-limit
   * middleware refuses nothing by explicit policy — "shed load by delaying more,
   * not by rejecting" — and this is a product rule, not load shedding, so it must
   * not become the one exception that teaches the next reader otherwise.
   *
   * The copy names the way out that still works: a person.
   */
  private _dailyCapResponse(): AccessRequestAddResponse {
    return {
      limited: {
        reason: 'daily-cap',
        message: "You've asked a lot today. You can ask again tomorrow, or ask a parent in person.",
      },
    };
  }

  /**
   * Count this ask, and say whether the child has had their day's worth.
   *
   * Counts **asks, not rows**. A row can be withdrawn, and a counter derived from
   * rows would reset every time a child cancelled one — which is the first thing
   * anyone probing would find.
   *
   * **Fails open**, which is the opposite of every other guard in this feature.
   * The assistant's allowance and cooldown fail closed because an unmetered path
   * to automatic approval is worse than a hand-off. This is not that: a child who
   * cannot file a request has no way to reach a parent at all, and an unreachable
   * Redis must not be the thing that stops them asking.
   */
  private async _countDailyAsk(ctx: RequestContext): Promise<{allowed: boolean; used: number}> {
    const day = new Date().toISOString().slice(0, 10);
    const key = `arq_day:${ctx.accountId}:${ctx.currentUserId}:${day}`;

    try {
      const store = getKeyValueStore();
      const used = Number(await store.incr(key));
      // Two days, so a counter set just before midnight still expires on its own.
      if (used === 1) await store.expire(key, 2 * 24 * 60 * 60);
      if (!Number.isFinite(used)) return {allowed: true, used: 0};
      return {allowed: used <= DAILY_REQUESTS_PER_CHILD, used};
    } catch (error) {
      console.warn("[access_request] could not count today's asks", error);
      return {allowed: true, used: 0};
    }
  }

  /**
   * The assistant's answer to a request identical to one already asked.
   *
   * This is the anti-gaming core, and it is why the verdict lives on the row.
   * Without it a child re-submits the same site until a model has an off moment;
   * with it the second ask is not a new question, so it does not get a new roll.
   * Returns null when there is nothing on file.
   */
  private _findCachedReview(
    rows: any[],
    reviewKey: string,
    currentGuidelinesHash: string | null,
  ): {row: any; aiReview: AccessRequestAiReview} | null {
    for (const row of rows) {
      const aiReview = (row?.details as any)?.aiReview as AccessRequestAiReview | undefined;
      if (!aiReview) continue;
      if (normalizeAccessRequestUrlKey(row?.key) !== reviewKey) continue;

      // Judged against rules the parent has since rewritten, so it is not an
      // answer to the question being asked now. Changing the guidelines has to
      // visibly change what happens next, or the setting is a lie.
      if (currentGuidelinesHash && aiReview.guidelinesHash && aiReview.guidelinesHash !== currentGuidelinesHash) {
        continue;
      }

      return {row, aiReview};
    }
    return null;
  }

  // ROUTE-METHOD
  async addAccessRequest(
    ctx: RequestContext,
    key: string,
    type: string,
    details: any,
    message: string,
  ): Promise<AccessRequestAddResponse> {
    const requestType = type || 'url';

    // Library-add requests dedup by requester+key so re-asking for the same
    // item doesn't pile up duplicates for the parent.
    if (requestType === 'publishedItem' || requestType === 'item') {
      const existing = await this._getAccessRequestByRequesterAndKey(ctx, key);
      const pendingType = requestType === 'publishedItem' ? 'publishedItem' : 'item';
      const pending = (existing as any[]).find((r) => r?.type === pendingType && r?.status === 'requested');
      if (pending) return {requestId: pending._id};
    }

    const requester = await ctx.getCurrentUser();
    const reviewKey = requestType === 'url' ? normalizeAccessRequestUrlKey(key) : null;

    // A request that is not for a site has no dedupe of its own, so it is counted
    // before anything else. Time and check-in asks are the cheapest to spam.
    if (!reviewKey) {
      const daily = await this._countDailyAsk(ctx);
      if (!daily.allowed) return this._dailyCapResponse();
    }

    if (reviewKey) {
      const since = new Date(Date.now() - ASSISTANT_VERDICT_CACHE_DAYS * 24 * 60 * 60 * 1000);
      const recent = await this.accessRequests.listRecentUrlRequestsByRequester(
        ctx.accountId,
        ctx.currentUserId,
        since,
      );

      // Already asked and still waiting. Silently the same request — no second
      // row, and above all no second notification, which is what made a child
      // pressing Submit twice look like nagging to a parent.
      const pending = (recent as any[]).find(
        (r) => r?.status === 'requested' && normalizeAccessRequestUrlKey(r?.key) === reviewKey,
      );
      if (pending) {
        const priorReview = (pending.details as any)?.aiReview as AccessRequestAiReview | undefined;
        return {
          requestId: pending._id,
          ...(priorReview
            ? {
                aiReview: {
                  checked: priorReview.source === 'model',
                  decision: priorReview.decision,
                  reasonForChild: priorReview.reasonForChild,
                  remainingThisWeek: null,
                },
              }
            : {}),
        };
      }

      // Past the dedupe, so this is a question the parent has not been asked yet.
      // Counted here rather than at the row write, because the repeat-ask path
      // below also files a row and re-notifies, and it must not be a way around
      // the cap.
      const dailyUrl = await this._countDailyAsk(ctx);
      if (!dailyUrl.allowed) return this._dailyCapResponse();

      // Read once here so a verdict judged against rules the parent has since
      // rewritten is not handed back as though it still applied.
      const currentGuidelinesHash = await this.reviewService
        .currentGuidelinesFingerprint(ctx, ctx.currentUserId)
        .catch(() => null);
      const cached = this._findCachedReview(recent as any[], reviewKey, currentGuidelinesHash);
      if (cached) {
        if (cached.aiReview.decision === 'approve' || cached.aiReview.decision === 'reclassify') {
          // Already acted on, and what it wrote is still in force — a library item
          // for an approval, a category rule for a correction. Hand back the same
          // answer rather than writing a second copy of either.
          return {
            requestId: cached.row._id,
            aiReview: {
              checked: true,
              decision: cached.aiReview.decision,
              reasonForChild: cached.aiReview.reasonForChild,
              remainingThisWeek: null,
            },
          };
        }

        // Previously left for the parent, and they have not answered. File the
        // ask again so it is in front of them, but do not pay for a second
        // opinion on a question whose answer has not changed.
        const repeatReview: AccessRequestAiReview = {...cached.aiReview, source: 'cached'};
        const requestId = await this._createRow(ctx, {
          key,
          type: requestType,
          details: {...(details || {}), aiReview: repeatReview},
          message,
        });
        await this.notificationsService.sendAccessRequestNotification(ctx, requester, requestId, key, requestType, {
          ...(details || {}),
          aiReview: repeatReview,
        });
        return {
          requestId,
          aiReview: {
            checked: false,
            decision: 'leave_for_parent',
            reasonForChild: repeatReview.reasonForChild,
            remainingThisWeek: null,
          },
        };
      }
    }

    const outcome = await this.reviewService.review(ctx, {
      url: key,
      targetUserId: ctx.currentUserId,
      details,
      note: message,
      requestType,
    });

    if (outcome.kind === 'decided' && outcome.aiReview.decision === 'approve') {
      let libraryItemId: string | null = null;
      try {
        libraryItemId = await this.reviewService.applyApproval(
          ctx,
          ctx.currentUserId,
          key,
          {
            // The page's real title, so the parent's library shows "Photosynthesis"
            // rather than "en.wikipedia.org" — unless the title came from the
            // site's bot protection, which `applyApproval` detects and discards.
            title: outcome.aiReview.inputs.title,
            description: outcome.aiReview.inputs.description,
            siteName: outcome.aiReview.inputs.siteName,
          },
          // The width already recorded on the review, so what a parent reads on
          // the row is what was written to the library.
          outcome.aiReview.grantedScope || 'specific',
        );
      } catch (error) {
        // Never tell a child they were approved when nothing was written. The
        // request becomes an ordinary one and a parent decides.
        console.warn('[access_request] assistant approval could not be applied', error);
        const failed: AccessRequestAiReview = {
          ...outcome.aiReview,
          decision: 'leave_for_parent',
          source: 'error',
          reasonForParent: 'The assistant approved this, but adding it to the library failed.',
          reasonForChild: 'Sent to your parent to look at.',
        };
        const requestId = await this._createRow(ctx, {
          key,
          type: requestType,
          details: {...(details || {}), aiReview: failed},
          message,
        });
        await this.notificationsService.sendAccessRequestNotification(ctx, requester, requestId, key, requestType, {
          ...(details || {}),
          aiReview: failed,
        });
        return {
          requestId,
          aiReview: {
            checked: true,
            decision: 'leave_for_parent',
            reasonForChild: failed.reasonForChild,
            remainingThisWeek: outcome.remainingThisWeek,
          },
        };
      }

      const requestId = await this._createRow(ctx, {
        key,
        type: requestType,
        details: {...(details || {}), aiReview: outcome.aiReview, libraryItemId},
        message,
        // Kept, not deleted. A parent's approval closes the row; this one IS the
        // record of what was approved in their name, so it has to survive.
        status: 'approved',
        approverId: ASSISTANT_APPROVER_ID,
        approverNote: outcome.aiReview.reasonForParent,
      });

      const host = (() => {
        try {
          return new URL(key).hostname.replace(/^www\./, '');
        } catch {
          return key;
        }
      })();
      const requesterName = (requester as any)?.displayedName || (requester as any)?.username || 'Your child';

      // Offered, not sent. The category's defaults are both false
      // (`userPrefDefaults`), so `canSend` refuses email and push until a parent
      // switches one on — which is the point: switching this feature on is a
      // request for these to stop reaching you, and pushing every one would undo
      // it. Passing `true` here is what makes the preference reachable at all;
      // passing `false` meant the row in Notification Settings could never do
      // anything. The in-app notice is written either way.
      await this.notificationsService.addAccountNotification(
        ctx,
        NotificationType.LIBRARY_AUTO_APPROVAL_APPROVED,
        ctx.currentUserId,
        ctx.accountId,
        {
          title: 'AI approved a site',
          message: `${requesterName} asked for ${host}. ${outcome.aiReview.reasonForParent}`,
          shortMessage: `Approved ${host} for ${requesterName}`,
          refInfo: {requestId, url: key, decision: 'approve', targetUserId: ctx.currentUserId},
        },
        true,
      );

      return {
        requestId,
        aiReview: {
          checked: outcome.aiReview.source === 'model',
          decision: 'approve',
          reasonForChild: outcome.aiReview.reasonForChild,
          remainingThisWeek: outcome.remainingThisWeek,
        },
      };
    }

    if (outcome.kind === 'decided' && outcome.aiReview.decision === 'reclassify') {
      let reclassifyRuleId: string | null = null;
      try {
        reclassifyRuleId = await this.reviewService.applyReclassify(
          ctx,
          ctx.currentUserId,
          key,
          outcome.aiReview.reclassifiedEduValue!,
          // Same two widths the grant path uses, capped the same way.
          outcome.aiReview.grantedScope || 'specific',
        );
      } catch (error) {
        // Same rule as a failed approval: never tell a child something changed
        // when nothing was written. It becomes an ordinary ask for more time.
        console.warn('[access_request] assistant reclassification could not be applied', error);
        const failed: AccessRequestAiReview = {
          ...outcome.aiReview,
          decision: 'leave_for_parent',
          source: 'error',
          reasonForParent: 'The assistant read this as study material, but changing its category failed.',
          reasonForChild: 'Sent to your parent to look at.',
          reclassifiedEduValue: null,
        };
        const requestId = await this._createRow(ctx, {
          key,
          type: requestType,
          details: {...(details || {}), aiReview: failed},
          message,
        });
        await this.notificationsService.sendAccessRequestNotification(ctx, requester, requestId, key, requestType, {
          ...(details || {}),
          aiReview: failed,
        });
        return {
          requestId,
          aiReview: {
            checked: true,
            decision: 'leave_for_parent',
            reasonForChild: failed.reasonForChild,
            remainingThisWeek: outcome.remainingThisWeek,
          },
        };
      }

      const applied: AccessRequestAiReview = {...outcome.aiReview, reclassifyRuleId};
      const requestId = await this._createRow(ctx, {
        key,
        type: requestType,
        details: {...(details || {}), aiReview: applied},
        message,
        // Kept for the same reason an assistant approval is: this row IS the
        // record of a change made in the parent's name, and the one place they
        // can undo it.
        status: 'approved',
        approverId: ASSISTANT_APPROVER_ID,
        approverNote: applied.reasonForParent,
      });

      const requesterName = (requester as any)?.displayedName || (requester as any)?.username || 'Your child';

      // The same notification type an assistant approval uses. Its name is about
      // the library and this is not, but the type is persisted on every existing
      // notification row and governs one parent preference — "tell me when the
      // assistant acted" — which is the question a parent is actually answering.
      // The copy below is what they read, and it says what happened.
      await this.notificationsService.addAccountNotification(
        ctx,
        NotificationType.LIBRARY_AUTO_APPROVAL_APPROVED,
        ctx.currentUserId,
        ctx.accountId,
        {
          title: 'AI changed a category',
          message: `${requesterName} was out of time on ${assistantReviewHostKey(key) || key}. ${applied.reasonForParent}`,
          shortMessage: `Recategorized ${assistantReviewHostKey(key) || key} for ${requesterName}`,
          refInfo: {requestId, url: key, decision: 'reclassify', targetUserId: ctx.currentUserId},
        },
        // Same as the approval above: offered, and refused by the default-off
        // preference until a parent asks for it.
        true,
      );

      return {
        requestId,
        aiReview: {
          checked: outcome.aiReview.source === 'model',
          decision: 'reclassify',
          reasonForChild: applied.reasonForChild,
          remainingThisWeek: outcome.remainingThisWeek,
        },
      };
    }

    const aiReview = outcome.kind === 'decided' ? outcome.aiReview : null;
    const detailsWithReview = aiReview ? {...(details || {}), aiReview} : details;

    const accessRequestId = await this._createRow(ctx, {
      key,
      type: requestType,
      details: detailsWithReview,
      message,
    });

    await this.notificationsService.sendAccessRequestNotification(
      ctx,
      requester,
      accessRequestId,
      key,
      requestType,
      detailsWithReview,
    );

    return {
      requestId: accessRequestId,
      ...(aiReview
        ? {
            aiReview: {
              checked: aiReview.source === 'model',
              decision: aiReview.decision,
              reasonForChild: aiReview.reasonForChild,
              remainingThisWeek: outcome.kind === 'decided' ? outcome.remainingThisWeek : null,
            },
          }
        : {}),
    };
  }

  // ROUTE-METHOD
  async processAccessRequest(ctx: RequestContext, id: string, status: string, approverNote: string) {
    let message = '';
    const accessrequest = await this._getAccessRequestById(ctx, id);

    const isApproved = status === 'approved' || status === 'done';

    if (ctx.accountId != accessrequest.accountId) throw new Error('Access denied');

    // A row the assistant already answered is a record, not a question. Acting on
    // it again would add the site to the library a second time (the parent's
    // approve path creates its own item) and delete the only evidence of what was
    // granted in their name. The deep link from the approval notification lands
    // on this screen, so this is reachable by an ordinary click, not just an
    // engineered one.
    if (accessrequest.approverId === ASSISTANT_APPROVER_ID) {
      throw new Error('This request was already decided by the assistant');
    }

    const isActionRequest = accessrequest.type === 'action';

    // An answered request is kept as the record of what was decided and by whom.
    //
    // It used to be deleted, which meant the only durable trace of a family's
    // access decisions was the ones the ASSISTANT made — a parent's own answers
    // vanished the moment they gave them. That made "your parent can see every
    // request" untrue, and left a guardian unable to check what a co-guardian had
    // allowed. `fetchAccessRequests` already returns pending plus thirty days of
    // decided, so keeping the row is all the history needs.
    //
    // Action requests keep their own rules below: an approved one is consumed by
    // the action itself, and that flow reads the row rather than a log.
    if (!isActionRequest) {
      await this.accessRequests.updateWithId(accessrequest._id, {
        status: isApproved ? 'approved' : 'denied',
        approverNote: approverNote ?? null,
        // Who answered, so a co-guardian reading the history is not left guessing.
        approverId: ctx.currentUserId,
        updatedAt: new Date(),
      } as any);
    } else {
      if (isApproved) {
        await this.accessRequests.updateWithId(accessrequest._id, {
          status: 'approved',
          approverNote: approverNote ?? null,
          updatedAt: new Date(),
        } as any);
      } else {
        await this._deleteAccessRequestRow(ctx, id);
      }
    }

    // The key is a publishId (not a URL) for published-catalog add requests,
    // and an itemId for library-item add requests.
    const isPublishedItemRequest = accessrequest.type === 'publishedItem';
    const isLibraryItemRequest = accessrequest.type === 'item';
    const publishedItemName = (accessrequest.details as any)?.srcTitle || 'the item';
    const libraryItemName =
      (accessrequest.details as any)?.srcTitle || (accessrequest.details as any)?.name || 'the item';

    let title = 'Request ';
    if (isApproved) {
      title += 'Granted';
      if (isActionRequest) {
        message = `Request GRANTED for ${accessrequest.key}.`;
      } else if (isPublishedItemRequest) {
        message = `Request GRANTED: "${publishedItemName}" was added to your library.`;
      } else if (isLibraryItemRequest) {
        message = `Request GRANTED: "${libraryItemName}" was added to your library.`;
      } else {
        message = `Request GRANTED for <a href="${accessrequest.key}">${accessrequest.key}</a>. `;
      }
    } else {
      title += 'Denied';
      message = isPublishedItemRequest
        ? `Request DENIED for "${publishedItemName}"`
        : isLibraryItemRequest
          ? `Request DENIED for "${libraryItemName}"`
          : `Request DENIED for ${accessrequest.key}`;
    }

    const notificationData = {
      title: title,
      message: message,
      additionalMessage: approverNote,
      refInfo: {
        requestId: id,
        resourceType: isActionRequest
          ? 'action'
          : isPublishedItemRequest
            ? 'publishedItem'
            : isLibraryItemRequest
              ? 'item'
              : 'url',
        resourceURL: accessrequest.key,
        approvalStatus: isApproved ? 'approved' : status,
      },
    };

    await this.notificationsService.addUserNotification(
      ctx,
      NotificationType.ACCESS_REQUEST_UPDATE,
      ctx.currentUserId,
      ctx.accountId,
      accessrequest.requesterId,
      notificationData,
      true,
    );
    return {};
  }

  async _getAccessRequestById(ctx: RequestContext, id: string) {
    const accessRequest = await this.accessRequests.findById(id, {accountId: ctx.accountId});
    if (accessRequest.accountId != ctx.accountId) throw new Error('Request not found');

    return accessRequest;
  }

  async _getAccessRequestByRequesterAndKey(ctx: RequestContext, key) {
    return await this.accessRequests.findMany({requesterId: ctx.currentUserId, key});
  }
}

export default AccessRequestService;
