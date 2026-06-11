import type { LibraryAutoApprovalSettings, UserSettingsCopySourceSnapshot } from '../api';

export const USER_SETTINGS_COPY_FILTERING_PREF_KEYS = [
  'filters.strictnessPresetId',
  'filters.contentFilters',
  'filters.blockedUrlPatterns',
  'filters.serverDeepLookupEnabled',
  'filters.autoApprovalSettings',
] as const;

export const USER_SETTINGS_COPY_WEBSITE_PREF_KEYS = [
  'contentOpenBehaviorOverrides',
  'youtubeVideoOpenBehavior',
  'youtubeHideSearch',
  'youtubeHideComments',
  'youtubeHideRecommendations',
  'youtubeHideOtherDistractions',
  'redditHideSearch',
  'redditHideComments',
  'redditHideOtherDistractions',
] as const;

type ResolvedContentFilters = {
  blockAdult: boolean;
  blockViolence: boolean;
  blockExtremism: boolean;
  safeSearch: boolean;
  blurThumbnails: boolean;
  imageFlagging: boolean;
  blockPagesWithManyInappropriateImages: boolean;
  imageAggressionLevel: 'strict' | 'moderate' | 'relaxed' | 'off';
  disableSexyBlocking: boolean;
  blockShortFormVideo: boolean;
  blockSocialMedia: boolean;
  blockInappropriateTopics: boolean;
  languageRestrictionLevel: 'strict' | 'moderate' | 'lenient';
  blockStrongLanguage: boolean;
  blockStrongSexualTerms: boolean;
  blockStrongProfanityTerms: boolean;
  censorBadWords: boolean;
  disableAllExplicitImageScanning: boolean;
};

type StrictnessPresetId = 'strict' | 'moderate' | 'relaxed' | 'custom';
type NamedStrictnessPresetId = Exclude<StrictnessPresetId, 'custom'>;

const STRICTNESS_PRESET_FILTER_PATCHES: Record<NamedStrictnessPresetId, Partial<ResolvedContentFilters>> = {
  strict: {
    languageRestrictionLevel: 'strict',
    blockStrongSexualTerms: true,
    blockStrongProfanityTerms: true,
    censorBadWords: true,
  },
  moderate: {
    languageRestrictionLevel: 'moderate',
    blockStrongSexualTerms: true,
    blockStrongProfanityTerms: true,
    censorBadWords: true,
  },
  relaxed: {
    languageRestrictionLevel: 'lenient',
    blockStrongSexualTerms: true,
    blockStrongProfanityTerms: true,
    censorBadWords: true,
  },
};

const STRICTNESS_INDEPENDENT_FILTER_KEYS: Array<keyof ResolvedContentFilters> = [
  'blurThumbnails',
  'blockPagesWithManyInappropriateImages',
  'imageAggressionLevel',
  'disableSexyBlocking',
];

const DEFAULT_FILTERS: ResolvedContentFilters = {
  blockAdult: true,
  blockViolence: true,
  blockExtremism: false,
  safeSearch: true,
  blurThumbnails: false,
  imageFlagging: true,
  blockPagesWithManyInappropriateImages: true,
  imageAggressionLevel: 'moderate',
  disableSexyBlocking: false,
  blockShortFormVideo: false,
  blockSocialMedia: false,
  blockInappropriateTopics: true,
  languageRestrictionLevel: 'strict',
  blockStrongLanguage: true,
  blockStrongSexualTerms: true,
  blockStrongProfanityTerms: true,
  censorBadWords: true,
  disableAllExplicitImageScanning: false,
};

const RESTRICTED_OVERRIDES: Partial<ResolvedContentFilters> = {
  blurThumbnails: true,
  censorBadWords: true,
};

const DEFAULT_AUTO_APPROVAL_SETTINGS: LibraryAutoApprovalSettings = {
  enabled: false,
  experimental: true,
  criteria: {
    enabled: false,
    requireTrustedDomain: false,
    trustedDomains: [],
    requireEducational: false,
    allowedAgeBands: ['child', 'teen', 'adult'],
    customPolicyPrompt: '',
  },
};

