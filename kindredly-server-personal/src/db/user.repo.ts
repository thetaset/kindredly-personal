import User from '@/schemas/public/User';
import { BaseRepo } from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class UserRepo extends BaseRepo<User> {
  public jsonArrayFields = ['plugins', 'pinnedItemIds', 'profileImage', 'encSettings'];

  constructor(db: Knex = knex) {
    super('user', db);
  }

  _updateInput(data) {
    for (const fieldName of this.jsonArrayFields) {
      if (fieldName in data && data[fieldName]) {
        data[fieldName] = JSON.stringify(data[fieldName]);
      }
    }
    return data;
  }

  async updateWithId(id: string, update: User) {
    return await this.where({ _id: id }).update(this._updateInput(update));
  }

  async _updateUserWithId(
    userId: string,
    data: Record<string, unknown>
  ) {
    await this.where({ _id: userId }).update(data);
    return null;
  }

  async create(input: User) {
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

  async findUsersByIds(ids: string[]) {
    return await this.query().whereIn('_id', ids);
  }

  async findByEmail(email: string) {
    return await this.where({ email }).first();
  }

  async findByLoginId(loginId: string) {
    return await this.where({ loginId }).first();
  }

  async findByUsername(username: string) {
    return await this.where({ username }).first();
  }

  listByAccountId(accountId:string) {
    return this.query().where({ accountId });
  }

  async deleteWithId(id: string) {
    return await this.where({ _id: id }).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async checkSpaceUsageForAccountId(accountId: string) {
    if (!accountId) {
       throw new Error("No account id provided");
    }
    const users = await this.listByAccountId(accountId);

    const userIds = users.map((u) => u._id);

    const results = [];
    for (const tableName of [
      "item",
      "item_feedback",
      "user_file",
      "user_activity",
      "user_feed",
      "user_change_log",
      "post",
      "user_activity_log",
    ]) {
      const select = `SELECT sum(pg_column_size(t.*)) as filesize, count(*) as filerow FROM ${tableName} t where "userId" IN (:userIds)`;

      const query = knex.raw(select, { userIds });
      results.push({ tableName, data: await query });
    }

    const select = `SELECT sum("fileSize") as filesizesum FROM user_file where "userId" IN (:userIds)`;

    const query = knex.raw(select, { userIds });
    const userFileResults = await query;

    return {
      tables: results,
      userFileData: userFileResults.rows[0].filesizesum,
    };

  }


}
