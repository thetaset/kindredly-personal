/**
 * RolloutReadinessService — answers "is this account's whole client fleet ready for capability X?"
 *
 * Ready iff every recently-active device of the account: (a) runs on a platform that has shipped a
 * supporting build (present in the capability's `platforms` map), and (b) is at/above the
 * capability's `minClientVersion`. This is the safety gate behind flipping the per-account write
 * switch — used by the admin readiness panel today, reusable by an auto-flip cron later.
 *
 * Read-only: it never mutates account state.
 */
import {UserRepo} from '@/db/user.repo';
import {ClientInfoRepo} from '@/db/client_info.repo';
import {compareVersions, getRolloutCapability, type RolloutCapability} from './rolloutCapabilities';

const DEFAULT_ACTIVE_WINDOW_DAYS = 60;

export type RolloutBlockReason = 'platform_not_shipped' | 'below_min_version';

export type FleetDeviceReadiness = {
  userId: string | null;
  appType: string | null;
  appVersion: string | null;
  lastSeen: Date | null;
  ok: boolean;
  reason?: RolloutBlockReason;
};

export type RolloutReadiness = {
  capKey: string;
  cap: RolloutCapability | null;
  ready: boolean;
  activeWindowDays: number;
  fleet: FleetDeviceReadiness[];
  /** High-level reasons readiness is false (empty when ready). */
  blockedBy: string[];
};

export type FleetClientLike = {
  userId?: string | null;
  appId?: string | null;
  appType?: string | null;
  appVersion?: string | null;
  lastSeen?: Date | string | null;
};

/**
 * Pure readiness decision over a fleet of client_info rows. No DB / no clock access — pass `nowMs`.
 * Ready iff there is at least one recently-active device and EVERY recently-active device runs a
 * shipped platform (present in `cap.platforms`) at/above `cap.minClientVersion`.
 */
export function evaluateFleetReadiness(
  cap: RolloutCapability,
  clients: FleetClientLike[],
  opts: {nowMs: number; activeWindowDays?: number},
): Omit<RolloutReadiness, 'capKey'> {
  const activeWindowDays = opts.activeWindowDays ?? DEFAULT_ACTIVE_WINDOW_DAYS;
  const cutoffMs = opts.nowMs - activeWindowDays * 24 * 60 * 60 * 1000;

  const active = clients.filter((c) => {
    // The Companion satellite versions independently of the web/extension/native
    // clients and never reads gated formats — it must not block fleet readiness.
    if (c.appId === 'companion') return false;
    const seenMs = c.lastSeen ? new Date(c.lastSeen).getTime() : NaN;
    return Number.isFinite(seenMs) && seenMs >= cutoffMs;
  });

  const fleet: FleetDeviceReadiness[] = active.map((c) => {
    const appType = c.appType ?? null;
    const appVersion = c.appVersion ?? null;
    const lastSeen = c.lastSeen ? new Date(c.lastSeen) : null;
    const platformMin = appType ? cap.platforms[appType as keyof typeof cap.platforms] : undefined;
    if (!platformMin) {
      return {userId: c.userId ?? null, appType, appVersion, lastSeen, ok: false, reason: 'platform_not_shipped'};
    }
    const ok = !!appVersion && compareVersions(appVersion, cap.minClientVersion) >= 0;
    return {userId: c.userId ?? null, appType, appVersion, lastSeen, ok, reason: ok ? undefined : 'below_min_version'};
  });

  const blockedBy: string[] = [];
  if (active.length === 0) {
    blockedBy.push('no_active_devices');
  } else {
    if (fleet.some((d) => d.reason === 'platform_not_shipped')) blockedBy.push('platform_not_shipped');
    if (fleet.some((d) => d.reason === 'below_min_version')) blockedBy.push('below_min_version');
  }

  const ready = active.length > 0 && fleet.every((d) => d.ok);
  return {cap, ready, activeWindowDays, fleet, blockedBy};
}

export class RolloutReadinessService {
  private users = new UserRepo();
  private clientInfo = new ClientInfoRepo();

  async isAccountReadyFor(
    accountId: string,
    capKey: string,
    opts: {activeWindowDays?: number} = {},
  ): Promise<RolloutReadiness> {
    const activeWindowDays = opts.activeWindowDays ?? DEFAULT_ACTIVE_WINDOW_DAYS;
    const cap = getRolloutCapability(capKey) ?? null;
    if (!cap) {
      return {capKey, cap: null, ready: false, activeWindowDays, fleet: [], blockedBy: ['unknown_capability']};
    }

    const users = await this.users.listByAccountId(accountId);
    const userIds = users.map((u) => u._id).filter((id): id is string => !!id);
    if (userIds.length === 0) {
      return {capKey, cap, ready: false, activeWindowDays, fleet: [], blockedBy: ['no_users']};
    }

    const clients = (await this.clientInfo.findWhereIn('userId', userIds)) as FleetClientLike[];

    const result = evaluateFleetReadiness(cap, clients, {nowMs: Date.now(), activeWindowDays});
    return {capKey, ...result};
  }
}

export default RolloutReadinessService;
