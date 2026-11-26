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
   * Kinbot gave a child its self-harm help reply (EUP-12). The guardian is told, with what the
   * child wrote (founder, 2026-10-23). Its own category so muting anything else never mutes it;
   * email and push both start on.
   */
  CHILD_SAFETY_ALERT = 'CHILD_SAFETY_ALERT',

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

  /**
   * Family Downtime started: a push to each admin's phone, removed when it ends (HAT-380).
   * Push only, never a stored notification: it is true only while downtime is on.
   */
  FAMILY_DOWNTIME = 'FAMILY_DOWNTIME',

  /**
   * A connected AI app is asking an adult's permission (HAT-690): a push to that adult's phones
   * that names nothing, since what is asked is encrypted and lasts ten minutes. Push only, never a
   * stored notification; the request itself shows in Kindredly (mcp_permission.service.ts).
   */
  AI_APP_PERMISSION = 'AI_APP_PERMISSION',

  /**
   * A new device of this person asks to open their data (UNL-14): a push to their phones, so "Is
   * this you?" can be answered without the app open. Always sent, like a sign-in alert: it is
   * about their own account, and only a session signed in as them can ask. Push only.
   */
  DEVICE_UNLOCK_REQUEST = 'DEVICE_UNLOCK_REQUEST',

  /**
   * A child finished a part of a built-in lesson pack (Digital citizenship, HAT-577). Names the
   * child and the pack, never the part. Its own category, push off until a guardian turns it on.
   */
  LESSON_PART_DONE = 'LESSON_PART_DONE',

  /**
   * A child asked for a Helper AI helper (HAT-1105, HAI-14). Names the child only: what they asked
   * for stays in the encrypted request, on the Helper AI page the notice opens.
   */
  HELPER_REQUEST = 'HELPER_REQUEST',

  /**
   * Each admin's report of which children were active, weekly on Sunday evening by default, or
   * daily, or off (HAT-655). Sent even when no child was active, saying so, with nothing to open.
   */
  ACTIVITY_REPORT = 'ACTIVITY_REPORT',
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
  runFamilyDowntimeNotices = 'familyDowntimeNotices.run',
  runActivityReports = 'activityReports.run',
  subscribe = 'publishedService.subscribe',
  updateSubscription = 'publishedService.updateSubscription',
  publishedModerationAiReview = 'publishedService.publishedModerationAiReview',
  curationReviewAiDraft = 'curationReview.aiDraft',
  runDueCurationReviews = 'curationReview.runDue',
  runCatalogMonitor = 'catalogMonitor.run',
  getBannerImageDataForUrl = 'getBannerImageDataForUrl',
  TASKRUNNER_TEST = 'TASKRUNNER_TEST',
  fetchMetadata = 'fetchMetadata',
  contentClassification = 'contentClassification',
}
