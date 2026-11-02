import {Knex} from 'knex';
import knex from './knex_config';

/** One connected AI app (Connected AI apps, HAT-616). See the migration for what each column holds. */
export type McpRelayChannelRow = {
  _id: string;
  accountId: string;
  userId: string;
  clientName: string;
  sealed: boolean;
  keyHash: string | null;
  wrappedKey: string | null;
  createdAt: Date;
  lastUsedAt: Date | string | null;
  /** Set for a connection made by OAuth sign-in: the AI app's client id. */
  oauthClientId?: string | null;
  /** SHA-256 of the current refresh token, and of the one it replaced. */
  refreshHash?: string | null;
  prevRefreshHash?: string | null;
  /** What the AI app said it is in its last `initialize` (AIM-1). */
  clientInfo?: McpRelayClientInfo | null;
  clientInfoAt?: Date | null;
};

/** An MCP client's `clientInfo`, trimmed. */
export type McpRelayClientInfo = {name?: string; version?: string; title?: string};

/** An AI app that registered itself for OAuth sign-in (Dynamic Client Registration). */
export type McpRelayOauthClientRow = {
  _id: string;
  clientName: string;
  redirectUris: string[];
  createdAt: Date;
};

export class McpRelayChannelRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async findById(id: string): Promise<McpRelayChannelRow | undefined> {
    return await this.knex<McpRelayChannelRow>('mcp_relay_channel').where({_id: id}).first();
  }

  async findByKeyHash(keyHash: string): Promise<McpRelayChannelRow | undefined> {
    return await this.knex<McpRelayChannelRow>('mcp_relay_channel').where({keyHash}).first();
  }

  async listByAccount(accountId: string): Promise<McpRelayChannelRow[]> {
    return await this.knex<McpRelayChannelRow>('mcp_relay_channel').where({accountId}).orderBy('createdAt', 'desc');
  }

  async countByUser(userId: string): Promise<number> {
    const row = await this.knex('mcp_relay_channel').where({userId}).count<{count: string | number}[]>('* as count');
    return Number(row?.[0]?.count || 0);
  }

  async findByRefreshHash(hash: string): Promise<McpRelayChannelRow | undefined> {
    return await this.knex<McpRelayChannelRow>('mcp_relay_channel').where({refreshHash: hash}).first();
  }

  async findByPrevRefreshHash(hash: string): Promise<McpRelayChannelRow | undefined> {
    return await this.knex<McpRelayChannelRow>('mcp_relay_channel').where({prevRefreshHash: hash}).first();
  }

  /**
   * Replaces the refresh token only if it is still the one presented, so two refreshes racing with
   * the same token cannot both succeed. Returns whether this call won.
   */
  async rotateRefresh(id: string, presentedHash: string, nextHash: string): Promise<boolean> {
    const updated = await this.knex('mcp_relay_channel')
      .where({_id: id, refreshHash: presentedHash})
      .update({refreshHash: nextHash, prevRefreshHash: presentedHash});
    return updated === 1;
  }

  /** Gives a pairing connection its credential, once: only while it has none. Returns whether it did. */
  async setKeyHashOnce(id: string, keyHash: string, clientName: string): Promise<boolean> {
    const updated = await this.knex('mcp_relay_channel')
      .where({_id: id})
      .whereNull('keyHash')
      .update({keyHash, clientName});
    return updated === 1;
  }

  async setWrappedKey(id: string, wrappedKey: string): Promise<void> {
    await this.knex('mcp_relay_channel').where({_id: id}).update({wrappedKey});
  }

  async setRefreshHash(id: string, hash: string): Promise<void> {
    await this.knex('mcp_relay_channel').where({_id: id}).update({refreshHash: hash, prevRefreshHash: null});
  }

  async findOauthClient(id: string): Promise<McpRelayOauthClientRow | undefined> {
    return await this.knex<McpRelayOauthClientRow>('mcp_relay_oauth_client').where({_id: id}).first();
  }

  async insertOauthClient(row: Omit<McpRelayOauthClientRow, 'createdAt'>): Promise<void> {
    await this.knex('mcp_relay_oauth_client').insert({
      ...row,
      redirectUris: JSON.stringify(row.redirectUris),
      createdAt: this.knex.fn.now(),
    });
  }

  async insert(row: Omit<McpRelayChannelRow, 'createdAt' | 'lastUsedAt'>): Promise<McpRelayChannelRow> {
    await this.knex('mcp_relay_channel').insert({...row, createdAt: this.knex.fn.now()});
    return (await this.findById(row._id))!;
  }

  /** Keeps what the AI app said it is in `initialize`. */
  async setClientInfo(id: string, clientInfo: McpRelayClientInfo): Promise<void> {
    await this.knex('mcp_relay_channel')
      .where({_id: id})
      .update({clientInfo: JSON.stringify(clientInfo), clientInfoAt: this.knex.fn.now()});
  }

  /** Records the day the AI app last called. Callers write at most once a day per connection. */
  async touchLastUsed(id: string, day: string): Promise<void> {
    await this.knex('mcp_relay_channel').where({_id: id}).update({lastUsedAt: day});
  }

  /** Deletes the connection; its credential stops working on the next call. Returns rows removed. */
  async deleteWithId(id: string): Promise<number> {
    return await this.knex('mcp_relay_channel').where({_id: id}).delete();
  }
}
