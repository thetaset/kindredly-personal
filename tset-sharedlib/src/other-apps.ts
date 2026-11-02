/**
 * "Open other apps" (founder, 2026-09-18): whether links in the Kindredly browser on a phone or
 * tablet may leave for another app — phone, email and maps links, links that launch an app, and
 * Always Open in App. One switch in Open With settings, written only by an admin.
 *
 * Stored inverted, as `user.options.containLinksInternally` (true = links stay in Kindredly), the
 * name it had as the old "Contain external app links" switch. The server never seeds it, so nothing
 * stored is the common case and means: an adult may open other apps, a child (`type: 'restricted'`)
 * may not until a guardian allows it. An unknown type is treated as a child.
 *
 * The iOS and Android apps apply the same rule natively (TabManager.allowsOtherApps,
 * UserPreferences.allowsOtherApps); keep them in step with this file.
 */

export type PersonOtherApps =
  | { type?: unknown; options?: { containLinksInternally?: unknown; openYouTubeInApp?: unknown } | null }
  | null
  | undefined;

export function personAllowsOtherApps(person: PersonOtherApps): boolean {
  const contained = person?.options?.containLinksInternally;
  return person?.type === 'admin' ? contained !== true : contained === false;
}

/** The value to store for a choice made with the "Open other apps" switch. */
export function containLinksInternallyFor(allowOtherApps: boolean): boolean {
  return !allowOtherApps;
}

/**
 * "Open YouTube in the YouTube app" (founder, 2026-09-25, HAT-109). Off unless an admin turns it on
 * for an adult: YouTube otherwise stays in Kindredly, in its player or the Kindredly browser, even
 * for an adult who allows other apps. Never for a child, whatever is stored, and it can do nothing
 * while "Open other apps" is off. Stored as `user.options.openYouTubeInApp`.
 *
 * The phone apps apply the same rule natively (TabManager.allowsYouTubeApp,
 * OtherAppsRules.allowsYouTubeApp); keep them in step with this file.
 */
export function personAllowsYouTubeApp(person: PersonOtherApps): boolean {
  return person?.type === 'admin'
    && personAllowsOtherApps(person)
    && person?.options?.openYouTubeInApp === true;
}

/**
 * YouTube opens in its app only when `personAllowsYouTubeApp` says so: Kindredly has its own
 * YouTube player. Each entry also covers its subdomains (m., music., www.).
 */
export const YOUTUBE_APP_HOSTS: readonly string[] = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'youtubekids.com',
];

export function isYouTubeAppHost(host: string | null | undefined): boolean {
  const normalized = (host ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!normalized) return false;
  return YOUTUBE_APP_HOSTS.some((entry) => normalized === entry || normalized.endsWith(`.${entry}`));
}
