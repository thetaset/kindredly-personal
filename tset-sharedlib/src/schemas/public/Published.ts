import { ItemSysInfo, ItemMeta, ItemAttachment } from "../../shared.types";
import { ItemTypePrimary, ItemTypeSecondary } from "../../content.types";

/**
 * Database schema for published/marketplace items.
 * Used server-side for database operations and as the 'details' field in PublishedInfoView for transport.
 */
export default interface Published {
  _id?: string;

  key?: string | null;

  type?: ItemTypePrimary | null;

  subType?: ItemTypeSecondary | null;

  name?: string | null;

  description?: string | null;

  sourceItemId?: string | null;

  accountId?: string | null;

  publicUserId?: string | null;

  /**
   * Internal user id of the publisher (non-public only).
   * Must never be exposed in public responses.
   */
  ownerUserId?: string | null;

  username?: string | null;

  itemCount?: number | null;

  categories?: string[] | null;

  useCriteria?: string[] | null;

  imageFilename?: string | null;

  tableGroup?: string | null;

  updatedAt?: Date | null;

  createdAt?: Date | null;

  excludeFromSearch?: boolean | null;

  published?: boolean | null;

  blockedAt?: Date | null;

  blockContext?: Record<string, any> | null;

  visibilityCode?: number | null;

  curationStatus?: string | null;

  publishType?: string | null;

  publishConfig?: Record<string, any> | null;

  pubStatus?: string | null;

  pubStatusUpdated?: Date | null;

  meta?: ItemMeta | null;

  data?: {
    [key: string]: any;
    patterns?: string[];
    url?: string;
  } | null;

  overallRating?: number | null;

  numRatings?: number | null;

  easyId?: string | null;

  curated?: boolean | null;

  curatorId?: string | null;

  curatedDate?: Date | null;

  curatorComment?: string | null;

  attachments?: {entries: ItemAttachment[]} | null;

  info?: Record<string, any> | null;

  statSubCount?: number | null;

  statViewCount?: number | null;

  sysInfo?: ItemSysInfo | null;

  sourceInfo?: Record<string, any> | null;

  availableAt?: Date | null;
}
