/**
 * Device folders' fallback (HAT-1321, docs/proposals/device-folders.md → Transport): when a person's
 * device and the folder's computer cannot connect directly, Cloudflare's TURN service carries the
 * connection between them. This hands that person's app a password for it, good for an hour.
 *
 * The cost is ours, so the allowance is kept here and not on any device. Before each password the
 * server reads this person's use this month from Cloudflare's analytics, under an identifier that
 * names no one, and refuses once they reach `gbPerPersonPerMonth`. If their use can't be read, no
 * password is handed out: the app still tries a direct connection.
 *
 * The files stay sealed either way: DTLS on the channel, and the connection details were swapped
 * inside frames the server cannot read. Cloudflare sees addresses and amounts, as a relay of our own
 * would. NOTHING HERE IS LOGGED but an event name: never a password, an identifier or an amount.
 */
import {createHash} from 'crypto';
import {config} from '@/config';
import {getKeyValueStore} from '@/base/runtime.factory';
import type {KeyValueStore} from '@/base/kv_store';
import type {DeviceFolderIceServer, DeviceFolderRelayState} from 'tset-sharedlib/api';

/** The free STUN servers every connection uses; the apps hold the same list for when this fails. */
export const DEVICE_FOLDER_STUN: DeviceFolderIceServer[] = [
  {urls: ['stun:stun.l.google.com:19302']},
  {urls: ['stun:stun.cloudflare.com:3478']},
];

const TURN_API = 'https://rtc.live.cloudflare.com/v1/turn/keys';
const GRAPHQL_API = 'https://api.cloudflare.com/client/v4/graphql';
/** A relayed connection ends when its password does, so this bounds how far past the allowance one can run. */
export const RELAY_PASSWORD_TTL_SEC = 60 * 60;
/**
 * Cloudflare's analytics show use a few minutes late (3 to 6 minutes, measured 2026-11-25; its FAQ
 * says 30 seconds). Read it at most once a minute per person.
 */
const USE_CACHE_SEC = 60;
const REQUEST_TIMEOUT_MS = 8_000;

export type RelaySettings = {
  turnKeyId: string;
  turnKeyApiToken: string;
  accountId: string;
  analyticsToken: string;
  gbPerPersonPerMonth: number;
};

function relayLog(event: string): void {
  console.info(`[deviceFolders] relay ${event}`);
}

/** The name Cloudflare counts a person's use under: stable, and it names no one. */
export function relayIdentifier(userId: string): string {
  return createHash('sha256').update(`kindredly-device-folder-relay:${userId}`).digest('hex').slice(0, 32);
}

/** This month so far, as Cloudflare's analytics take dates (UTC). */
export function monthSoFar(now: Date): {from: string; to: string} {
  const to = now.toISOString().slice(0, 10);
  return {from: `${to.slice(0, 8)}01`, to};
}

/**
 * Cloudflare's answer, as a list browsers take. The alternate port 53 is dropped: browsers block it,
 * and without trickle ICE the app would wait for it to time out (Cloudflare's own advice).
 */
