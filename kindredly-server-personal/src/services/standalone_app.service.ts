import {RequestContext} from '@/base/request_context';
import type {StandaloneAppBootstrapResponse} from 'tset-sharedlib/api/api-types';
import type {StandaloneAppCatalogEntry, StandaloneAppManifest, StandaloneAppPublicInfo} from 'tset-sharedlib/types';

type StandaloneAppRegistryEntry = StandaloneAppManifest & {
  allowlistedUserIds?: string[];
};

const standaloneAppRegistry: Record<string, StandaloneAppRegistryEntry> = {
  'activity-finder': {
    slug: 'activity-finder',
    title: 'Activity Finder',
    summary: 'Find a simple real-world activity fast, then track what you tried.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/activity-finder',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: false,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  'mindful-minute': {
    slug: 'mindful-minute',
    title: 'Mindful Minute',
    summary: 'A short, low-friction breathing timer.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/mindful-minute',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: false,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  'trusted-search': {
    slug: 'trusted-search',
    title: 'Trusted Search',
    summary: 'Build reputable-source searches across health, science, policy, history, and more.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/trusted-search',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: false,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  'family-reflection': {
    slug: 'family-reflection',
    title: 'Family Reflection',
    summary: 'A lightweight reflection space for quick testing on the website.',
    runtimeKind: 'same_origin_hosted',
    canonicalPath: '/apps/family-reflection',
    runtimeEntryPath: '/app-runtime/family-reflection/',
    discoverability: 'listed',
    requiresLogin: false,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
};

function toPublicInfo(app: StandaloneAppRegistryEntry): StandaloneAppPublicInfo {
  return {
    slug: app.slug,
    title: app.title,
    summary: app.summary,
    canonicalPath: app.canonicalPath,
    runtimeKind: app.runtimeKind,
    runtimeEntryPath: app.runtimeEntryPath,
  };
}

function toManifest(app: StandaloneAppRegistryEntry): StandaloneAppManifest {
  return {
    ...toPublicInfo(app),
    discoverability: app.discoverability,
    requiresLogin: app.requiresLogin,
    featureGate: app.featureGate,
    allowedRoles: app.allowedRoles,
    allowedAccountTypes: app.allowedAccountTypes,
    extensionEmbeddingAllowed: app.extensionEmbeddingAllowed,
  };
}

function toCatalogEntry(app: StandaloneAppRegistryEntry): StandaloneAppCatalogEntry {
  return {
    ...toPublicInfo(app),
    requiresLogin: app.requiresLogin,
  };
}

function hasPolicyRequirements(app: StandaloneAppRegistryEntry): boolean {
  return !!(
    app.requiresLogin ||
    app.featureGate ||
    app.allowedRoles?.length ||
    app.allowedAccountTypes?.length ||
    app.allowlistedUserIds?.length
  );
}

function sanitizeStandaloneRedirectPath(redirectPath?: string | null): string | null {
  const candidate = String(redirectPath || '').trim();
  if (!candidate) return null;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return null;
  if (candidate.startsWith('/signin') || candidate.startsWith('/kindredapp/signin')) return null;
  return candidate;
}

class StandaloneAppService {
  listApps(): StandaloneAppCatalogEntry[] {
    return Object.values(standaloneAppRegistry)
      .filter((app) => app.discoverability === 'listed')
      .map((app) => toCatalogEntry(app));
  }

  getRegistryEntry(slug: string): StandaloneAppRegistryEntry | null {
    const normalizedSlug = String(slug || '')
      .trim()
      .toLowerCase();
    return standaloneAppRegistry[normalizedSlug] || null;
  }

  async getBootstrap(
    ctx: RequestContext,
    slug: string,
    redirectPath?: string | null,
  ): Promise<StandaloneAppBootstrapResponse> {
    const app = this.getRegistryEntry(slug);
    if (!app) {
      return {
        access: 'not_found',
        message: 'App not found.',
      };
    }

    const publicInfo = toPublicInfo(app);
    const loginRedirectTarget = sanitizeStandaloneRedirectPath(redirectPath) || app.canonicalPath;
    const loginUrl = `/kindredapp/signin?redirect=${encodeURIComponent(loginRedirectTarget)}`;

    if (!ctx?.isAuthenticated() && hasPolicyRequirements(app)) {
      return {
        access: 'login_required',
        app: publicInfo,
        loginUrl,
        message: 'Please sign in to continue.',
      };
    }

    if (!hasPolicyRequirements(app)) {
      return {
        access: 'allowed',
        app: toManifest(app),
      };
    }

    const [user, account] = await Promise.all([ctx.getCurrentUser(), ctx.getAccount()]);

    const userType = user?.type;
    if (app.allowedRoles?.length && (!userType || !app.allowedRoles.includes(userType))) {
      return {
        access: 'forbidden',
        app: publicInfo,
        message: 'This app is not available for your user role.',
      };
    }

    const accountType = account?.accountType;
    if (app.allowedAccountTypes?.length && (!accountType || !app.allowedAccountTypes.includes(accountType))) {
      return {
        access: 'upgrade_required',
        app: publicInfo,
        message: 'This app requires a different Kindredly plan.',
      };
    }

    if (app.featureGate) {
      const enabled = account?.sysOptions?.extendedFeatures?.[app.featureGate] === true;
      if (!enabled) {
        return {
          access: 'upgrade_required',
          app: publicInfo,
          message: 'This app is not enabled for your account.',
        };
      }
    }

    if (app.allowlistedUserIds?.length && !app.allowlistedUserIds.includes(String(user?._id || ''))) {
      return {
        access: 'forbidden',
        app: publicInfo,
        message: 'This app is not available for this user.',
      };
    }

    return {
      access: 'allowed',
      app: toManifest(app),
    };
  }
}

export default StandaloneAppService;
