import Account from 'tset-sharedlib/schemas/public/Account';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class AccountRepo extends BaseRepo<Account> {
  constructor(db: Knex = knex) {
    super('account', db);
  }
  async findById(id: string): Promise<Account> {
    return await this.where({_id: id}).first();
  }

  /**
   * An `options` write that leaves out `familyDowntime` keeps the Family Downtime stored at that
   * moment. Only Family Downtime's own routes write it, under a row lock; every other options write is
   * a whole object built from a copy of the account read earlier, which would otherwise put back the
   * downtime from before another admin's End now, or drop it.
   */
  async updateWithId(id: string, update: Account) {
    if (!id) {
      throw new Error('id is required');
    }
    const options = update.options as Record<string, unknown> | null | undefined;
    if (options && typeof options === 'object' && !('familyDowntime' in options)) {
      const json = JSON.stringify(options);
      return await this.where({_id: id}).update({
        ...update,
        options: this.db.raw(
          `(CASE WHEN jsonb_exists(options::jsonb, 'familyDowntime')
            THEN jsonb_set(?::jsonb, '{familyDowntime}', options::jsonb -> 'familyDowntime')
            ELSE ?::jsonb END)::json`,
          [json, json],
        ) as any,
      });
    }
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: Account) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
