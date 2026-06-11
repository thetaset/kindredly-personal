import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type UserOauthSecretRow = {
  _id: string;
  userId: string;
  provider: string;
  secretEnc: any;
  createdAt?: string;
  updatedAt?: string;
};

export class UserOauthSecretRepo extends BaseRepo<UserOauthSecretRow> {
  constructor(db: Knex = knex) {
    super('user_oauth_secret', db);
  }

  makeId(userId: string, provider: string): string {
    return `${userId}-${provider}`;
  }

  async upsert(row: UserOauthSecretRow): Promise<UserOauthSecretRow | null> {
    const result = (await this.query()
      .insert(row as any)
      .onConflict('_id')
      .merge({
        userId: row.userId,
        provider: row.provider,
        secretEnc: row.secretEnc,
        updatedAt: this.knex.fn.now(),
      } as any)
      .returning('*')) as any;

    return Array.isArray(result) && result.length ? (result[0] as UserOauthSecretRow) : null;
  }

  async getByUserAndProvider(userId: string, provider: string): Promise<UserOauthSecretRow | null> {
    return (await this.where({userId, provider} as any).first()) as any;
  }

  async deleteByUserAndProvider(userId: string, provider: string): Promise<number> {
    return await this.where({userId, provider} as any).delete();
  }
}
