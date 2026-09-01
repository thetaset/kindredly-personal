
export default  interface Post {
  _id?: string;


  userId?: string | null;

  postType?: string | null;

  data?: Record<string, any> | null;
  
  attachedItems?: Record<string, any> | null;

  sharedWith?: Record<string, any> | null;

  /** Links fan-out siblings created for one "Separate recipients" authoring action. */
  shareGroupId?: string | null;

  /** Author-facing label for this sibling's group (e.g. "Group 1"). */
  groupLabel?: string | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date | null;

  updatedAt?: Date | null;

  deletedAt?: Date | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}