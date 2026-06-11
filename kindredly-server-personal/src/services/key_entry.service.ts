import {FriendRepo} from '@/db/friend.repo';
import {KeyEntryRepo} from '@/db/key_entry.repo';
import {UserRepo} from '@/db/user.repo';
import KeyEntry from 'tset-sharedlib/schemas/public/KeyEntry';
import {RequestContext} from '@/base/request_context';
import {DynObj} from '@/types';
import {filterToFields} from '@/utils/parse_utils';
import {v4 as uuidv4} from 'uuid';

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

  async removeById(ctx: RequestContext, id: string) {
    return await this.keyEntries.updateWithId(id, {deletedAt: new Date()});
  }
}

export default KeyEntryService;
