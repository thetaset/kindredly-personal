/**
 * Activity/content flags attached to ActivityContentInfo.flags.
 *
 * These are *signals*, not a final classification.
 *
 * Convention (recommended):
 * - beh_*   : behavior/interaction pattern (refresh loops, rapid bouncing)
 * - risk_*  : elevated risk / potentially harmful dynamic (rage-spiral, toxic drafting)
 * - safe_*  : de-risking signal (e.g. "kid-safe mode", "teacher-led")
 * - content_* : content attributes (adult/graphic/etc) when you don't want a separate axis
 *
 * NOTE: flags are intentionally open-ended; classifiers/rules may emit new strings.
 */

export type ActivityFlagKind = 'behavior' | 'risk' | 'safety' | 'content' | 'unknown';

const FLAG_PREFIX_KIND: Array<{ prefix: string; kind: ActivityFlagKind }> = [
  { prefix: 'beh_', kind: 'behavior' },
  { prefix: 'risk_', kind: 'risk' },
  { prefix: 'safe_', kind: 'safety' },
  { prefix: 'content_', kind: 'content' },
];

export const knownActivityFlags: Array<{
  key: string;
  kind: ActivityFlagKind;
  label: string;
  description: string;
}> = [
  {
    key: 'beh_compulsive_refresh',
    kind: 'behavior',
    label: 'Compulsive Refresh',
    description: 'Repeated rapid refreshes or revisiting the same page/source in a short window.',
  },
  {
    key: 'beh_rapid_bounce',
    kind: 'behavior',
    label: 'Rapid Bouncing',
    description: 'Many short visits with little dwell time, often indicating restless browsing.',
  },
  {
    key: 'risk_rage_spiral',
    kind: 'risk',
    label: 'Rage Spiral',
    description: 'Signals the user may be escalating emotionally (placeholder for future detection).',
  },
  {
    key: 'risk_toxic_drafting',
    kind: 'risk',
    label: 'Toxic Drafting',
    description: 'Signals the user may be typing mean/rash content (placeholder for future detection).',
  },
  {
    key: 'safe_teacher_led',
    kind: 'safety',
    label: 'Teacher-Led',
    description: 'Context suggests the activity is structured/teacher-led, reducing risk.',
  },
];

export function getActivityFlagKind(flag: string): ActivityFlagKind {
  if (!flag) return 'unknown';
  for (const entry of FLAG_PREFIX_KIND) {
    if (flag.startsWith(entry.prefix)) return entry.kind;
  }
  return 'unknown';
}

export function getActivityFlagDisplayName(flag: string): string {
  if (!flag) return '';

  const known = knownActivityFlags.find(f => f.key === flag);
  if (known) return known.label;

  // Fallback: convert snake_case / camelCase into Title Case.
  return flag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function splitActivityFlags(flags: string[] | undefined | null): Record<ActivityFlagKind, string[]> {
  const out: Record<ActivityFlagKind, string[]> = {
    behavior: [],
    risk: [],
    safety: [],
    content: [],
    unknown: [],
  };

  for (const flag of flags || []) {
    out[getActivityFlagKind(flag)].push(flag);
  }

  return out;
}
