/**
 * Saving one field of `accessControlSettings` without saving the rest (HAT-327, REG-7).
 *
 * `accessControlSettings` holds about a dozen settings with different writers: pauses, Block all,
 * the check-in and its release, reminders, the usage indicator, the blocked message, remote
 * actions, Live View. Every writer used to read the object, change one field and send the whole
 * thing back, so two writers a moment apart erased each other — a parent's save wiped a child's
 * check-in that way (UX-023).
 *
 * A save now carries `accessControlSettingsPatch`: only the fields it changes, with `null` meaning
 * "remove this field". A current server applies the patch to its own latest copy and ignores the
 * whole object. The whole object still goes with it for a server that predates patches (a personal
 * box not yet updated), which stores it as before.
 */

/** The fields to change. `null` removes a field. */
export type AccessControlSettingsPatch = Record<string, unknown>;

/** The settings after a patch: changed fields set, `null` fields removed, the rest untouched. */
export function applyAccessControlSettingsPatch(
  current: Record<string, unknown> | null | undefined,
  patch: AccessControlSettingsPatch,
): Record<string, unknown> {
  const next: Record<string, unknown> = {...(current || {})};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next;
}

/**
 * The options for saving a change to `accessControlSettings`: the patch, and the whole object it
 * produces from `current` for a server that does not know patches.
 */
export function accessControlSettingsSave(
  current: Record<string, unknown> | null | undefined,
  patch: AccessControlSettingsPatch,
): {accessControlSettings: Record<string, unknown>; accessControlSettingsPatch: AccessControlSettingsPatch} {
  // `undefined` would vanish from the JSON and change nothing, where in a whole-object save it
  // removed the field. Sent as `null`, it removes the field either way.
  const sent: AccessControlSettingsPatch = {};
  for (const [key, value] of Object.entries(patch)) sent[key] = value === undefined ? null : value;
  return {
    accessControlSettings: applyAccessControlSettingsPatch(current, sent),
    accessControlSettingsPatch: sent,
  };
}

/**
 * The patch that turns `before` into `after`: fields that changed, and `null` for fields `after`
 * dropped. For a writer that builds the whole object from a copy it read, so it can send just what
 * it changed beside it.
 */
export function accessControlSettingsChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): AccessControlSettingsPatch {
  const patch: AccessControlSettingsPatch = {};
  const from = before || {};
  const to = after || {};
  for (const key of Object.keys(to)) {
    if (to[key] === undefined) {
      if (key in from) patch[key] = null;
    } else if (JSON.stringify(to[key]) !== JSON.stringify(from[key])) {
      patch[key] = to[key];
    }
  }
  for (const key of Object.keys(from)) {
    if (!(key in to) && from[key] !== undefined) patch[key] = null;
  }
  return patch;
}

export function isAccessControlSettingsPatch(value: unknown): value is AccessControlSettingsPatch {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
