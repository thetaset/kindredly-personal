import type { EncInfo } from '../../types/encryption.types';

export default interface FamilyPolicyRuleRecord {
  _id?: string;
  accountId?: string;
  data?: Record<string, any> | null;
  encrypted?: boolean;
  encInfo?: EncInfo | Record<string, any> | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}