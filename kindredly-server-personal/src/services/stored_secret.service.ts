import crypto from 'crypto';
import {Knex} from 'knex';
import {v4 as uuidv4} from 'uuid';
import {config} from '@/config';
import knex from '@/db/knex_config';
import {logger} from '@/utils/logger';
import {hashString} from '@/utils/crypto_util';
import {isV2StoredSecret, v2SaltOf, wrapStoredSecret} from '@/utils/stored_password';

/**
 * Writing stored passwords and PINs, and moving them between the old form and the new (HAT-848).
 * The forms are in `utils/stored_password.ts`.
 *
 * - `STORED_SECRET_V2` off (the default): every write stores the old form, as before.
 * - On: writes store the new form, and `upgradeStoredSecrets` changes existing rows.
 * - Every time the new form is written, the old form is kept first in `stored_secret_backup`, so
 *   `restoreStoredSecrets` can put every row back. Clearing the backups is a separate, deliberate step.
 */
export type StoredSecretField = 'password' | 'pin';

const FIELDS: StoredSecretField[] = ['password', 'pin'];
const BACKUP_TABLE = 'stored_secret_backup';
const V1 = /^[0-9a-f]{128}$/;
const BATCH = 100;
export const MIN_BACKUP_DAYS = 30;

async function keepBackup(db: Knex, userId: string, field: StoredSecretField, v1: string, v2: string) {
  const _id = 'ssb_' + uuidv4();
  await db(BACKUP_TABLE).insert({_id, userId, field, v1, v2Salt: v2SaltOf(v2), createdAt: new Date()});
  return _id;
}

/**
 * The value to store for a password or PIN the app sent. The old form unless `STORED_SECRET_V2` is on.
 * If keeping the backup or making the new form fails, it stores the old form: a write never fails
 * because of the upgrade.
 */
export async function secretForStorage(
  userId: string,
  field: StoredSecretField,
  sent: string,
  db: Knex = knex,
): Promise<string> {
  const v1 = hashString(String(sent));
  if (!config.storedSecretV2.write) return v1;
  try {
    const v2 = await wrapStoredSecret(v1, config.storedSecretV2.rounds);
    await keepBackup(db, userId, field, v1, v2);
    return v2;
  } catch (e) {
    logger.error(`[stored-secret] kept the old form for ${field} of ${userId}: ${(e as Error)?.message}`);
    return v1;
  }
}

export type StoredSecretRun = {
  field: StoredSecretField;
  dryRun: boolean;
  /** Rows in the form this run changes from. */
  looked: number;
  /** Rows changed, or that would be in a dry run. */
  changed: number;
  /** Rows that changed while the run was on them, left as they were. */
  skipped: number;
  /** Upgrade: rows that aren't a readable old form. Restore: new-form rows with no backup. */
  unreadable: number;
  unreadableUserIds: string[];
};

const newRun = (field: StoredSecretField, dryRun: boolean): StoredSecretRun => ({
  field,
  dryRun,
  looked: 0,
  changed: 0,
  skipped: 0,
  unreadable: 0,
  unreadableUserIds: [],
});

const pause = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/**
 * Changes old-form rows to the new form, a batch at a time, keeping each old value first. Safe to stop
 * and run again: new-form rows are left alone. A dry run only counts. Refuses to change anything
 * while `STORED_SECRET_V2` is off.
 */
export async function upgradeStoredSecrets(
  opts: {dryRun?: boolean; limit?: number; rounds?: number; pauseMs?: number; db?: Knex} = {},
): Promise<StoredSecretRun[]> {
  const {dryRun = false, limit = Infinity, rounds = config.storedSecretV2.rounds, pauseMs = 0, db = knex} = opts;
  if (!dryRun && !config.storedSecretV2.write) {
    throw new Error('STORED_SECRET_V2 is off. Turn it on before upgrading rows; a dry run works either way.');
  }
  const runs: StoredSecretRun[] = [];
  let budget = limit;
  for (const field of FIELDS) {
    const run = newRun(field, dryRun);
    runs.push(run);
    let after = '';
    while (budget > 0) {
      const rows: Array<Record<string, any>> = await db('user')
        .select('_id', field)
        .whereNotNull(field)
        .whereNot(field, 'like', 'v2$%')
        .where('_id', '>', after)
        .orderBy('_id')
        .limit(BATCH);
      if (!rows.length) break;
      for (const row of rows) {
        if (budget <= 0) break;
        after = row._id;
        const stored = row[field];
        if (!stored || isV2StoredSecret(stored)) continue;
        run.looked++;
        if (!V1.test(stored)) {
          run.unreadable++;
          run.unreadableUserIds.push(row._id);
          continue;
        }
        budget--;
        if (dryRun) {
          run.changed++;
          continue;
        }
        const v2 = await wrapStoredSecret(stored, rounds);
        const backupId = await keepBackup(db, row._id, field, stored, v2);
        // Only if the row still holds the value read: a password changed meanwhile is left alone.
        const updated = await db('user')
          .where({_id: row._id, [field]: stored})
          .update({[field]: v2});
        if (updated) {
          run.changed++;
        } else {
          await db(BACKUP_TABLE).where({_id: backupId}).del();
          run.skipped++;
        }
        await pause(pauseMs);
      }
    }
  }
  return runs;
}

