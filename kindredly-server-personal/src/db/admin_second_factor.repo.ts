import {Knex} from 'knex';
import knex from './knex_config';

type Encrypted = {iv: string; encryptedData: string};

export type AdminSecondFactorRow = {
  _id: string;
  secret: Encrypted | null;
  pendingSecret: Encrypted | null;
  pendingAt: Date | null;
  enabledAt: Date | null;
  lastStep: string | number | null;
  recoveryCodeHashes: string[];
  updatedAt: Date;
};

const ID = 'admin';

export class AdminSecondFactorRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async get(): Promise<AdminSecondFactorRow | undefined> {
    return await this.knex<AdminSecondFactorRow>('admin_second_factor').where({_id: ID}).first();
  }

  async savePending(pendingSecret: Encrypted): Promise<void> {
    const now = this.knex.fn.now();
    await this.knex('admin_second_factor')
      .insert({_id: ID, pendingSecret: JSON.stringify(pendingSecret), pendingAt: now, updatedAt: now})
      .onConflict('_id')
      .merge(['pendingSecret', 'pendingAt', 'updatedAt']);
  }

  async enable(secret: Encrypted, recoveryCodeHashes: string[], step: number): Promise<void> {
    await this.knex('admin_second_factor')
      .where({_id: ID})
      .update({
        secret: JSON.stringify(secret),
        pendingSecret: null,
        pendingAt: null,
        enabledAt: this.knex.fn.now(),
        lastStep: step,
        recoveryCodeHashes: JSON.stringify(recoveryCodeHashes),
        updatedAt: this.knex.fn.now(),
      });
  }

  async disable(): Promise<void> {
    await this.knex('admin_second_factor').where({_id: ID}).delete();
  }

  /** Records `step` as used. False when it, or a later one, was already used: a replayed code. */
  async claimStep(step: number): Promise<boolean> {
    const count = await this.knex('admin_second_factor')
      .where({_id: ID})
      .where((q) => q.whereNull('lastStep').orWhere('lastStep', '<', step))
      .update({lastStep: step, updatedAt: this.knex.fn.now()});
    return count > 0;
  }

  /** Removes one recovery code. False when it was not there, or another request took it first. */
  async consumeRecoveryCode(hash: string): Promise<boolean> {
    const count = await this.knex('admin_second_factor')
      .where({_id: ID})
      .whereRaw(`"recoveryCodeHashes" \\? ?`, [hash])
      .update({
        recoveryCodeHashes: this.knex.raw(`"recoveryCodeHashes" - ?`, [hash]),
        updatedAt: this.knex.fn.now(),
      });
    return count > 0;
  }
}
