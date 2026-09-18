import {Knex} from 'knex';

/**
 * The per-user device settings version (DCP-5). See the migration
 * `20260913220000_device_settings_version.ts` for why it is `GREATEST(previous + 1, epoch ms)`.
 *
 * Both helpers take the connection the write itself runs on, a transaction included, so the version
 * moves in the same transaction as the settings it describes. A version raised outside it could be
 * read by a device before the settings commit, and the device would keep old settings under a new
 * version, never fetching again.
 */
export function nextDeviceSettingsVersionSql(db: Knex | Knex.Transaction, nowMs = Date.now()): Knex.Raw {
  return db.raw('GREATEST(COALESCE("deviceSettingsVersion", 0) + 1, ?::bigint)', [Math.floor(nowMs)]);
}

export async function bumpDeviceSettingsVersion(
  db: Knex | Knex.Transaction,
  userIds: string[],
  nowMs = Date.now(),
): Promise<void> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;
  await db('user')
    .whereIn('_id', ids)
    .update({deviceSettingsVersion: nextDeviceSettingsVersionSql(db, nowMs)});
}