/**
 * Puts the old form back in every new-form row, from the backup kept for that exact value. Refuses
 * while `STORED_SECRET_V2` is on, since writes would store the new form again. Keeps the backups.
 */
export async function restoreStoredSecrets(opts: {dryRun?: boolean; db?: Knex} = {}): Promise<StoredSecretRun[]> {
  const {dryRun = false, db = knex} = opts;
  if (!dryRun && config.storedSecretV2.write) {
    throw new Error('STORED_SECRET_V2 is on. Turn it off before restoring, or new writes store the new form again.');
  }
  const runs: StoredSecretRun[] = [];
  for (const field of FIELDS) {
    const run = newRun(field, dryRun);
    runs.push(run);
    let after = '';
    for (;;) {
      const rows: Array<Record<string, any>> = await db('user')
        .select('_id', field)
        .where(field, 'like', 'v2$%')
        .where('_id', '>', after)
        .orderBy('_id')
        .limit(BATCH);
      if (!rows.length) break;
      for (const row of rows) {
        after = row._id;
        const stored = row[field];
        const salt = v2SaltOf(stored);
        if (!salt) continue;
        run.looked++;
        const backup = await db(BACKUP_TABLE)
          .where({userId: row._id, field, v2Salt: salt})
          .orderBy('createdAt', 'desc')
          .first();
        if (!backup) {
          run.unreadable++;
          run.unreadableUserIds.push(row._id);
          continue;
        }
        if (dryRun) {
          run.changed++;
          continue;
        }
        const updated = await db('user')
          .where({_id: row._id, [field]: stored})
          .update({[field]: backup.v1});
        if (updated) run.changed++;
        else run.skipped++;
      }
    }
  }
  return runs;
}

/**
 * Deletes backups older than `olderThanDays` (at least 30). After this, rows changed before then can't
 * be put back in the old form; their new form still works on every server that reads both forms.
 */
export async function clearStoredSecretBackups(opts: {
  olderThanDays: number;
  dryRun?: boolean;
  now?: Date;
  db?: Knex;
}): Promise<{dryRun: boolean; cleared: number; olderThan: Date}> {
  const {olderThanDays, dryRun = false, now = new Date(), db = knex} = opts;
  if (!Number.isFinite(olderThanDays) || olderThanDays < MIN_BACKUP_DAYS) {
    throw new Error(`Backups are kept at least ${MIN_BACKUP_DAYS} days`);
  }
  const olderThan = new Date(now.getTime() - olderThanDays * 24 * 3600 * 1000);
  const query = db(BACKUP_TABLE).where('createdAt', '<', olderThan);
  if (dryRun) {
    const [{count}] = await query.clone().count({count: '*'});
    return {dryRun, cleared: Number(count), olderThan};
  }
  return {dryRun, cleared: Number(await query.del()), olderThan};
}

/** Milliseconds one new-form check takes at `rounds` on this machine, averaged over `tries`. */
export async function measureStoredSecretRounds(rounds: number, tries = 5): Promise<number> {
  const v1 = hashString('measure');
  const v2 = await wrapStoredSecret(v1, rounds);
  const [, , salt] = v2.split('$');
  const started = process.hrtime.bigint();
  for (let i = 0; i < tries; i++) {
    await new Promise<void>((resolve, reject) =>
      crypto.pbkdf2(v1, Buffer.from(salt, 'hex'), rounds, 64, 'sha512', (e) => (e ? reject(e) : resolve())),
    );
  }
  return Number(process.hrtime.bigint() - started) / 1e6 / tries;
}
