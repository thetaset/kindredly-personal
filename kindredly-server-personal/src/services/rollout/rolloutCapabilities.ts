/**
 * Rollout Capabilities — registry of format/behavior changes that require the whole of an
 * account's client fleet to be updated before the account may start *writing* the new format.
 *
 * This is the single, reusable encoding of the founder's fleet-safety rule: an account only
 * switches to a new write-format once (1) all its active clients run a build that can READ the new
 * format, and (2) a supporting build has been RELEASED on every platform the account uses.
 *
 * A capability's `platforms` map IS the "released on every platform" assertion — a platform absent
 * from the map is treated as "not yet shipped" and blocks readiness. Bump these per release as each
 * platform's build ships. (Kept in code for v1; can move to server config/DB later.)
 */

export type RolloutAppType = 'webapp' | 'extension' | 'ios' | 'android';

export type RolloutCapability = {
  /** Stable key stored on the account flag (`extendedFeatures['rollout.'+key]`). */
  key: string;
  description: string;
  /** First client build that can READ the new format. */
  minClientVersion: string;
  /** Min RELEASED build per platform; a missing platform = not yet shipped (blocks readiness). */
  platforms: Partial<Record<RolloutAppType, string>>;
};

export const ROLLOUT_CAPABILITIES: Record<string, RolloutCapability> = {
  /*
   * `deviceAppUsageAttribution` (counting phone-app time against category usage
   * limits) used to live here and was deliberately removed.
   *
   * This mechanism protects FORMAT changes: false means "keep writing the old
   * format", which every client can still read, so a cold or stale flag only ever
   * delays the switch. Phone-app attribution is a BEHAVIOR change with no old
   * format to fall back on — there, false means the parental control is simply off,
   * and the client-side gate is cache-only and false when cold, so a cold start
   * silently stopped category limits reaching the phone for minutes at a time.
   * The gate's safe direction and its default pointed opposite ways.
   *
   * It was also guarding a risk that did not exist: the harm was an EXISTING
   * "2 hours of Fun" limit suddenly governing a child's games on an app update,
   * which requires families already running Guard. There were none. Every family
   * who enrols meets the behavior as the feature, not as a change. The parent's
   * real control is `countInUsageLimits` on the per-child Apps page, honoured by
   * both the rule compiler and the usage report.
   *
   * Add capabilities here for format/wire changes. Think hard before adding one for
   * a behavior change — check which way its safe default points first.
   */
  publishPrivacy: {
    key: 'publishPrivacy',
    description: 'Encrypt publishId/imageFilename at rest + blind-key dedup',
    minClientVersion: '3.1.0',
    platforms: {
      webapp: '3.1.0',
      extension: '3.1.0',
      ios: '3.1.0',
      android: '3.1.0',
    },
  },
};

export function getRolloutCapability(key: string): RolloutCapability | undefined {
  return ROLLOUT_CAPABILITIES[key];
}

/**
 * Compare two dotted numeric version strings.
 * Returns 1 if a > b, -1 if a < b, 0 if equal. Missing/non-numeric parts are treated as 0, so
 * `'3.1' === '3.1.0'` and `'3.1' > '3.0.236'`.
 */
export function compareVersions(a: string, b: string): number {
  const pa = String(a || '').split('.');
  const pb = String(b || '').split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? '0', 10) || 0;
    const nb = parseInt(pb[i] ?? '0', 10) || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
