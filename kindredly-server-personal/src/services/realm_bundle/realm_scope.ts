/**
 * What belongs to a realm, table by table.
 *
 * A realm is not selectable by a query. `accountId` is absent from roughly a third of the tables
 * that hold family data, `key_entry` scopes on `selectType`/`selectId`, and `ref_state` on
 * `ownerType`/`ownerId`. Founder decision 2026-09-01 (realm-bundle-format.md §4.1): the exporter
 * walks rather than a migration backfilling `accountId` across ~25 tables.
 *
 * **This table is the whole safety mechanism.** The failure mode of a walk is not a crash — it is a
 * family restoring and finding one category of their data silently absent, discovered at the worst
 * possible moment. `realm_scope.test.ts` asserts this map is total over the tables the migrations
 * create, so a new table cannot be added without someone deciding, on the record, whether it is
 * family data.
 *
 * If you are here because that test failed: add your table with the scope it deserves. There is no
 * default, deliberately.
 */

export type RealmScope =
  /** The realm root. One row, field-filtered. */
  | 'account'
  /** Collected through the realm's users, by `userId`. */
  | 'user'
  /** Collected by `accountId`. */
  | 'account-scoped'
  /** Polymorphic owner columns; needs its own two-branch walk. */
  | 'polymorphic'
  /** Host infrastructure, host content, or another host's relationship with this family. Never travels. */
  | 'host'
  /** Rebuildable at the destination. Never travels. */
  | 'derived';

export type RealmTableRule = {
  scope: RealmScope;
  /** The column the walk filters on, where there is one. */
  column?: string;
  /** Why, for the scopes where the answer is not obvious from the name. */
  note?: string;
};

export const REALM_TABLE_SCOPES: Readonly<Record<string, RealmTableRule>> = {
  account: {scope: 'account', note: 'The realm root; stripeCustomerId and entitlements are filtered out'},

  // --- collected through the realm's users --------------------------------
  user: {scope: 'user', column: 'accountId', note: 'The member roster; credentials and escrow filtered out'},
  user_pref: {scope: 'user', column: 'userId'},
  user_perm: {scope: 'user', column: 'userId'},
  user_feed: {scope: 'user', column: 'userId'},
  user_showcase: {scope: 'user', column: 'userId'},
  client_info: {scope: 'user', column: 'userId'},
  passkey_credential: {scope: 'user', column: 'userId'},
  post: {scope: 'user', column: 'userId'},
  comment: {scope: 'user', column: 'userId'},
  reaction: {scope: 'user', column: 'userId'},
  following: {scope: 'user', column: 'userId'},
  friend: {scope: 'user', column: 'userId'},
  item_feedback: {scope: 'user', column: 'userId'},
  report_problem: {scope: 'user', column: 'userId'},
  review: {scope: 'user', column: 'userId'},
  subscription: {scope: 'user', column: 'userId'},
  user_activity: {scope: 'user', column: 'userId'},
  user_activity_log: {scope: 'user', column: 'userId'},
  user_file: {scope: 'user', column: 'userId', note: 'Also the blob index — the storage seam cannot enumerate'},

  // --- collected by accountId ---------------------------------------------
  item: {scope: 'account-scoped', column: 'accountId'},
  item_relation: {scope: 'account-scoped', column: 'accountId'},
  notification: {scope: 'account-scoped', column: 'accountId'},
  access_request: {scope: 'account-scoped', column: 'accountId'},
  family_policy_rule: {scope: 'account-scoped', column: 'accountId'},

  // --- polymorphic owners --------------------------------------------------
  key_entry: {scope: 'polymorphic', column: 'selectId', note: "selectType 'user' | 'account'"},
  ref_state: {scope: 'polymorphic', column: 'ownerId', note: "ownerType 'user' | 'account' | 'session'"},

  // --- host: never travels --------------------------------------------------
  knex_migrations: {scope: 'host', note: 'Migration bookkeeping'},
  knex_migrations_lock: {scope: 'host', note: 'Migration bookkeeping'},
  sys_info: {scope: 'host', note: 'Host and catalog state'},
  user_session: {scope: 'host', note: 'JWT revocation registry for one host'},
  user_oauth_secret: {scope: 'host', note: 'Host-coupled provider credentials'},
  verification: {scope: 'host', note: 'Short-lived email/code verification'},
  contact_request: {scope: 'host', note: 'Inbound contact form, no owner'},
  site_plugin: {scope: 'host', note: 'Host-wide plugin definitions'},
  published: {scope: 'host', note: 'The public catalog; server-side plaintext shared across accounts'},
  published_relation: {scope: 'host', note: 'Catalog structure'},
  curation_review: {scope: 'host', note: 'Curator reviews of public catalog rows; no per-user data'},
  curation_review_signoff: {scope: 'host', note: "Each curator's answers to a catalog review; no per-user data"},
  user_public: {scope: 'host', note: 'Public profile projection, keyed on its own id'},
  external_meta_cache: {scope: 'host', note: 'TTL metadata cache, no owner'},
  source_reputation: {scope: 'host', note: 'Domain trust data, seeded from the app'},
  puzzle_content: {scope: 'host', note: 'App content; no per-user data'},
  content_source_draft: {scope: 'host', note: 'Admin content pipeline'},
  platform_alert_receiver: {scope: 'host', note: 'Ops alert list'},
  security_event: {scope: 'host', note: 'Host ledger; ipHash is HMAC-ed with a server secret'},
  audit_log: {scope: 'host', note: 'Host ledger'},
  event_log: {scope: 'host', note: 'Append-only host telemetry'},
  ai_usage_log: {scope: 'host', note: "The host's AI spend accounting"},
  ai_limit_window: {scope: 'host', note: "The host's AI limit windows; they start again on first use"},
  ai_extra_usage_grant: {scope: 'host', note: 'Extra AI usage Kindredly granted on this host; not portable credit'},
  ai_extra_usage_debit: {scope: 'host', note: "The host's extra AI usage ledger"},
  classification_model_artifact: {scope: 'host', note: 'ML artifact'},
  classification_anchor_set: {scope: 'host', note: 'ML artifact'},
  classification_dataset: {scope: 'host', note: 'ML artifact'},
  classification_dataset_sample: {scope: 'host', note: 'ML artifact'},
  classification_eval_run: {scope: 'host', note: 'ML artifact'},
  classification_eval_prediction: {scope: 'host', note: 'ML artifact'},
  classification_feedback_report: {scope: 'host', note: 'ML artifact'},

  // --- derived: rebuilt at the destination ----------------------------------
  user_change_log: {scope: 'derived', note: 'Per-host sync journal; destination writes one fullReset per member'},
  embedding_vector_cache: {scope: 'derived', note: 'Recomputable'},
  item_meta: {scope: 'derived', note: 'Vestigial — data moved into item.meta in migration 20231020119034'},
};

