import {BaseRepo} from './base.repo';
import type {Knex} from 'knex';
import knex from './knex_config';

export type PlatformAlertReceiverRow = {
  userId: string;
  note?: string | null;
  createdAt: Date;
};

/** Receiver row joined with user identity for display and notification targeting. */
export type PlatformAlertReceiverView = PlatformAlertReceiverRow & {
  /** Null when the user record was deleted after being added. */
  username: string | null;
  email: string | null;
  accountId: string | null;
};

export class PlatformAlertReceiverRepo extends BaseRepo<PlatformAlertReceiverRow> {
  constructor(db: Knex = knex) {
    super('platform_alert_receiver', db);
  }

  async listWithUser(): Promise<PlatformAlertReceiverView[]> {
    return (await this.query()
      .leftJoin('user', 'user._id', 'platform_alert_receiver.userId')
      .select('platform_alert_receiver.*', 'user.username', 'user.email', 'user.accountId')
      .orderBy('platform_alert_receiver.createdAt', 'asc')) as PlatformAlertReceiverView[];
  }

  async add(userId: string, note?: string | null): Promise<void> {
    await this.query()
      .insert({userId, note: note ?? null, createdAt: new Date()})
      .onConflict('userId')
      .merge();
  }

  async remove(userId: string): Promise<void> {
    await this.query().where({userId}).delete();
  }
}
