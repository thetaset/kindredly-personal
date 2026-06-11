export default interface ClassificationFeedbackReport {
  _id?: number;
  dedupeKey: string;
  userId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  details: any;
  reportCount: number;
  lastReportedAt: Date;
  createdAt?: Date;
}