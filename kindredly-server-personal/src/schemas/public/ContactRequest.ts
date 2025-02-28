
export default  interface ContactRequest {
  _id?: string;

  contactType?: string | null;

  userInfo?: unknown | null;

  processed?: boolean | null;

  message?: string | null;

  processNote?: string | null;

  updatedAt?: Date | null;

  createdAt?: Date | null;
}
