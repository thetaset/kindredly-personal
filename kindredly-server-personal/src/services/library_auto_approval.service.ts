import {RequestContext} from '@/base/request_context';
import {config} from '@/config';
import {UserPrefRepo} from '@/db/user_pref.repo';
import {UserRepo} from '@/db/user.repo';
import {isUnderAge} from 'tset-sharedlib/date.utils';
import {NotificationType} from '@/typing/enum_strings';
import NotificationService from './notification.service';
import ExternalDataService from './external_data.service';
import ItemService from './item.service';
import AccessRequestService from './access_request.service';
import type {
  LibraryAutoApprovalEvaluateRequest,
  LibraryAutoApprovalEvaluateResponse,
  LibraryAutoApprovalSettings,
} from 'tset-sharedlib/api';
import type {DateOfBirth} from 'tset-sharedlib/date.utils';
import {UserType} from 'tset-sharedlib/shared.types';
import {container} from '@/inversify.config';

const AUTO_APPROVAL_PREF_KEY = 'filters.autoApprovalSettings';

function normalizeTrustedDomain(input: string): string | null {
  const trimmed = String(input || '')
    .trim()
    .toLowerCase();
  if (!trimmed) return null;

  let candidate = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .trim();

  if (!candidate || candidate.startsWith('.')) return null;
  if (!/^[a-z0-9.-]+$/.test(candidate)) return null;
  if (!candidate.includes('.') && candidate !== 'localhost') return null;
  return candidate;
}

function normalizeAutoApprovalSettings(raw: unknown): LibraryAutoApprovalSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const criteriaRaw =
    input.criteria && typeof input.criteria === 'object' ? (input.criteria as Record<string, unknown>) : {};
  const trustedDomains = Array.isArray(criteriaRaw.trustedDomains)
    ? Array.from(
        new Set(
          criteriaRaw.trustedDomains
            .map((v) => normalizeTrustedDomain(String(v || '')))
            .filter((v): v is string => !!v),
        ),
      )
    : [];
  const allowedAgeBandsRaw = Array.isArray(criteriaRaw.allowedAgeBands)
    ? criteriaRaw.allowedAgeBands
    : ['child', 'teen', 'adult'];
  const allowedAgeBands = Array.from(
    new Set(
      allowedAgeBandsRaw
        .map((v) =>
          String(v || '')
            .trim()
            .toLowerCase(),
        )
        .filter((v) => v === 'child' || v === 'teen' || v === 'adult'),
    ),
  ) as Array<'child' | 'teen' | 'adult'>;

  return {
    enabled: input.enabled === true,
    experimental: input.experimental !== false,
    criteria: {
      enabled: criteriaRaw.enabled === true,
      requireTrustedDomain: criteriaRaw.requireTrustedDomain === true,
      trustedDomains,
      requireEducational: criteriaRaw.requireEducational === true,
      allowedAgeBands: allowedAgeBands.length > 0 ? allowedAgeBands : ['child', 'teen', 'adult'],
      customPolicyPrompt:
        typeof criteriaRaw.customPolicyPrompt === 'string' ? criteriaRaw.customPolicyPrompt.trim().slice(0, 1200) : '',
    },
  };
}