function cloneValue<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function isNamedStrictnessPresetId(value: unknown): value is NamedStrictnessPresetId {
  return value === 'strict' || value === 'moderate' || value === 'relaxed';
}

function pickStrictnessIndependentFilters(
  rawContentFilters?: Record<string, unknown> | null,
): Partial<ResolvedContentFilters> {
  const picked: Partial<ResolvedContentFilters> = {};

  for (const key of STRICTNESS_INDEPENDENT_FILTER_KEYS) {
    if (rawContentFilters && key in rawContentFilters) {
      (picked as Record<string, unknown>)[key] = rawContentFilters[key as string];
    }
  }

  return picked;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeImageAggressionLevel(
  value: unknown,
  fallback: ResolvedContentFilters['imageAggressionLevel'],
): ResolvedContentFilters['imageAggressionLevel'] {
  const level = typeof value === 'string' ? value : '';
  if (level === 'strict' || level === 'moderate' || level === 'relaxed' || level === 'off') {
    return level;
  }
  if (level === 'aggressive') return 'strict';
  if (level === 'balanced') return 'moderate';
  if (level === 'lenient') return 'relaxed';
  return fallback;
}

function normalizeLanguageRestrictionLevel(
  value: unknown,
  fallback: ResolvedContentFilters['languageRestrictionLevel'],
): ResolvedContentFilters['languageRestrictionLevel'] {
  const level = typeof value === 'string' ? value : '';
  if (level === 'strict' || level === 'moderate' || level === 'lenient') {
    return level;
  }
  return fallback;
}

function normalizeBlockedPattern(input: string): string | null {
  const trimmed = String(input || '').trim().toLowerCase();
  if (!trimmed) return null;

  let candidate = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '');

  if (!candidate || candidate.startsWith('/')) return null;

  const slashIndex = candidate.indexOf('/');
  const hostPart = slashIndex >= 0 ? candidate.slice(0, slashIndex) : candidate;
  const pathPart = slashIndex >= 0 ? candidate.slice(slashIndex) : '';

  const hostname = hostPart.trim();
  if (!hostname || !/^[a-z0-9.-]+$/.test(hostname)) return null;
  if (!hostname.includes('.') && hostname !== 'localhost') return null;

  const normalizedPath = pathPart
    ? '/' + pathPart.replace(/^\/+/, '').replace(/\/$/, '')
    : '';

  return `${hostname}${normalizedPath}`;
}

function normalizeBlockedPatternList(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : [];
  const normalized = values
    .map((value) => normalizeBlockedPattern(String(value || '')))
    .filter((value): value is string => !!value);
  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
}

function normalizeTrustedDomain(input: string): string | null {
  const trimmed = String(input || '').trim().toLowerCase();
  if (!trimmed) return null;

  const candidate = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .trim();

  if (!candidate || candidate.startsWith('.')) return null;
  if (!/^[a-z0-9.-]+$/.test(candidate)) return null;
  if (!candidate.includes('.') && candidate !== 'localhost') return null;
  return candidate;
}

function normalizeTrustedDomainList(raw: unknown): string[] {
  const values = Array.isArray(raw)
    ? raw
    : String(raw || '').split('\n');

  const normalized = values
    .map((value) => normalizeTrustedDomain(String(value || '')))
    .filter((value): value is string => !!value);

  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
}

