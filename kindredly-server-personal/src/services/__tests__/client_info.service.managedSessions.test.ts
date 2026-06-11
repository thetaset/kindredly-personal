import ClientInfoService from '../client_info.service';

describe('ClientInfoService.listManagedSessions', () => {
  it('merges client info with live SSE state for supported managed clients', async () => {
    const repo = {
      listByUserId: jest.fn().mockResolvedValue([
        {
          clientId: 'ios-1',
          clientVersion: '1',
          appId: 'kindredly',
          appType: 'ios',
          appVersion: '1.2.3',
          deviceName: 'Alice iPhone',
          deviceType: 'phone',
          lastSeen: new Date('2026-05-19T10:00:00.000Z'),
          lastLogin: new Date('2026-05-19T09:00:00.000Z'),
        },
        {
          clientId: 'electron-1',
          clientVersion: '1',
          appId: 'kindredly',
          appType: 'electron',
          appVersion: '1.2.3',
          lastSeen: new Date('2026-05-19T10:00:00.000Z'),
          lastLogin: new Date('2026-05-19T09:00:00.000Z'),
        },
      ]),
    };
    const sseManager = {
      getConnectionDetailsForUser: jest.fn().mockResolvedValue([
        {
          clientId: 'ios-1',
          userId: 'child-1',
          serverId: 'server-1',
          connectedAt: new Date('2026-05-19T10:05:00.000Z'),
          hasHeartbeat: true,
          lastHeartbeat: '2026-05-19T10:05:30.000Z',
        },
      ]),
    };
    const ctx = {
      verifySelfOrAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ClientInfoService(repo as any, sseManager as any);
    const results = await service.listManagedSessions(ctx as any, 'child-1');

    expect(ctx.verifySelfOrAdmin).toHaveBeenCalledWith('child-1');
    expect(results).toEqual([
      expect.objectContaining({
        clientId: 'ios-1',
        appType: 'ios',
        status: 'online-unverified',
        supportsRemoteCommands: true,
        remoteCommandReady: true,
        lastHeartbeatAt: '2026-05-19T10:05:30.000Z',
      }),
    ]);
  });

  it('marks recently seen supported clients as stale when not currently connected', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-19T10:05:00.000Z').getTime());
    const repo = {
      listByUserId: jest.fn().mockResolvedValue([
        {
          clientId: 'android-1',
          clientVersion: '1',
          appId: 'kindredly',
          appType: 'android',
          appVersion: '1.2.3',
          lastSeen: new Date('2026-05-19T09:58:00.000Z'),
          lastLogin: new Date('2026-05-19T09:00:00.000Z'),
        },
      ]),
    };
    const sseManager = {
      getConnectionDetailsForUser: jest.fn().mockResolvedValue([]),
    };
    const ctx = {
      verifySelfOrAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ClientInfoService(repo as any, sseManager as any);
    const results = await service.listManagedSessions(ctx as any, 'child-2');

    expect(results[0]).toEqual(
      expect.objectContaining({
        clientId: 'android-1',
        status: 'stale',
        remoteCommandReady: false,
      }),
    );

    nowSpy.mockRestore();
  });

  it('matches prefixed SSE connection ids back to raw managed client ids', async () => {
    const repo = {
      listByUserId: jest.fn().mockResolvedValue([
        {
          clientId: 'android-2',
          clientVersion: '1',
          appId: 'kindredly',
          appType: 'android',
          appVersion: '1.2.3',
          lastSeen: new Date('2026-05-19T10:00:00.000Z'),
          lastLogin: new Date('2026-05-19T09:00:00.000Z'),
        },
      ]),
    };
    const sseManager = {
      getConnectionDetailsForUser: jest.fn().mockResolvedValue([
        {
          clientId: 'child-2-android-2',
          userId: 'child-2',
          serverId: 'server-1',
          connectedAt: new Date('2026-05-19T10:05:00.000Z'),
          hasHeartbeat: true,
          lastHeartbeat: '2026-05-19T10:05:30.000Z',
        },
      ]),
    };
    const ctx = {
      verifySelfOrAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ClientInfoService(repo as any, sseManager as any);
    const results = await service.listManagedSessions(ctx as any, 'child-2');

    expect(results).toEqual([
      expect.objectContaining({
        clientId: 'android-2',
        status: 'online-unverified',
        remoteCommandReady: true,
        lastHeartbeatAt: '2026-05-19T10:05:30.000Z',
      }),
    ]);
  });

  it('sends encrypted debug toasts only to selected live supported clients', async () => {
    const repo = {
      listByUserId: jest.fn().mockResolvedValue([
        {
          clientId: 'ios-1',
          appType: 'ios',
        },
        {
          clientId: 'electron-1',
          appType: 'electron',
        },
        {
          clientId: 'android-1',
          appType: 'android',
        },
      ]),
    };
    const sseManager = {
      getConnectionDetailsForUser: jest
        .fn()
        .mockResolvedValue([{clientId: 'child-1-ios-1'}, {clientId: 'child-1-android-1'}]),
      broadcastToClient: jest.fn().mockResolvedValue(undefined),
    };
    const ctx = {
      currentUserId: 'child-1',
      verifySelfOrAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ClientInfoService(repo as any, sseManager as any);
    const results = await service.sendEncryptedDebugToast(ctx as any, {
      userId: 'child-1',
      clientIds: ['ios-1', 'electron-1', 'missing-1'],
      encryptedPayload: 'ciphertext',
    });

    expect(ctx.verifySelfOrAdmin).toHaveBeenCalledWith('child-1');
    expect(sseManager.broadcastToClient).toHaveBeenCalledTimes(1);
    expect(sseManager.broadcastToClient).toHaveBeenCalledWith(
      'child-1-ios-1',
      'remoteDebugToast',
      expect.objectContaining({
        encryptedPayload: 'ciphertext',
      }),
    );
    expect(results).toEqual(
      expect.objectContaining({
        targetUserId: 'child-1',
        deliveredClientIds: ['ios-1'],
        skippedTargets: [
          {clientId: 'electron-1', reason: 'unsupported'},
          {clientId: 'missing-1', reason: 'unknown-client'},
        ],
      }),
    );
  });
});
