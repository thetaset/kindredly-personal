import {v4 as uuidv4} from 'uuid';
import {config} from '@/config';
import {AccountRepo} from '@/db/account.repo';
import {UserRepo} from '@/db/user.repo';
import {RequestContext} from '@/base/request_context';

import {buildAccountPlanUpdate, productLookup} from '../defaults/products_and_plans';
import ItemService from './item.service';
import EventAuditService from './record_event.service';
import VerificationService from './verification.service';

import {EventRecordName, EventRecordType} from '@/typing/enum_strings';
import {AccountType, VerificationType} from 'tset-sharedlib/shared.types';
import NotificationService from './notification.service';
import {inject, injectable} from 'inversify';
import {TYPES} from '@/types';
import type SetupService from './_interfaces/syssetup.service';
import {container} from '@/inversify.config';
import UserService from './user.service';
import type Account from 'tset-sharedlib/schemas/public/Account';
import {
  ASSISTANT_GUIDELINES_MAX,
  ASSISTANT_TEMPLATE_MAX,
  normalizeAssistantReviewConfig,
  normalizeAssistantReviewEntry,
  normalizeAssistantReviewTemplate,
} from 'tset-sharedlib/restrictions/assistantReview';
import {AccountOptions} from 'tset-sharedlib/schemas/public/Account';
import type {SystemOptions} from 'tset-sharedlib/schemas/public/Account';
import {FAMILY_AI_SETTINGS_OFFERED} from 'tset-sharedlib/family-ai';
import {isValidTimeZone, notifyDeviceSettingsChanged} from './device_settings.service';
import {bumpDeviceSettingsVersion} from '@/db/device_settings_version.repo';
import {
  FAMILY_DOWNTIME_ONE_OFF_MAX,
  dismissFamilyDowntimeForUser,
  endFamilyDowntimeNow,
  keepDismissalsWithinDowntime,
  normalizeFamilyDowntime,
  oneOffProblem,
  pruneFamilyDowntime,
  resolveFamilyDowntime,
  type FamilyDowntimeAllow,
  type FamilyDowntimeSchedule,
  type FamilyDowntimeSettings,
} from 'tset-sharedlib/restrictions/familyDowntime';
import SSEManager from './sse.manager';

function resolveDisplayAccount(account: Account | null) {
  if (!account) return account;

  return {
    ...account,
    ...buildAccountPlanUpdate(account.accountType),
  };
}

@injectable()
class AccountService {
  constructor(@inject(TYPES.SetupService) private setupService: SetupService) {}

  private users = new UserRepo();
  private accounts = new AccountRepo();
  private eventLogService = new EventAuditService();
  private notificationService = container.resolve(NotificationService);
  private verificationService = new VerificationService();
  private itemService = new ItemService();

  private userService = new UserService();

  /**
   * The account as a client is allowed to see it. **Every path that sends an
   * account to a client must go through here.**
   *
   * There are two `/account/info` routes: `account.route.ts` registers one inside
   * `if (config.privateServer)`, and the cloud is served by
   * `_internal/product_subscription.route.ts`. They each had their own copy of the
   * plan-resolution step, so a withholding rule added to one silently did not apply
   * to the other — which is exactly what happened when the assistant-review strip
   * landed on the personal-server path only, leaving the cloud (the only deployment
   * where the feature runs) still handing children the guidelines. One function
   * now, called by both.
   *
   * What is withheld: `options.assistantReview`, the text a child's blocked-site
   * requests are judged against. Knowing the target is most of the work of hitting
   * it. Fail-closed on anything that is not an admin rather than testing for
   * `restricted` — a user type we do not recognise should not be the one that
   * leaks. The per-child on/off lives on `user.options` and is deliberately NOT
   * withheld: the block page needs it to know whether to promise a check.
   */
  async toClientAccount(ctx: RequestContext, account: Account | null) {
    const display = resolveDisplayAccount(account);
    if (!display) return display;
    if (await ctx.isAdmin()) return display;

    const {assistantReview: _withheld, ...visibleOptions} = (display.options || {}) as Record<string, unknown>;
    // Family Downtime ships to everyone, since every device enforces it, but which admins dismissed
    // it for themselves is nobody else's business.
    const downtime = visibleOptions.familyDowntime as FamilyDowntimeSettings | null | undefined;
    if (downtime && typeof downtime === 'object') {
      visibleOptions.familyDowntime = {...downtime, dismissals: []};
    }
    return {...display, options: visibleOptions as typeof display.options};
  }

