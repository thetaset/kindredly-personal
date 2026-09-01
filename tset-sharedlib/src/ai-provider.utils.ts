// Known external AI assistants, so "Ask AI" can hand a query straight to
// whatever the user put in their AI slot (Core Apps → AI Assistant) instead of
// dumping them on a blank homepage.
//
// The AI slot holds an ordinary link item, so its URL is whatever the user
// saved. We recognise the well-known hosts to get a proper name and a
// prefill-capable URL; anything unrecognised still opens, just without the
// query pre-typed.

export type AiProviderId = 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'copilot' | 'grok';

type AiProviderDefinition = {
  id: AiProviderId;
  displayName: string;
  matchesHostname: (hostname: string) => boolean;
  // Prompt URL template with a {q} placeholder; the builder owns encoding.
  // Null when the provider has no documented prefill parameter.
  promptUrlTemplate: string | null;
  homepageUrl: string;
  // Bootstrap icon name. Neutral for now; brand marks are a cosmetic follow-up.
  iconName: string;
};

const AI_PROVIDER_DEFINITIONS: AiProviderDefinition[] = [
  {
    id: 'chatgpt',
    displayName: 'ChatGPT',
    matchesHostname: (hostname) => /(^|\.)chatgpt\.com$/.test(hostname) || /(^|\.)openai\.com$/.test(hostname),
    promptUrlTemplate: 'https://chatgpt.com/?q={q}',
    homepageUrl: 'https://chatgpt.com/',
    iconName: 'stars',
  },
  {
    id: 'claude',
    displayName: 'Claude',
    matchesHostname: (hostname) => /(^|\.)claude\.ai$/.test(hostname),
    promptUrlTemplate: 'https://claude.ai/new?q={q}',
    homepageUrl: 'https://claude.ai/',
    iconName: 'stars',
  },
  {
    id: 'perplexity',
    displayName: 'Perplexity',
    matchesHostname: (hostname) => /(^|\.)perplexity\.ai$/.test(hostname),
    promptUrlTemplate: 'https://www.perplexity.ai/search?q={q}',
    homepageUrl: 'https://www.perplexity.ai/',
    iconName: 'stars',
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    matchesHostname: (hostname) => /(^|\.)gemini\.google\.com$/.test(hostname),
    // Gemini has no documented prefill param; open it plain.
    promptUrlTemplate: null,
    homepageUrl: 'https://gemini.google.com/',
    iconName: 'stars',
  },
  {
    id: 'copilot',
    displayName: 'Copilot',
    matchesHostname: (hostname) => /(^|\.)copilot\.microsoft\.com$/.test(hostname),
    promptUrlTemplate: 'https://copilot.microsoft.com/?q={q}',
    homepageUrl: 'https://copilot.microsoft.com/',
    iconName: 'stars',
  },
  {
    id: 'grok',
    displayName: 'Grok',
    matchesHostname: (hostname) => /(^|\.)grok\.com$/.test(hostname) || /(^|\.)x\.ai$/.test(hostname),
    promptUrlTemplate: 'https://grok.com/?q={q}',
    homepageUrl: 'https://grok.com/',
    iconName: 'stars',
  },
];

export function getAiProviderById(id: AiProviderId): AiProviderDefinition | null {
  return AI_PROVIDER_DEFINITIONS.find((definition) => definition.id === id) || null;
}

/** Identifies a saved AI-slot URL as a known assistant, or null if unrecognised. */
export function detectAiProvider(urlString?: string | null): AiProviderDefinition | null {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    const hostname = (url.hostname || '').toLowerCase();
    return AI_PROVIDER_DEFINITIONS.find((definition) => definition.matchesHostname(hostname)) || null;
  } catch (_error) {
    return null;
  }
}

/**
 * URL that opens `slotUrl`'s assistant with `query` pre-typed when the provider
 * supports it. Falls back to the saved URL untouched — better to land the user
 * on their assistant than to guess at a query parameter.
 */
export function buildAiPromptUrl(slotUrl: string, query: string): string {
  const provider = detectAiProvider(slotUrl);
  const trimmed = (query || '').trim();

  if (!provider || !provider.promptUrlTemplate || !trimmed) return slotUrl;

  return provider.promptUrlTemplate.replace('{q}', encodeURIComponent(trimmed));
}
