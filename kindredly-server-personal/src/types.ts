
export const TYPES = {
  SetupService: Symbol.for('SetupService'),
  AuthValidatorService: Symbol.for('AuthValidatorService'),
  PublishedService: Symbol.for('PublishedService'),
  SubscriptionManagementService: Symbol.for('SubscriptionManagementService'),
  UserFileAccessProvider: Symbol.for('UserFileAccessProvider'),

};

export interface DynObj {
  [key: string]: any;
}

export enum SubscriptionRefType {
  col = 'col',
  pub_col = 'pub_col',
  item_feed = 'item_feed',
  pub_item_feed = 'pub_item_feed',
  custom = 'custom'
}
