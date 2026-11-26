/**
 * A revision on each setting saved whole from an earlier read (RVW-9, S6): the limits
 * (`usageLimitsData`) and extra time (`ruleOverrideSettings`). Two guardians saving at once, or a
 * page left open, wrote back the other's older copy. A save may now carry the revision it read
 * (`ifRevision` on `/user/options/update`); the server refuses it when the stored revision is newer
 * and the save would change what is stored, and the page reads again.
 *
 * Only the server writes a revision. It goes up by one on a save that changes the setting and stays
 * on a save that changes nothing, so re-saving the same limits is never refused and wakes no device.
 * Devices never read it: `deviceSettingsFromOptions` picks its fields by name.
 */
export const REVISED_OPTION_KEYS = ['usageLimitsData', 'ruleOverrideSettings'] as const;
export type RevisedOptionKey = (typeof REVISED_OPTION_KEYS)[number];
export type OptionRevisions = Record<RevisedOptionKey, number>;

/** Not part of what a guardian set: the revision itself, and the time extra time was last saved. */
const BOOKKEEPING_KEYS = new Set(['revision', 'lastUpdated']);

/** The stored revision of one setting; 0 for one saved before revisions. */
export function optionRevision(options: unknown, key: RevisedOptionKey): number {
  const value = (options as Record<string, any> | null | undefined)?.[key]?.revision;
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function optionRevisions(options: unknown): OptionRevisions {
  return {
    usageLimitsData: optionRevision(options, 'usageLimitsData'),
    ruleOverrideSettings: optionRevision(options, 'ruleOverrideSettings'),
  };
}

/**
 * JSON with object keys sorted, as `stableStringify` in the server's device_settings.service.ts:
 * stored options come back from Postgres with their own key order.
 */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(v => stableJson(v === undefined ? null : v)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter(k => record[k] !== undefined)
    .sort()
    .map(k => `${JSON.stringify(k)}:${stableJson(record[k])}`);
  return `{${entries.join(',')}}`;
}

function settingContent(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return stableJson(value);
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!BOOKKEEPING_KEYS.has(k)) rest[k] = v;
  }
  return stableJson(rest);
}

/** Whether storing `after` would change what a guardian set for this setting. */
export function optionSettingChanged(before: unknown, after: unknown, key: RevisedOptionKey): boolean {
  const b = (before as Record<string, unknown> | null | undefined)?.[key];
  const a = (after as Record<string, unknown> | null | undefined)?.[key];
  return settingContent(b ?? null) !== settingContent(a ?? null);
}

/**
 * The settings this save read at an older revision and would change. `ifRevision` names only what
 * the caller read; a key it leaves out is saved as before revisions.
 */
export function staleOptionKeys(
  before: unknown,
  after: unknown,
  ifRevision: Partial<OptionRevisions> | null | undefined,
): RevisedOptionKey[] {
  if (!ifRevision || typeof ifRevision !== 'object') return [];
  return REVISED_OPTION_KEYS.filter(key => {
    const read = ifRevision[key];
    if (typeof read !== 'number') return false;
    return read !== optionRevision(before, key) && optionSettingChanged(before, after, key);
  });
}

/**
 * Sets each setting's revision on the options about to be stored, in place, and returns them all.
 * A revision a client sent inside the setting is never kept.
 */
export function applyOptionRevisions(before: unknown, after: Record<string, unknown>): OptionRevisions {
  const revisions = optionRevisions(before);
  for (const key of REVISED_OPTION_KEYS) {
    const value = after[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const next = optionSettingChanged(before, after, key) ? revisions[key] + 1 : revisions[key];
    const {revision: _sent, ...rest} = value as Record<string, unknown>;
    after[key] = next > 0 ? {...rest, revision: next} : rest;
    revisions[key] = next;
  }
  return revisions;
}
