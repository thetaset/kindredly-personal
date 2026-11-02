/**
 * Is a newer Kindredly Personal published? (HAT-917, LITE-32)
 *
 * A Personal box has no version number of its own (`SERVER_VERSION` is a hardcoded 3.0.0). What it
 * does carry is the sync stamp every Personal release writes at the root of the published repo,
 * mounted at /app/.kindredly-sync.json — its `clientVersion` is the version this box was made from.
 * The newest published one is the same file on the public repo's main branch (founder, 2026-10-31).
 *
 * LITE-32's rule: nothing about the family leaves the box but the fetch itself — a plain GET of a
 * public file, no query string, no id, no version. Asked for when an admin opens the app, never on
 * a timer, and remembered for 12 hours so a busy family does not ask GitHub on every start.
 */
import {readFile} from 'fs/promises';
import path from 'path';
import type {PersonalUpdateInfo} from 'tset-sharedlib/types';
import {config} from '@/config';

const REPO_URL = 'https://github.com/thetaset/kindredly-personal';
const LATEST_URL = 'https://raw.githubusercontent.com/thetaset/kindredly-personal/main/.kindredly-sync.json';
const CACHE_MS = 12 * 60 * 60 * 1000;

/** The server runs from /app/kindredly-server-personal; the stamp is one level up. */
const stampPath = () => process.env.KINDREDLY_SYNC_STAMP || path.resolve(process.cwd(), '..', '.kindredly-sync.json');

const versionOf = (j: unknown): string | null => {
  const v = (j as {clientVersion?: unknown})?.clientVersion;
  return typeof v === 'string' && /^\d+(\.\d+)*$/.test(v) ? v : null;
};

/** 3.1.10 is newer than 3.1.9: compared part by part as numbers, not as text. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

let latestCache: {at: number; version: string | null} | null = null;

async function latestPublished(fetchImpl: typeof fetch): Promise<string | null> {
  if (latestCache && Date.now() - latestCache.at < CACHE_MS) return latestCache.version;
  let version: string | null = null;
  try {
    const res = await fetchImpl(LATEST_URL, {signal: AbortSignal.timeout(10_000)});
    if (res.ok) version = versionOf(await res.json());
  } catch {
    // Offline, or GitHub unreachable: not known, and asked again next time rather than cached.
    return null;
  }
  latestCache = {at: Date.now(), version};
  return version;
}

async function ownVersion(): Promise<string | null> {
  try {
    return versionOf(JSON.parse(await readFile(stampPath(), 'utf8')));
  } catch {
    return null;
  }
}

export async function personalUpdateCheck(fetchImpl: typeof fetch = fetch): Promise<PersonalUpdateInfo> {
  if (!config.privateServer) return {current: null, latest: null, updateAvailable: false, repoUrl: REPO_URL};
  const current = await ownVersion();
  // A box that cannot name its own version has nothing to compare, so it does not ask.
  const latest = current ? await latestPublished(fetchImpl) : null;
  return {
    current,
    latest,
    updateAvailable: !!current && !!latest && isNewerVersion(latest, current),
    repoUrl: REPO_URL,
  };
}

/** For the tests. */
export function resetPersonalUpdateCache() {
  latestCache = null;
}
