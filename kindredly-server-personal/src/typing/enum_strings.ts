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
  /**
   * The assistant acted on a request without the parent: it approved a site
   * against their written guidelines, or it counted a page as a different kind of
   * screen time. One type for both, because it answers one parent question —
   * "tell me when the assistant acted". The name is about the library and the
   * second case is not; it is persisted on every notification row ever written,
   * so it is deliberately not renamed, and the settings row is labelled by hand.
   *
   * Quiet by default rather than by rule: `userPrefDefaults` starts this category
   * with email and push both off, so it is a record to read later unless a parent
   * asks otherwise. It used to be sent with `sendPush = false`, which made that
   * preference unable to do anything.
   *
   * The DENIED/REVIEW siblings were removed with the feature that declared and
   * never sent them — the assistant cannot deny, and a hand-off to the parent is
   * an ACCESS_REQUEST like any other.
   */
  LIBRARY_AUTO_APPROVAL_APPROVED = 'LIBRARY_AUTO_APPROVAL_APPROVED',
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

  /**
   * A curator finished the curation review a person's catalog report opened: what they found.
   * Its own category so a family can switch it without touching anything else.
   */
  CURATION_REVIEW_RESULT = 'CURATION_REVIEW_RESULT',
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
  runRealmBackup = 'realmBackup.run',
  subscribe = 'publishedService.subscribe',
  updateSubscription = 'publishedService.updateSubscription',
  publishedModerationAiReview = 'publishedService.publishedModerationAiReview',
  curationReviewAiDraft = 'curationReview.aiDraft',
  runDueCurationReviews = 'curationReview.runDue',
  getBannerImageDataForUrl = 'getBannerImageDataForUrl',
  TASKRUNNER_TEST = 'TASKRUNNER_TEST',
  fetchMetadata = 'fetchMetadata',
  contentClassification = 'contentClassification',
}
