
export default  interface ItemRelation {
  _id?: string;

  accountId?: string | null;

  itemType?: string | null;

  collectionId?: string | null;

  itemId?: string | null;

  order?: number | null;

  createdAt?: Date | null;

  details?: unknown | null;

  userId?: string | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;

  publishedAvailableAt?: Date | null;

  publishedUpdatedAt?: Date | null;
}
