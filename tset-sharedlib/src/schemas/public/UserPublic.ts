
export default  interface UserPublic {
  _id?: string;

  username?: string | null;

  about?: string | null;

  /** Default value: false */
  enabled?: boolean | null;

  profileImage?: Record<string, any> | null;

  fullName?: string | null;

  curator?: boolean | null;

  curatorApprovalBy?: string | null;

  curatorApprovalDate?: Date | null;

  blockedAt?: Date | null;

  blockContext?: Record<string, any> | null;

  verifiedType?: string | null;

  verifiedContext?: Record<string, any> | null;

  updatedAt?: Date | null;

  createdAt?: Date | null;
}
