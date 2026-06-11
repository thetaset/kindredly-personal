import {getTestRequest} from './setup/testServer';
import {createTestUser, getAuthHeaders, TestUser} from './setup/testAuth';
import {getTestDb} from './setup/testDb';
import {createTestItem, createTestCollection} from './setup/testHelpers';
import {ItemTypeEnum, UserType, PermissionType} from 'tset-sharedlib/shared.types';

function expectQuerySuccess(response: any) {
  expect(response.statusCode).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.results).toBeDefined();
  return response.body.results;
}

describe('ItemQueryService Integration Tests', () => {
  const db = getTestDb();
  let testUser: TestUser;
  let authHeaders: Record<string, string>;

  beforeEach(async () => {
    testUser = await createTestUser(
      'queryuser',
      `query${Date.now()}@example.com`,
      'QueryPass123!',
      UserType.restricted,
    );
    authHeaders = getAuthHeaders(testUser.token!);
  });

  describe('POST /v3.0/item/query - standard mode', () => {
    it('should return items for user with basic query', async () => {
      // Create test items
      const item1Id = await createTestItem(db, testUser._id, {
        title: 'Test Item 1',
        url: 'https://example.com/1',
      });
      const item2Id = await createTestItem(db, testUser._id, {
        title: 'Test Item 2',
        url: 'https://example.com/2',
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items).toBeDefined();
      expect(Array.isArray(results.items)).toBe(true);
      expect(results.total).toBeGreaterThanOrEqual(2);
      expect(results.hasMore).toBeDefined();
    });

    it('should filter items by IDs', async () => {
      const item1Id = await createTestItem(db, testUser._id, {title: 'Item A'});
      const item2Id = await createTestItem(db, testUser._id, {title: 'Item B'});
      await createTestItem(db, testUser._id, {title: 'Item C - should not appear'});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [item1Id, item2Id]},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(2);
      const itemIds = results.items.map((i: any) => i.itemId);
      expect(itemIds).toContain(item1Id);
      expect(itemIds).toContain(item2Id);
    });

    it('should filter items by type', async () => {
      await createTestItem(db, testUser._id, {title: 'Link Item', type: ItemTypeEnum.link});
      const colId = await createTestCollection(db, testUser._id, 'Collection');
      await createTestItem(db, testUser._id, {title: 'Another Link', type: ItemTypeEnum.link});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {itemTypes: [ItemTypeEnum.link]},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.every((i: any) => i.details.type === ItemTypeEnum.link)).toBe(true);
    });

    it('should return empty array for empty IDs filter', async () => {
      await createTestItem(db, testUser._id, {title: 'Item'});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: []},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items).toEqual([]);
      expect(results.total).toBe(0);
    });

    it('should include feedback when requested', async () => {
      const itemId = await createTestItem(db, testUser._id, {title: 'Item with Feedback'});

      // Add feedback
      await db('item_feedback').insert({
        _id: `feedback_${testUser._id}_${itemId}`,
        userId: testUser._id,
        itemId,
        starredDate: new Date(),
        visitCount: 5,
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [itemId]},
          includes: {feedback: true},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(1);
      expect(results.items[0].feedback).toBeDefined();
      expect(results.items[0].feedback.starredDate).toBeDefined();
      expect(results.items[0].feedback.visitCount).toBe(5);
    });

    it('should include permissions when requested', async () => {
      const itemId = await createTestItem(db, testUser._id, {title: 'Item with Permissions'});

      // Create another user to share with
      const otherUser = await createTestUser('otherquery', `otherquery${Date.now()}@example.com`, 'OtherPass123!');

      // Add permission
      await db('user_perm').insert({
        _id: `${otherUser._id}_0-0_${itemId}`,
        userId: otherUser._id,
        itemId,
        permission: PermissionType.viewer,
        sharedByUserId: testUser._id,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [itemId]},
          includes: {permissions: true},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(1);
      expect(results.items[0].permissions).toBeDefined();
      expect(results.items[0].permissions.length).toBeGreaterThan(0);
    });

    it('should include collection relationships when requested', async () => {
      const colId = await createTestCollection(db, testUser._id, 'Parent Collection');
      const itemId = await createTestItem(db, testUser._id, {title: 'Child Item'});

      // Add relation
      await db('item_relation').insert({
        _id: `rel_${colId}_${itemId}`,
        itemId,
        collectionId: colId,
        itemType: ItemTypeEnum.link,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [itemId]},
          includes: {parentCollectionIds: true},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(1);
      expect(results.items[0].collectionIds).toBeDefined();
      expect(results.items[0].collectionIds).toContain(colId);
    });

    it('should sort by created date descending by default', async () => {
      // Create items with slight delay to ensure different timestamps
      const item1Id = await createTestItem(db, testUser._id, {title: 'First Item'});
      await new Promise((resolve) => setTimeout(resolve, 10));
      const item2Id = await createTestItem(db, testUser._id, {title: 'Second Item'});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [item1Id, item2Id]},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(2);
      // Newest first (descending)
      expect(results.items[0].itemId).toBe(item2Id);
      expect(results.items[1].itemId).toBe(item1Id);
    });

    it('should sort by name when requested', async () => {
      await createTestItem(db, testUser._id, {title: 'Zebra'});
      await createTestItem(db, testUser._id, {title: 'Apple'});
      await createTestItem(db, testUser._id, {title: 'Mango'});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          sort: {field: 'name', order: 'asc'},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBeGreaterThanOrEqual(3);
      // Check items are sorted alphabetically
      const names = results.items.map((i: any) => i.details.name || i.details.title);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should apply pagination correctly', async () => {
      // Create 5 items
      for (let i = 0; i < 5; i++) {
        await createTestItem(db, testUser._id, {title: `Paginated Item ${i}`});
      }

      const response1 = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          pagination: {limit: 2, offset: 0},
        });

      const results1 = expectQuerySuccess(response1);
      expect(results1.items.length).toBe(2);
      expect(results1.hasMore).toBe(true);

      const response2 = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          pagination: {limit: 2, offset: 2},
        });

      const results2 = expectQuerySuccess(response2);
      expect(results2.items.length).toBe(2);
    });

    it('should filter by URL', async () => {
      const targetUrl = 'https://example.com/specific-page';
      const targetItemId = await createTestItem(db, testUser._id, {
        title: 'Target Item',
        url: targetUrl,
      });
      await createTestItem(db, testUser._id, {
        title: 'Other Item',
        url: 'https://example.com/other',
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {urls: [targetUrl]},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(1);
      expect(results.items[0].itemId).toBe(targetItemId);
    });

    it('should return ItemInfoView format with details containing full item', async () => {
      const itemId = await createTestItem(db, testUser._id, {
        title: 'Format Test Item',
        url: 'https://example.com/format',
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [itemId]},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      expect(results.items.length).toBe(1);

      const item = results.items[0];
      // Check ItemInfoView structure
      expect(item.itemId).toBe(itemId);
      expect(item.details).toBeDefined();
      expect(item.details._id).toBe(itemId);
      expect(item.details.type).toBeDefined();
      expect(item.details.userId).toBe(testUser._id);
      expect(item.details.createdAt).toBeDefined();
      expect(item.details.updatedAt).toBeDefined();
    });
  });

  describe('POST /v3.0/item/query - edge cases', () => {
    it('should not return archived items by default', async () => {
      const activeItemId = await createTestItem(db, testUser._id, {title: 'Active Item'});
      const archivedItemId = await createTestItem(db, testUser._id, {title: 'Archived Item'});

      // Archive the item
      await db('item').where({_id: archivedItemId}).update({archived: true});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [activeItemId, archivedItemId]},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      const itemIds = results.items.map((i: any) => i.itemId);
      expect(itemIds).toContain(activeItemId);
      expect(itemIds).not.toContain(archivedItemId);
    });

    it('should not return hidden items', async () => {
      const visibleItemId = await createTestItem(db, testUser._id, {title: 'Visible Item'});
      const hiddenItemId = await createTestItem(db, testUser._id, {title: 'Hidden Item'});

      // Hide the item via feedback
      await db('item_feedback').insert({
        _id: `feedback_hidden_${testUser._id}_${hiddenItemId}`,
        userId: testUser._id,
        itemId: hiddenItemId,
        isHidden: true,
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [visibleItemId, hiddenItemId]},
          includes: {feedback: true},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      const itemIds = results.items.map((i: any) => i.itemId);
      expect(itemIds).toContain(visibleItemId);
      expect(itemIds).not.toContain(hiddenItemId);
    });

    it('should return archived items when archived filter is true', async () => {
      const activeItemId = await createTestItem(db, testUser._id, {title: 'Active Item'});
      const archivedItemId = await createTestItem(db, testUser._id, {title: 'Archived Item'});

      await db('item').where({_id: archivedItemId}).update({archived: true});

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [activeItemId, archivedItemId], archived: true},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      const itemIds = results.items.map((i: any) => i.itemId);
      expect(itemIds).toContain(archivedItemId);
      expect(itemIds).not.toContain(activeItemId);
    });

    it('should return hidden items when filtering by hidden feedback', async () => {
      const visibleItemId = await createTestItem(db, testUser._id, {title: 'Visible Item'});
      const hiddenItemId = await createTestItem(db, testUser._id, {title: 'Hidden Item'});

      await db('item_feedback').insert({
        _id: `feedback_hidden_filter_${testUser._id}_${hiddenItemId}`,
        userId: testUser._id,
        itemId: hiddenItemId,
        isHidden: true,
      });

      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .set(authHeaders)
        .send({
          mode: 'standard',
          filters: {ids: [visibleItemId, hiddenItemId], feedbackTypes: ['isHidden']},
          includes: {feedback: true},
          pagination: {limit: 50, offset: 0},
        });

      const results = expectQuerySuccess(response);
      const itemIds = results.items.map((i: any) => i.itemId);
      expect(itemIds).toContain(hiddenItemId);
      expect(itemIds).not.toContain(visibleItemId);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await getTestRequest()
        .post('/v3.0/item/query')
        .send({
          mode: 'standard',
          pagination: {limit: 50, offset: 0},
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe(403);
    });
  });
});
