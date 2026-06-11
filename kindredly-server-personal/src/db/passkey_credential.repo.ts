import PasskeyCredential from 'tset-sharedlib/schemas/public/PasskeyCredential';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class PasskeyCredentialRepo extends BaseRepo<PasskeyCredential> {
  constructor(db: Knex = knex) {
    super('passkey_credential', db);
  }

  async create(input: PasskeyCredential) {
    const now = new Date();
    const data = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    const result = (await this.query().insert(data).returning('*')) as any;
    if (result.length > 0) {
      return result[0];
    }
    return null;
  }

  async findById(id: string) {
    return await this.where({_id: id} as any).first();
  }

  async findByCredentialId(credentialId: string) {
    return await this.where({credentialId} as any).first();
  }

  async findByUserId(userId: string) {
    return await this.query()
      .where({userId} as any)
      .whereNull('disabled')
      .orWhere({disabled: false} as any);
  }

  async listByUserId(userId: string): Promise<PasskeyCredential[]> {
    return await this.query()
      .where({userId} as any)
      .andWhere(function () {
        this.whereNull('disabled').orWhere({disabled: false} as any);
      })
      .orderBy('createdAt', 'desc');
  }

  async updateSignCount(credentialId: string, signCount: number) {
    return await this.where({credentialId} as any).update({
      signCount,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  async deleteByCredentialId(credentialId: string) {
    return await this.where({credentialId} as any).delete();
  }

  async disableByCredentialId(credentialId: string) {
    return await this.where({credentialId} as any).update({
      disabled: true,
      updatedAt: new Date(),
    } as any);
  }
}
