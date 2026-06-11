import {RequestContext} from '@/base/request_context';
import UserService from '@/services/user.service';
import {
  OFFICIAL_PUBLISHER_ABOUT,
  OFFICIAL_PUBLISHER_FULL_NAME,
  OFFICIAL_PUBLISHER_PUBLIC_ID,
  OFFICIAL_PUBLISHER_USERNAME,
} from 'tset-sharedlib/constants';

function makeCtx(publicId: string | null) {
  return {
    getCurrentUser: jest.fn().mockResolvedValue({
      _id: 'user-1',
      publicId,
    }),
  } as unknown as RequestContext;
}

describe('UserService official publisher identity', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    (service as any).usersPublic = {
      findById: jest.fn(),
    };
  });

  it('returns a synthesized public profile for the reserved official id', async () => {
    const profile = await service.getUserPublicProfileById(OFFICIAL_PUBLISHER_PUBLIC_ID);

    expect(profile).toEqual(
      expect.objectContaining({
        _id: OFFICIAL_PUBLISHER_PUBLIC_ID,
        username: OFFICIAL_PUBLISHER_USERNAME,
        fullName: OFFICIAL_PUBLISHER_FULL_NAME,
        about: OFFICIAL_PUBLISHER_ABOUT,
        enabled: true,
        verifiedType: 'official',
      }),
    );
    expect((service as any).usersPublic.findById).not.toHaveBeenCalled();
  });

  it('does not resolve the reserved official id to a backing user row', async () => {
    (service as any).userRepo = {
      where: jest.fn(),
    };

    const result = await service.getUserByPublicId(OFFICIAL_PUBLISHER_PUBLIC_ID);

    expect(result).toBeNull();
    expect((service as any).userRepo.where).not.toHaveBeenCalled();
  });

  it('rejects public profile updates when a reserved official id is encountered', async () => {
    await expect(
      service.updateUserPublicProfile(makeCtx(OFFICIAL_PUBLISHER_PUBLIC_ID), {
        username: 'someoneelse',
      }),
    ).rejects.toThrow('Reserved public profile id');
  });
});