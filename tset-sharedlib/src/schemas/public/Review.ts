
export default  interface Review {
  _id?: string;

  key?: string | null;

  userId?: string | null;

  data?: string | null;

  createdAt?: Date | null;

  publicUserId?: string | null;

  publishId?: string | null;

  overallRating?: number | null;

  comment?: string | null;

  visibilityCode?: number | null;

  deletedAt?: Date | null;

  updatedAt?: Date | null;
}
