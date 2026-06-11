export interface MediaRollupPlatformDefinition {
  id: string;
  label: string;
  domains: string[];
}

export const MEDIA_ROLLUP_PLATFORM_MAP_VERSION = 2;

export const MEDIA_ROLLUP_PLATFORMS: MediaRollupPlatformDefinition[] = [
  {
    id: 'google',
    label: 'Google',
    domains: [
      'google.com',
      'googleapis.com',
      'googleusercontent.com',
      'googlevideo.com',
      'gmail.com',
      'youtube.com',
      'youtu.be',
    ],
  },
  {
    id: 'meta',
    label: 'Meta',
    domains: ['facebook.com', 'fb.com', 'instagram.com', 'threads.net', 'messenger.com'],
  },
  {
    id: 'amazon',
    label: 'Amazon',
    domains: ['amazon.com', 'amazonaws.com', 'audible.com', 'primevideo.com', 'twitch.tv'],
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'onedrive.com', 'sharepoint.com'],
  },
  {
    id: 'reddit',
    label: 'Reddit',
    domains: ['reddit.com', 'redd.it'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    domains: ['tiktok.com'],
  },
  {
    id: 'netflix',
    label: 'Netflix',
    domains: ['netflix.com', 'nflxvideo.net', 'nflximg.net', 'nflxext.com', 'nflxso.net'],
  },
];

function normalizeHostname(hostname: string | null | undefined): string {
  return String(hostname || '').trim().toLowerCase();
}

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function findMediaRollupPlatformByHostname(
  hostname: string | null | undefined,
): MediaRollupPlatformDefinition | null {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;

  for (const platform of MEDIA_ROLLUP_PLATFORMS) {
    if (platform.domains.some((domain) => matchesDomain(normalized, domain))) {
      return platform;
    }
  }

  return null;
}