
export default  interface KeyEntry {
  _id?: string;

  selectId?: string | null;

  selectType?: string | null;

  groupId?: string | null;

  groupType?: string | null;

  keyId?: string | null;

  keyType?: string | null;

  keyName?: string | null;

  version?: string | null;

  permission?: string | null;

  keyData?: Record<string, any> | null;

  keyAlgo?: Record<string, any> | null;

  keyOps?: Record<string, any> | null;

  isWrapped?: boolean | null;

  wrappingKeyId?: string | null;

  wrappingKeyGroup?: string | null;

  unwrappingKeyId?: string | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date | null;
  
  deletedAt?: Date | null;
}
