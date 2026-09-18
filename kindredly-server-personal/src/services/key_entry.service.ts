import {FriendRepo} from '@/db/friend.repo';
import {KeyEntryRepo} from '@/db/key_entry.repo';
import {UserRepo} from '@/db/user.repo';
import KeyEntry from 'tset-sharedlib/schemas/public/KeyEntry';
import {RequestContext} from '@/base/request_context';
import {DynObj} from '@/types';
import {filterToFields} from '@/utils/parse_utils';
import {v4 as uuidv4} from 'uuid';
import {createDecipheriv, pbkdf2} from 'crypto';
import {promisify} from 'util';

const pbkdf2Async = promisify(pbkdf2);

// KEY-0 (docs/trackers/key-custody-and-recovery-tracker.md): SSO registration used to derive a
// "password" key from null, which TextEncoder coerces to the literal string "null", wrapping
// the user secret under a key anyone can compute. These constants reproduce that exact key.
// They must match the client: tset-client/src/config/config.main.ts (passwordEncSalt) and the
// legacy iteration count in tset-client/src/crypto/CryptoUtils.ts.
const KEY0_COERCED_PASSWORD = 'null';
const KEY0_LEGACY_SALT = '789asflljay01';
const KEY0_LEGACY_ITERATIONS = 100000;
const GCM_TAG_BYTES = 16;

export type Key0SweepReport = {
  dryRun: boolean;
  scanned: number;
  skippedUserHasPassword: number;
  skippedUserMissing: number;
  confirmedConstant: number;
  removed: number;
  notConstant: number;
  confirmedUserIds: string[];
};

function keyLookupId(key: KeyEntry) {
  return `${key.keyId} - ${key.unwrappingKeyId}`;
}

const KEY_ENTRY_DB_FIELDS = [
  'groupId',
  'groupType',
  'keyId',
  'keyType',
  'keyName',
  'version',
  'permission',
  'keyData',
  'keyAlgo',
  'keyOps',
  'isWrapped',
  'wrappingKeyId',
  'wrappingKeyGroup',
  'unwrappingKeyId',
] as const satisfies readonly (keyof KeyEntry)[];

class KeyEntryService {
  private keyEntries = new KeyEntryRepo();
  private friends = new FriendRepo();

  private users = new UserRepo();

  async createKeyEntryForUser(ctx: RequestContext, targetUserId: string, data: KeyEntry) {
    await ctx.verifyInNetwork([targetUserId]);
    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new Error('User not found');
    }

    const keyEntryId = data._id || 'ke_' + uuidv4();

    const filtered = filterToFields(KEY_ENTRY_DB_FIELDS, data);

    const info = {
      _id: keyEntryId,
      // Store under the target user's key list so they can fetch it via /user/encryption/listKeys.
      selectId: targetUserId,
      selectType: 'user',
      createdAt: new Date(),
      deletedAt: null,
      ...filtered,
    };

