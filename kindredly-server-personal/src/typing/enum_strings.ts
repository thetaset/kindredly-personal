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
  /**
   * A child's Kindredly Guard device stopped reporting, reported a tamper attempt,
   * or had its uninstall protection removed.
   *
   * Its own category on purpose: `canSend` gates push delivery per notification
   * type, so folding these into an existing type would let a parent who muted that
   * unrelated category silently lose the one alert that must not be lost.
   */
  DEVICE_PROTECTION_ALERT = 'DEVICE_PROTECTION_ALERT',

  /**
   * New apps appeared on a child's Guard device since the parent last reviewed
   * them.
   *
   * Separate from DEVICE_PROTECTION_ALERT for the same reason that one is separate:
   * `canSend` gates push per type. These are routine and will arrive far more
   * often, so folding them in would force a parent to choose between being spammed
   * and muting the tamper alert that must never be missed.
   */
  DEVICE_APP_REVIEW = 'DEVICE_APP_REVIEW',

  /**
   * Platform-operations alert to designated staff users (bug reports, emergencies).
   *
   * Bypasses `canSend` entirely: receivers are founder-designated and must not be
   * able to accidentally mute it, and it must not surface a settings toggle to
   * ordinary families (it has no userPrefDefaults category on purpose).
   */
  PLATFORM_ALERT = 'PLATFORM_ALERT',
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
  runCompanionTamperWatch = 'companionTamperWatch.run',
  runSecurityDigest = 'securityDigest.run',
  subscribe = 'publishedService.subscribe',
  updateSubscription = 'publishedService.updateSubscription',
  publishedModerationAiReview = 'publishedService.publishedModerationAiReview',
  getBannerImageDataForUrl = 'getBannerImageDataForUrl',
  TASKRUNNER_TEST = 'TASKRUNNER_TEST',
  fetchMetadata = 'fetchMetadata',
  contentClassification = 'contentClassification',
}
