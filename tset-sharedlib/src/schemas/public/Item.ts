
import { ItemTypePrimary, ItemTypeSecondary as ItemTypeSecondary } from "../../content.types";
import { ItemAttachment, ItemSysInfo, ItemMeta, ItemDetailsInfo, EncInfo } from "../../shared.types";

/**
 * Database schema for library items.
 * Used server-side for database operations and as the 'details' field in ItemInfoView for transport.
 */
export default interface Item {
  _id?: string;

  accountId?: string | null;

  key?: string | null;

  userId?: string | null;

  name?: string | null;

  description?: string | null;

  comment?: string | null;

  type?: ItemTypePrimary | null;

  subType?: ItemTypeSecondary | null;

  visibility?: string | null;

  categories?: Array<string> | null;

  tags?: Array<string> | null;

  useCriteria?: Array<string> | null;

  /**
   * Semantic slot assignments ("health.provider.dentist", "apps.email") — see
   * kinds/kindRegistry.ts. E2E-encrypted client-side from introduction (like `tags`),
   * so the server never reads real values for encrypted accounts.
   * (Mirrors the `kinds` column added in migration 20260709120000; kanel-regenerable.)
   */
  kinds?: Array<string> | null;

  url?: string | null;

  patterns?: Array<string> | null;

  imageFilename?: string | null;

  itemCount?: number | null;

  updatedAt?: Date | null;

  createdAt?: Date | null;

  metaUpdatedAt?: Date | null;

  published?: boolean | null;

  publishId?: string | null;

  /**
   * Per-account blind index of `publishId` (HMAC). Lets the server dedup/lookup imported items by
   * published source without learning which published item a row is. Populated on sv:2 writes.
   * (Mirrors the `publishIdBlindKey` column added in migration 20260629130000; kanel-regenerable.)
   */
  publishIdBlindKey?: string | null;

  publishName?: string | null;

  publishDescription?: string | null;

  publishedUpdatedAt?: Date | null;

  publishType?: string | null;

  publishConfig?: Record<string, any> | null;

  publishVisibilityCode?: number | null;

  publishUpdateType?: string | null;

  deleted?: boolean | null;

  archived?: boolean | null;

  permanent?: boolean | null;

  info?: ItemDetailsInfo | null;

  meta?: ItemMeta | null;

  attachments?: {entries: ItemAttachment[]} | null;
  
  sourceInfo?: Record<string, any> | null;

  sysInfo?: ItemSysInfo | null;

  encrypted?: boolean;

  encInfo?: null | EncInfo;

  // Permission fields (added to API responses, not in DB)
  sharedByUserId?: string | null;
  sharedWithUserId?: string | null;
  sharedAt?: Date | null;
  permissionUserId?: string | null;
  permission?: string | null;
  ownedByUserType?: string | null;

  // Client-side decryption state (not in DB)
  decrypted?: boolean;

  //client only
  path?: string[];
}