/** Columns dropped from the realm root. Everything not listed travels (§4.4). */
export const ACCOUNT_EXCLUDED_FIELDS = [
  'stripeCustomerId',
  'subscriptionInfo',
  'accountType',
  'maxUsers',
  'maxCollections',
  'maxItemsPerCollection',
  'userCount',
  'collectionCount',
] as const;

/**
 * Columns dropped from every member row.
 *
 * `passwordCopy` and `recoveryKey` are KEY-11 D9 — escrow is a relationship with one host, wrapped
 * under a server-local key, and unreadable at any destination anyway. The rest are sign-in
 * credentials for one host's ladder.
 */
export const USER_EXCLUDED_FIELDS = [
  'password',
  'passwordCopy',
  'recoveryKey',
  'pin',
  'loginId',
  'lastActiveAt',
  'verifyEmailSentAt',
] as const;

/** What a bundle says it left behind, so a restore can tell the family in words (§7). */
export const EXCLUDED_MANIFEST_ENTRIES: string[] = [
  ...ACCOUNT_EXCLUDED_FIELDS.map((f) => `account.${f}`),
  ...USER_EXCLUDED_FIELDS.map((f) => `user.${f}`),
  ...Object.entries(REALM_TABLE_SCOPES)
    .filter(([, rule]) => rule.scope === 'host' || rule.scope === 'derived')
    .map(([table]) => `table:${table}`),
];

export const travels = (table: string): boolean => {
  const rule = REALM_TABLE_SCOPES[table];
  return !!rule && rule.scope !== 'host' && rule.scope !== 'derived';
};

export const tablesWithScope = (scope: RealmScope): string[] =>
  Object.entries(REALM_TABLE_SCOPES)
    .filter(([, rule]) => rule.scope === scope)
    .map(([table]) => table)
    .sort();

/** Drop excluded columns without mutating the row the caller handed in. */
export function filterFields<T extends Record<string, unknown>>(row: T, excluded: readonly string[]): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!excluded.includes(k)) out[k] = v;
  }
  return out as T;
}
