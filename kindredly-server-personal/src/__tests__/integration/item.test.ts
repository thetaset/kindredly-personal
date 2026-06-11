import {getTestRequest} from './setup/testServer';
import {createTestUser, createUniqueTestEmail, getAuthHeaders} from './setup/testAuth';
import {getTestDb} from './setup/testDb';
import {createTestCollection, createTestItem, expectValidId, expectValidTimestamp} from './setup/testHelpers';
import {ItemTypeEnum, UserType} from 'tset-sharedlib/shared.types';
import {KEY_DIL} from '@/templates/email.templates';
import {v4 as uuidv4} from 'uuid';

describe('Item Routes Integration Tests', () => {
  const db = getTestDb();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authHeaders: Record<string, string>;

  beforeEach(async () => {
    testUser = await createTestUser('itemuser', createUniqueTestEmail('itemuser'), 'ItemPass123!', UserType.restricted);
    authHeaders = getAuthHeaders(testUser.token!);
  });

  async function createConfirmedFriendship(userId: string, friendUserId: string) {
    const now = new Date();
    await db('friend').insert([
      {
        _id: `${userId}${KEY_DIL}${friendUserId}`,
        userId,
        friendUserId,
        requester: false,
        confirmed: true,
        denied: false,
        createdAt: now,
      },
      {
        _id: `${friendUserId}${KEY_DIL}${userId}`,
        userId: friendUserId,
        friendUserId: userId,
        requester: true,
        confirmed: true,
        denied: false,
        createdAt: now,
      },
    ]);
  }

  async function setUserAccountId(userId: string, accountId: string) {
    await db('user').where({_id: userId}).update({accountId});
  }

  describe('POST /v3.0/item/save', () => {
    it('should save a new item', async () => {
      const response = await getTestRequest()
        .post('/v3.0/item/save')
        .set(authHeaders)
        .send({
          details: {
            url: 'https://example.com/article',
            name: 'Test Article',
            type: ItemTypeEnum.link,
            content: {summary: 'Test summary'},
          },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results?.itemId).toBeDefined();
      expectValidId(response.body.results.itemId);

      // Verify item in database
      const item = await db('item').where({_id: response.body.results.itemId}).first();
      expect(item).toBeDefined();
      expect(item.userId).toBe(testUser._id);
      expect(item.url).toBe('https://example.com/article');
      expect(item.name).toBe('Test Article');
    });

    it('should update an existing item when saving by item id', async () => {
      const url = 'https://example.com/duplicate';

      // Create first item
      const firstResponse = await getTestRequest()
        .post('/v3.0/item/save')
        .set(authHeaders)
        .send({
          details: {
            url,
            name: 'Original Title',
            type: ItemTypeEnum.link,
          },
        });

      const firstId = firstResponse.body.results.itemId;

      // Save again with the same item id
      const secondResponse = await getTestRequest()
        .post('/v3.0/item/save')
        .set(authHeaders)
        .send({
          itemId: firstId,
          details: {
            url,
            name: 'Updated Title',
            type: ItemTypeEnum.link,
          },
        });

      expect(secondResponse.statusCode).toBe(200);
      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.results.itemId).toBe(firstId);

      const updatedItem = await db('item').where({_id: firstId}).first();
      expect(updatedItem).toBeDefined();
      expect(updatedItem.name).toBe('Updated Title');
    });

    it('should reject saving item without authentication', async () => {
      const response = await getTestRequest()
        .post('/v3.0/item/save')
        .send({
          details: {
            url: 'https://example.com/article',
            name: 'Test Article',
            type: ItemTypeEnum.link,
          },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe(403);
    });
  });

  describe('POST /v3.0/item/infoById', () => {
    it('should retrieve item by ID', async () => {
      const itemId = await createTestItem(db, testUser._id, {
        url: 'https://example.com/test',
        title: 'Test Item',
        type: ItemTypeEnum.link,
      });

      const response = await getTestRequest().post('/v3.0/item/infoById').set(authHeaders).send({itemId});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results.itemId).toBe(itemId);
      expect(response.body.results.details.url).toBe('https://example.com/test');
      expectValidTimestamp(response.body.results.details.createdAt);
      expectValidTimestamp(response.body.results.details.updatedAt);
    });

    it('should return an error payload for non-existent item', async () => {
      const response = await getTestRequest()
        .post('/v3.0/item/infoById')
        .set(authHeaders)
        .send({itemId: 'i_nonexistent'});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/item not found/i);
    });

    it("should return an error payload for another user's private item", async () => {
      // Create another user and their item
      const otherUser = await createTestUser('otheruser', createUniqueTestEmail('otheruser'), 'OtherPass123!');
      const otherItemId = await createTestItem(db, otherUser._id, {
        title: 'Other User Item',
      });

      const response = await getTestRequest().post('/v3.0/item/infoById').set(authHeaders).send({itemId: otherItemId});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /v3.0/item/delete', () => {
    it('should allow an owner to delete their own item', async () => {
      const itemId = await createTestItem(db, testUser._id, {
        title: 'Item to Delete',
      });

      const response = await getTestRequest().post('/v3.0/item/delete').set(authHeaders).send({itemId});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const item = await db('item').where({_id: itemId}).first();
      expect(item).toBeUndefined();
    });

    it('should delete item by ID for admins', async () => {
      const adminUser = await createTestUser(
        'adminitemuser',
        createUniqueTestEmail('admin-item'),
        'ItemPass123!',
        UserType.admin,
      );
      const adminHeaders = getAuthHeaders(adminUser.token!);
      const itemId = await createTestItem(db, adminUser._id, {
        title: 'Item to Delete',
      });

      const response = await getTestRequest().post('/v3.0/item/delete').set(adminHeaders).send({itemId});

      expect(response.statusCode).toBe(200);

      // Verify item deleted from database
      const item = await db('item').where({_id: itemId}).first();
      expect(item).toBeUndefined();
    });

    it('should return error when deleting non-existent item', async () => {
      const adminUser = await createTestUser(
        'adminmissingitem',
        createUniqueTestEmail('admin-missing'),
        'ItemPass123!',
        UserType.admin,
      );
      const adminHeaders = getAuthHeaders(adminUser.token!);

      const response = await getTestRequest()
        .post('/v3.0/item/delete')
        .set(adminHeaders)
        .send({itemId: 'i_nonexistent'});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /v3.0/item/removeFromUserLibrary', () => {
    it('should hide a restricted user owner item from library by writing the owner override row', async () => {
      const ownerItemId = `i_${uuidv4()}`;
      await db('item').insert({
        _id: ownerItemId,
        userId: testUser._id,
        name: 'Owned Classified Item',
        type: ItemTypeEnum.link,
        url: `https://example.com/${ownerItemId}`,
        useCriteria: db.raw('?::json', [JSON.stringify(['eduval_fun'])]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/removeFromUserLibrary')
        .set(authHeaders)
        .send({itemIds: [ownerItemId]});

      expect(response.statusCode).toBe(200);

      const permission = await db('user_perm').where({userId: testUser._id, itemId: ownerItemId}).first();
      expect(permission).toBeDefined();
      expect(permission.permission).toBeNull();
      expect(permission.notInLibrary).toBe(true);
    });

    it('should hide a classified item from the restricted user library without deleting it', async () => {
      const adminUser = await createTestUser(
        'itemhideowner',
        createUniqueTestEmail('itemhideowner'),
        'ItemPass123!',
        UserType.admin,
      );
      const itemId = `i_${uuidv4()}`;
      await db('item').insert({
        _id: itemId,
        userId: adminUser._id,
        name: 'Classified Item',
        type: ItemTypeEnum.link,
        url: `https://example.com/${itemId}`,
        useCriteria: db.raw('?::json', [JSON.stringify(['eduval_educational'])]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db('user_perm').insert({
        _id: `${testUser._id}_0-0_${itemId}`,
        userId: testUser._id,
        itemId,
        permission: 'viewer',
        sharedByUserId: adminUser._id,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/removeFromUserLibrary')
        .set(authHeaders)
        .send({itemIds: [itemId]});

      expect(response.statusCode).toBe(200);

      const permission = await db('user_perm').where({userId: testUser._id, itemId}).first();
      expect(permission).toBeDefined();
      expect(permission.notInLibrary).toBe(true);

      const item = await db('item').where({_id: itemId}).first();
      expect(item).toBeDefined();
      expect(item.deleted).not.toBe(true);
    });

    it('should hide an inherited classified item by writing a direct library override row', async () => {
      const adminUser = await createTestUser(
        'itemhideparent',
        createUniqueTestEmail('itemhideparent'),
        'ItemPass123!',
        UserType.admin,
      );
      const collectionId = await createTestCollection(db, adminUser._id, 'Shared Parent');
      const itemId = `i_${uuidv4()}`;

      await db('item').insert({
        _id: itemId,
        userId: adminUser._id,
        name: 'Inherited Classified Item',
        type: ItemTypeEnum.link,
        url: `https://example.com/${itemId}`,
        useCriteria: db.raw('?::json', [JSON.stringify(['eduval_fun'])]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db('user_perm').insert({
        _id: `${testUser._id}_0-0_${collectionId}`,
        userId: testUser._id,
        itemId: collectionId,
        permission: 'viewer',
        sharedByUserId: adminUser._id,
        createdAt: new Date(),
      });

      await db('item_relation').insert({
        _id: `rel_${collectionId}_${itemId}`,
        itemId,
        collectionId,
        itemType: ItemTypeEnum.link,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/removeFromUserLibrary')
        .set(authHeaders)
        .send({itemIds: [itemId]});

      expect(response.statusCode).toBe(200);

      const permission = await db('user_perm').where({userId: testUser._id, itemId}).first();
      expect(permission).toBeDefined();
      expect(permission.permission).toBeNull();
      expect(permission.notInLibrary).toBe(true);
    });

    it('should reject hiding an unclassified item', async () => {
      const adminUser = await createTestUser(
        'itemhideblocked',
        createUniqueTestEmail('itemhideblocked'),
        'ItemPass123!',
        UserType.admin,
      );
      const itemId = `i_${uuidv4()}`;
      await db('item').insert({
        _id: itemId,
        userId: adminUser._id,
        name: 'Unclassified Item',
        type: ItemTypeEnum.link,
        url: `https://example.com/${itemId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db('user_perm').insert({
        _id: `${testUser._id}_0-0_${itemId}`,
        userId: testUser._id,
        itemId,
        permission: 'viewer',
        sharedByUserId: adminUser._id,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/removeFromUserLibrary')
        .set(authHeaders)
        .send({itemIds: [itemId]});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not eligible/i);

      const permission = await db('user_perm').where({userId: testUser._id, itemId}).first();
      expect(permission).toBeDefined();
      expect(permission.notInLibrary).not.toBe(true);
    });

    it('should not partially hide items when one item in the batch is ineligible', async () => {
      const adminUser = await createTestUser(
        'itemhidebatch',
        createUniqueTestEmail('itemhidebatch'),
        'ItemPass123!',
        UserType.admin,
      );
      const eligibleItemId = `i_${uuidv4()}`;
      const blockedItemId = `i_${uuidv4()}`;

      await db('item').insert([
        {
          _id: eligibleItemId,
          userId: adminUser._id,
          name: 'Eligible Item',
          type: ItemTypeEnum.link,
          url: `https://example.com/${eligibleItemId}`,
          useCriteria: db.raw('?::json', [JSON.stringify(['eduval_educational'])]),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: blockedItemId,
          userId: adminUser._id,
          name: 'Blocked Item',
          type: ItemTypeEnum.link,
          url: `https://example.com/${blockedItemId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await db('user_perm').insert([
        {
          _id: `${testUser._id}_0-0_${eligibleItemId}`,
          userId: testUser._id,
          itemId: eligibleItemId,
          permission: 'viewer',
          sharedByUserId: adminUser._id,
          createdAt: new Date(),
        },
        {
          _id: `${testUser._id}_0-0_${blockedItemId}`,
          userId: testUser._id,
          itemId: blockedItemId,
          permission: 'viewer',
          sharedByUserId: adminUser._id,
          createdAt: new Date(),
        },
      ]);

      const response = await getTestRequest()
        .post('/v3.0/item/removeFromUserLibrary')
        .set(authHeaders)
        .send({itemIds: [eligibleItemId, blockedItemId]});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not eligible/i);

      const eligiblePermission = await db('user_perm').where({userId: testUser._id, itemId: eligibleItemId}).first();
      const blockedPermission = await db('user_perm').where({userId: testUser._id, itemId: blockedItemId}).first();

      expect(eligiblePermission).toBeDefined();
      expect(eligiblePermission.notInLibrary).not.toBe(true);
      expect(blockedPermission).toBeDefined();
      expect(blockedPermission.notInLibrary).not.toBe(true);
    });
  });

  describe('Friend collection share outside library', () => {
    it('creates a viewer permission with notInLibrary when forceViewerForCrossAccount is requested', async () => {
      const friendUser = await createTestUser(
        'collectionfriend',
        createUniqueTestEmail('collectionfriend'),
        'ItemPass123!',
        UserType.admin,
      );
      const collectionId = await createTestCollection(db, testUser._id, 'Friend Shared Collection');

      await createConfirmedFriendship(testUser._id, friendUser._id);

      const response = await getTestRequest()
        .post('/v3.0/item/shareWithUsers')
        .set(authHeaders)
        .send({
          itemId: collectionId,
          userIds: [friendUser._id],
          permission: 'editor',
          notInLibrary: true,
          forceViewerForCrossAccount: true,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const permission = await db('user_perm').where({userId: friendUser._id, itemId: collectionId}).first();
      expect(permission).toBeDefined();
      expect(permission.permission).toBe('viewer');
      expect(permission.notInLibrary).toBe(true);
      expect(permission.sharedByUserId).toBe(testUser._id);
    });

    it('returns notInLibrary friend-shared collections from sharedWithMe and supports filtering by sharer', async () => {
      const friendUser = await createTestUser(
        'collectionfriendfilter',
        createUniqueTestEmail('collectionfriendfilter'),
        'ItemPass123!',
        UserType.admin,
      );
      const otherUser = await createTestUser(
        'collectionotherfilter',
        createUniqueTestEmail('collectionotherfilter'),
        'ItemPass123!',
        UserType.admin,
      );
      const collectionId = await createTestCollection(db, testUser._id, 'Filtered Shared Collection');
      const otherCollectionId = await createTestCollection(db, otherUser._id, 'Other Shared Collection');
      const friendHeaders = getAuthHeaders(friendUser.token!);

      await createConfirmedFriendship(testUser._id, friendUser._id);
      await createConfirmedFriendship(otherUser._id, friendUser._id);

      await db('user_perm').insert([
        {
          _id: `${friendUser._id}${KEY_DIL}${collectionId}`,
          userId: friendUser._id,
          itemId: collectionId,
          permission: 'viewer',
          sharedByUserId: testUser._id,
          notInLibrary: true,
          createdAt: new Date(),
        },
        {
          _id: `${friendUser._id}${KEY_DIL}${otherCollectionId}`,
          userId: friendUser._id,
          itemId: otherCollectionId,
          permission: 'viewer',
          sharedByUserId: otherUser._id,
          notInLibrary: true,
          createdAt: new Date(),
        },
      ]);

      const response = await getTestRequest()
        .post('/v3.0/item/listSharedWithUser')
        .set(friendHeaders)
        .send({sharedByUserId: testUser._id});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].itemId).toBe(collectionId);
      expect(response.body.results[0].details.sharedByUserId).toBe(testUser._id);
      expect(response.body.results[0].details.notInLibrary).toBe(true);
    });

    it('adds a shared collection into the recipient library by clearing notInLibrary', async () => {
      const friendUser = await createTestUser(
        'collectionfriendadd',
        createUniqueTestEmail('collectionfriendadd'),
        'ItemPass123!',
        UserType.admin,
      );
      const collectionId = await createTestCollection(db, testUser._id, 'Add Shared Collection');
      const friendHeaders = getAuthHeaders(friendUser.token!);

      await createConfirmedFriendship(testUser._id, friendUser._id);

      await db('user_perm').insert({
        _id: `${friendUser._id}${KEY_DIL}${collectionId}`,
        userId: friendUser._id,
        itemId: collectionId,
        permission: 'viewer',
        sharedByUserId: testUser._id,
        notInLibrary: true,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/collection/addToUserLibrary')
        .set(friendHeaders)
        .send({collectionIds: [collectionId]});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const permission = await db('user_perm').where({userId: friendUser._id, itemId: collectionId}).first();
      expect(permission).toBeDefined();
      expect(permission.permission).toBe('viewer');
      expect(permission.notInLibrary).toBe(false);
    });

    it('adds a shared item into the recipient library by clearing notInLibrary', async () => {
      const friendUser = await createTestUser(
        'itemfriendadd',
        createUniqueTestEmail('itemfriendadd'),
        'ItemPass123!',
        UserType.admin,
      );
      const itemId = await createTestItem(db, testUser._id, 'Add Shared Item');
      const friendHeaders = getAuthHeaders(friendUser.token!);

      await createConfirmedFriendship(testUser._id, friendUser._id);

      await db('user_perm').insert({
        _id: `${friendUser._id}${KEY_DIL}${itemId}`,
        userId: friendUser._id,
        itemId,
        permission: 'viewer',
        sharedByUserId: testUser._id,
        notInLibrary: true,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/addToUserLibrary')
        .set(friendHeaders)
        .send({itemIds: [itemId]});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const permission = await db('user_perm').where({userId: friendUser._id, itemId}).first();
      expect(permission).toBeDefined();
      expect(permission.permission).toBe('viewer');
      expect(permission.notInLibrary).toBe(false);
    });

    it('rejects re-sharing when the current user only has viewer access', async () => {
      const ownerUser = await createTestUser(
        'collectionownerreadonly',
        createUniqueTestEmail('collectionownerreadonly'),
        'ItemPass123!',
        UserType.admin,
      );
      const friendUser = await createTestUser(
        'collectiontargetreadonly',
        createUniqueTestEmail('collectiontargetreadonly'),
        'ItemPass123!',
        UserType.admin,
      );
      const itemId = await createTestItem(db, ownerUser._id, {
        url: 'https://example.com/viewer-share-denied',
        title: 'Viewer Share Denied',
        type: ItemTypeEnum.link,
      });

      await setUserAccountId(ownerUser._id, testUser.accountId!);
      await createConfirmedFriendship(testUser._id, friendUser._id);

      await db('user_perm').insert({
        _id: `${testUser._id}${KEY_DIL}${itemId}`,
        userId: testUser._id,
        itemId,
        permission: 'viewer',
        sharedByUserId: ownerUser._id,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/shareWithUsers')
        .set(authHeaders)
        .send({
          itemId,
          userIds: [friendUser._id],
          permission: 'viewer',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/permission to share this item/i);

      const permission = await db('user_perm').where({userId: friendUser._id, itemId}).first();
      expect(permission).toBeUndefined();
    });

    it('rejects publishing a collection when the current user only has viewer access', async () => {
      const ownerUser = await createTestUser(
        'publishownerreadonly',
        createUniqueTestEmail('publishownerreadonly'),
        'ItemPass123!',
        UserType.admin,
      );
      const collectionId = await createTestCollection(db, ownerUser._id, 'Publish Viewer Denied');

      await setUserAccountId(ownerUser._id, testUser.accountId!);

      await db('user_perm').insert({
        _id: `${testUser._id}${KEY_DIL}${collectionId}`,
        userId: testUser._id,
        itemId: collectionId,
        permission: 'viewer',
        sharedByUserId: ownerUser._id,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/published/publishCollection')
        .set(authHeaders)
        .send({itemId: collectionId});

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/permission to publish this item/i);
    });
  });

  describe('POST /v3.0/item/addToCollections', () => {
    it('rejects adding an item when access is viewer-only through a shared parent collection', async () => {
      const ownerUser = await createTestUser(
        'itemparentowner',
        createUniqueTestEmail('itemparentowner'),
        'ItemPass123!',
        UserType.admin,
      );
      const sharedCollectionId = await createTestCollection(db, ownerUser._id, 'Shared Read Only Parent');
      const editableCollectionId = await createTestCollection(db, testUser._id, 'My Editable Collection');
      const itemId = await createTestItem(db, ownerUser._id, {
        url: 'https://example.com/inherited-viewer-item',
        title: 'Inherited Viewer Item',
        type: ItemTypeEnum.link,
      });

      await db('user_perm').insert({
        _id: `${testUser._id}${KEY_DIL}${sharedCollectionId}`,
        userId: testUser._id,
        itemId: sharedCollectionId,
        permission: 'viewer',
        sharedByUserId: ownerUser._id,
        createdAt: new Date(),
      });

      await db('item_relation').insert({
        _id: `rel_${sharedCollectionId}_${itemId}`,
        itemId,
        collectionId: sharedCollectionId,
        itemType: ItemTypeEnum.link,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/addToCollections')
        .set(authHeaders)
        .send({
          itemId,
          collectionIds: [editableCollectionId],
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/permission to edit this item/i);

      const relation = await db('item_relation')
        .where({itemId, collectionId: editableCollectionId})
        .first();
      expect(relation).toBeUndefined();
    });

    it('allows adding an item when access is editor through a shared parent collection', async () => {
      const ownerUser = await createTestUser(
        'itemparenteditor',
        createUniqueTestEmail('itemparenteditor'),
        'ItemPass123!',
        UserType.admin,
      );
      const sharedCollectionId = await createTestCollection(db, ownerUser._id, 'Shared Editable Parent');
      const editableCollectionId = await createTestCollection(db, testUser._id, 'My Other Editable Collection');
      const itemId = await createTestItem(db, ownerUser._id, {
        url: 'https://example.com/inherited-editor-item',
        title: 'Inherited Editor Item',
        type: ItemTypeEnum.link,
      });

      await db('user_perm').insert({
        _id: `${testUser._id}${KEY_DIL}${sharedCollectionId}`,
        userId: testUser._id,
        itemId: sharedCollectionId,
        permission: 'editor',
        sharedByUserId: ownerUser._id,
        createdAt: new Date(),
      });

      await db('item_relation').insert({
        _id: `rel_${sharedCollectionId}_${itemId}`,
        itemId,
        collectionId: sharedCollectionId,
        itemType: ItemTypeEnum.link,
        createdAt: new Date(),
      });

      const response = await getTestRequest()
        .post('/v3.0/item/addToCollections')
        .set(authHeaders)
        .send({
          itemId,
          collectionIds: [editableCollectionId],
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const relation = await db('item_relation')
        .where({itemId, collectionId: editableCollectionId})
        .first();
      expect(relation).toBeDefined();
      expect(relation.userId).toBe(testUser._id);
    });
  });
});
