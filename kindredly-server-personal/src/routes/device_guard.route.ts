import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import NotificationService from '@/services/notification.service';
import {container} from '@/inversify.config';
import {NotificationType} from '@/typing/enum_strings';
import {UserType} from 'tset-sharedlib/shared.types';
import {AuditLogService} from '@/services/audit_log.service';
import {RefStateService} from '@/services/ref_state.service';
import {DeviceRulesService} from '@/services/device_rules.service';
import {SessionService} from '@/services/session.service';

/**
 * Server-side gate for taking uninstall protection *off* a child's Kindredly Guard
 * device.
 *
 * Enabling protection needs no authorization — the OS consent dialog is the real
 * gate there, and a child who protects their own phone has harmed nobody. Removing
 * it is the asymmetric half, and it cannot be decided on the device: the child is
 * signed into the main Kindredly app on that phone, so any client-side "is a parent
 * present?" flag is worthless. The check has to happen here.
 *
 * Authorization is a live permission-override: a parent enters their PIN/password
 * on the child's phone, `/auth/permissionOverride` verifies it server-side and mints
 * a short-lived token for that admin, and `authenticateJWT` folds it into the
 * request context. So by the time this route runs, `ctx.currentUserId` is the admin
 * — not because the client said so, but because a JWT signed by this server did.
 */
/** Enough to be useful in a notification, few enough to stay one readable line. */
const MAX_REPORTED_APPS = 5;

class DeviceGuardRoute implements Routes {
  public router = Router();

