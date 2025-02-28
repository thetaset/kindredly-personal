
import type AccessRequest from './public/AccessRequest';
import type Account from './public/Account';
import type ContactRequest from './public/ContactRequest';
import type EventLog from './public/EventLog';

import type Friend from './public/Friend';
import type Item from './public/Item';
import type ItemFeedback from './public/ItemFeedback';
import type Reaction from './public/Reaction';


import type ItemRelation from './public/ItemRelation';
import type Notification from './public/Notification';
import type Published from './public/Published';
import type PublishedRelation from './public/PublishedRelation';
import type Review from './public/Review';
import type SitePlugin from './public/SitePlugin';
import type SysInfo from './public/SysInfo';
import type User from './public/User';
import type UserActivity from './public/UserActivity';
import type UserPerm from './public/UserPerm';
import type UserPublic from './public/UserPublic';
import type Verification from './public/Verification';

import type UserChangeLog from './public/UserChangeLog';
import type Post from './public/Post';
import type UserFeed from './public/UserFeed';
import type Comment from './public/Comment';
import type KeyEntry from './public/KeyEntry';
import type UserPref from './public/UserPref';
import type ReportProblem from './public/ReportProblem';

declare module 'knex/types/tables.js' {
  interface Tables {
    access_request: AccessRequest;
    account: Account;
    comment: Comment;
    contact_request: ContactRequest;
    event_log: EventLog;
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