  // ROUTE-METHOD
  async getAccountDetails(ctx: RequestContext) {
    const account = await this._getAccountById(ctx.accountId);
    return this.toClientAccount(ctx, account);
  }

  // ROUTE-METHOD
  async createAccountInvite(ctx: RequestContext, inviteData: {email: string; inviterName: string; message: string}) {
    const {email, inviterName, message} = inviteData;

    const accountUser = await ctx.getCurrentUser();

    const verification = await this.verificationService._addVerification(
      config.inviteAccountExpMin,
      VerificationType.joinFamily,
      ctx.accountId,
      {
        accountId: ctx.accountId,
        userId: ctx.currentUserId,
        email: email,
        type: VerificationType.joinFamily,
        inviterName: inviterName,
        inviterEmail: accountUser.email,
        message: message,
      },
    );

    const inviteCode = verification._id;

    this.notificationService.notifyOfInvitation(email, inviterName, accountUser, inviteCode, message);

    this.eventLogService.recordEvent({
      eventName: EventRecordName.ACCOUNT_INVITE,
      eventType: EventRecordType.EXPLICIT,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
    });
    return {inviteCode: verification._id};
  }

  // ROUTE-METHOD
  async getAccountStats(ctx: RequestContext) {
    const accountId = ctx.accountId;

    //TODO: combine into one (or two) simple stat queries
    const users = await this.users.listByAccountId(accountId);

    const collectionCount = await this.itemService._getCollectionCount(accountId);
    const itemCount = await this.itemService._getLibraryItemCount(accountId);

    const account = await this._getAccountById(accountId);

    const limits = await this.setupService.getLimitsForAccount(accountId);
    return {
      createdAt: account.createdAt,
      userCount: users.length,
      itemCount,
      collectionCount,
      ...limits,
    };
  }