function normalizeAutoApprovalSettings(raw: unknown): LibraryAutoApprovalSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const inputCriteria = input.criteria && typeof input.criteria === 'object'
    ? (input.criteria as Record<string, unknown>)
    : {};

  const trustedDomains = normalizeTrustedDomainList(inputCriteria.trustedDomains);

  const allowedAgeBandsRaw = Array.isArray(inputCriteria.allowedAgeBands)
    ? inputCriteria.allowedAgeBands
    : DEFAULT_AUTO_APPROVAL_SETTINGS.criteria.allowedAgeBands;
  const allowedAgeBands = Array.from(new Set(
    allowedAgeBandsRaw
      .map((value) => String(value || '').trim().toLowerCase())
      .filter((value) => value === 'child' || value === 'teen' || value === 'adult')
  )) as Array<'child' | 'teen' | 'adult'>;

  const customPolicyPrompt = typeof inputCriteria.customPolicyPrompt === 'string'
    ? inputCriteria.customPolicyPrompt.trim().slice(0, 1200)
    : '';

  return {
    enabled: input.enabled === true,
    experimental: input.experimental !== false,
    criteria: {
      enabled: inputCriteria.enabled === true,
      requireTrustedDomain: inputCriteria.requireTrustedDomain === true,
      trustedDomains,
      requireEducational: inputCriteria.requireEducational === true,
      allowedAgeBands: allowedAgeBands.length > 0 ? allowedAgeBands : DEFAULT_AUTO_APPROVAL_SETTINGS.criteria.allowedAgeBands,
      customPolicyPrompt,
    },
  };
}

function resolveContentFilters(
  rawFilters?: Record<string, unknown> | null,
  restrictedUser = false,
  policyLockedUser = false,
): ResolvedContentFilters {
  const defaults = restrictedUser
    ? { ...DEFAULT_FILTERS, ...RESTRICTED_OVERRIDES }
    : DEFAULT_FILTERS;

  const filters = rawFilters && typeof rawFilters === 'object' ? rawFilters : {};

  const hasLanguageRestrictionLevel = typeof filters.languageRestrictionLevel === 'string';
  const legacyBlockStrongLanguage = toBoolean(filters.blockStrongLanguage, defaults.blockStrongLanguage);
  const legacyDerivedLanguageLevel: ResolvedContentFilters['languageRestrictionLevel'] =
    legacyBlockStrongLanguage ? 'strict' : 'lenient';
  const languageRestrictionLevel = normalizeLanguageRestrictionLevel(
    filters.languageRestrictionLevel,
    hasLanguageRestrictionLevel ? defaults.languageRestrictionLevel : legacyDerivedLanguageLevel,
  );

  const blockStrongLanguage = languageRestrictionLevel !== 'lenient';

  const resolved: ResolvedContentFilters = {
    blockAdult: toBoolean(filters.blockAdult, defaults.blockAdult),
    blockViolence: toBoolean(filters.blockViolence, defaults.blockViolence),
    blockExtremism: toBoolean(filters.blockExtremism, defaults.blockExtremism),
    safeSearch: toBoolean(filters.safeSearch, defaults.safeSearch),
    blurThumbnails: toBoolean(filters.blurThumbnails, defaults.blurThumbnails),
    imageFlagging: toBoolean(filters.imageFlagging, defaults.imageFlagging),
    blockPagesWithManyInappropriateImages: toBoolean(
      filters.blockPagesWithManyInappropriateImages,
      defaults.blockPagesWithManyInappropriateImages,
    ),
    imageAggressionLevel: normalizeImageAggressionLevel(filters.imageAggressionLevel, defaults.imageAggressionLevel),
    disableSexyBlocking: toBoolean(filters.disableSexyBlocking, defaults.disableSexyBlocking),
    blockShortFormVideo: false,
    blockSocialMedia: false,
    blockInappropriateTopics: toBoolean(filters.blockInappropriateTopics, defaults.blockInappropriateTopics),
    languageRestrictionLevel,
    blockStrongLanguage,
    blockStrongSexualTerms: toBoolean(filters.blockStrongSexualTerms, defaults.blockStrongSexualTerms),
    blockStrongProfanityTerms: toBoolean(filters.blockStrongProfanityTerms, defaults.blockStrongProfanityTerms),
    censorBadWords: toBoolean(filters.censorBadWords, defaults.censorBadWords),
    disableAllExplicitImageScanning: false,
  };

  if (restrictedUser) {
    resolved.censorBadWords = true;
  }

  if (resolved.imageAggressionLevel === 'off') {
    resolved.imageFlagging = false;
  } else {
    resolved.imageFlagging = true;
  }

  return resolved;
}

