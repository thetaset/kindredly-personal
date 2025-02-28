
export default interface AccessRequest {
  
  _id?: string;

  key?: string | null;

  accountId?: string | null;

  requesterId?: string | null;

  status?: string | null;

  requesterNote?: string | null;

  approverNote?: string | null;

  sourceRefType?: string | null;

  sourceRefId?: string | null;

  type?: string | null;

  approverId?: string | null;

  details?: any | null;

  createdAt?: Date | null;

  updatedAt?: Date | null;
}
