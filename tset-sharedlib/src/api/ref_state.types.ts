// @deprecated Prefer importing RefState types from `tset-sharedlib/api/api-types`.
import type { EncInfo } from '../shared.types';

export type RefStateOwnerType = 'user' | 'account' | 'session';

export type RefStateRefType = 'item' | 'post' | 'feed_item' | 'app_global';

export type RefStateEntry = {
  _id: string;
  refType: RefStateRefType;
  refId: string;
  ownerType: RefStateOwnerType;
  ownerId: string;
  stateKey: string;
  stateSubKey?: string | null;
  data?: any;
  encrypted?: boolean;
  encInfo?: EncInfo | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RefStateUpsertRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey: string;
  stateSubKey?: string | null;
  data?: any;
  ownerId?: string;
};

export type RefStateUpsertResponse = {
  entry: RefStateEntry;
};

export type RefStateListRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey?: string;
  stateSubKey?: string | null;
  limit?: number;
  cursorUpdatedAt?: string;
  ownerId?: string;
};

export type RefStateListResponse = {
  entries: RefStateEntry[];
  nextCursorUpdatedAt?: string;
};

export type RefStateDeleteRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey: string;
  stateSubKey?: string | null;
  ownerId?: string;
};

export type RefStateDeleteResponse = {
  deletedCount: number;
};
