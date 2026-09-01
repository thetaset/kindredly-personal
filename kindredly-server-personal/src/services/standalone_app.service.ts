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
    summary:
      'Find a worthwhile thing to do — for kids and grown-ups. Pick a direction and discover ideas from Kindredly and your own library.',
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
  'knowledge-map': {
    slug: 'knowledge-map',
    title: 'Knowledge Map',
    summary: 'Explore your library as a living map — see what you know, what is fresh, and what has gone cold.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/knowledge-map',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: true,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  // App-listing metadata only — Explore Nearby has no server backend (curated data
  // ships in the client; OpenStreetMap is fetched client-side; favorites/last-location
  // use the existing /user/prefs endpoints). If a curated-overlay backend is ever added,
  // isolate it under its own route area so it can be externalized.
  'explore-nearby': {
    slug: 'explore-nearby',
    title: 'Explore Nearby',
    summary: 'Find family-friendly places to go — parks, trails, museums, libraries and more — on a map.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/explore-nearby',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: false,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  // The critical-thinking puzzle app. Content is authored in the `puzzle_content` store and read
  // through /thinkingPuzzles/catalog; the client also carries a bundled seed it falls back to when
  // no live puzzle comes back. `hidden` keeps it out of the Apps directory while staying reachable
  // at /apps/thinking-puzzles.
  'thinking-puzzles': {
    slug: 'thinking-puzzles',
    title: 'Thinking Puzzles',
    summary: 'Short counterintuitive puzzles about bias, intuition, numbers, and how claims are framed.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/thinking-puzzles',
    runtimeEntryPath: null,
    discoverability: 'hidden',
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
  'family-board': {
    slug: 'family-board',
    title: 'Family Board',
    summary:
      'A simple board to organize your family’s tasks and to-dos — keep notes and a running log on every card. Private and end-to-end encrypted.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/family-board',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: true,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  'mind-map': {
    slug: 'mind-map',
    title: 'Mind Map',
    summary:
      'Map out ideas as a living web of connected thoughts — add branches, link items from your library, and rearrange freely. Private and end-to-end encrypted.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/mind-map',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: true,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  lesson: {
    slug: 'lesson',
    title: 'Lessons',
    summary:
      'Build and work through your own lessons — steps, quizzes, and flashcards, with your progress saved as you go. Lessons live in your Kindredly library. Private and end-to-end encrypted.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/lesson',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: true,
    featureGate: null,
    allowedRoles: [],
    allowedAccountTypes: [],
    extensionEmbeddingAllowed: false,
  },
  notes: {
    slug: 'notes',
    title: 'Notes',
    summary:
      'Quick notes, Keep-style — capture, pin, color, and label. Notes live in your Kindredly library. Private and end-to-end encrypted.',
    runtimeKind: 'bundled',
    canonicalPath: '/apps/notes',
    runtimeEntryPath: null,
    discoverability: 'listed',
    requiresLogin: true,
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