export function normalizeIceServers(body: unknown): DeviceFolderIceServer[] {
  const raw = (body as any)?.iceServers;
  const entries: any[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  const out: DeviceFolderIceServer[] = [];
  for (const entry of entries) {
    const list: unknown[] = Array.isArray(entry?.urls)
      ? entry.urls
      : typeof entry?.urls === 'string'
        ? [entry.urls]
        : [];
    const urls = list.filter(
      (u): u is string => typeof u === 'string' && /^(stun|turns?):/.test(u) && !/:53(\?|$)/.test(u),
    );
    if (!urls.length) continue;
    const isTurn = urls.some((u) => u.startsWith('turn'));
    if (!isTurn) {
      out.push({urls});
      continue;
    }
    if (typeof entry.username !== 'string' || typeof entry.credential !== 'string') continue;
    out.push({urls, username: entry.username, credential: entry.credential});
  }
  return out;
}

/** The bytes Cloudflare sent this person this month, from its analytics' answer. */
export function egressBytesOf(body: unknown): number | null {
  const viewer = (body as any)?.data?.viewer;
  if (!viewer || typeof viewer !== 'object' || (body as any)?.errors?.length) return null;
  // The documented query answers under `accounts`; Cloudflare's own example shows `usage`.
  const accounts: any[] = Array.isArray(viewer.accounts)
    ? viewer.accounts
    : Array.isArray(viewer.usage)
      ? viewer.usage
      : [];
  if (!accounts.length) return null;
  const groups = accounts[0]?.callsTurnUsageAdaptiveGroups;
  if (!Array.isArray(groups)) return null;
  let total = 0;
  for (const group of groups) {
    const bytes = Number(group?.sum?.egressBytes);
    if (Number.isFinite(bytes) && bytes > 0) total += bytes;
  }
  return total;
}

export default class DeviceFolderRelayService {
  constructor(
    private readonly settings: () => RelaySettings = () => config.deviceFolderRelay,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private configured(s: RelaySettings): boolean {
    return !!(s.turnKeyId && s.turnKeyApiToken && s.accountId && s.analyticsToken && s.gbPerPersonPerMonth > 0);
  }

  /**
   * The servers this person's app should try: STUN always, and Cloudflare's TURN while the fallback
   * is set up and they are under their allowance. `relay` says which, so the page can say why when
   * neither path connects.
   */
  async iceServersFor(userId: string): Promise<{iceServers: DeviceFolderIceServer[]; relay: DeviceFolderRelayState}> {
    const s = this.settings();
    if (!this.configured(s)) return {iceServers: DEVICE_FOLDER_STUN, relay: 'off'};
    const id = relayIdentifier(userId);
    const used = await this.usedBytes(s, id);
    if (used === null) return {iceServers: DEVICE_FOLDER_STUN, relay: 'off'};
    if (used >= s.gbPerPersonPerMonth * 1024 ** 3) {
      relayLog('used_up');
      return {iceServers: DEVICE_FOLDER_STUN, relay: 'used_up'};
    }
    const turn = await this.mint(s, id);
    if (!turn.length) return {iceServers: DEVICE_FOLDER_STUN, relay: 'off'};
    return {iceServers: [...DEVICE_FOLDER_STUN, ...turn.filter((t) => t.username)], relay: 'on'};
  }

  /**
   * One password for Cloudflare's TURN, tagged with this person's identifier for the analytics.
   * `generate-ice-servers` rather than `generate`: it also lists TURN on port 443 (UDP, and TLS),
   * which gets through networks that allow nothing else, and it counts use under the identifier too
   * (both checked against Cloudflare 2026-11-25).
   */
  private async mint(s: RelaySettings, id: string): Promise<DeviceFolderIceServer[]> {
    try {
      const res = await this.fetchImpl(
        `${TURN_API}/${encodeURIComponent(s.turnKeyId)}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {Authorization: `Bearer ${s.turnKeyApiToken}`, 'Content-Type': 'application/json'},
          body: JSON.stringify({ttl: RELAY_PASSWORD_TTL_SEC, customIdentifier: id}),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (!res.ok) {
        relayLog(`mint_failed_${res.status}`);
        return [];
      }
      return normalizeIceServers(await res.json());
    } catch {
      relayLog('mint_failed');
      return [];
    }
  }

  /** This person's use this month, read from Cloudflare at most once a minute; null if it can't be. */
  private async usedBytes(s: RelaySettings, id: string): Promise<number | null> {
    const cacheKey = `deviceFolders:relayUse:${id}`;
    const cached = await this.kv.get(cacheKey).catch(() => null);
    if (cached !== null && Number.isFinite(Number(cached))) return Number(cached);
    const {from, to} = monthSoFar(this.now());
    // Every value is ours and checked (hex ids, ISO dates), so it is written into the query as is.
    if (!/^[0-9a-f]+$/i.test(s.accountId) || !/^[0-9a-f]+$/.test(id)) return null;
    const query = `query { viewer { accounts(filter: { accountTag: "${s.accountId}" }) {
      callsTurnUsageAdaptiveGroups(filter: { date_geq: "${from}", date_leq: "${to}", customIdentifier: "${id}" }, limit: 1) {
        sum { egressBytes }
      } } } }`;
    try {
      const res = await this.fetchImpl(GRAPHQL_API, {
        method: 'POST',
        headers: {Authorization: `Bearer ${s.analyticsToken}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({query}),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        relayLog(`use_failed_${res.status}`);
        return null;
      }
      const used = egressBytesOf(await res.json());
      if (used === null) {
        relayLog('use_unreadable');
        return null;
      }
      await this.kv.setex(cacheKey, USE_CACHE_SEC, String(used)).catch(() => {});
      return used;
    } catch {
      relayLog('use_failed');
      return null;
    }
  }
}
