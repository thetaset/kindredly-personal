import {RefStateRepo} from '@/db/ref_state.repo';
import {UserRepo} from '@/db/user.repo';
import NotificationService from '@/services/notification.service';
import {container} from '@/inversify.config';
import {RequestContext} from '@/base/request_context';
import {NotificationType, RequestTypes} from '@/typing/enum_strings';
import {
  accountIsDark,
  describeReason,
  evaluateDevice,
  type DeviceSnapshot,
  type TamperIncident,
} from './companionTamperPolicy';

const REF_TYPE = 'device-guard';
const REF_ID = 'companion';
const STATE_STATUS = 'status';
const STATE_INCIDENT = 'tamperIncident';
/** Written by the main Kindredly app on the same phone — see deviceGuardRefState.ts. */
const STATE_WITNESS = 'witness';

/** Keyset page size for the cross-owner sweep. */
const PAGE_SIZE = 500;

/**
 * Notices when a child's Kindredly Guard device stops reporting, and tells the
 * parent.
 *
 * This is the entire backstop for every bypass the on-device lock cannot prevent
 * (safe mode, a secondary user profile, factory reset, ADB). Android never
 * notifies an app that it is being uninstalled, so a device cannot report its own
 * death — detection has to live here, off the device.
 *
 * It costs the child's phone **zero** battery: the phone already heartbeats every
 * 15 minutes for the parent dashboard, and this job only reads the absence of
 * that. Nothing new is polled or transmitted.
 *
 * Decisions live in the pure `companionTamperPolicy` module so the thresholds are
 * unit-tested; this class is only I/O and delivery.
 */
export class CompanionTamperWatchService {
  private static _staticInstance: CompanionTamperWatchService | null = null;

  static get instance(): CompanionTamperWatchService {
    if (!this._staticInstance) this._staticInstance = new CompanionTamperWatchService();
    return this._staticInstance;
  }

  private readonly refStateRepo = new RefStateRepo();
  private readonly userRepo = new UserRepo();
  // NotificationService takes an injected SetupService, so it must come from the container.
  private readonly notificationService = container.resolve(NotificationService);

  /**
   * Per-device serialization for the load → evaluate → save cycle.
   *
   * Every step of that cycle is idempotent on its own, but interleaved it is not:
   * two heartbeats arriving together (the expedited tamper upload and the next
   * periodic one both carry the same `tamper.lastEventAt`) each load the incident
   * before either saves, so `isNewEvent` sees no record of the event and both
   * notify. Observed on a real device: two identical alerts 57 ms apart, and a
   * `notifyCount` of 2 — the entire MAX_NOTIFICATIONS_PER_INCIDENT budget burned on
   * one event, leaving nothing for the escalation.
   *
   * A promise chain per device is enough because the writer is this process. A
   * multi-instance deployment could still interleave across instances; the durable
   * `notifyCount` in `ref_state` bounds that to at most one extra alert rather than
   * a loop, and the fix there would be a conditional update, not a bigger lock.
   */
  private readonly deviceLocks = new Map<string, Promise<unknown>>();