    const keyEntry = await this.keyEntries.create(info);
    return keyEntry._id || keyEntryId;
  }

  async createKeyEntry(ctx: RequestContext, data: KeyEntry) {
    const keyEntryId = 'ke_' + uuidv4();

    const filtered = filterToFields(
      ['selectId', 'selectType', ...KEY_ENTRY_DB_FIELDS, 'createdAt', 'deletedAt'] as const,
      data,
    );

    const info = {
      _id: keyEntryId,
      createdAt: new Date(),
      deletedAt: null,
      ...filtered,
    };

    const keyEntry = await this.keyEntries.create(info);

    return keyEntry._id || keyEntryId;
  }

  async listForUser(ctx: RequestContext, targetUserId: string) {
    if (ctx.currentUserId !== targetUserId) {
      await ctx.verifyAdminPermissions(targetUserId);
    }
    const userKeys = await this.keyEntries.listForUser(targetUserId);
    const accountKeys = await this.keyEntries.listForAccount(ctx.accountId);

    let allKeys = [...userKeys, ...accountKeys];

    // Permissions:
    // - Non-admins should never see 'admin' keys.
    // - Admins listing another user should generally not see that user's 'self' keys (e.g. password-wrapped user secrets).
    //   However, some legacy account-key shares were stored with permission 'self'. Those are safe to expose to admins
    //   because they're still encrypted for the target user, but we need them for accurate "has account key" status.
    const isAdmin = await ctx.isAdmin();
    if (ctx.currentUserId !== targetUserId && isAdmin) {
      const accountIdPrefix = `acnt:${ctx.accountId}:`;
      allKeys = allKeys.filter((r) => {
        if (r.permission !== 'self') return true;
        // Allow legacy self-permission account keys (e.g. account secret) so admin status checks don't false-negative.
        return typeof r.keyId === 'string' && r.keyId.startsWith(accountIdPrefix);
      });
    } else if (!isAdmin) {
      allKeys = allKeys.filter((r) => r.permission !== 'admin');
    }

    const friends = await this.friends.findMany({userId: targetUserId, confirmed: true});

    const friendIds = friends.map((v) => v.friendUserId);

    const friendKeys = await this.keyEntries.listPublicKeysForUsers(friendIds);

    allKeys = [...allKeys, ...friendKeys];

    return allKeys.filter((r) => !r.deletedAt);
  }

  async saveUserKeys(ctx: RequestContext, targetUserId: string, keyList: KeyEntry[]) {
    await ctx.verifySelfOrAdmin(targetUserId);
    let currentKeys = await this.keyEntries.listForUser(targetUserId);

    const keyIdLookup = {};
    for (const key of currentKeys) {
      keyIdLookup[keyLookupId(key)] = key;
    }

    const keyEntries = keyList.map((r) => {
      const currentKey = keyIdLookup[keyLookupId(r)];

      const keyEntryId = currentKey?._id || 'ke_' + uuidv4();

      const filtered = filterToFields(KEY_ENTRY_DB_FIELDS, r);

      const info = {
        _id: keyEntryId,
        selectId: targetUserId,
        selectType: 'user',
        createdAt: new Date(),
        deletedAt: null,
        ...filtered,
      };

      return info;
    });

    await this.keyEntries.createMany(keyEntries);
  }

  async saveAccountKeys(ctx: RequestContext, keyList: KeyEntry[]) {
    let currentKeys = await this.keyEntries.listForAccount(ctx.accountId);

    const keyIdLookup = {};
    for (const key of currentKeys) {
      keyIdLookup[keyLookupId(key)] = key;
    }

    const keyEntries = keyList.map((r) => {
      const currentKey = keyIdLookup[keyLookupId(r)];

      const keyEntryId = currentKey?._id || 'ke_' + uuidv4();

      const filtered = filterToFields(KEY_ENTRY_DB_FIELDS, r);

      const info = {
        _id: keyEntryId,
        selectId: ctx.accountId,
        selectType: 'account',
        createdAt: new Date(),
        deletedAt: null,
        ...filtered,
      };

      return info;
    });

    await this.keyEntries.createMany(keyEntries);
  }

  async updateUserEncSettings(ctx: RequestContext, targetUserId: string, settings: DynObj) {
    await ctx.verifyAdminPermissions(targetUserId);
    const user = await ctx.getUserById(targetUserId);

    if (!user) {
      throw new Error('User not found');
    }

    await this.users.updateWithId(targetUserId, {encSettings: settings});
  }

  async removeUserKeys(ctx: RequestContext, targetUserId: string, deleteAccountKeys = false) {
    await ctx.verifyAdminPermissions(targetUserId);

    await this.keyEntries.deleteWhere({selectId: targetUserId});
    if (deleteAccountKeys) {
      await this.keyEntries.deleteWhere({selectId: ctx.accountId});
    }
  }

  async removeAllAccountKeys(ctx: RequestContext) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Permission denied');
    }
    const users = await this.users.listByAccountId(ctx.accountId);
    for (const user of users) {
      await this.keyEntries.deleteWhere({selectId: user._id});
    }
    await this.keyEntries.deleteWhere({selectId: ctx.accountId});
  }

  async deleteRecoveryKey(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    let currentKeys = await this.keyEntries.listForUser(targetUserId);

    const recoveryKey = currentKeys.find((r) => r.keyName === 'recovery');

    await this.users.updateWithId(targetUserId, {recoveryKey: null});

    if (!recoveryKey) {
      return;
    }

    const keyWrappedByRecovery = currentKeys.find((r) => r.unwrappingKeyId === recoveryKey.keyId);

    if (recoveryKey._id) {
      await this.keyEntries.updateWithId(recoveryKey._id, {deletedAt: new Date()});
    }
    if (keyWrappedByRecovery?._id) {
      await this.keyEntries.updateWithId(keyWrappedByRecovery._id, {deletedAt: new Date()});
    }
  }

  /**
   * KEY-0 repair. SSO accounts were created with no password, but the client derived a
   * password key anyway — from a null that coerces to the string "null". The result is a
   * copy of the user secret wrapped under a constant every attacker can compute, sitting
   * in key_entry. This removes that copy.
   *
   * Refuses when the user has a real password: there the entry is their genuine unlock
   * method and deleting it would lock them out.
   *
   * See docs/trackers/key-custody-and-recovery-tracker.md, KEY-0.
   */
  async deletePasswordWrappedSecret(ctx: RequestContext, targetUserId: string): Promise<{removed: boolean}> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    const user = await ctx.getUserById(targetUserId);
    if (!user) {
      throw new Error('User not found');
    }

    // A user with a password is using this entry legitimately. Never touch it.
    if (user.password) {
      return {removed: false};
    }

    // listForUser does not filter soft-deletes, so without the deletedAt check a repeat
    // call re-tombstones dead rows and reports removed: true having removed nothing.
    const currentKeys = await this.keyEntries.listForUser(targetUserId);
    const stale = currentKeys.filter((r) => r.unwrappingKeyId === 'userPassword' && !r.deletedAt);

    if (stale.length === 0) {
      return {removed: false};
    }

    for (const entry of stale) {
      if (entry._id) {
        await this.keyEntries.updateWithId(entry._id, {deletedAt: new Date()});
      }
    }

    return {removed: true};
  }

  async removeById(ctx: RequestContext, id: string) {
    return await this.keyEntries.updateWithId(id, {deletedAt: new Date()});
  }

  // The KEY-0 constant is one key for every legacy entry (same salt, same count), so derive
  // it once per distinct (iterations, salt) pair instead of per entry — PBKDF2 at 100k
  // rounds is the expensive half of the sweep.
  private key0KeyCache = new Map<string, Buffer>();

  private async deriveKey0ConstantKey(salt: string, iterations: number): Promise<Buffer> {
    const cacheKey = `${iterations}:${salt}`;
    let key = this.key0KeyCache.get(cacheKey);
    if (!key) {
      key = await pbkdf2Async(KEY0_COERCED_PASSWORD, salt, iterations, 32, 'sha256');
      this.key0KeyCache.set(cacheKey, key);
    }
    return key;
  }

  /**
   * Does this entry's payload decrypt under the KEY-0 constant? GCM authenticates, so a
   * successful decrypt is a positive identification, not a guess — a secret wrapped under a
   * real password fails the tag check. Mirrors the client-side check in
   * EncryptionKeyService.unwrapsWithKey0Constant; KDF params come off the entry because the
   * iteration count and salt depend on whether passwordKdfV2Enabled was on at creation.
   */
  private async unwrapsWithKey0Constant(entry: KeyEntry): Promise<boolean> {
    try {
      const keyData = (entry.keyData || {}) as DynObj;
      const iterations = typeof keyData.kdfIterations === 'number' ? keyData.kdfIterations : KEY0_LEGACY_ITERATIONS;
      const salt = typeof keyData.kdfSalt === 'string' && keyData.kdfSalt ? keyData.kdfSalt : KEY0_LEGACY_SALT;
      const wrapped = Buffer.from(String(keyData.wrappedKey || ''), 'base64');
      const iv = Buffer.from(String(keyData.iv || ''), 'base64');
      if (wrapped.length <= GCM_TAG_BYTES || iv.length === 0) return false;

      const key = await this.deriveKey0ConstantKey(salt, iterations);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(wrapped.subarray(wrapped.length - GCM_TAG_BYTES));
      const plaintext = Buffer.concat([
        decipher.update(wrapped.subarray(0, wrapped.length - GCM_TAG_BYTES)),
        decipher.final(), // throws unless the tag verifies — i.e. unless this really is the constant
      ]);
      JSON.parse(plaintext.toString('utf8')); // wrapped payloads are JWK JSON; anything else is not ours
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * KEY-0 sweep — the server-side close-out of the client repair.
   *
   * The client repair (deletePasswordWrappedSecret above) only fires when an affected user
   * signs in, so dormant accounts keep their constant-wrapped secret indefinitely. This walks
   * every live password-wrapped user-secret copy in one pass and tombstones the ones that
   * PROVABLY decrypt under the constant.
   *
   * Safety, in order:
   * - dryRun defaults to TRUE; mutation is opt-in.
   * - A user with a real password is skipped without decrypting anything — their entry is a
   *   genuine unlock method.
   * - Only entries that actually decrypt under the constant are touched (GCM tag = proof).
   *   No client flow can unlock through such an entry: new clients refuse to derive a key
   *   from an empty password, and old clients never stored one for SSO users — so removing
   *   it can strand no one.
   * - Deletion is the same soft tombstone the client repair uses.
   *
   * NOT exposed to users — the caller is the admin console route, behind adminAuthenticateJWT.
   */
  async sweepKey0ConstantEntries(opts: {dryRun?: boolean} = {}): Promise<Key0SweepReport> {
    const dryRun = opts.dryRun !== false;

    const entries = await this.keyEntries.listActivePasswordWrapped();
    const report: Key0SweepReport = {
      dryRun,
      scanned: entries.length,
      skippedUserHasPassword: 0,
      skippedUserMissing: 0,
      confirmedConstant: 0,
      removed: 0,
      notConstant: 0,
      confirmedUserIds: [],
    };

    const userIds = [...new Set(entries.map((r) => r.selectId).filter(Boolean))] as string[];
    const usersById = new Map<string, {password?: string | null; deleted?: boolean | null}>();
    for (let i = 0; i < userIds.length; i += 500) {
      const users = await this.users.findUsersByIds(userIds.slice(i, i + 500));
      for (const u of users) usersById.set(u._id, u);
    }

    for (const entry of entries) {
      const user = entry.selectId ? usersById.get(entry.selectId) : undefined;
      if (!user || user.deleted) {
        report.skippedUserMissing++;
        continue;
      }
      if (user.password) {
        report.skippedUserHasPassword++;
        continue;
      }
      if (!(await this.unwrapsWithKey0Constant(entry))) {
        report.notConstant++;
        continue;
      }

      report.confirmedConstant++;
      if (entry.selectId && report.confirmedUserIds.length < 200 && !report.confirmedUserIds.includes(entry.selectId)) {
        report.confirmedUserIds.push(entry.selectId);
      }
      if (!dryRun && entry._id) {
        await this.keyEntries.updateWithId(entry._id, {deletedAt: new Date()});
        report.removed++;
      }
    }

    return report;
  }
}

export default KeyEntryService;
