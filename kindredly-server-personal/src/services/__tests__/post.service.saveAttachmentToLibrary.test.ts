import {RequestContext} from '@/base/request_context';
import PostService from '@/services/post.service';
import {urlToKey} from 'tset-sharedlib/text.utils';

describe('PostService.saveAttachmentToLibrary', () => {
  let service: PostService;

  beforeEach(() => {
    service = new PostService();
    (service as any).posts = {
      findById: jest.fn(),
    };
    (service as any).itemService = {
      saveItem: jest.fn().mockResolvedValue({itemId: 'item-1'}),
    };
  });

  function makeCtx() {
    return new RequestContext({
      currentUserId: 'child-1',
      authUserId: 'child-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });
  }

  function makePost(bundleItem: Record<string, any>, postUserId = 'parent-1') {
    return {
      _id: 'post-1',
      userId: postUserId,
      sharedWith: ['child-1'],
      attachedItems: [
        {
          type: 'libItemBundle',
          bundleId: 'bundle-1',
          data: {item: bundleItem},
        },
      ],
    };
  }

  function makeLegacyNestedPost(bundleItem: Record<string, any>, postUserId = 'parent-1') {
    return {
      _id: 'post-1',
      userId: postUserId,
      sharedWith: ['child-1'],
      data: {
        attachedItems: [
          {
            type: 'libItemBundle',
            bundleId: 'bundle-1',
            data: {item: bundleItem},
          },
        ],
      },
    };
  }

  function makeEncryptedPostWithoutInlineBundleItem(postUserId = 'parent-1') {
    return {
      _id: 'post-1',
      userId: postUserId,
      sharedWith: ['child-1'],
      encInfo: {keys: [{id: 'k1'}]},
      attachedItems: [
        {
          type: 'libItemBundle',
          bundleId: 'bundle-1',
          data: {encrypted: 'ciphertext'},
        },
      ],
    };
  }

  it('saves directly for restricted library-only users when the sharer is an admin in-account', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: true},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockImplementation(async (userId: string) => {
      if (userId === 'parent-1') {
        return {_id: 'parent-1', accountId: 'acct-1', type: 'admin'} as any;
      }
      return {_id: 'child-1', accountId: 'acct-1', type: 'restricted'} as any;
    });
    (service as any).posts.findById.mockResolvedValue(makePost({url: 'https://example.com', name: 'Example'}));

    const result = await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      saveRequest: {
        details: {url: 'https://example.com', name: 'Edited'} as any,
        collectionIds: ['col-1'],
        quickShareUserIds: ['friend-1'],
        accessRequestId: 'req-1',
        targetUserId: 'someone-else',
      },
    });

    expect(result).toEqual({action: 'saved', itemId: 'item-1'});
    expect((service as any).itemService.saveItem).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        itemId: undefined,
        isNew: true,
        collectionIds: ['col-1'],
        quickShareUserIds: [],
        accessRequestId: undefined,
        targetUserId: undefined,
        tempAuthToken: undefined,
      }),
    );
    expect((service as any).itemService.saveItem).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        details: expect.objectContaining({
          url: 'https://example.com',
          key: urlToKey('https://example.com'),
          name: 'Edited',
          patterns: null,
        }),
      }),
    );
  });

  it('does not allow the caller to replace the shared attachment url or patterns', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: true},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockResolvedValue({
      _id: 'parent-1',
      accountId: 'acct-1',
      type: 'admin',
    } as any);
    (service as any).posts.findById.mockResolvedValue(
      makePost({
        url: 'https://example.com',
        name: 'Example',
        patterns: ['*.example.com/*'],
        type: 'link',
      }),
    );

    await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      saveRequest: {
        details: {
          url: 'https://attacker.example.com',
          key: 'https://attacker.example.com',
          patterns: ['*.attacker.example.com/*'],
          name: 'Retitled',
          type: 'note',
        } as any,
      },
    });

    expect((service as any).itemService.saveItem).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        details: expect.objectContaining({
          url: 'https://example.com',
          key: urlToKey('https://example.com'),
          patterns: ['*.example.com/*'],
          type: 'link',
          name: 'Retitled',
        }),
      }),
    );
  });

  it('returns request-required for restricted library-only users when a non-admin shared the post', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: true},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockResolvedValue({
      _id: 'parent-1',
      accountId: 'acct-1',
      type: 'restricted',
    } as any);
    (service as any).posts.findById.mockResolvedValue(makePost({url: 'https://example.com', name: 'Example'}));

    const result = await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      saveRequest: {
        details: {url: 'https://example.com'} as any,
      },
    });

    expect(result).toEqual({
      action: 'request-required',
      requestPrefill: expect.objectContaining({
        key: 'https://example.com',
        type: 'url',
        allowSwitchType: false,
      }),
    });
    expect((service as any).itemService.saveItem).not.toHaveBeenCalled();
  });

  it('falls back to an item-style request for pattern-only bundles', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: true},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockResolvedValue({
      _id: 'parent-1',
      accountId: 'acct-1',
      type: 'restricted',
    } as any);
    (service as any).posts.findById.mockResolvedValue(makePost({name: 'Example', patterns: ['*.example.com/*']}));

    const result = await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      saveRequest: {
        details: {patterns: ['*.example.com/*']} as any,
      },
    });

    expect(result).toEqual({
      action: 'request-required',
      requestPrefill: expect.objectContaining({
        key: 'post_attachment_bundle:post-1:bundle-1',
        type: 'item',
      }),
    });
  });

  it('does not apply the admin-sharer gate outside library-only mode', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: false},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockResolvedValue({
      _id: 'parent-1',
      accountId: 'acct-1',
      type: 'restricted',
    } as any);
    (service as any).posts.findById.mockResolvedValue(makePost({url: 'https://example.com', name: 'Example'}));

    const result = await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      saveRequest: {
        details: {url: 'https://example.com'} as any,
      },
    });

    expect(result).toEqual({action: 'saved', itemId: 'item-1'});
    expect((service as any).itemService.saveItem).toHaveBeenCalled();
  });

  it('finds shared bundle attachments stored under post.data.attachedItems', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: false},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockResolvedValue({
      _id: 'parent-1',
      accountId: 'acct-1',
      type: 'restricted',
    } as any);
    (service as any).posts.findById.mockResolvedValue(
      makeLegacyNestedPost({url: 'https://example.com', name: 'Example'}),
    );

    const result = await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      saveRequest: {
        details: {url: 'https://example.com'} as any,
      },
    });

    expect(result).toEqual({action: 'saved', itemId: 'item-1'});
    expect((service as any).itemService.saveItem).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        details: expect.objectContaining({
          url: 'https://example.com',
          key: urlToKey('https://example.com'),
        }),
      }),
    );
  });

  it('uses the client-provided bundle source for encrypted posts when inline item data is unavailable', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'child-1',
      type: 'restricted',
      options: {whitelistingEnabled: false},
    } as any);
    jest.spyOn(ctx, 'getUserById').mockResolvedValue({
      _id: 'parent-1',
      accountId: 'acct-1',
      type: 'restricted',
    } as any);
    (service as any).posts.findById.mockResolvedValue(makeEncryptedPostWithoutInlineBundleItem());

    const result = await service.saveAttachmentToLibrary(ctx, {
      postId: 'post-1',
      bundleId: 'bundle-1',
      bundleSource: {
        url: 'https://example.com',
        name: 'Example',
        patterns: ['*.example.com/*'],
        type: 'link',
      } as any,
      saveRequest: {
        details: {url: 'https://example.com', name: 'Edited'} as any,
      },
    });

    expect(result).toEqual({action: 'saved', itemId: 'item-1'});
    expect((service as any).itemService.saveItem).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        details: expect.objectContaining({
          url: 'https://example.com',
          key: urlToKey('https://example.com'),
          patterns: ['*.example.com/*'],
          type: 'link',
          name: 'Edited',
        }),
      }),
    );
  });
});
