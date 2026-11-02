import {Knex} from 'knex';
import knex from './knex_config';

export type AgentKeyRow = {
  _id: string;
  label: string;
  scope: string;
  keyHash: string;
  createdBy: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export class AgentKeyRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async list(): Promise<AgentKeyRow[]> {
    return await this.knex<AgentKeyRow>('agent_key').orderBy('createdAt', 'desc');
  }

  async findById(id: string): Promise<AgentKeyRow | undefined> {
    return await this.knex<AgentKeyRow>('agent_key').where({_id: id}).first();
  }

  async findActiveByHash(keyHash: string): Promise<AgentKeyRow | undefined> {
    return await this.knex<AgentKeyRow>('agent_key').where({keyHash}).whereNull('revokedAt').first();
  }

  async insert(row: Pick<AgentKeyRow, '_id' | 'label' | 'scope' | 'keyHash' | 'createdBy'>): Promise<AgentKeyRow> {
    await this.knex('agent_key').insert({...row, createdAt: this.knex.fn.now()});
    return (await this.findById(row._id))!;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.knex('agent_key').where({_id: id}).update({lastUsedAt: this.knex.fn.now()});
  }

  async revoke(id: string): Promise<AgentKeyRow | undefined> {
    await this.knex('agent_key').where({_id: id}).whereNull('revokedAt').update({revokedAt: this.knex.fn.now()});
    return await this.findById(id);
  }
}
