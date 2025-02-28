
export default  interface Published {
  _id?: string;

  type?: string | null;

  name?: string | null;

  description?: string | null;

  sourceItemId?: string | null;

  accountId?: string | null;

  publicUserId?: string | null;

  username?: string | null;

  itemCount?: number | null;

  categories?: unknown | null;

  useCriteria?: unknown | null;

  imageFilename?: string | null;

  tableGroup?: string | null;

  items?: unknown | null;

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

  key?: string | null;

  meta?: Record<string, any> | null;

  data?: Record<string, any> | null;

  overallRating?: number | null;

  numRatings?: number | null;

  easyId?: string | null;

  curated?: boolean | null;

  curatorId?: string | null;

  curatedDate?: Date | null;

  curatorComment?: string | null;

  attachments?: Record<string, any> | null;

  subType?: string | null;

  info?: Record<string, any> | null;

  statSubCount?: number | null;

  statViewCount?: number | null;

  availableAt?: Date | null;
}
