

export default  interface ContentDetails {

  _id?: string;

  key?: string | null;

  uriRoot?: string | null;

  url?: string | null;

  contentType?: string | null;

  meta?: Record<string, any> | null;

  rawMetaUpdatedAt?: Date | null;

  extractedMeta?: Record<string, any> | null;

  extractedMetaUpdatedAt?: Date | null;

  classificationResults?: Record<string, any> | null;

  classificationUpdatedAt?: Date | null;

  useCriteria?: Array<string> | null;
  
  inappropriate?: boolean | null;

  kidSafe?: boolean | null;

  reviewed?: boolean | null;
  reviewStatus?: string | null;
  reviewStatusUpdatedAt?: Date | null;
  reviewStatusUpdatedBy?: string | null;

  createdAt?: Date | null;
  updatedAt?: Date | null;

  lastRequestAt?: Date | null;

  
}
