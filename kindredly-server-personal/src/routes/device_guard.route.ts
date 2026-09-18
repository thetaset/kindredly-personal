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
import {SessionService} from '@/services/session.service';
import {DeviceSettingsService, deviceSettingsVersionOf} from '@/services/device_settings.service';
import SSEManager from '@/services/sse.manager';
import {config} from '@/config';
import {isRateLimitingEnabled} from '@/services/rate_limit_switch';
import {describeNewApps} from '@/services/companionTamperPolicy';

const SETTINGS_EVENTS_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  // Disable proxy buffering (nginx/personal-server) so the stream flushes.
  'X-Accel-Buffering': 'no',
} as const;

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
  private deviceSettingsService = new DeviceSettingsService();
  private sseManager = SSEManager.getInstance();

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
            ...describeNewApps({total, listed: `${listed}${extra}`, childName, platform: req.body?.platform}),
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
     * Answers with NO ruleset, on purpose (DCP-2).
     *
     * This route used to return a ruleset compiled here by `DeviceRulesService`, and Guard replaced
     * its sealed set with it. The server cannot build a correct one: `appPolicy` and `appInventory`
     * are end-to-end encrypted, so the server's ruleset never held a single app block, and a Guard
     * restart lifted every block the parent had set (UX-063, seen on a OnePlus 6T 2026-09-13).
     *
     * With no `ruleSet` key, Guard's `RuleFetcher` returns `Failed("no ruleSet in response")` and
     * keeps the set it already has. **Never answer with an empty ruleset**: to Guard that means
     * "nothing is limited" and it clears every block.
     *
     * Known regression, accepted while Guard is unreleased: this was the only path that delivered
     * usage limits to a phone whose Kindredly is not running and signed in as the child. DCP-7
     * restores it by having Guard fetch settings and compile them itself; DCP-5 replaces this
     * route with `/companion/settings/current`.
     *
     * Still device-token only and still refuses an unprovisioned token, so an old Guard keeps
     * reading the same auth errors it always has.
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

        res.json({success: true, results: {}});
      }),
    );

    /**
     * The settings a device compiles its own rules from, with the device settings version (DCP-5,
     * redesign §4.3). Replaces `/companion/rules/current` once devices consume it (DCP-7, DCP-8).
     *
     * Device-agent token only, and it takes no user or device id: the user is the one the token was
     * minted for (`getSessionUserId`, which a permission override does not change). That is what
     * stops one child's device reading a sibling's settings; the allowlist does not.
     *
     * `knownVersion` is the only input. When it equals the current version the response carries no
     * settings. Devices compare with `!==` (see `DeviceSettingsCurrentResponse`).
     *
     * A device keeps its sealed app blocks whenever `settings.appPolicy` is null.
     */
    /**
     * A user's current device settings version, for a guardian or the user themselves (DCP-10).
     * A device reports the version it applied in its heartbeat (`appliedSettingsVersion`), so the two
     * together say whether a save has reached the device: "Saved. Waiting for Emma's phone", then "On
     * Emma's phone". Carries no settings.
     */
    this.router.post(
      '/companion/settings/version',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/settings/version'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = String(req.body?.userId || ctx.getCurrentUserId() || '');
        if (!userId) return res.json({success: false, message: 'userId is required'});
        await ctx.verifySelfOrAdminOverUser(userId);
        res.json({success: true, results: {version: await deviceSettingsVersionOf(userId)}});
      }),
    );

    this.router.post(
      '/companion/settings/current',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/settings/current'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.getSessionUserId();
        const deviceId = ctx.getTokenDeviceId();
        if (!userId || !deviceId) {
          return res.json({success: false, message: 'Only a linked device can read its settings.', status: 403});
        }

        const raw = req.body?.knownVersion;
        const knownVersion = typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
        const results = await this.deviceSettingsService.currentForUser(userId, knownVersion);
        res.json({success: true, results});
      }),
    );

    /**
     * The desktop Companion's nudge stream (DCP-8, decision D5): an SSE stream a device token may
     * hold, carrying only `deviceSettingsChanged`, so a guardian's change reaches a computer in
     * seconds with no browser open. The event has no content; the Companion answers it with a fetch
     * of `/companion/settings/current`. Everything else sent to the child's browsers is filtered out
     * by the SSE manager for this connection. Phones get the same nudge as a silent push instead.
     */
    this.router.get(
      '/companion/settings/events',
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.getSessionUserId();
        const deviceId = ctx.getTokenDeviceId();
        if (!userId || !deviceId) {
          return res.json({success: false, message: 'Only a linked device can hold this stream.', status: 403});
        }
        const clientId = `${userId}-cmp_${deviceId}-settings`;

        // The same per-client connect throttle as `/sync/events`, failing open on a store error.
        let attempts = 0;
        if (isRateLimitingEnabled()) {
          try {
            attempts = await this.sseManager.registerConnectAttempt(clientId);
          } catch (e) {
            console.warn(`SSE throttle check failed for ${clientId}, allowing connect:`, (e as any)?.message || e);
          }
        }
        res.writeHead(200, SETTINGS_EVENTS_HEADERS);
        if (attempts > config.sse.maxConnectsPerWindow) {
          res.write('retry: 60000\n\n');
          res.end();
          return;
        }
        res.flushHeaders();
        res.write('retry: 15000\n\n');

        try {
          const alive = await this.sseManager.registerConnection(clientId, userId, req, res, {
            events: ['deviceSettingsChanged'],
          });
          if (!alive) return;
          // A comment, not an event: the Companion learns the stream is up from it, and it says nothing.
          res.write(': connected\n\n');
          res.flush?.();
          await this.sseManager.updateConnectionHeartbeat(clientId);
        } catch (error) {
          console.error(`Settings stream failed for ${clientId}:`, error);
          await this.sseManager.removeConnection(clientId, res).catch(() => {});
          try {
            res.end();
          } catch {
            // Already closed.
          }
        }
      }),
    );
  }
}

export default DeviceGuardRoute;
