import type AccessRequest from '../../../tset-sharedlib/src/schemas/public/AccessRequest';
import type Account from '../../../tset-sharedlib/src/schemas/public/Account';
import type ContactRequest from '../../../tset-sharedlib/src/schemas/public/ContactRequest';
import type EventLog from '../../../tset-sharedlib/src/schemas/public/EventLog';

import type Friend from '../../../tset-sharedlib/src/schemas/public/Friend';
import type Item from '../../../tset-sharedlib/src/schemas/public/Item';
import type ItemFeedback from '../../../tset-sharedlib/src/schemas/public/ItemFeedback';
import type Reaction from '../../../tset-sharedlib/src/schemas/public/Reaction';

import type ItemRelation from '../../../tset-sharedlib/src/schemas/public/ItemRelation';
import type Notification from '../../../tset-sharedlib/src/schemas/public/Notification';
import type Published from '../../../tset-sharedlib/src/schemas/public/Published';
import type PublishedRelation from '../../../tset-sharedlib/src/schemas/public/PublishedRelation';
import type Review from '../../../tset-sharedlib/src/schemas/public/Review';
import type SitePlugin from '../../../tset-sharedlib/src/schemas/public/SitePlugin';
import type SysInfo from '../../../tset-sharedlib/src/schemas/public/SysInfo';
import type User from '../../../tset-sharedlib/src/schemas/public/User';
import type UserActivity from '../../../tset-sharedlib/src/schemas/public/UserActivity';
import type UserPerm from '../../../tset-sharedlib/src/schemas/public/UserPerm';
import type UserPublic from '../../../tset-sharedlib/src/schemas/public/UserPublic';
import type Verification from '../../../tset-sharedlib/src/schemas/public/Verification';

import type UserChangeLog from '../../../tset-sharedlib/src/schemas/public/UserChangeLog';
import type Post from '../../../tset-sharedlib/src/schemas/public/Post';
import type UserFeed from '../../../tset-sharedlib/src/schemas/public/UserFeed';
import type Comment from '../../../tset-sharedlib/src/schemas/public/Comment';
import type KeyEntry from '../../../tset-sharedlib/src/schemas/public/KeyEntry';
import type UserPref from '../../../tset-sharedlib/src/schemas/public/UserPref';
import type ReportProblem from '../../../tset-sharedlib/src/schemas/public/ReportProblem';
import type ClassificationDatasetSample from '../../../tset-sharedlib/src/schemas/public/ClassificationDatasetSample';
import type ClassificationFeedbackReport from '../../../tset-sharedlib/src/schemas/public/ClassificationFeedbackReport';
import type FamilyPolicyRule from '../../../tset-sharedlib/src/schemas/public/FamilyPolicyRule';

declare module 'knex/types/tables.js' {
  interface Tables {
    access_request: AccessRequest;
    account: Account;
    comment: Comment;
    classification_dataset_sample: ClassificationDatasetSample;
    classification_feedback_report: ClassificationFeedbackReport;
    contact_request: ContactRequest;
    event_log: EventLog;
    family_policy_rule: FamilyPolicyRule;
    friend: Friend;
    item_feedback: ItemFeedback;
    item_relation: ItemRelation;
    item: Item;
    key_entry: KeyEntry;
    notification: Notification;
    post: Post;
    published_relation: PublishedRelation;
    published: Published;
    reaction: Reaction;
    report_problem: ReportProblem;
    review: Review;
    site_plugin: SitePlugin;
    sys_info: SysInfo;
    user_activity: UserActivity;
    user_change_log: UserChangeLog;
    user_feed: UserFeed;
    user_perm: UserPerm;
    user_prefs: UserPref;
    user_public: UserPublic;
    user: User;
    verification: Verification;
  }
}
