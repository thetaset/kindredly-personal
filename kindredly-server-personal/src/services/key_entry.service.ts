import { FriendRepo } from '@/db/friend.repo';
import { KeyEntryRepo } from '@/db/key_entry.repo';
import { UserRepo } from '@/db/user.repo';
import KeyEntry from '@/schemas/public/KeyEntry';
import { RequestContext } from '@/base/request_context';
import { DynObj } from '@/types';
import { filterToFields } from '@/utils/parse_utils';
import { v4 as uuidv4 } from 'uuid';

function keyLookupId(key: KeyEntry) {
  return key.keyId + " - " + key.unwrappingKeyId
}

class KeyEntryService {
  private keyEntries = new KeyEntryRepo();
  private friends = new FriendRepo();

  private users = new UserRepo();

  async createKeyEntry(ctx: RequestContext, data: DynObj) {
    const keyEntryId = 'ke_' + uuidv4();

    const info = {
      _id: keyEntryId,
      userId: ctx.currentUserId,
      accountId: ctx.accountId,
      ...data,
    };

    const keyEntry = await this.keyEntries.create(info);

    return keyEntry._id;
  }

  async listForUser(ctx: RequestContext, targetUserId: string) {
    if (ctx.currentUserId !== targetUserId) {
      await ctx.verifyAdminPermissions(targetUserId);
    }
    const userKeys = await this.keyEntries.listForUser(targetUserId);
    const accountKeys = await this.keyEntries.listForAccount(ctx.accountId);


    let allKeys = [...userKeys, ...accountKeys];

    // If the user is admin and not target user, then filter out the self permission
    // else filter out the admin permission
    if (ctx.currentUserId !== targetUserId && !await ctx.isAdmin()) {
      allKeys = allKeys.filter((r) => r.permission !== 'self');
    }
    else if (!(await ctx.isAdmin())) {
      allKeys = allKeys.filter((r) => r.permission !== 'admin');
    }

    const friends = await this.friends.findMany({ userId: targetUserId, confirmed: true });

    const friendIds = friends.map(v => v.friendUserId);

    const friendKeys = await this.keyEntries.listPublicKeysForUsers(friendIds);

    allKeys = [...allKeys, ...friendKeys];

    return allKeys.filter((r) => !r.deletedAt);
  }


  async saveUserKeys(ctx: RequestContext, targetUserId: string, keyList: KeyEntry[]) {
    await ctx.verifySelfOrAdmin(targetUserId);
    let currentKeys = await this.keyEntries.listForUser(targetUserId);

    const keyIdLookup = {}
    for (const key of currentKeys) {
      keyIdLookup[keyLookupId(key)] = key;
    }

    const keyEntries = keyList.map((r) => {

      const currentKey = keyIdLookup[keyLookupId(r)];

      const keyEntryId = currentKey?._id || 'ke_' + uuidv4();

      const info = {
        _id: keyEntryId,
        selectId: targetUserId,
        selectType: 'user',
        createdAt: new Date(),
        deletedAt: null,
        ...r,
      };

      return info;
    });

    await this.keyEntries.createMany(keyEntries);
  }

  async saveAccountKeys(ctx: RequestContext, keyList: KeyEntry[]) {
    let currentKeys = await this.keyEntries.listForAccount(ctx.accountId);

    const keyIdLookup = {}
    for (const key of currentKeys) {
      keyIdLookup[keyLookupId(key)] = key;
    }

    const keyEntries = keyList.map((r) => {
      const currentKey = keyIdLookup[keyLookupId(r)];

      const keyEntryId = currentKey?._id || 'ke_' + uuidv4();

      const info = {
        _id: keyEntryId,
        selectId: ctx.accountId,
        selectType: 'account',
        createdAt: new Date(),

        ...r,
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

    await this.users.updateWithId(targetUserId, { encSettings: settings });
  }

  async removeUserKeys(ctx: RequestContext, targetUserId: string, deleteAccountKeys = false) {
    await ctx.verifyAdminPermissions(targetUserId);

    await this.keyEntries.deleteWhere({ selectId: ctx.currentUserId });
  }

  async removeAllAccountKeys(ctx: RequestContext) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Permission denied');
    }
    const users = await this.users.listByAccountId(ctx.accountId);
    for (const user of users) {
      await this.keyEntries.deleteWhere({ selectId: user._id });
    }
    await this.keyEntries.deleteWhere({ selectId: ctx.accountId });
  }


  async deleteRecoveryKey(ctx: RequestContext, targetUserId: string) {

    await ctx.verifySelfOrAdminOverUser(targetUserId);

    let currentKeys = await this.keyEntries.listForUser(targetUserId);

    const recoveryKey = currentKeys.find((r) => r.keyName === 'recovery');

    const keyWrappedByRecovery = currentKeys.find((r) => r.unwrappingKeyId === recoveryKey.keyId);

    await this.users.updateWithId(targetUserId, { recoveryKey: null });

    await this.keyEntries.updateWithId(recoveryKey._id, { deletedAt: new Date() });
    await this.keyEntries.updateWithId(keyWrappedByRecovery._id, { deletedAt: new Date() });
  }


  async removeById(ctx: RequestContext, id: string) {
    return await this.keyEntries.updateWithId(id, { deletedAt: new Date() });
  }


}

export default KeyEntryService;
