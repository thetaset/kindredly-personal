export interface AccountOptions {
  setupComplete?: boolean;

}


export interface SystemOptions {
  aiChatSupported?: boolean;
  extendedFeatures?: Record<string, boolean>;
}

export type AccountType = 'standard' | 'plus' | 'superplus';

export default interface Account {
  
  _id?: string;

  userCount?: number | null;

  ownerUserId?: string | null;

  collectionCount?: number | null;

  maxUsers?: number | null;

  maxCollections?: number | null;

  maxItemsPerCollection?: number | null;

  accountType?: AccountType | null;

  options?: AccountOptions | null;

  sysOptions?: SystemOptions | null;

  createdAt?: Date | null;

  updatedAt?: Date | null;

  /** Default value: false */
  deleted?: boolean | null;

  /** Default value: false */
  disabled?: boolean | null;

  stripeCustomerId?: string | null;

  subscriptionInfo?: Record<string, any> | null;

  encEnabled?: boolean | null;

  encConfig?: null | Record<string, any>;
}
