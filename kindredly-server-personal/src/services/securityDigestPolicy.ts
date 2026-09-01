/**
 * What counts as worth waking someone for, given an hour of the security ledger.
 *
 * Pure by design — no database, no clock, no email. Every threshold decision is a function
 * of numbers passed in, so the judgement can be unit-tested without standing anything up.
 * The service beside this file does the I/O.
 *
 * These thresholds are **uncalibrated**. Nothing has run against real production traffic
 * yet, so they are set where a human would clearly agree something is wrong rather than at
 * the edge of normal. That direction is deliberate: an alerting system that cries wolf in
 * its first week gets muted, and a muted alert is worse than no alert because it looks like
 * coverage. Tighten them once a few weeks of digests show what quiet actually looks like.
 */

export type DigestSeverity = 'warn' | 'critical';

export type DigestCount = {
  eventType: string;
  severity: 'info' | 'warn' | 'critical';
  occurrences: number;
  rows: number;
};

export type DigestSource = {ipPrefix: string; occurrences: number};

export type DigestInput = {
  windowHours: number;
  counts: DigestCount[];
  sources: DigestSource[];
};

export type DigestFinding = {
  /**
   * Stable across runs for the same condition, so the alert throttle can recognise "this
   * again" rather than mailing every hour. Deliberately excludes the occurrence count —
   * including it would make every new number a new alert.
   */
  key: string;
  severity: DigestSeverity;
  /** One line, readable in an email subject. */
  title: string;
  /** Numbers behind the title. Never free text from a request. */
  detail: Record<string, string | number>;
};

export type DigestResult = {
  windowHours: number;
  totalOccurrences: number;
  distinctTypes: number;
  distinctSources: number;
  findings: DigestFinding[];
};

export const DIGEST_THRESHOLDS = {
  /**
   * Failed logins in the window. A family product has a handful an hour from mistyped
   * passwords; 200 is not people forgetting.
   */
  loginFailuresPerWindow: 200,
  /**
   * Rate-limit rejections. Some are normal — a client retry loop trips them — so this sits
   * well above background noise.
   */
  rateLimitPerWindow: 1000,
  /**
   * Admin-route auth failures. Different in kind from the above: nobody stumbles onto an
   * admin route, so a handful is already probing.
   */
  adminAuthFailuresPerWindow: 10,
  /**
   * AI budget stops. One family hitting its cap is the system working. Many in an hour
   * means either an abuse pattern or a budget set too low, and both need a look.
   */
  aiBudgetStopsPerWindow: 25,
  /** A single subnet must clear this before concentration is even considered. */
  sourceMinOccurrences: 100,
  /**
   * …and account for this share of everything. Both conditions together, because on a
   * quiet hour one subnet trivially owns 100% of three events.
   */
  sourceShare: 0.6,
} as const;

/** Event types that are never routine, whatever the count. */
const ALWAYS_ALERT = new Set(['proxy.ssrf_blocked', 'auth.session_revoked_use']);

const occurrencesOf = (counts: DigestCount[], eventType: string): number =>
  counts.filter((c) => c.eventType === eventType).reduce((total, c) => total + c.occurrences, 0);

export function evaluateDigest(input: DigestInput): DigestResult {
  const counts = input.counts || [];
  const sources = input.sources || [];
  const totalOccurrences = counts.reduce((total, c) => total + c.occurrences, 0);
  const findings: DigestFinding[] = [];

  // 1. Anything the recording site already called critical. Trusting the emitter here means
  //    a new critical event type raises an alert without this file having to learn about it.
  for (const c of counts) {
    if (c.severity !== 'critical') continue;
    findings.push({
      key: `critical:${c.eventType}`,
      severity: 'critical',
      title: `Critical security event: ${c.eventType}`,
      detail: {eventType: c.eventType, occurrences: c.occurrences, windowHours: input.windowHours},
    });
  }

  // 2. Event types that are never routine even at severity warn.
  for (const eventType of ALWAYS_ALERT) {
    const occurrences = occurrencesOf(counts, eventType);
    if (!occurrences) continue;
    // Already reported above if it came through as critical.
    if (findings.some((f) => f.key === `critical:${eventType}`)) continue;
    findings.push({
      key: `always:${eventType}`,
      severity: 'critical',
      title: `${eventType} occurred ${occurrences} time(s)`,
      detail: {eventType, occurrences, windowHours: input.windowHours},
    });
  }

  const volumeRules: Array<{eventType: string; threshold: number; title: string}> = [
    {
      eventType: 'auth.login_failed',
      threshold: DIGEST_THRESHOLDS.loginFailuresPerWindow,
      title: 'Failed logins are far above normal',
    },
    {
      eventType: 'auth.admin_login_failed',
      threshold: DIGEST_THRESHOLDS.adminAuthFailuresPerWindow,
      title: 'Repeated failed access to admin routes',
    },
    {
      eventType: 'ratelimit.exceeded',
      threshold: DIGEST_THRESHOLDS.rateLimitPerWindow,
      title: 'Sustained rate-limit rejections',
    },
    {
      eventType: 'ai.budget_exceeded',
      threshold: DIGEST_THRESHOLDS.aiBudgetStopsPerWindow,
      title: 'Many accounts are hitting the AI budget',
    },
  ];

  for (const rule of volumeRules) {
    const occurrences = occurrencesOf(counts, rule.eventType);
    if (occurrences < rule.threshold) continue;
    findings.push({
      key: `volume:${rule.eventType}`,
      severity: 'warn',
      title: rule.title,
      detail: {
        eventType: rule.eventType,
        occurrences,
        threshold: rule.threshold,
        windowHours: input.windowHours,
      },
    });
  }

  // 3. One subnet behind most of the traffic. This is what separates "a lot of people had a
  //    bad hour" from "one place is doing this to us", and it is the single most useful
  //    signal in the digest — but only when there is enough volume for a share to mean
  //    anything.
  const top = sources[0];
  if (top && top.occurrences >= DIGEST_THRESHOLDS.sourceMinOccurrences && totalOccurrences > 0) {
    const share = top.occurrences / totalOccurrences;
    if (share >= DIGEST_THRESHOLDS.sourceShare) {
      findings.push({
        key: `source:${top.ipPrefix}`,
        severity: 'warn',
        title: `One subnet is behind most security events (${top.ipPrefix})`,
        detail: {
          ipPrefix: top.ipPrefix,
          occurrences: top.occurrences,
          sharePercent: Math.round(share * 100),
          totalOccurrences,
          windowHours: input.windowHours,
        },
      });
    }
  }

  return {
    windowHours: input.windowHours,
    totalOccurrences,
    distinctTypes: new Set(counts.map((c) => c.eventType)).size,
    distinctSources: sources.length,
    findings,
  };
}