function resolveEffectiveContentFiltersFromAdvancedPrefs(
  advancedPrefs: Record<string, unknown> | null | undefined,
  restrictedUser = false,
  policyLockedUser = false,
): { contentFilters: ResolvedContentFilters; presetId: StrictnessPresetId } {
  const rawPresetId = advancedPrefs?.['filters.strictnessPresetId'];
  const rawContentFilters =
    (advancedPrefs?.['filters.contentFilters'] || null) as Record<string, unknown> | null;

  if (isNamedStrictnessPresetId(rawPresetId)) {
    const independentOverlay = pickStrictnessIndependentFilters(rawContentFilters);
    return {
      contentFilters: resolveContentFilters(
        {
          ...(STRICTNESS_PRESET_FILTER_PATCHES[rawPresetId] || {}),
          ...independentOverlay,
        },
        restrictedUser,
        policyLockedUser,
      ),
      presetId: rawPresetId,
    };
  }

  return {
    contentFilters: resolveContentFilters(rawContentFilters, restrictedUser, policyLockedUser),
    presetId: 'custom',
  };
}

function resolveRestrictedSiteToggle(
  userType: string | null | undefined,
  configuredValue: boolean | null | undefined,
): boolean {
  if (configuredValue === true || configuredValue === false) {
    return configuredValue;
  }
  return userType === 'restricted';
}

function resolveYouTubeOpenBehavior(
  userType: string | null | undefined,
  configuredValue: unknown,
): 'inApp' | 'external' {
  if (configuredValue === 'inApp' || configuredValue === 'external') {
    return configuredValue;
  }
  return userType === 'restricted' ? 'inApp' : 'external';
}

function resolveYouTubeDistractionSetting(
  userType: string | null | undefined,
  configuredValue: boolean | null | undefined,
): boolean {
  return resolveRestrictedSiteToggle(userType, configuredValue);
}

function resolveRedditDistractionSetting(
  userType: string | null | undefined,
  configuredValue: boolean | null | undefined,
): boolean {
  return resolveRestrictedSiteToggle(userType, configuredValue);
}

export function sanitizeUsageLimitsAccessControlSettings(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== 'object') return null;

  const next = cloneValue(raw) as Record<string, unknown>;

  delete next.disableRestrictions;
  delete next.disableRestrictionsExpires;
  delete next.disableRestrictionsTimeStamp;
  delete next.disableUsageLimits;
  delete next.disableUsageLimitsExpires;
  delete next.disableUsageLimitsTimeStamp;
  delete next.restrictAll;
  delete next.restrictAllExpires;
  delete next.restrictAllTimeStamp;
  delete next.remoteActionSettings;

  return Object.keys(next).length > 0 ? next : null;
}

