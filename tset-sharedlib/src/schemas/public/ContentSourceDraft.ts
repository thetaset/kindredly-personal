export default interface ContentSourceDraftRecord {
  _id?: string;
  label?: string | null;
  status?: string;
  /** Array of ContentSourceCandidate objects (see api-types). */
  candidates?: Record<string, any> | null;
  createdByUserId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
