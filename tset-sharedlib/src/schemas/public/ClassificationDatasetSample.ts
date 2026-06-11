export default interface ClassificationDatasetSample {
  _id?: number;
  dedupeKey: string;
  datasetId: string;
  userId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  details: any;
  sampleCount: number;
  lastSeenAt: Date;
  createdAt?: Date;
}