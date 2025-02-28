
export default  interface PublishedRelation {
  _id?: string;


  parentId?: string | null;

  itemId?: string | null;

  order?: number | null;

  details?: null | Record<string, any>;

  createdAt?: Date | null;

  availableAt?: Date | null;

  updatedAt?: Date | null;
}
