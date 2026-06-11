
export default interface Verification {
  _id?: string;

  type?: string | null;

  filterKey?: string | null;

  data?: Record<string, any> | null;

  createdAt?: Date | null;

  expiresAt?: Date | null;
}

