import UserPref, { userPrefDefaults } from '@/schemas/public/UserPref';
import { BaseRepo } from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export enum UserPrefKeys {
  notificationSettings = 'notificationSettings',
}

export class UserPrefRepo extends BaseRepo<UserPref> {
  public jsonArrayFields = ['value'];

  constructor(db: Knex = knex) {
    super('user_pref', db);
  }

  get defaults() {
    return userPrefDefaults;
  }

  _addPrefDefaults(prefs: UserPref[], keys) {
    const prefsMap = Object.fromEntries(prefs.map((p) => [p.key, p]));
    if (!prefsMap.notificationSettings && keys.includes(UserPrefKeys.notificationSettings)) {
      prefsMap.notificationSettings = { key: UserPrefKeys.notificationSettings, value: userPrefDefaults.notificationSettings };
    }

    return Object.values(prefsMap);
  }

  _updateInput(data) {
    for (const fieldName of this.jsonArrayFields) {
      if (fieldName in data && data[fieldName]) {
        data[fieldName] = JSON.stringify(data[fieldName]);
      }
    }
    return data;
  }

  async getUserPref(targetUserId: string, key: string) {
    const prefId = this.prefId(targetUserId, key);
    const pref = await this.findById(prefId);
    if (!pref) {
      return userPrefDefaults[key];
    }
  }

  async updateWithId(id: string, update: UserPref) {
    return await this.where({ _id: id }).update(this._updateInput(update));
  }

  prefId(userId: string, key: string) {
    return `${userId}-${key}`;
  }

  async save(input: UserPref) {
    const result = (await this.query()
      .insert(this._updateInput(input))
      .onConflict('_id')
      .merge()
      .returning('*')) as any;
    if (result.length > 0) {
      return result[0];
    } else {
      return null;
    }
  }

  async findById(id: string) {
    return await this.where({ _id: id }).first();
  }

  async deleteWithId(id: string) {
    return await this.where({ _id: id }).delete();
  }
}
