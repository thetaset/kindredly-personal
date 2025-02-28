import { ItemPageTypes } from './constants';

export enum UserType {
  admin = 'admin',
  restricted = 'restricted',
}

export enum AccountType {
  standard = 'standard',
}

export enum LoginType {
  google = 'google',
  apple = 'apple',
  internal = 'internal',
}

export enum VerificationType {
  loginToken = 'loginToken',
  joinFamily = 'joinFamily',
  passwordReset = 'passwordReset',
  regToken = 'regToken',
  confirmEmail = 'confirmEmail',
}
export enum ItemType {
  collection = 'col',
  item = 'item',
  link = 'link',
  note = 'note',
  file = 'file',
  thing = 'thing',
  tab = 'tab'

}

export enum ItemSubType {
  article = 'article',
}

export enum PermissionType {
  owner = 'owner',
  editor = 'editor',
  viewer = 'viewer',
}
export const PermissionTypeList = [PermissionType.owner, PermissionType.editor, PermissionType.viewer];

export const PermissionTypeEditableList = [PermissionType.owner, PermissionType.editor];

export interface DynObj {
  [key: string]: any;
}

export interface UserView {
  _id: string;
  accountId: string;
  username: string;
  displayedName: string;
  
  encEnabled: boolean;
  encSettings: DynObj;
  [key: string]: any;
}


export interface CreateUserReq {
  username: string;
  displayedName?: string;
  email: string;
  type: UserType;
  loginType?: string;
  loginPayload?: any;
  serverCopyOfPassword?: string;
  password?: string;
  inviteVerification?: {
    code: string | null;
  };
  refData?: {
    inviteCode: string | null;
    accessToken?: string;
    sessionToken?: string;
  };
  recaptchaToken?: string;
}

export interface ClientInfoView {}

export interface ItemMetaView {
  tsExtractedInfo?: any;
  THETASET_PAGE_TYPE?: ItemPageTypes;
  title?: string;
  description?: string;
  bannerImagePath?: string;
  bannerImageSrcPath?: string;
  imageSrc?: string;
}
export type DateString = string | null;

export interface ItemFeedbackView {
  _id?: string;

  userId?: string | null;

  data?: unknown | null;

  isReadLaterDate?: DateString;

  starredDate?: DateString;

  isReadDate?: DateString;

  isHidden?: boolean;

  reactionDate?: DateString;

  reaction?: string;

  archivedDate?: DateString;

  snoozeUntilDate?: DateString;

  neverRemindDate?: DateString;

  notes?: unknown | null;

  visitCount?: number | null;

  visitTime?: DateString;

  updatedAt?: DateString;

  lastVisit?: DateString;

  createdAt?: DateString;
}
export interface ItemAttachment {
  id?: string;
  type: 'file' | 'snapshot' | 'snip' | 'uri';
  info: Record<string, any>; //this should be encrypted and will contain. orginal filename, uri, etc
  fileType: string;
  fileId?: string;
  encryptedInfo?: boolean;
  createDate?: number;
}

export interface ItemDetailsView {
  _id?: string;

  accountId?: string | null;

  key?: string | null;

  userId?: string | null;

  name?: string | null;

  description?: string | null;

  comment?: string | null;

  type?: ItemType | null;

  visibility?: string | null;

  categories?: Array<string> | null;

  tags?: Array<string> | null;

  useCriteria?: Array<string> | null;

  url?: string | null;

  patterns?:  Array<string> | null;

  imageFilename?: string | null;

  itemCount?: number | null;

  updatedAt?: DateString;

  createdAt?: DateString;

  published?: boolean | null;

  publishId?: string | null;

  publishName?: string | null;

  publishDescription?: string | null;

  deleted?: boolean | null;

  archived?: boolean | null;

  publishVisibilityCode?: number | null;

  publishUpdateType?: string | null;

  publishedUpdatedAt?: DateString;

  subType?: string | null;

  permanent?: boolean | null;

  info?: Record<string, any> | null;

  meta?: ItemMetaView | null;

  metaUpdatedAt?: DateString;

  attachments?: { entries: ItemAttachment[] } | null;

  sourceInfo?: Record<string, any> | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}

type Modify<T, R> = Omit<T, keyof R> & R;

export type ItemInfoViewWithDateObjs = Modify<
  ItemInfoView,
  {
    details?: Modify<
      ItemDetailsView,
      {
        updatedAt?: Date | null;
        createdAt?: Date | null;
        metaUpdatedAt?: Date | null;
      }
    >;

    collectionRelation?: Modify<
      ItemRelationView,
      {
        createdAt?: Date | null;
      }
    >;
    feedback?: Modify<
      ItemFeedbackView,
      {
        updatedAt?: Date | null;
        lastVisit?: Date | null;
        createdAt?: Date | null;
        isReadLaterDate?: Date | null;
        isReadDate?: Date | null;
        reactionDate?: Date | null;
        archivedDate?: Date | null;
        snoozeUntilDate?: Date | null;
        neverRemindDate?: Date | null;
        visitTime?: Date | null;
      }
    >;
  }
>;


export interface ItemRelationView {
  _id?: string;

  collectionId?: string | null;

  order?: number | null;

  createdAt?: DateString;

  details?: { name?: string; description?: string, comment?:string } | null;

  userId?: string | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}
export interface ItemInfoView {
  itemId: string;
  details: ItemDetailsView;
  feedback?: ItemFeedbackView;
  collectionRelation?: ItemRelationView;
  collectionIds?: string[]; //TODO rename to parentIds
}

export interface ItemInfoViewWithSearchFields extends ItemInfoView {
  sortTime?: number;
  scoreInfo?: Record<string, any>;
  permission?: PermissionType;
  permissionUserId?: string;
  permissionCreateAt?: string;
  parentList?: Record<string, any>;
}

export interface ItemChangeLogUpdate {
  fullReset: boolean;
  totalUpdates: number;
  updatedItems: ItemInfoView[];
  removedItemIds: string[];
}

export interface FileUploadInfo {
  ufId?: string; // used for fast lookup, but not for update
  refId: string;
  refType: string;
  filename: string;
  fileType: string;
  fileData: any;
  previews?: { id?: string; data: any, type?:string }[];
  encInfo: any;
}

