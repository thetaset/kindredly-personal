
import { ItemAttachment, ItemType } from "tset-sharedlib/shared.types";


//TODO: reconcile with ItemDetailsView in shared.types.ts
export default  interface Item {
  _id?: string;

  accountId?: string | null;

  key?: string | null;

  userId?: string | null;

  name?: string | null;

  description?: string | null;

  comment?: string | null;

  type?: ItemType | null;

  visibility?: string | null;

  categories?:  Array<string> | null;

  tags?:  Array<string> | null;

  useCriteria?: Array<string> | null;

  url?: string | null;

  patterns?:  Array<string> | null;

  imageFilename?: string | null;

  itemCount?: number | null;

  updatedAt?: Date | null;

  createdAt?: Date | null;

  published?: boolean | null;

  publishId?: string | null;

  publishName?: string | null;

  publishDescription?: string | null;

  publishType?: string | null;

  publishConfig?: Record<string, any> | null;

  deleted?: boolean | null;

  archived?: boolean | null;

  publishVisibilityCode?: number | null;

  publishUpdateType?: string | null;

  subType?: string | null;

  permanent?: boolean | null;

  info?: Record<string, any> | null;

  meta?: Record<string, any> | null;

  metaUpdatedAt?: Date | null;

  attachments?: {entries:ItemAttachment[]} | null;
  
  sourceInfo?: Record<string, any> | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;

}
