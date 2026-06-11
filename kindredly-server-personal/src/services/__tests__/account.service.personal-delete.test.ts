import AccountService from '@/services/account.service';

describe('AccountService.deleteAccountForPersonalServer', () => {
  it('requires the DELETE confirmation text', async () => {
    const service = new AccountService({} as any);
    const ctx = {
      accountId: 'ac_1',
      isAdmin: jest.fn().mockResolvedValue(true),
    } as any;

    await expect(service.deleteAccountForPersonalServer(ctx, 'nope')).rejects.toThrow(
      'Confirmation text did not match',
    );
  });

  it('soft deletes restricted users before admin users and marks the account deleted', async () => {
    const service = new AccountService({} as any);
    const updateWithId = jest.fn().mockResolvedValue(true);
    const listByAccountId = jest.fn().mockResolvedValue([
      {_id: 'u_restricted', type: 'restricted', deleted: false},
      {_id: 'u_admin', type: 'admin', deleted: false},
      {_id: 'u_deleted', type: 'admin', deleted: true},
    ]);
    const softDeleteUser = jest.fn().mockResolvedValue(true);

    (service as any).accounts = {updateWithId};
    (service as any).users = {listByAccountId};
    (service as any).userService = {softDeleteUser};

    const ctx = {
      accountId: 'ac_1',
      isAdmin: jest.fn().mockResolvedValue(true),
    } as any;

    await expect(service.deleteAccountForPersonalServer(ctx, 'DELETE')).resolves.toBe(true);

    expect(updateWithId).toHaveBeenCalledWith('ac_1', {deleted: true});
    expect(listByAccountId).toHaveBeenCalledWith('ac_1');
    expect(softDeleteUser.mock.calls).toEqual([
      [ctx, 'u_restricted'],
      [ctx, 'u_admin'],
    ]);
  });
});