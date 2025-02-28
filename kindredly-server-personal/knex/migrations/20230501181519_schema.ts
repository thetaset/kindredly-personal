import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('account', (table) => {
    table.string('_id').notNullable().primary().index();
    table.integer('userCount');
    table.integer('collectionCount');
    table.integer('maxUsers');
    table.integer('maxCollections');
    table.integer('maxItemsPerCollection');
    table.string('accountType');
    table.json('options');
    table.boolean('deleted').defaultTo(false);
    table.boolean('disabled').defaultTo(false);
    table.string('stripeCustomerId', 255);
    table.json('subscriptionInfo');
    table.boolean('encEnable');
    table.json('encSettings');
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user', function (table) {
    table.string('_id', 255).primary();
    table.string('accountId', 255).index();
    table.string('username', 255).unique().index();
    table.string('publicId', 255).unique();
    table.string('email', 255).unique().index();
    table.string('password', 255);
    table.string('type', 255);
    table.json('options');
    table.json('userData');
    table.boolean('canPublishPublicly');
    table.string('pin', 128);
    table.json('plugins');
    table.boolean('disabled').defaultTo(false);
    table.boolean('deleted').defaultTo(false);
    table.boolean('verified').defaultTo(false);
    table.json('dob');
    table.string('quickBarCollectionId', 255);
    table.json('pinnedItemIds');
    table.json('operationalStatus');
    table.string('loginType', 255);
    table.string('loginId', 255);
    table.json('profileImage');
    table.json('userInfo');
    table.boolean('encEnable');
    table.json('encSettings');
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updatedAt', {useTz: true});
  });

  await knex.schema.createTable('comment', (table) => {
    table.string('_id').notNullable().primary().index();
    table.string('refType');
    table.string('refId').index();
    table.string('userId').index();
    table.string('parentId');
    table.json('data');
    table.string('visibility');
    table.timestamp('deletedAt', {useTz: true});
    table.string('deleteReason');
    table.timestamp('editedAt', {useTz: true});
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('contact_request', function (table) {
    table.string('_id').primary().index();
    table.string('contactType');
    table.json('userInfo');
    table.boolean('processed');
    table.text('message');
    table.text('processNote');
    table.timestamp('updatedAt', {useTz: true});
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('event_log', function (table) {
    table.increments('_id').primary().index();
    table.string('eventName', 255).notNullable().index();
    table.string('eventVersion');
    table.string('eventType').notNullable();
    table.string('experimentId');
    table.string('source');
    table.json('eventInfo');
    table.json('clientInfo');
    table.boolean('anonymized').defaultTo(false);
    table.string('userId', 100);
    table.string('accountId');
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('friend', function (table) {
    table.string('_id').primary().index();
    table.string('accountId').index();
    table.string('userId', 100).index();
    table.string('friendUserId').index();
    table.string('nickname');
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.boolean('requester');
    table.boolean('confirmed');
    table.boolean('denied');
  });

  await knex.schema.createTable('item', function (table) {
    table.string('_id').primary().index();
    table.string('accountId').index();
    table.text('key').index();
    table.string('userId', 100);
    table.text('name');
    table.text('description');
    table.text('comment');
    table.text('type');
    table.text('visibility');
    table.text('subscriptionId');
    table.json('categories');
    table.json('tags');
    table.json('useCriteria');
    table.text('url');
    table.json('patterns');
    table.text('imageFilename');
    table.integer('itemCount');
    table.timestamp('updatedAt', {useTz: true});
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.boolean('published');
    table.string('publishId');
    table.text('publishName');
    table.text('publishDescription');
    table.boolean('deleted');
    table.integer('publishVisibilityCode');
    table.text('publishUpdateType');
    table.boolean('permanent');
    table.text('subType');
    table.boolean('archived');
  });

  await knex.schema.createTable('item_feedback', (table) => {
    table.string('_id').primary().index();
    table.string('itemId').index();
    table.string('userId').index();
    table.string('lastVisitId');
    table.json('data');
    table.json('lastVisitContext');
    table.integer('visitCount');
    table.timestamp('visitTime', {useTz: true});
    table.timestamp('lastUpdate', {useTz: true});
    table.timestamp('lastVisit', {useTz: true});
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true});
    table.timestamp('isReadLaterDate', {useTz: true});
    table.timestamp('isReadDate', {useTz: true});
    table.timestamp('reactionDate', {useTz: true});
    table.json('notes');
    table.timestamp('isArchived', {useTz: true});
    table.string('reaction');
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('item_meta', (table) => {
    table.string('_id').primary().index();
    table.string('accountId');
    table.text('key');
    table.json('meta');
    table.timestamp('updatedAt', {useTz: true});
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.index(['accountId', 'key']);
  });

  await knex.schema.createTable('item_relation', (table) => {
    table.string('_id').primary().index();
    table.string('accountId');
    table.string('itemType');
    table.string('collectionId').index();
    table.string('itemId').index();
    table.integer('order');
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.json('details');
    table.string('userId', 100);
    table.index(['itemId', 'itemType']);
    table.index(['collectionId', 'itemType']);
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('access_request', (table) => {
    table.string('_id').notNullable().primary().index();
    table.text('key');
    table.string('accountId').index();
    table.string('requesterId').index();
    table.string('requesterUsername');
    table.string('status');
    table.text('requesterNote');
    table.text('approverNote');
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('key_entry', (table) => {
    table.string('_id').primary().index();
    table.string('selectId');
    table.string('selectType');
    table.string('groupId');
    table.string('groupType');
    table.string('keyId');
    table.string('keyType');
    table.string('keyName');
    table.string('version');
    table.string('permission');
    table.json('keyData');
    table.json('keyAlgo');
    table.json('keyOps');
    table.boolean('isWrapped');
    table.string('wrappingKeyId');
    table.string('wrappingKeyGroup');
    table.string('unwrappingKeyId');
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.timestamp('deletedAt', {useTz: true});
    table.index(['selectId', 'selectType']);
  });

  await knex.schema.createTable('notification', function (table) {
    table.string('_id').primary().index();
    table.string('accountId').index();
    table.string('type');
    table.string('senderId');
    table.string('targetKey');
    table.json('data');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['accountId', 'targetKey']);
  });

  await knex.schema.createTable('post', function (table) {
    table.string('_id').primary().index();
    table.string('userId').index();
    table.string('postType');
    table.json('data');
    table.json('sharedWith');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt');
    table.timestamp('deletedAt');
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('published', function (table) {
    table.string('_id').primary().index();
    table.string('type');
    table.text('name');
    table.text('description');
    table.string('sourceItemId').index();
    table.string('accountId').index();
    table.string('publicUserId').index();
    table.string('username');
    table.integer('itemCount');
    table.jsonb('categories');
    table.jsonb('useCriteria');
    table.text('imageFilename');
    table.string('tableGroup').index();
    table.json('items');
    table.boolean('published');
    table.integer('visibilityCode');
    table.string('curationStatus');
    table.text('key');
    table.jsonb('meta');
    table.jsonb('data');
    table.float('overallRating');
    table.integer('numRatings');
    table.string('easyId').index();
    table.boolean('curated');
    table.string('curatorId').index();
    table.text('curatorComment');
    table.timestamp('curatedDate');
    table.timestamp('blockedAt');
    table.json('blockContext');
    table.timestamp('updatedAt');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('published_relation', function (table) {
    table.string('_id').primary().index();
    table.string('parentId').index();
    table.string('itemId').index();
    table.integer('order');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('report_problem', function (table) {
    table.increments('_id').primary();
    table.text('category').notNullable().index();
    table.json('details');
    table.text('sourceType').notNullable().index();
    table.text('sourceId');
    table.string('userId', 100).index();
    table.string('adminStatus', 255);
    table.json('adminStatusInfo');
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now()).notNullable();
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('review', function (table) {
    table.string('_id', 255).primary();
    table.string('key', 255).index();
    table.string('userId', 100).index();
    table.string('data', 255);
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
    table.text('publicUserId').index();
    table.text('publishId').index();
    table.integer('overallRating');
    table.text('comment');
    table.integer('visibilityCode');
    table.timestamp('deletedAt', {useTz: true});
    table.timestamp('updatedAt', {useTz: true});
  });

  await knex.schema.createTable('site_plugin', function (table) {
    table.string('_id', 255).primary();
    table.text('key').index();
    table.text('name');
    table.text('description');
    table.json('tags');
    table.json('patterns');
    table.json('css');
    table.json('script');
    table.string('version', 255);
    table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sys_info', function (table) {
    table.string('_id', 255).primary();
    table.json('data');
  });

  await knex.schema.createTable('user_activity', function (table) {
    table.string('_id').primary().index();
    table.text('key');
    table.text('url');
    table.string('activityType', 255);
    table.string('userId', 100).index();
    table.boolean('blocked');
    table.json('context');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.boolean('encrypted');
    table.json('encInfo');
    // add foreign key to user table
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('user_change_log', function (table) {
    table.increments('id').primary();
    table.string('userId', 100).index();
    table.text('sourceId');
    table.jsonb('data');
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable();
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('user_feed', function (table) {
    table.string('_id').primary().index();
    table.string('userId', 100).index();
    table.string('refId', 255);
    table.string('refType', 255);
    table.boolean('isRead').defaultTo(false);
    table.boolean('isDeleted').defaultTo(false);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.index(['userId', 'createdAt']);
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('user_perm', function (table) {
    table.string('_id').primary().index();
    table.string('userId', 100).index();
    table.string('itemId', 255).index();
    table.string('permission', 255);
    table.boolean('inLibrary');
    table.string('sharedByUserId', 100);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.foreign('userId').references('_id').inTable('user');
    table.foreign('sharedByUserId').references('_id').inTable('user');
  });

  await knex.schema.createTable('user_pref', function (table) {
    table.string('_id').primary().index();
    table.string('userId', 100);
    table.string('key', 255);
    table.json('value');
    table.timestamp('updatedAt');
    table.foreign('userId').references('_id').inTable('user');
  });

  await knex.schema.createTable('user_public', function (table) {
    table.string('_id').primary().index();
    table.string('username', 255);
    table.text('about');
    table.boolean('enabled').defaultTo(false);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt');
    table.string('fullName', 255);
    table.boolean('curator');
    table.string('curatorApprovalBy', 255);
    table.timestamp('curatorApprovalDate');
    table.timestamp('blockedAt');
    table.json('blockContext');
    table.json('profileImage');
    table.string('verifiedType', 255);
    table.json('verifiedContext');
  });

  await knex.schema.createTable('verification', function (table) {
    table.string('_id').primary().index();
    table.json('data');
    table.string('code');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('expiresAt');
  });

  await knex.schema.raw(`   
  drop index IF EXISTS published_categories_index;
  CREATE INDEX published_categories_index ON published USING gin ((categories -> 'i'));
  
  drop index IF EXISTS published_useCriteria_index;
  CREATE INDEX published_useCriteria_index ON published USING gin ("useCriteria");
  
  
  
  drop index if exists published_text_search_index;
  CREATE INDEX published_text_search_index ON published USING GIN (to_tsvector('english', "name" || ' ' || "description"));
  
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comment');

  await knex.schema.dropTableIfExists('access_request');
  await knex.schema.dropTableIfExists('contact_request');
  await knex.schema.dropTableIfExists('event_log');

  await knex.schema.dropTableIfExists('friend');

  await knex.schema.dropTableIfExists('key_entry');
  await knex.schema.dropTableIfExists('item_relation');
  await knex.schema.dropTableIfExists('item_meta');
  await knex.schema.dropTableIfExists('item_feedback');
  await knex.schema.dropTableIfExists('notification');
  await knex.schema.dropTableIfExists('post');
  await knex.schema.dropTableIfExists('published');
  await knex.schema.dropTableIfExists('published_relation');
  await knex.schema.dropTableIfExists('report_problem');
  await knex.schema.dropTableIfExists('review');
  await knex.schema.dropTableIfExists('site_plugin');
  await knex.schema.dropTableIfExists('sys_info');

  await knex.schema.dropTableIfExists('user_activity');
  await knex.schema.dropTableIfExists('user_change_log');
  await knex.schema.dropTableIfExists('user_change_log_id_seq');
  await knex.schema.dropTableIfExists('user_feed');
  await knex.schema.dropTableIfExists('user_perm');
  await knex.schema.dropTableIfExists('user_pref');
  await knex.schema.dropTableIfExists('user_public');
  await knex.schema.dropTable('verification');
  await knex.schema.raw(`   
drop index IF EXISTS published_useCriteria_index;

drop index IF EXISTS published_categories_index;

drop index IF EXISTS published_eduvalue_index;

drop index IF EXISTS published_minAgeGroup_index;

drop index IF EXISTS published_targetAudiences_index;

drop index if exists published_text_search_index;

    `);

  await knex.schema.dropTableIfExists('item');
  await knex.schema.dropTableIfExists('user');
  await knex.schema.dropTableIfExists('account');
}
