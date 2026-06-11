import {KEY_DIL} from '@/templates/email.templates';
import {getTestRequest} from './setup/testServer';
import {createTestUser, createUniqueTestEmail, getAuthHeaders} from './setup/testAuth';
import {getTestDb} from './setup/testDb';
import {createTestCollection, createTestItem} from './setup/testHelpers';
import {ItemTypeEnum, UserType} from 'tset-sharedlib/shared.types';

describe('Post collection sharing integration', () => {
  const db = getTestDb();
  let poster: Awaited<ReturnType<typeof createTestUser>>;
  let posterHeaders: Record<string, string>;

  beforeEach(async () => {
    poster = await createTestUser(
      'postcollectionposter',
      createUniqueTestEmail('postcollectionposter'),
      'ItemPass123!',
      UserType.restricted,
    );
    posterHeaders = getAuthHeaders(poster.token!);
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

  it('does not create direct collection permissions when a collection is attached to a post', async () => {
    const friendUser = await createTestUser(
      'postcollectionfriend',
      createUniqueTestEmail('postcollectionfriend'),
      'ItemPass123!',
      UserType.admin,
    );
    const friendHeaders = getAuthHeaders(friendUser.token!);
    const collectionId = await createTestCollection(db, poster._id, 'Posted Shared Collection');

    await createConfirmedFriendship(poster._id, friendUser._id);

    const response = await getTestRequest()
      .post('/v3.0/post/create')
      .set(posterHeaders)
      .send({
        postType: 'post',
        data: {text: 'Sharing a collection'},
        attachedItems: [
          {
            id: 'attachment-1',
            type: 'libItem',
            itemId: collectionId,
            data: {
              _id: collectionId,
              type: 'col',
            },
          },
        ],
        sharedWith: [friendUser._id],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const permission = await db('user_perm').where({userId: friendUser._id, itemId: collectionId}).first();
    expect(permission).toBeUndefined();

    const sharedWithMe = await getTestRequest()
      .post('/v3.0/item/listSharedWithUser')
      .set(friendHeaders)
      .send({});

    expect(sharedWithMe.statusCode).toBe(200);
    expect(sharedWithMe.body.success).toBe(true);
    const sharedCollection = sharedWithMe.body.results.find((item: any) => item.itemId === collectionId);
    expect(sharedCollection).toBeUndefined();
  });

  it('does not create collection permissions when a post is updated to include a friend later', async () => {
    const friendUser = await createTestUser(
      'postcollectionupdate',
      createUniqueTestEmail('postcollectionupdate'),
      'ItemPass123!',
      UserType.admin,
    );
    const friendHeaders = getAuthHeaders(friendUser.token!);
    const collectionId = await createTestCollection(db, poster._id, 'Updated Shared Collection');

    await createConfirmedFriendship(poster._id, friendUser._id);

    const createResponse = await getTestRequest()
      .post('/v3.0/post/create')
      .set(posterHeaders)
      .send({
        postType: 'post',
        data: {text: 'Share later'},
        attachedItems: [
          {
            id: 'attachment-1',
            type: 'libItem',
            itemId: collectionId,
            data: {
              _id: collectionId,
              type: 'col',
            },
          },
        ],
        sharedWith: [],
      });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body.success).toBe(true);

    const postId = createResponse.body.results;

    const updateResponse = await getTestRequest()
      .post('/v3.0/post/updateSharedWith')
      .set(posterHeaders)
      .send({
        postId,
        sharedWith: [friendUser._id],
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.success).toBe(true);

    const permission = await db('user_perm').where({userId: friendUser._id, itemId: collectionId}).first();
    expect(permission).toBeUndefined();

    const sharedWithMe = await getTestRequest()
      .post('/v3.0/item/listSharedWithUser')
      .set(friendHeaders)
      .send({});

    expect(sharedWithMe.statusCode).toBe(200);
    expect(sharedWithMe.body.success).toBe(true);
    expect(sharedWithMe.body.results.some((item: any) => item.itemId === collectionId)).toBe(false);
  });

  it('does not create direct sharedWithMe entries for friend item attachments shared through a post', async () => {
    const friendUser = await createTestUser(
      'postitemfriend',
      createUniqueTestEmail('postitemfriend'),
      'ItemPass123!',
      UserType.admin,
    );
    const friendHeaders = getAuthHeaders(friendUser.token!);
    const itemId = await createTestItem(db, poster._id, {
      title: 'Posted Shared Item',
      type: ItemTypeEnum.link,
      url: 'https://example.com/post-item',
    });

    await createConfirmedFriendship(poster._id, friendUser._id);

    const response = await getTestRequest()
      .post('/v3.0/post/create')
      .set(posterHeaders)
      .send({
        postType: 'post',
        data: {text: 'Sharing an item'},
        attachedItems: [
          {
            id: 'attachment-1',
            type: 'libItem',
            itemId,
            data: {
              _id: itemId,
              type: 'link',
            },
          },
        ],
        sharedWith: [friendUser._id],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const permission = await db('user_perm').where({userId: friendUser._id, itemId}).first();
    expect(permission).toBeUndefined();

    const sharedWithMe = await getTestRequest()
      .post('/v3.0/item/listSharedWithUser')
      .set(friendHeaders)
      .send({});

    expect(sharedWithMe.statusCode).toBe(200);
    expect(sharedWithMe.body.success).toBe(true);
    expect(sharedWithMe.body.results.some((item: any) => item.itemId === itemId)).toBe(false);
  });

  it('lets a restricted recipient access and add a same-account item attachment shared through a post', async () => {
    const restrictedRecipient = await createTestUser(
      'postitemrestricted',
      createUniqueTestEmail('postitemrestricted'),
      'ItemPass123!',
      UserType.restricted,
    );
    const recipientHeaders = getAuthHeaders(restrictedRecipient.token!);
    const itemId = await createTestItem(db, poster._id, {
      title: 'Posted Shared Item For Restricted User',
      type: ItemTypeEnum.link,
      url: 'https://example.com/post-item-restricted',
    });

    await setUserAccountId(restrictedRecipient._id, poster.accountId!);

    const response = await getTestRequest()
      .post('/v3.0/post/create')
      .set(posterHeaders)
      .send({
        postType: 'post',
        data: {text: 'Sharing an item to restricted user'},
        attachedItems: [
          {
            id: 'attachment-1',
            type: 'libItem',
            itemId,
            data: {
              _id: itemId,
              type: 'link',
            },
          },
        ],
        sharedWith: [restrictedRecipient._id],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const sharedPermission = await db('user_perm').where({userId: restrictedRecipient._id, itemId}).first();
    expect(sharedPermission).toBeDefined();
    expect(sharedPermission.notInLibrary).toBe(false);

    const sharedWithMe = await getTestRequest()
      .post('/v3.0/item/listSharedWithUser')
      .set(recipientHeaders)
      .send({});

    expect(sharedWithMe.statusCode).toBe(200);
    expect(sharedWithMe.body.success).toBe(true);
    expect(sharedWithMe.body.results.some((item: any) => item.itemId === itemId)).toBe(true);

    const addResponse = await getTestRequest()
      .post('/v3.0/item/addToUserLibrary')
      .set(recipientHeaders)
      .send({itemIds: [itemId]});

    expect(addResponse.statusCode).toBe(200);
    expect(addResponse.body.success).toBe(true);

    const addedPermission = await db('user_perm').where({userId: restrictedRecipient._id, itemId}).first();
    expect(addedPermission).toBeDefined();
    expect(addedPermission.notInLibrary).toBe(false);
  });

  it('rejects sharing a post recipient-facing collection attachment when the poster only has viewer access', async () => {
    const ownerUser = await createTestUser(
      'postcollectionowner',
      createUniqueTestEmail('postcollectionowner'),
      'ItemPass123!',
      UserType.admin,
    );
    const friendUser = await createTestUser(
      'postreadonlyfriend',
      createUniqueTestEmail('postreadonlyfriend'),
      'ItemPass123!',
      UserType.admin,
    );
    const collectionId = await createTestCollection(db, ownerUser._id, 'Read Only Posted Collection');

    await setUserAccountId(ownerUser._id, poster.accountId!);
    await createConfirmedFriendship(poster._id, friendUser._id);

    await db('user_perm').insert({
      _id: `${poster._id}${KEY_DIL}${collectionId}`,
      userId: poster._id,
      itemId: collectionId,
      permission: 'viewer',
      sharedByUserId: ownerUser._id,
      createdAt: new Date(),
    });

    const response = await getTestRequest()
      .post('/v3.0/post/create')
      .set(posterHeaders)
      .send({
        postType: 'post',
        data: {text: 'Attempting to reshare a read only collection'},
        attachedItems: [
          {
            id: 'attachment-1',
            type: 'libItem',
            itemId: collectionId,
            data: {
              _id: collectionId,
              type: 'col',
            },
          },
        ],
        sharedWith: [friendUser._id],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/permission to share one or more attached library items/i);

    const permission = await db('user_perm').where({userId: friendUser._id, itemId: collectionId}).first();
    expect(permission).toBeUndefined();
  });
});