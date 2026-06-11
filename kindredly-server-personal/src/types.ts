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
