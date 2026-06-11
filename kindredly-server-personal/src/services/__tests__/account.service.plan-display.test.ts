import AccountService from '@/services/account.service';

describe('AccountService.getAccountDetails', () => {
  it('returns display-safe plan fields from the canonical policy', async () => {
    const service = new AccountService({} as any);

    jest.spyOn(service, '_getAccountById').mockResolvedValue({
      _id: 'ac_1',
      accountType: 'plus',
      maxUsers: 5,
      maxCollections: 250,
      maxItemsPerCollection: 1000,
    } as any);

    const result = await service.getAccountDetails({accountId: 'ac_1'} as any);

    expect(result).toEqual(
      expect.objectContaining({
        _id: 'ac_1',
        accountType: 'plus',
        maxUsers: 10,
        maxCollections: 5000,
        maxItemsPerCollection: 50000,
      }),
    );
  });

  it('treats legacy superplus accounts as plus-equivalent for display limits', async () => {
    const service = new AccountService({} as any);

    jest.spyOn(service, '_getAccountById').mockResolvedValue({
      _id: 'ac_2',
      accountType: 'superplus',
      maxUsers: 5,
      maxCollections: 250,
      maxItemsPerCollection: 1000,
    } as any);

    const result = await service.getAccountDetails({accountId: 'ac_2'} as any);

    expect(result).toEqual(
      expect.objectContaining({
        _id: 'ac_2',
        accountType: 'plus',
        maxUsers: 10,
        maxCollections: 5000,
        maxItemsPerCollection: 50000,
      }),
    );
  });
});