  private notificationService = container.resolve(NotificationService);
  private refStateService = new RefStateService();
  private deviceRulesService = new DeviceRulesService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/companion/protection/authorizeRemoval',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/protection/authorizeRemoval'>, res) => {
        const ctx = RequestContext.instance(req);

        // The signed-in user (the child) is the device's owner; the override user is
        // the parent vouching for the removal. Both are needed.
        const childUserId = ctx.getSessionUserId();
        const adminUserId = ctx.getTempAuthUserId();

        if (!adminUserId) {
          return res.json({success: true, results: {authorized: false, reason: 'A parent must approve this.'}});
        }

        const admin = await ctx.getUserById(adminUserId);
        // Same-account is re-checked rather than assumed: the mint path enforces it,
        // but this route must not depend on how the token it was handed came to be.
        if (!admin || admin.type !== UserType.admin || admin.accountId !== ctx.accountId) {
          return res.json({success: true, results: {authorized: false, reason: 'A parent must approve this.'}});
        }

        // Recorded for the whole account, not just the approving parent. If one
        // parent's PIN is known to the child, the other parents still find out.
        const deviceId = String(req.body?.deviceId || '');
        const child = childUserId ? await ctx.getUserById(childUserId) : null;
        const childName = child?.displayedName || child?.username || 'a child';
        await this.notificationService.addAccountNotification(
          ctx,
          NotificationType.DEVICE_PROTECTION_ALERT,
          adminUserId,
          ctx.accountId,
          {
            title: 'Uninstall protection turned off',
            message: `${admin.displayedName || admin.username || 'A parent'} turned off uninstall protection on ${childName}'s phone.`,
            shortMessage: `Uninstall protection was turned off on ${childName}'s phone.`,
            refInfo: {resourceType: 'companionDevice', resourceId: deviceId, requestType: 'protectionRemoved'},
          },
          true,
        );

        res.json({success: true, results: {authorized: true, adminUserId, at: Date.now()}});
      }),
    );

    /**
     * Remove one of a child's devices: disconnect it, then forget it.
     *
     * Both halves are needed and neither is sufficient. Deleting the rows alone is
     * cosmetic — a live device re-creates its `status` row on the next check-in and
     * reappears within minutes. Revoking alone leaves a dead device cluttering the
     * list forever. So this revokes first, then deletes, and only the server can
     * promise that order.
     *
     * Authorization is admin-only and checked here rather than trusted from the
     * client: the page's `isAdmin` flag is client-side, and a restricted user's client
     * cannot gate itself. See the note at the check itself for why "self" is not
     * enough on this particular route.
     *
     * NOT deleted: the `witness` row. It is per-owner, keyed 'main-app' rather than
     * by device, and belongs to the tamper watch rather than to any one device.
     */
    this.router.post(
      '/companion/devices/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/devices/remove'>, res) => {
        const ctx = RequestContext.instance(req);
        const childUserId = String(req.body?.childUserId || '');
        const deviceId = String(req.body?.deviceId || '');
        if (!childUserId || !deviceId) {
          return res.json({success: false, message: 'childUserId and deviceId are required'});
        }
        /**
         * Admin, not self-or-admin.
         *
         * `verifySelfOrAdminOverUser` returns true the moment the target is the caller,
         * before it checks anything else — which is right for a route where the self
         * case is an adult acting on their own account, and wrong here. This route is
         * reachable by any signed-in user, so under that gate a restricted child could
         * POST their own id and disconnect their own monitoring: sessions revoked,
         * provisioning, status, inventory and the tamper record deleted, and the device
         * gone from the parent's page entirely rather than flagged. Blinding a parent
         * is exactly the act the tamper record exists to survive.
         *
         * `verifyAdminPermissions` demands an admin first and same-account second, so:
         * an adult may still remove their own computer, a parent may remove a child's,
         * and a child on their own token may remove nothing. A parent who used "Unlock
         * settings" passes too — the override sets `currentUserId` to the admin.
         */
        await ctx.verifyAdminPermissions(childUserId);

        // First, so that a failure here stops the whole thing while the device is
        // still listed — a parent seeing it still there knows the removal did not
        // happen. The reverse order fails silently.
        const revokedSessions = await SessionService.instance.revokeForClient(
          childUserId,
          `cmp_${deviceId}`,
          'device_removed',
        );

        // `tamperIncident` goes with it, and not for tidiness: `loadIncident` keys by
        // (ownerId, deviceId) and re-linking reuses the deviceId, so an orphan would
        // suppress or mis-fire the first alert after a remove-and-relink.
        const stateKeys = ['provisioning', 'status', 'appInventory', 'tamperIncident'];
        let deletedRows = 0;
        for (const stateKey of stateKeys) {
          const result = await this.refStateService.delete(ctx, 'user', {
            refType: 'device-guard',
            refId: 'companion',
            stateKey,
            stateSubKey: deviceId,
            ownerId: childUserId,
          });
          deletedRows += result?.deletedCount || 0;
        }

        // Audited because of who else can reach it: a child who has used "Unlock
        // settings" is a server-authorized admin for five minutes and can remove
        // their own monitoring. `targetUserId` is not redundant with entityId —
        // AuditLogRepo.listForUser matches on it, and without it the child would
        // never see the record on their own audit log.
        try {
          await AuditLogService.instance.log(ctx, {
            action: 'device.remove',
            entityType: 'user',
            entityId: childUserId,
            relatedIds: {targetUserId: childUserId, deviceId},
          });
        } catch (e) {
          console.error('audit_log: failed to log device.remove', e);
        }

        res.json({success: true, results: {ok: true, revokedSessions, deletedRows}});
      }),
    );

    /**
     * The child's device reporting apps it has just seen for the first time.
     *
     * Detection cannot happen here: the inventory and the parent's policy are both
     * E2E-encrypted, so the server has no idea what is installed. The device does
     * the diff and sends only the names, which is why this route exists at all.
     *
     * Trust model: the caller is the child, so this is self-reported and a child
     * who wanted to could simply not call it. That is acceptable — this is a
     * courtesy notice, not an enforcement path. Enforcement is `appPolicy`, which
     * blocks by NAME and therefore covers apps nobody ever reported.
     */
    this.router.post(
      '/companion/apps/reportNew',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/apps/reportNew'>, res) => {
        const ctx = RequestContext.instance(req);
        const childUserId = ctx.getSessionUserId();

        const pkgs = Array.isArray(req.body?.pkgs) ? req.body.pkgs.filter((p) => typeof p === 'string' && p) : [];
        const labels = Array.isArray(req.body?.labels) ? req.body.labels.filter((l) => typeof l === 'string' && l) : [];
        // Bounded so a malformed or hostile client can't turn one sync into a
        // thousand-line notification.
        const shown = (labels.length ? labels : pkgs).slice(0, MAX_REPORTED_APPS);
        if (shown.length === 0) return res.json({success: true, results: {ok: true, notified: 0}});

        const child = childUserId ? await ctx.getUserById(childUserId) : null;
        const childName = child?.displayedName || child?.username || 'a child';

        // ONE notification per sync, never one per app: a child restoring a backup
        // installs dozens at once, and a notification per app is how a parent
        // learns to swipe the whole category away without reading it.
        const total = pkgs.length;
        const listed = shown.join(', ');
        const extra = total > shown.length ? ` and ${total - shown.length} more` : '';
        await this.notificationService.addAccountNotification(
          ctx,
          NotificationType.DEVICE_APP_REVIEW,
          childUserId,
          ctx.accountId,
          {
            title: total === 1 ? 'New app on a phone' : `${total} new apps on a phone`,
            message: `${listed}${extra} appeared on ${childName}'s phone. Review what's allowed.`,
            shortMessage: `${total} new app${total === 1 ? '' : 's'} on ${childName}'s phone.`,
            refInfo: {
              resourceType: 'companionDevice',
              resourceId: childUserId || '',
              requestType: 'newApps',
            },
          },
          true,
        );

        res.json({success: true, results: {ok: true, notified: total}});
      }),
    );
    /**
     * The compiled ruleset for the calling device.
     *
     * Read-only, and deliberately takes NO user id: the child is whoever the token was minted
     * for. The device-agent allowlist is not what stops a Companion naming a sibling — this is.
     * `deviceId` comes from the token too, for the same reason; the body only carries the
     * device's local UTC offset, which is the one input the server cannot know and which Guard
     * already evaluates schedules against rather than trusting the device clock.
     *
     * Guard used to receive this over local IPC from the main app, so a parent's block landed
     * only when the child next opened Kindredly (UX-019). Fetching it here removes that
     * dependency entirely.
     */
    this.router.post(
      '/companion/rules/current',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/rules/current'>, res) => {
        const ctx = RequestContext.instance(req);
        const childUserId = ctx.getSessionUserId();
        const deviceId = ctx.getTokenDeviceId();

        if (!childUserId || !deviceId) {
          return res.json({success: false, message: 'This device is not provisioned.', status: 401});
        }

        // Clamped to the real range of UTC offsets. A junk value here would not be rejected by
        // the compiler — it would silently slide every schedule window, which reads on the
        // phone as a parent's evening cutoff landing at the wrong hour.
        const rawOffset = Number(req.body?.tzOffsetMinutes);
        const tzOffsetMinutes =
          Number.isFinite(rawOffset) && Math.abs(rawOffset) <= 14 * 60 ? Math.round(rawOffset) : 0;

        const ruleSet = await this.deviceRulesService.compileForDevice(ctx, {
          childUserId,
          deviceId,
          tzOffsetMinutes,
        });

        res.json({success: true, results: {ruleSet}});
      }),
    );
  }
}

export default DeviceGuardRoute;
