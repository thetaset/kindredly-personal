/**
 * The box announces itself (BOX-1).
 *
 * Clients probe `kindredly.local` (`tset-client/src/core/serverDiscovery.ts`) but nothing ever
 * published it: the name resolved only when the machine's OS hostname happened to be `kindredly`
 * and Bonjour/Avahi was doing it for free. Without a stable name the box's ADDRESS was its
 * identity, and every DHCP move signed every device out — the browser scopes the session to the
 * origin.
 *
 * This publishes, on the `lite` profile only:
 *   - `kindredly.local` (A/AAAA) — or `kindredly-2.local` / `kindredly-3.local` when the name is
 *     already taken on the LAN, logged so the setup page can say which;
 *   - a `_kindredly._tcp` service record carrying the port, the API version, the server version
 *     and the authority fingerprint (BOX-3), for native clients that can browse.
 *
 * The responder is `@homebridge/ciao` (passes Apple's Bonjour conformance test; does RFC 6762
 * probing and conflict handling). Multicast is not hand-rolled here.
 *
 * Known limits, to be written on the setup page rather than around: Android resolves `.local`
 * in Chrome only from 12 up, and some routers drop multicast DNS entirely — Home Assistant's
 * `homeassistant.local` issue thread is the evidence. The name is the fast path; the client's
 * LAN sweep (BOX-2) is the backstop.
 */
import dns from 'dns';
import {config} from '@/config';
import {logger} from '@/utils/logger';
import {currentLanAddresses} from '@/base/box_tls';

/** In order of preference. Matches BOX_HOSTNAMES in box_tls.ts and DEFAULT_DISCOVERY_HOSTNAMES on the client. */
export const BOX_NAME_CANDIDATES = ['kindredly', 'kindredly-2', 'kindredly-3'];
export const BOX_SERVICE_TYPE = 'kindredly';

export type BoxAnnouncement = {
  /** Without the `.local` suffix, e.g. `kindredly-2`. */
  hostname: string;
  stop: () => Promise<void>;
};

/** The name this process announced (without `.local`), for /healthcheckping and the setup page; null until then. */
let announcedHostname: string | null = null;
export function getAnnouncedHostname(): string | null {
  return announcedHostname;
}

export function boxAnnounceEnabled(): boolean {
  return config.profile === 'lite' && config.box.mdns;
}

type Lookup = (hostname: string) => Promise<string[]>;

const osLookup: Lookup = async (hostname) => {
  const results = await dns.promises.lookup(hostname, {all: true});
  return results.map((r) => r.address);
};

/**
 * The first candidate not already answering on this LAN for somebody else.
 *
 * A name is taken when it resolves to an address that is not one of ours; a name that does not
 * resolve at all is free. On a Linux host without an mDNS resolver every lookup fails and every
 * name looks free — ciao's own prober still catches a real conflict and the `hostname-change`
 * event below logs what it did about it.
 */
export async function pickFreeHostname(
  candidates: string[] = BOX_NAME_CANDIDATES,
  ours: string[] = currentLanAddresses(),
  lookup: Lookup = osLookup,
): Promise<{hostname: string; taken: string[]}> {
  const mine = new Set(['127.0.0.1', '::1', ...ours]);
  const taken: string[] = [];
  for (const name of candidates) {
    let addresses: string[] = [];
    try {
      addresses = await lookup(`${name}.local`);
    } catch {
      addresses = [];
    }
    const foreign = addresses.filter((a) => !mine.has(a));
    if (foreign.length === 0) return {hostname: name, taken};
    taken.push(name);
  }
  // Every candidate is taken: use the last one anyway and let the prober suffix it further.
  return {hostname: candidates[candidates.length - 1], taken};
}

type ResponderLike = {
  createService: (options: Record<string, unknown>) => {
    advertise: () => Promise<void>;
    on: (event: string, listener: (value: string) => void) => unknown;
  };
  shutdown: () => Promise<void>;
};

/** Test seam: the ciao responder, loaded lazily so the cloud never touches multicast. */
export const announceHooks = {
  getResponder: async (): Promise<ResponderLike> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ciao = require('@homebridge/ciao');
    return ciao.getResponder();
  },
  lookup: undefined as Lookup | undefined,
};

/**
 * Start announcing. Resolves to null when this process should not announce (cloud, or `off`).
 * Never throws: a box whose network refuses multicast still serves; it just is not findable by name.
 */
export async function startBoxAnnounce(opts: {port: number; caSha256?: string}): Promise<BoxAnnouncement | null> {
  if (!boxAnnounceEnabled()) return null;
  try {
    const preferred = config.box.hostname ? [config.box.hostname, ...BOX_NAME_CANDIDATES] : BOX_NAME_CANDIDATES;
    const {hostname, taken} = await pickFreeHostname(
      [...new Set(preferred)],
      currentLanAddresses(),
      announceHooks.lookup,
    );
    if (taken.length)
      logger.warn(
        `[box-announce] ${taken.map((n) => `${n}.local`).join(', ')} already in use on this network; announcing as ${hostname}.local`,
      );

    const responder = await announceHooks.getResponder();
    const service = responder.createService({
      name: 'Kindredly Box',
      type: BOX_SERVICE_TYPE,
      port: opts.port,
      hostname,
      txt: {
        api: config.apiVersion,
        ver: config.version.serverVersion,
        ...(opts.caSha256 ? {ca: opts.caSha256} : {}),
      },
    });
    let announced = hostname;
    service.on('hostname-change', (changed: string) => {
      announced = changed;
      announcedHostname = changed;
      logger.warn(`[box-announce] hostname conflict on the network; now announcing as ${changed}.local`);
    });
    await service.advertise();
    announcedHostname = announced;
    logger.info(`[box-announce] ${announced}.local and _${BOX_SERVICE_TYPE}._tcp on port ${opts.port}`);
    return {
      hostname: announced,
      stop: () => responder.shutdown().catch(() => undefined),
    };
  } catch (error) {
    logger.warn(`[box-announce] not announcing: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
