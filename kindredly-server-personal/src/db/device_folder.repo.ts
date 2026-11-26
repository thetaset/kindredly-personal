import {Knex} from 'knex';
import knex from './knex_config';

/** A shared device folder (HAT-1321). See the migration for what each column holds. */
export type DeviceFolderRow = {
  _id: string;
  accountId: string;
  ownerUserId: string;
  hostDeviceId: string;
  name: string;
  /** The computer's name as its Companion reported it when the folder was shared. */
  hostName: string | null;
  wholeFamilyRole: 'view' | 'add' | null;
  uploadsAllowed: boolean;
  createdAt: Date;
  stoppedAt: Date | null;
};

export type DeviceFolderMemberRow = {
  folderId: string;
  userId: string;
  role: 'manage' | 'add' | 'view';
};

/** The folder key sealed to one person by the host. */
export type DeviceFolderKeyRow = {
  folderId: string;
  userId: string;
  wrappedKey: string;
};

export class DeviceFolderRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async findById(id: string): Promise<DeviceFolderRow | undefined> {
    return await this.knex<DeviceFolderRow>('device_folder').where({_id: id}).first();
  }

  /** The folders still shared in a family, newest first. */
  async listActiveByAccount(accountId: string): Promise<DeviceFolderRow[]> {
    return await this.knex<DeviceFolderRow>('device_folder')
      .where({accountId})
      .whereNull('stoppedAt')
      .orderBy('createdAt', 'desc');
  }

  async listActiveByHost(hostDeviceId: string): Promise<DeviceFolderRow[]> {
    return await this.knex<DeviceFolderRow>('device_folder')
      .where({hostDeviceId})
      .whereNull('stoppedAt')
      .orderBy('createdAt', 'asc');
  }

  async countActiveByHost(hostDeviceId: string): Promise<number> {
    const row = await this.knex('device_folder')
      .where({hostDeviceId})
      .whereNull('stoppedAt')
      .count<{count: string | number}[]>('* as count');
    return Number(row?.[0]?.count || 0);
  }

  async listMembers(folderIds: string[]): Promise<DeviceFolderMemberRow[]> {
    if (folderIds.length === 0) return [];
    return await this.knex<DeviceFolderMemberRow>('device_folder_member').whereIn('folderId', folderIds);
  }

  async findMember(folderId: string, userId: string): Promise<DeviceFolderMemberRow | undefined> {
    return await this.knex<DeviceFolderMemberRow>('device_folder_member').where({folderId, userId}).first();
  }

  async listKeys(folderIds: string[]): Promise<DeviceFolderKeyRow[]> {
    if (folderIds.length === 0) return [];
    return await this.knex('device_folder_key')
      .whereIn('folderId', folderIds)
      .select('folderId', 'userId', 'wrappedKey');
  }

  async findKey(folderId: string, userId: string): Promise<DeviceFolderKeyRow | undefined> {
    return await this.knex<DeviceFolderKeyRow>('device_folder_key').where({folderId, userId}).first();
  }

  /** Stores the host's sealed copies, replacing an older copy for the same person. */
  async upsertKeys(rows: DeviceFolderKeyRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.knex('device_folder_key').insert(rows).onConflict(['folderId', 'userId']).merge(['wrappedKey']);
  }

  /** The folder and its people, in one transaction. */
  async create(
    folder: Omit<DeviceFolderRow, 'createdAt' | 'stoppedAt'>,
    members: DeviceFolderMemberRow[],
  ): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx('device_folder').insert(folder);
      if (members.length > 0) await trx('device_folder_member').insert(members);
    });
  }

  /** A folder's whole-family role and uploads, and its named people replaced, in one transaction. */
  async update(
    id: string,
    fields: Pick<DeviceFolderRow, 'wholeFamilyRole' | 'uploadsAllowed'>,
    members: DeviceFolderMemberRow[],
  ): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx('device_folder').where({_id: id}).update(fields);
      await trx('device_folder_member').where({folderId: id}).delete();
      if (members.length > 0) await trx('device_folder_member').insert(members);
    });
  }

  /** Drops every sealed copy of a folder's key, when its host makes a new one. */
  async deleteKeys(folderId: string): Promise<void> {
    await this.knex('device_folder_key').where({folderId}).delete();
  }

  /** Stops a folder its host still serves. Returns whether it did. */
  async stop(id: string, hostDeviceId: string): Promise<boolean> {
    const updated = await this.knex('device_folder')
      .where({_id: id, hostDeviceId})
      .whereNull('stoppedAt')
      .update({stoppedAt: this.knex.fn.now()});
    return updated === 1;
  }
}
