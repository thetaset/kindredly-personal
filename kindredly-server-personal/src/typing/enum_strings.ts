// notfication types

export enum NotificationGroupType {
  USER = 'USER',
  ACCOUNT = 'ACCOUNT',
}
export enum NotificationType {
  // user
  WELCOME_USER = 'WELCOME_USER',
  NEW_ITEM = 'NEW_ITEM',
  USER_JOINED_ACCOUNT = 'USER_JOINED_ACCOUNT',
  ACCESS_REQUEST_UPDATE = 'ACCESS_REQUEST_UPDATE',
  LIBRARY_AUTO_APPROVAL_APPROVED = 'LIBRARY_AUTO_APPROVAL_APPROVED',
  LIBRARY_AUTO_APPROVAL_DENIED = 'LIBRARY_AUTO_APPROVAL_DENIED',
  LIBRARY_AUTO_APPROVAL_REVIEW = 'LIBRARY_AUTO_APPROVAL_REVIEW',
  NEW_POST = 'NEW_POST',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  ACCESS_REQUEST = 'ACCESS_REQUEST',
  SHARED_ITEM = 'SHARED_ITEM',
  NEW_COMMENT = 'NEW_COMMENT',
  FOLLOWING_UPDATE = 'FOLLOWING_UPDATE',
  RESTRICTED_USER_PUBLISHED = 'RESTRICTED_USER_PUBLISHED',
}

export enum EventRecordName {
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
  CREATE_USER = 'CREATE_USER',
  ACCOUNT_INVITE = 'ACCOUNT_INVITE',
  SAVE_ITEM_FEEDBACK = 'SAVE_ITEM_FEEDBACK',
  FRIEND_INVITE = 'FRIEND_INVITE',
}

export enum EventRecordType {
  EXPLICIT = 'EXPLICIT',
}

export enum NotificationMethod {
  email = 'email',
  push = 'push',
}

export enum RequestTypes {
  taskRunner = 'taskRunner',
}

export enum TaskRunnerJobTypes {
  runAutoPublish = 'publishedService.runAutoPublish',
  runDataRetention = 'dataRetention.runPurge',
  subscribe = 'publishedService.subscribe',
  updateSubscription = 'publishedService.updateSubscription',
  publishedModerationAiReview = 'publishedService.publishedModerationAiReview',
  getBannerImageDataForUrl = 'getBannerImageDataForUrl',
  TASKRUNNER_TEST = 'TASKRUNNER_TEST',
  fetchMetadata = 'fetchMetadata',
  contentClassification = 'contentClassification',
}