export function buildContentFilteringCopySnapshot(
  sourceOptions: Record<string, unknown>,
  sourcePrefs: Record<string, unknown>,
  targetUserType: string | null,
): UserSettingsCopySourceSnapshot {
  const restrictedTarget = targetUserType === 'restricted';
  const effective = resolveEffectiveContentFiltersFromAdvancedPrefs(
    sourcePrefs,
    restrictedTarget,
    false,
  );

  const strictnessPresetId = sourcePrefs?.['filters.strictnessPresetId'];
  const blockedPatterns = normalizeBlockedPatternList(sourcePrefs?.['filters.blockedUrlPatterns']);
  const autoApprovalSettings = normalizeAutoApprovalSettings(sourcePrefs?.['filters.autoApprovalSettings']);
  const normalizedFilters = resolveContentFilters(
    effective.contentFilters as Record<string, unknown>,
    restrictedTarget,
    false,
  );

  const whitelistingEnabled = sourceOptions?.whitelistingEnabled === true;
  const contentFilteringEnabled = whitelistingEnabled || sourceOptions?.contentFilteringEnabled === true;

  return {
    optionsPatch: {
      whitelistingEnabled,
      contentFilteringEnabled,
    },
    preferenceUpdates: {
      'filters.strictnessPresetId': strictnessPresetId === 'strict' || strictnessPresetId === 'moderate' || strictnessPresetId === 'relaxed'
        ? strictnessPresetId
        : 'custom',
      'filters.contentFilters': normalizedFilters,
      'filters.blockedUrlPatterns': blockedPatterns,
      'filters.serverDeepLookupEnabled': sourcePrefs?.['filters.serverDeepLookupEnabled'] === true,
      'filters.autoApprovalSettings': autoApprovalSettings,
    },
  };
}

export function buildUsageLimitsCopySnapshot(
  sourceOptions: Record<string, unknown>,
): UserSettingsCopySourceSnapshot {
  const usageLimitsData = cloneValue((sourceOptions?.usageLimitsData || null) as Record<string, unknown> | null);
  const accessControlSettings = sanitizeUsageLimitsAccessControlSettings(
    (sourceOptions?.accessControlSettings || null) as Record<string, unknown> | null,
  );

  return {
    optionsPatch: {
      usageLimitsData,
      accessControlSettings,
    },
    preferenceUpdates: {},
  };
}

export function buildWebsiteSettingsCopySnapshot(
  sourcePrefs: Record<string, unknown>,
  sourceUserType: string | null,
): UserSettingsCopySourceSnapshot {
  const contentOpenBehaviorOverrides = sourcePrefs.contentOpenBehaviorOverrides && typeof sourcePrefs.contentOpenBehaviorOverrides === 'object'
    ? cloneValue(sourcePrefs.contentOpenBehaviorOverrides as Record<string, unknown>)
    : null;
  const youtubeOpenBehavior = resolveYouTubeOpenBehavior(
    sourceUserType,
    sourcePrefs.youtubeVideoOpenBehavior,
  );
  const youtubeHideSearch = resolveYouTubeDistractionSetting(
    sourceUserType,
    sourcePrefs.youtubeHideSearch as boolean | null | undefined,
  );
  const youtubeHideComments = resolveYouTubeDistractionSetting(
    sourceUserType,
    sourcePrefs.youtubeHideComments as boolean | null | undefined,
  );
  const youtubeHideRecommendations = resolveYouTubeDistractionSetting(
    sourceUserType,
    sourcePrefs.youtubeHideRecommendations as boolean | null | undefined,
  );
  const youtubeHideOtherDistractions = resolveYouTubeDistractionSetting(
    sourceUserType,
    sourcePrefs.youtubeHideOtherDistractions as boolean | null | undefined,
  );
  const redditHideSearch = resolveRedditDistractionSetting(
    sourceUserType,
    sourcePrefs.redditHideSearch as boolean | null | undefined,
  );
  const redditHideComments = resolveRedditDistractionSetting(
    sourceUserType,
    sourcePrefs.redditHideComments as boolean | null | undefined,
  );
  const redditHideOtherDistractions = resolveRedditDistractionSetting(
    sourceUserType,
    sourcePrefs.redditHideOtherDistractions as boolean | null | undefined,
  );

  return {
    optionsPatch: {},
    preferenceUpdates: {
      ...(contentOpenBehaviorOverrides ? { contentOpenBehaviorOverrides } : {}),
      youtubeVideoOpenBehavior: youtubeOpenBehavior,
      youtubeHideSearch,
      youtubeHideComments,
      youtubeHideRecommendations,
      youtubeHideOtherDistractions,
      redditHideSearch,
      redditHideComments,
      redditHideOtherDistractions,
    },
  };
}