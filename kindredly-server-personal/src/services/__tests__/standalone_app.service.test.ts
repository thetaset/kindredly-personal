import type {RequestContext} from '@/base/request_context';
import StandaloneAppService from '@/services/standalone_app.service';

describe('StandaloneAppService.getBootstrap', () => {
  let service: StandaloneAppService;

  beforeEach(() => {
    service = new StandaloneAppService();
  });

  function makeCtx(
    options: {
      authenticated?: boolean;
      user?: {_id?: string; type?: 'admin' | 'restricted'} | null;
      account?: {
        accountType?: 'standard' | 'plus' | 'superplus' | null;
        sysOptions?: {extendedFeatures?: Record<string, boolean>} | null;
      } | null;
    } = {},
  ): RequestContext {
    return {
      isAuthenticated: () => options.authenticated === true,
      getCurrentUser: jest.fn().mockResolvedValue(options.user || null),
      getAccount: jest.fn().mockResolvedValue(options.account || null),
    } as unknown as RequestContext;
  }

  it('allows a public bundled app for guests', async () => {
    const result = await service.getBootstrap(makeCtx(), 'activity-finder');

    expect(result).toEqual(
      expect.objectContaining({
        access: 'allowed',
        app: expect.objectContaining({
          slug: 'activity-finder',
          runtimeKind: 'bundled',
          requiresLogin: false,
        }),
      }),
    );
  });

  it('lists discoverable apps for the directory view', () => {
    const result = service.listApps();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({slug: 'activity-finder', requiresLogin: false}),
        expect.objectContaining({slug: 'mindful-minute', requiresLogin: false}),
        expect.objectContaining({slug: 'family-reflection', requiresLogin: false}),
      ]),
    );
  });

  it('allows the hosted demo app for signed-out users', async () => {
    const result = await service.getBootstrap(makeCtx(), 'family-reflection');

    expect(result).toEqual(
      expect.objectContaining({
        access: 'allowed',
        app: expect.objectContaining({slug: 'family-reflection', requiresLogin: false}),
      }),
    );
  });

  it('preserves a safe runtime redirect path for hosted apps', async () => {
    jest.spyOn(service, 'getRegistryEntry').mockReturnValue({
      slug: 'protected-hosted',
      title: 'Protected Hosted',
      summary: 'Protected app.',
      runtimeKind: 'same_origin_hosted',
      canonicalPath: '/apps/protected-hosted',
      runtimeEntryPath: '/app-runtime/protected-hosted/',
      discoverability: 'hidden',
      requiresLogin: true,
      featureGate: null,
      allowedRoles: [],
      allowedAccountTypes: [],
      extensionEmbeddingAllowed: false,
    } as any);

    const result = await service.getBootstrap(
      makeCtx(),
      'protected-hosted',
      '/app-runtime/protected-hosted/?from=test',
    );

    expect(result).toEqual(
      expect.objectContaining({
        access: 'login_required',
        loginUrl: '/kindredapp/signin?redirect=%2Fapp-runtime%2Fprotected-hosted%2F%3Ffrom%3Dtest',
      }),
    );
  });

  it('ignores unsafe redirect overrides', async () => {
    jest.spyOn(service, 'getRegistryEntry').mockReturnValue({
      slug: 'protected-hosted',
      title: 'Protected Hosted',
      summary: 'Protected app.',
      runtimeKind: 'same_origin_hosted',
      canonicalPath: '/apps/protected-hosted',
      runtimeEntryPath: '/app-runtime/protected-hosted/',
      discoverability: 'hidden',
      requiresLogin: true,
      featureGate: null,
      allowedRoles: [],
      allowedAccountTypes: [],
      extensionEmbeddingAllowed: false,
    } as any);

    const result = await service.getBootstrap(makeCtx(), 'protected-hosted', 'https://evil.example/login');

    expect(result).toEqual(
      expect.objectContaining({
        access: 'login_required',
        loginUrl: '/kindredapp/signin?redirect=%2Fapps%2Fprotected-hosted',
      }),
    );
  });

  it('returns upgrade_required when account type is not eligible', async () => {
    jest.spyOn(service, 'getRegistryEntry').mockReturnValue({
      slug: 'plus-only',
      title: 'Plus Only',
      summary: 'Requires a paid plan.',
      runtimeKind: 'bundled',
      canonicalPath: '/apps/plus-only',
      runtimeEntryPath: null,
      discoverability: 'hidden',
      requiresLogin: true,
      featureGate: null,
      allowedRoles: [],
      allowedAccountTypes: ['plus'],
      extensionEmbeddingAllowed: false,
    } as any);

    const result = await service.getBootstrap(
      makeCtx({
        authenticated: true,
        user: {_id: 'user-1', type: 'admin'},
        account: {accountType: 'standard', sysOptions: {extendedFeatures: {}}},
      }),
      'plus-only',
    );

    expect(result).toEqual(
      expect.objectContaining({
        access: 'upgrade_required',
        app: expect.objectContaining({slug: 'plus-only'}),
      }),
    );
  });

  it('returns forbidden when the current role is not allowed', async () => {
    jest.spyOn(service, 'getRegistryEntry').mockReturnValue({
      slug: 'admin-only',
      title: 'Admin Only',
      summary: 'Restricted app.',
      runtimeKind: 'bundled',
      canonicalPath: '/apps/admin-only',
      runtimeEntryPath: null,
      discoverability: 'hidden',
      requiresLogin: true,
      featureGate: null,
      allowedRoles: ['admin'],
      allowedAccountTypes: [],
      extensionEmbeddingAllowed: false,
    } as any);

    const result = await service.getBootstrap(
      makeCtx({
        authenticated: true,
        user: {_id: 'user-1', type: 'restricted'},
        account: {accountType: 'plus', sysOptions: {extendedFeatures: {}}},
      }),
      'admin-only',
    );

    expect(result).toEqual(
      expect.objectContaining({
        access: 'forbidden',
        app: expect.objectContaining({slug: 'admin-only'}),
      }),
    );
  });
});
