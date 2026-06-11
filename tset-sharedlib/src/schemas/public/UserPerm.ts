
export default  interface UserPerm {
  _id?: string;

  userId?: string | null;

  itemId?: string | null;

  permission?: string | null;

  /**
   * LEGACY (DB-only): `user_perm.inLibrary` exists in older schemas but is deprecated.
   * Do not use in app code; use `notInLibrary` instead.
   */
  // inLibrary?: boolean | null;

  /**
   * Preferred flag (new): when true, user has permission but item should NOT appear in their library.
   * Default is false (i.e., it *is* in the library) unless a share flow sets it true.
   */
  notInLibrary?: boolean | null;

  sharedByUserId?: string | null;

  createdAt?: Date | null;
}
