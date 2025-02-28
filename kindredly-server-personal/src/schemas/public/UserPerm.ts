
export default  interface UserPerm {
  _id?: string;

  userId?: string | null;

  itemId?: string | null;

  permission?: string | null;

  inLibrary?: boolean | null;

  sharedByUserId?: string | null;

  createdAt?: Date | null;
}