  private withDeviceLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prior = this.deviceLocks.get(key) ?? Promise.resolve();
    const next = prior.then(fn, fn);
    // Only clear if we are still the tail, or a later waiter would lose its predecessor.
    const settled = next
      .catch(() => undefined)
      .then(() => {
        if (this.deviceLocks.get(key) === settled) this.deviceLocks.delete(key);
      });
    this.deviceLocks.set(key, settled);
    return next;
  }

  async run(now = Date.now()): Promise<{scanned: number; notified: number; opened: number; resolved: number}> {
    const startedAt = Date.now();
    let scanned = 0;
    let notified = 0;
    let opened = 0;
    let resolved = 0;

    let cursorUpdatedAt: Date | undefined;
    let cursorId: string | undefined;

    for (;;) {
      const rows = await this.refStateRepo.listAllByStateKey({
        refType: REF_TYPE,
        refId: REF_ID,
        stateKey: STATE_STATUS,
        limit: PAGE_SIZE,
        cursorUpdatedAt,
        cursorId,
      });
      if (rows.length === 0) break;

      // Group by owner so "is this whole family dark?" is answerable — one quiet
      // device is a signal, every device at once is a holiday.
      const byOwner = new Map<string, typeof rows>();
      for (const row of rows) {
        const list = byOwner.get(row.ownerId) ?? [];
        list.push(row);
        byOwner.set(row.ownerId, list);
      }

      for (const [ownerId, ownerRows] of byOwner) {
        const snapshots = ownerRows.map((r) => toSnapshot(r));
        const dark = accountIsDark(snapshots, now);
        // The main app's independent report, folded in as a tamper event. Only
        // meaningful because we are already looking at a provisioned status row —
        // an Android install that never had Guard says nothing here.
        const witnessAt = await this.companionMissingSince(ownerId);
        if (witnessAt) {
          for (const s of snapshots) {
            if (s.provisioned && !(s.tamperLastEventAt && s.tamperLastEventAt >= witnessAt)) {
              s.tamperLastEventAt = witnessAt;
              s.tamperLastEventKind = 'mainAppMissing';
            }
          }
        }
        for (let i = 0; i < ownerRows.length; i++) {
          scanned++;
          try {
            const outcome = await this.evaluateOne(ownerId, ownerRows[i], snapshots[i], dark, now);
            if (outcome === 'notified') notified++;
            else if (outcome === 'opened') opened++;
            else if (outcome === 'resolved') resolved++;
          } catch (e) {
            // One bad row must never stop the sweep — the whole point is coverage.
            console.error('[CompanionTamperWatch] device failed', ownerRows[i].stateSubKey, e);
          }
        }
      }

      const last = rows[rows.length - 1];
      cursorUpdatedAt = last.updatedAt;
      cursorId = last._id;
      if (rows.length < PAGE_SIZE) break;
    }

    console.log(
      '[CompanionTamperWatch] complete scanned=',
      scanned,
      'notified=',
      notified,
      'opened=',
      opened,
      'resolved=',
      resolved,
      'durationMs=',
      Date.now() - startedAt,
    );
    return {scanned, notified, opened, resolved};
  }

  private async evaluateOne(
    ownerId: string,
    row: {stateSubKey: string; data: any},
    snapshot: DeviceSnapshot,
    accountDark: boolean,
    now: number,
  ): Promise<'none' | 'opened' | 'notified' | 'resolved'> {
    return this.withDeviceLock(`${ownerId}:${snapshot.deviceId}`, () =>
      this.evaluateOneLocked(ownerId, row, snapshot, accountDark, now),
    );
  }

  private async evaluateOneLocked(
    ownerId: string,
    row: {stateSubKey: string; data: any},
    snapshot: DeviceSnapshot,
    accountDark: boolean,
    now: number,
  ): Promise<'none' | 'opened' | 'notified' | 'resolved'> {
    const incident = await this.loadIncident(ownerId, snapshot.deviceId);
    const tz = await this.tzOffsetMinutes(ownerId);
    const decision = evaluateDevice(snapshot, incident, now, tz);

    switch (decision.action) {
      case 'none':
        return 'none';

      case 'open':
        await this.saveIncident(ownerId, snapshot.deviceId, decision.incident);
        return 'opened';

      case 'resolve':
        await this.saveIncident(ownerId, snapshot.deviceId, decision.incident);
        if (decision.notifyRecovery) {
          await this.notifyParents(ownerId, snapshot, {
            title: `${deviceLabel(snapshot)} is reporting again`,
            body: 'Kindredly Guard is back online on this phone.',
          });
        }
        return 'resolved';

      case 'notify': {
        // A whole-account blackout is a family on holiday, not a tamper. Record the
        // incident so the clock keeps running, but don't cry wolf. Explicit tamper
        // events still go out — those came from a live device and are unambiguous.
        if (accountDark && decision.reason.kind === 'gap') {
          await this.saveIncident(ownerId, snapshot.deviceId, {...decision.incident, notifyCount: 0});
          return 'none';
        }
        await this.saveIncident(ownerId, snapshot.deviceId, decision.incident);
        await this.notifyParents(ownerId, snapshot, describeReason(decision.reason, deviceLabel(snapshot)));
        return 'notified';
      }
    }
  }

  /**
   * Called from the heartbeat route right after a device checks in.
   *
   * The 30-minute sweep is the backstop for *silence*; this is the fast path for a
   * device that is still alive and telling us something happened — a child on the
   * device-admin deactivation screen. Waiting up to half an hour for that would
   * often mean telling the parent after protection is already gone.
   *
   * Deliberately does nothing unless the report contains a tamper event, and
   * shares `evaluateDevice` with the sweep so the dedupe rules can't drift apart.
   */
  async noteHeartbeat(ownerId: string, status: any, now = Date.now()): Promise<boolean> {
    const eventAt = status?.tamper?.lastEventAt;
    if (!eventAt) return false;
    const snapshot: DeviceSnapshot = {
      deviceId: status.deviceId ?? '',
      deviceLabel: status.deviceName,
      provisioned: status.provisioned === true,
      lastSeenAt: now,
      tamperLastEventAt: eventAt,
      tamperLastEventKind: status.tamper?.lastEventKind,
    };
    if (!snapshot.deviceId) return false;

    // Locked for the same reason as the sweep, and this is where it actually bites:
    // a tamper triggers an expedited upload, and the periodic upload lands moments
    // later carrying the identical `lastEventAt`.
    return this.withDeviceLock(`${ownerId}:${snapshot.deviceId}`, async () => {
      const incident = await this.loadIncident(ownerId, snapshot.deviceId);
      const decision = evaluateDevice(snapshot, incident, now);
      if (decision.action !== 'notify' || decision.urgency !== 'immediate') return false;

      // Saved BEFORE notifying: if delivery throws, the event stays recorded and the
      // next heartbeat won't re-alert. Losing one alert to a transient push failure is
      // better than re-alerting on every check-in for the rest of the day.
      await this.saveIncident(ownerId, snapshot.deviceId, decision.incident);
      await this.notifyParents(ownerId, snapshot, describeReason(decision.reason, deviceLabel(snapshot)));
      return true;
    });
  }

  /** When the main app last reported Guard as absent, or null if it reports present. */
  private async companionMissingSince(ownerId: string): Promise<number | null> {
    const rows = await this.refStateRepo.listByRef({
      refType: REF_TYPE,
      refId: REF_ID,
      ownerType: 'user',
      ownerId,
      stateKey: STATE_WITNESS,
      limit: 1,
    });
    const data = rows[0]?.data;
    if (!data || data.companionInstalled !== false) return null;
    return typeof data.at === 'number' ? data.at : null;
  }

  private async loadIncident(ownerId: string, deviceId: string): Promise<TamperIncident | null> {
    const rows = await this.refStateRepo.listByRef({
      refType: REF_TYPE,
      refId: REF_ID,
      ownerType: 'user',
      ownerId,
      stateKey: STATE_INCIDENT,
      stateSubKey: deviceId,
      limit: 1,
    });
    return (rows[0]?.data as TamperIncident) ?? null;
  }

  /**
   * Incident state must live in the database, not the queue: `scheduleRecurringJobs`
   * drains and re-registers every job scheduler on each boot, so anything held in
   * BullMQ would be lost on deploy and every open incident would re-alert.
   */
  private async saveIncident(ownerId: string, deviceId: string, incident: TamperIncident): Promise<void> {
    await this.refStateRepo.upsert({
      _id: `${ownerId}:${REF_ID}:${STATE_INCIDENT}:${deviceId}`,
      refType: REF_TYPE,
      refId: REF_ID,
      ownerType: 'user',
      ownerId,
      stateKey: STATE_INCIDENT,
      stateSubKey: deviceId,
      data: incident,
      encrypted: false,
      encInfo: null,
    } as any);
  }

  private async notifyParents(
    childUserId: string,
    snapshot: DeviceSnapshot,
    copy: {title: string; body: string},
  ): Promise<void> {
    const child = await this.userRepo.findById(childUserId);
    if (!child?.accountId) return;
    const ctx = new RequestContext({
      currentUserId: childUserId,
      accountId: child.accountId,
      request: {type: RequestTypes.taskRunner},
    });
    // addAccountNotification already targets the account's admins and honours each
    // one's notification preferences, so parents keep control of the channel.
    await this.notificationService.addAccountNotification(
      ctx,
      NotificationType.DEVICE_PROTECTION_ALERT,
      childUserId,
      child.accountId,
      {
        title: copy.title,
        message: copy.body,
        shortMessage: copy.body,
        refInfo: {resourceType: 'companionDevice', resourceId: snapshot.deviceId, requestType: 'tamper'},
      },
      true,
    );
  }

  /**
   * The family's local offset, for digest timing. Not stored anywhere today, so
   * gap alerts land at 09:00 UTC until a per-account timezone exists — documented
   * rather than guessed, since a wrong guess shifts every family's alerts.
   */
  private async tzOffsetMinutes(_ownerId: string): Promise<number> {
    return 0;
  }
}

function toSnapshot(row: {stateSubKey: string; data: any; updatedAt: Date}): DeviceSnapshot {
  const status = row.data ?? {};
  return {
    deviceId: row.stateSubKey || status.deviceId || '',
    deviceLabel: status.deviceName || undefined,
    provisioned: status.provisioned === true,
    lastSeenAt: row.updatedAt ? new Date(row.updatedAt).getTime() : null,
    tamperLastEventAt: status.tamper?.lastEventAt,
    tamperLastEventKind: status.tamper?.lastEventKind,
  };
}

function deviceLabel(snapshot: DeviceSnapshot): string {
  return snapshot.deviceLabel || `Device ${snapshot.deviceId.slice(0, 8)}`;
}