function getAgeBandForDob(dob?: DateOfBirth | null): 'child' | 'teen' | 'adult' {
  if (!dob) return 'adult';
  if (isUnderAge(dob, 13)) return 'child';
  if (isUnderAge(dob, 18)) return 'teen';
  return 'adult';
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

class LibraryAutoApprovalService {
  private userPrefRepo = new UserPrefRepo();
  private userRepo = new UserRepo();
  private notificationService = container.resolve(NotificationService);
  private externalDataService = new ExternalDataService();
  private itemService = new ItemService();
  private accessRequestService = new AccessRequestService();

  private isExperimentEnabled(): boolean {
    return config.devMode === true || process.env.ENABLE_LIBRARY_AUTO_APPROVAL_EXPERIMENT === 'true';
  }

  private async notifyParents(
    ctx: RequestContext,
    targetUserId: string,
    payload: {
      type: NotificationType;
      title: string;
      message: string;
      shortMessage: string;
      refInfo: any;
    },
  ) {
    const admins = await this.userRepo
      .where({accountId: ctx.accountId, type: UserType.admin, deleted: false})
      .limit(20);

    const uniqueAdminIds = Array.from(new Set((admins || []).map((u: any) => String(u?._id || '')).filter(Boolean)));
    await Promise.all(
      uniqueAdminIds.map(async (adminId) => {
        await this.notificationService.addUserNotification(
          ctx,
          payload.type,
          ctx.currentUserId,
          ctx.accountId,
          adminId,
          {
            title: payload.title,
            message: payload.message,
            shortMessage: payload.shortMessage,
            refInfo: {
              ...(payload.refInfo || {}),
              targetUserId,
            },
          },
          true,
        );
      }),
    );
  }

  private async approveAndAddToLibrary(ctx: RequestContext, targetUserId: string, url: string) {
    const hostname = hostFromUrl(url) || 'Allowed Link';
    await this.itemService.saveItem(ctx, {
      details: {
        type: 'thing',
        subType: 'information',
        name: hostname,
        url,
      } as any,
      quickShareUserIds: [targetUserId],
    });
  }

  async evaluateAndApply(
    ctx: RequestContext,
    data: LibraryAutoApprovalEvaluateRequest,
  ): Promise<LibraryAutoApprovalEvaluateResponse> {
    const targetUserId = data.userId || ctx.currentUserId;
    await ctx.verifySelfOrAdmin(targetUserId);

    if (!this.isExperimentEnabled()) {
      return {
        enabled: false,
        settingsApplied: false,
        decision: 'review',
        reason: 'experimental-dev-gate-disabled',
      };
    }

    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser) {
      return {
        enabled: false,
        settingsApplied: false,
        decision: 'review',
        reason: 'target-user-not-found',
      };
    }

    const options = (targetUser as any)?.options || {};
    if (options?.whitelistingEnabled !== true) {
      return {
        enabled: false,
        settingsApplied: false,
        decision: 'review',
        reason: 'not-library-only-mode',
      };
    }

    const saved = await this.userPrefRepo.getUserPref(targetUserId, AUTO_APPROVAL_PREF_KEY);
    const settings = normalizeAutoApprovalSettings(saved);
    if (!settings.enabled || !settings.criteria.enabled) {
      return {
        enabled: false,
        settingsApplied: false,
        decision: 'review',
        reason: 'feature-disabled',
      };
    }

    const url = String(data.url || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return {
        enabled: true,
        settingsApplied: true,
        decision: 'review',
        reason: 'invalid-url',
      };
    }

    const targetAgeBand = getAgeBandForDob(((targetUser as any)?.dob || null) as DateOfBirth | null);
    if (!settings.criteria.allowedAgeBands.includes(targetAgeBand)) {
      await this.notifyParents(ctx, targetUserId, {
        type: NotificationType.LIBRARY_AUTO_APPROVAL_DENIED,
        title: 'Auto Approval Denied',
        message: `Auto-approval denied because the user age band (${targetAgeBand}) is outside configured criteria for ${url}.`,
        shortMessage: 'Auto-approval denied (age criteria)',
        refInfo: {url, decision: 'denied', reason: 'age-band-not-allowed'},
      });
      return {
        enabled: true,
        settingsApplied: true,
        decision: 'denied',
        reason: 'age-band-not-allowed',
      };
    }

    const hostname = hostFromUrl(url);
    if (
      settings.criteria.requireTrustedDomain &&
      (hostname.length === 0 ||
        !settings.criteria.trustedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`)))
    ) {
      await this.notifyParents(ctx, targetUserId, {
        type: NotificationType.LIBRARY_AUTO_APPROVAL_DENIED,
        title: 'Auto Approval Denied',
        message: `Auto-approval denied because ${url} did not match trusted domains.`,
        shortMessage: 'Auto-approval denied (untrusted domain)',
        refInfo: {url, decision: 'denied', reason: 'trusted-domain-required'},
      });
      return {
        enabled: true,
        settingsApplied: true,
        decision: 'denied',
        reason: 'trusted-domain-required',
      };
    }

    const classification = await this.externalDataService.contentClassification(ctx, {
      url,
      features: {
        ...(data.meta || {}),
        policyPrompt: settings.criteria.customPolicyPrompt || undefined,
      },
    });

    const categories = Array.isArray(classification?.details?.categories)
      ? classification.details.categories.map((c: any) => String(c?.value || '').toLowerCase())
      : [];
    const eduValue = String(classification?.details?.eduValue?.value || '').toLowerCase();
    const isEducational =
      eduValue.includes('educational') ||
      categories.some(
        (c) => c.includes('educational') || c.includes('learning') || c.includes('science') || c.includes('history'),
      );

    if (settings.criteria.requireEducational && !isEducational) {
      await this.notifyParents(ctx, targetUserId, {
        type: NotificationType.LIBRARY_AUTO_APPROVAL_DENIED,
        title: 'Auto Approval Denied',
        message: `Auto-approval denied because ${url} did not meet educational criteria.`,
        shortMessage: 'Auto-approval denied (educational criteria)',
        refInfo: {url, decision: 'denied', reason: 'educational-required'},
      });
      return {
        enabled: true,
        settingsApplied: true,
        decision: 'denied',
        reason: 'educational-required',
        confidence: classification?.confidence,
      };
    }

    const shouldApprove =
      (!settings.criteria.requireEducational || isEducational) &&
      (!settings.criteria.requireTrustedDomain ||
        (hostname.length > 0 &&
          settings.criteria.trustedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))));

    if (shouldApprove) {
      await this.approveAndAddToLibrary(ctx, targetUserId, url);
      await this.notifyParents(ctx, targetUserId, {
        type: NotificationType.LIBRARY_AUTO_APPROVAL_APPROVED,
        title: 'Auto Approval Added to Library',
        message: `Auto-approval added ${url} to the library for user ${targetUserId}.`,
        shortMessage: 'Auto-approval granted',
        refInfo: {url, decision: 'approved', reason: 'criteria-matched'},
      });
      return {
        enabled: true,
        settingsApplied: true,
        decision: 'approved',
        reason: 'criteria-matched',
        confidence: classification?.confidence,
        addedToLibrary: true,
      };
    }

    const accessRequestId = await this.accessRequestService.addAccessRequest(
      ctx,
      url,
      'url',
      {
        source: 'library-auto-approval',
        targetUserId,
        classification,
      },
      'Auto approval requires parent review',
    );

    return {
      enabled: true,
      settingsApplied: true,
      decision: 'review',
      reason: 'needs-parent-review',
      confidence: classification?.confidence,
      accessRequestId,
    };
  }
}

export default LibraryAutoApprovalService;