  /**
   * Storage used across the WHOLE account, summed over every user in it.
   *
   * Admin-only, like every other account-scoped read here. It was ungated until SP-24, so a
   * restricted child on their own Files page (`MyUserFiles.vue`) was shown the household's
   * total — one number describing everyone else's libraries, on a page that otherwise only
   * ever shows the viewer their own files.
   */
  // ROUTE-METHOD
  async checkSpaceUsage(ctx: RequestContext) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }
    return this.users.checkSpaceUsageForAccountId(ctx.accountId);
  }

  // ROUTE-METHOD
  async updateAccountOptions(ctx: RequestContext, options: AccountOptions) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }
    const account = await ctx.getAccount();
    const patch = {...(options || {})} as AccountOptions;
    // Family Downtime has its own routes, each a locked patch. A whole-object write here from a
    // client's cached account would silently undo another admin's End now or one-off.
    delete patch.familyDowntime;

    // The family AI setting (PLN-3): only a choice offered today. Settings only waits for PLN-11,
    // and a value this server does not offer must not be stored for a client to read.
    if ('aiSetting' in patch && !(FAMILY_AI_SETTINGS_OFFERED as readonly unknown[]).includes(patch.aiSetting)) {
      throw new Error('Unknown AI setting');
    }

    /**
     * The family timezone (D3, DCP-5) is a device setting for every member of the family: device
     * apps evaluate schedules in it. So a change is validated, and raises every member's device
     * settings version in the same transaction as the account write.
     */
    let timeZoneChanged = false;
    if ('familyTimeZone' in patch) {
      const next = patch.familyTimeZone ?? null;
      if (next !== null && !isValidTimeZone(next)) {
        throw new Error('Unknown timezone');
      }
      timeZoneChanged = (account.options?.familyTimeZone ?? null) !== next;
    }

    // Recurring downtime is worked out in the family timezone, so a zone cannot be cleared under it.
    if (timeZoneChanged && !patch.familyTimeZone && this._usesRecurringDowntime(account.options?.familyDowntime)) {
      throw new Error('Family Downtime uses the family timezone. Turn off its schedules first.');
    }

    // Left out on purpose: `updateWithId` then keeps the downtime stored at the moment of the write.
    const {familyDowntime: _readEarlier, ...currentOptions} = account.options || {};
    const merged = {...currentOptions, ...patch};
    if (!timeZoneChanged) {
      await this.accounts.updateWithId(ctx.accountId, {options: merged});
      return true;
    }

    let memberIds: string[] = [];
    const trx = await this.accounts.createTransaction();
    try {
      await (this.accounts.withTransaction(trx) as AccountRepo).updateWithId(ctx.accountId, {options: merged});
      memberIds = (await trx('user').where({accountId: ctx.accountId}).select('_id')).map(
        (row: {_id: string}) => row._id,
      );
      await bumpDeviceSettingsVersion(trx, memberIds);
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
    notifyDeviceSettingsChanged(memberIds);
    return true;
  }

  /**
   * Set the family's assistant-review guidelines, or one child's override.
   *
   * A patch, deliberately — not a whole-object write. Both editors used to rebuild
   * the entire `assistantReview` object from the client's cached account and send
   * it back, and `updateAccountOptions` replaces the key wholesale, so two
   * guardians editing at once silently lost one of the edits: B's stale cache
   * would overwrite the family text A had just changed, or drop a sibling's
   * override. The server holds the object and changes exactly one field.
   *
   * No `targetUserId` means the family entry. With one, that child's override — a
   * null or empty entry clears it, so the child falls back to the family text
   * rather than being left with rules that match nothing.
   *
   * A null entry on the FAMILY branch blanks the guidelines, which switches the
   * feature off for every child rather than leaving it approving on empty rules.
   * That is the safe direction, and the only one available: guidelines are the
   * whole decision procedure, so "on with nothing written" is not a state it can
   * act in.
   *
   * `appendCustomText` adds one line to the free text at the chosen scope instead
   * of replacing the entry. It exists for the same reason the whole method is a
   * patch: the obvious client-side version — read the entry, join a sentence onto
   * it, send the result — reopens exactly the race described above, and does it on
   * a button a parent might press twice in a row. Appending server-side means the
   * read and the write cannot be separated by someone else's write.
   *
   * It refuses rather than truncates when the result would not fit.
   * `composeAssistantGuidelines` slices to `ASSISTANT_GUIDELINES_MAX` **on read**,
   * so an over-long append would look like it worked and then quietly lose its
   * tail — and the parent would have no way to tell which line went missing.
   */
  // ROUTE-METHOD
  async updateAssistantReview(
    ctx: RequestContext,
    targetUserId: string | null,
    entry: unknown,
    appendCustomText?: string | null,
    template?: {save?: unknown; remove?: unknown} | null,
  ) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }

    const account = await ctx.getAccount();
    // Family Downtime is left out of every write below, so `updateWithId` keeps the one stored then.
    const {familyDowntime: _readEarlier, ...options} = (account?.options || {}) as AccountOptions;
    const current = normalizeAssistantReviewConfig(options.assistantReview);

    // Templates: a patch too. Sending the whole array back would let two guardians who opened
    // the picker at the same moment each drop the other's saves.
    if (template) {
      const templates = [...(current.templates || [])];

      if (typeof template.remove === 'string') {
        const next = templates.filter((existing) => existing.id !== template.remove);
        await this.accounts.updateWithId(ctx.accountId, {
          options: {...options, assistantReview: {...current, templates: next}},
        });
        return true;
      }

      // A save with no id is a new template; the id is minted here rather than by the client so
      // two tabs saving at once cannot collide on one a client guessed.
      const raw = (template.save || {}) as Record<string, unknown>;
      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `tpl_${uuidv4()}`;
      const normalized = normalizeAssistantReviewTemplate({...raw, id});
      if (!normalized) {
        throw new Error('A template needs a name and some guidelines');
      }

      const at = templates.findIndex((existing) => existing.id === normalized.id);
      if (at >= 0) {
        templates[at] = normalized;
      } else {
        if (templates.length >= ASSISTANT_TEMPLATE_MAX) {
          throw new Error(`You can keep ${ASSISTANT_TEMPLATE_MAX} templates — delete one first`);
        }
        templates.push(normalized);
      }

      await this.accounts.updateWithId(ctx.accountId, {
        options: {...options, assistantReview: {...current, templates}},
      });
      return true;
    }

    const appended = typeof appendCustomText === 'string' ? appendCustomText.trim() : '';
    if (appended) {
      if (targetUserId) await ctx.verifyAdminPermissions(targetUserId);

      const base = targetUserId
        ? normalizeAssistantReviewEntry(current.overrides?.[targetUserId] || null)
        : normalizeAssistantReviewEntry(current);

      // Already written, in any casing. Adding it again would change the
      // guidelines hash and drop every cached verdict for nothing.
      const existing = base.customText || '';
      if (existing.toLowerCase().includes(appended.toLowerCase())) return true;

      const merged = existing ? `${existing}\n${appended}` : appended;
      if (merged.length > ASSISTANT_GUIDELINES_MAX) {
        throw new Error('Guidelines are full — shorten them before adding another line');
      }

      const nextEntry = normalizeAssistantReviewEntry({...base, customText: merged});
      const nextConfig = targetUserId
        ? {...current, overrides: {...(current.overrides || {}), [targetUserId]: nextEntry}}
        : {...nextEntry, overrides: current.overrides || {}, templates: current.templates || []};

      await this.accounts.updateWithId(ctx.accountId, {
        options: {...options, assistantReview: nextConfig},
      });
      return true;
    }

    // `entry` became optional when `appendCustomText` was added, which opened a
    // path that did not exist before: a request carrying neither field would fall
    // through to the replace branch and blank the guidelines. Clearing them is a
    // real operation — an explicit `null` still does it — but it has to be asked
    // for, not arrived at by omission.
    if (entry === undefined) {
      throw new Error('Nothing to write: send an entry, or a line to append');
    }

    let next;
    if (targetUserId) {
      // Confirms the child is one this admin manages, not just any id they can name.
      await ctx.verifyAdminPermissions(targetUserId);

      const overrides = {...(current.overrides || {})};
      const normalized = entry ? normalizeAssistantReviewEntry(entry) : null;
      if (normalized && (normalized.presets.length > 0 || normalized.customText)) {
        overrides[targetUserId] = normalized;
      } else {
        delete overrides[targetUserId];
      }
      next = {...current, overrides};
    } else {
      // Spread the entry, not `current` — but carry the sibling collections across, or writing
      // the family text would silently delete every override and every saved template.
      next = {
        ...normalizeAssistantReviewEntry(entry),
        overrides: current.overrides || {},
        templates: current.templates || [],
      };
    }

    await this.accounts.updateWithId(ctx.accountId, {options: {...options, assistantReview: next}});
    return true;
  }

  private _usesRecurringDowntime(raw: unknown): boolean {
    const downtime = normalizeFamilyDowntime(raw);
    return downtime.enabled && downtime.schedules.length > 0;
  }

  /**
   * Every Family Downtime write goes through here.
   *
   * Reads the account row with a lock, so the read and the write cannot be separated by another
   * admin's save: two admins pressing End now and adding a one-off at the same moment both land.
   * The existing `updateAccountOptions` and `updateAssistantReview` read and write without one,
   * which is fine for text nobody edits at the same second and wrong for a button that locks the
   * family's screens.
   *
   * The result is normalized and pruned, so what is stored is always something every device can
   * enforce. Every member's device settings version moves in the same transaction, unless
   * `touchesDevices` is false (a dismissal changes nothing a child's device enforces).
   */
  private async _writeFamilyDowntime(
    ctx: RequestContext,
    mutate: (current: FamilyDowntimeSettings, env: {nowMs: number; timeZone: string | null}) => FamilyDowntimeSettings,
    opts: {touchesDevices?: boolean} = {},
  ): Promise<{familyDowntime: FamilyDowntimeSettings}> {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }
    const touchesDevices = opts.touchesDevices !== false;
    const nowMs = Date.now();

    let stored: FamilyDowntimeSettings;
    let memberIds: string[] = [];
    const trx = await this.accounts.createTransaction();
    try {
      const row = await trx('account').where({_id: ctx.accountId}).forUpdate().first('options');
      if (!row) throw new Error('Account not found');
      const options = (row.options || {}) as AccountOptions;
      const timeZone = isValidTimeZone(options.familyTimeZone) ? options.familyTimeZone : null;

      const current = pruneFamilyDowntime(normalizeFamilyDowntime(options.familyDowntime), nowMs);
      // A write that ends the dismissed downtime early ends the dismissal with it.
      const next = keepDismissalsWithinDowntime(mutate(current, {nowMs, timeZone}), nowMs, timeZone);
      stored = pruneFamilyDowntime(
        normalizeFamilyDowntime({...next, updatedAt: nowMs, updatedBy: ctx.currentUserId}),
        nowMs,
      );

      if (stored.enabled && stored.schedules.length > 0 && !timeZone) {
        throw new Error('Set the family timezone before turning on a schedule.');
      }

      await (this.accounts.withTransaction(trx) as AccountRepo).updateWithId(ctx.accountId, {
        options: {...options, familyDowntime: stored},
      });
      memberIds = (await trx('user').where({accountId: ctx.accountId}).select('_id')).map((r: {_id: string}) => r._id);
      if (touchesDevices) await bumpDeviceSettingsVersion(trx, memberIds);
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    if (touchesDevices) notifyDeviceSettingsChanged(memberIds);
    // Browsers keep their own copy of the account. Without this they would learn about a Start now
    // only on their next account refresh, minutes later.
    const audience = touchesDevices ? memberIds : [ctx.currentUserId];
    const sse = SSEManager.getInstance();
    for (const userId of audience) {
      sse.broadcastToUser(userId, 'accountOptionsUpdate', {source: 'family-downtime'}).catch((e) => {
        console.warn('[family-downtime] SSE refresh failed', e?.message || e);
      });
    }

    return {familyDowntime: stored};
  }

  // ROUTE-METHOD
  async updateFamilyDowntime(
    ctx: RequestContext,
    patch: {enabled?: boolean; schedules?: FamilyDowntimeSchedule[]; allow?: FamilyDowntimeAllow},
  ) {
    const input = patch && typeof patch === 'object' ? patch : {};
    return this._writeFamilyDowntime(ctx, (current) => ({
      ...current,
      ...('enabled' in input ? {enabled: input.enabled === true} : {}),
      ...('schedules' in input ? {schedules: Array.isArray(input.schedules) ? input.schedules : []} : {}),
      ...('allow' in input ? {allow: normalizeFamilyDowntime({allow: input.allow}).allow} : {}),
    }));
  }

  // ROUTE-METHOD
  async addFamilyDowntimeOneOff(ctx: RequestContext, startAt: number, endAt: number) {
    return this._writeFamilyDowntime(ctx, (current, {nowMs}) => {
      const problem = oneOffProblem(startAt, endAt, nowMs);
      if (problem) throw new Error(problem);
      if (current.oneOffs.length >= FAMILY_DOWNTIME_ONE_OFF_MAX) {
        throw new Error(`You can plan ${FAMILY_DOWNTIME_ONE_OFF_MAX} one-offs at a time. Remove one first.`);
      }
      // Minted here, not by the client, so two admins adding at the same moment cannot collide.
      const oneOff = {id: `oneoff_${uuidv4()}`, startAt, endAt, createdBy: ctx.currentUserId};
      return {...current, oneOffs: [...current.oneOffs, oneOff]};
    });
  }

  // ROUTE-METHOD
  async removeFamilyDowntimeOneOff(ctx: RequestContext, id: string) {
    return this._writeFamilyDowntime(ctx, (current) => ({
      ...current,
      oneOffs: current.oneOffs.filter((o) => o.id !== id),
    }));
  }

  // ROUTE-METHOD
  async endFamilyDowntimeNow(ctx: RequestContext) {
    return this._writeFamilyDowntime(ctx, (current, {nowMs, timeZone}) =>
      endFamilyDowntimeNow(current, nowMs, timeZone, ctx.currentUserId),
    );
  }

  // ROUTE-METHOD
  async dismissFamilyDowntime(ctx: RequestContext) {
    return this._writeFamilyDowntime(
      ctx,
      (current, {nowMs, timeZone}) => {
        if (!resolveFamilyDowntime(current, nowMs, timeZone).active) {
          throw new Error('Family Downtime is not on right now.');
        }
        return dismissFamilyDowntimeForUser(current, nowMs, timeZone, ctx.currentUserId);
      },
      {touchesDevices: false},
    );
  }

  // ROUTE-METHOD
  async getExtendedFeatures(ctx: RequestContext) {
    const account = await ctx.getAccount();
    const sysOptions = (account?.sysOptions || {}) as SystemOptions;
    return sysOptions.extendedFeatures || {};
  }

  // ROUTE-METHOD
  async updateExtendedFeatures(ctx: RequestContext, updates: NonNullable<SystemOptions['extendedFeatures']>) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }

    const account = await ctx.getAccount();
    const sysOptions = (account?.sysOptions || {}) as SystemOptions;

    const nextSysOptions: SystemOptions = {
      ...sysOptions,
      extendedFeatures: {
        ...(sysOptions.extendedFeatures || {}),
        ...(updates || {}),
      },
    };

    await this.accounts.updateWithId(ctx.accountId, {sysOptions: nextSysOptions});
    return true;
  }

  /**
   * D5, the family-wide key custody policy.
   *
   * Turning it ON is refused while any member still has a recovery key or password copy
   * on our servers. Purging on their behalf would be the other option and it is the wrong
   * one -- for a member relying on Kindredly recovery, a silent purge is a permanent
   * lockout. So the toggle reports who is still holding, and each member clears their own.
   *
   * Turning it OFF is always allowed: it only re-opens a choice, it does not restore
   * anything that was deleted.
   */
  // ROUTE-METHOD
  async updateKeyStoragePolicy(ctx: RequestContext, noServerKeyStorage: boolean) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }

    if (noServerKeyStorage) {
      const blockedBy = await this.listMembersWithServerKeyMaterial(ctx);
      if (blockedBy.length > 0) {
        return {noServerKeyStorage: false, blockedBy};
      }
    }

    const account = await ctx.getAccount();
    const sysOptions = (account?.sysOptions || {}) as SystemOptions;

    await this.accounts.updateWithId(ctx.accountId, {
      sysOptions: {...sysOptions, noServerKeyStorage},
    });

    return {noServerKeyStorage};
  }

  /** Members whose key material we still hold. Empty means the policy can be turned on. */
  async listMembersWithServerKeyMaterial(ctx: RequestContext) {
    const users = await this.users.listByAccountId(ctx.accountId);
    return users
      .filter((u) => !u.deleted && (!!u.recoveryKey || !!u.passwordCopy))
      .map((u) => ({userId: u._id as string, displayedName: u.displayedName || u.username || ''}));
  }

  async _getAccountById(id: string) {
    const account = await this.accounts.findById(id);
    return account;
  }

  async _queryAccountsByField(query) {
    return await this.accounts.findMany(query);
  }

  async _updateAccountInfo(accountId: string, info) {
    await this.accounts.updateWithId(accountId, info);
  }

  async deleteAccountForPersonalServer(ctx: RequestContext, confirmation?: string) {
    const accountId = ctx.accountId;

    if (!(await ctx.isAdmin())) {
      throw new Error('Only admins can delete accounts');
    }

    if (confirmation !== 'DELETE') {
      throw new Error('Confirmation text did not match');
    }

    const users = await this.users.listByAccountId(accountId);
    const living = users.filter((u) => !u.deleted);

    // markUserDeleted, not softDeleteUser: the latter guards a member *leaving a family*
    // ("only a child can be removed", "you are the only user in this account"), and the last
    // admin deleting the whole account trips those every time. Children first, then adults,
    // so the account is never briefly adult-less.
    for (const user of living.filter((u) => u.type == 'restricted')) {
      await this.userService.markUserDeleted(user._id);
    }

    for (const user of living.filter((u) => u.type != 'restricted')) {
      await this.userService.markUserDeleted(user._id);
    }

    // Last, not first: a throw above must not leave a deleted account with live users
    // still pointing at it.
    await this.accounts.updateWithId(accountId, {deleted: true});

    return true;
  }
}

export default AccountService;
