/**
 * A family's own AI account (HAT-966): an adult connects OpenAI, Anthropic, Google, OpenRouter or any
 * OpenAI-compatible address with their own key, and Kinbot and the AI tools on every family device
 * call it straight from the device instead of Kindredly AI.
 *
 * The connection (key included) is encrypted with the family's account key before it is saved in
 * `account.options.ownAi`, so Kindredly's server stores it but cannot read it, and every member's
 * device, children's included, can (founder, 2026-11-02). Only an admin writes it.
 */

export type OwnAiProviderId = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'custom';

export type OwnAiProvider = {
  id: OwnAiProviderId;
  /** The company's own name for itself. */
  label: string;
  /** OpenAI-compatible base address; `/chat/completions` and `/models` sit under it. Empty for custom. */
  baseUrl: string;
  /** The page where an adult makes a key. Empty for custom. */
  keyPageUrl: string;
  /** How the provider's keys start, for the field's placeholder. */
  keyPlaceholder: string;
  /** False only for a custom address, which may not need one (a server the family runs). */
  keyRequired: boolean;
  /**
   * Real tool calling over the OpenAI-compatible API. A custom address is unknown, so it uses the
   * JSON envelope, as Ollama does.
   */
  nativeTools: boolean;
  /** Bootstrap icon for its tile. Generic on purpose: no brand marks at icon size. */
  icon: string;
};

export const OWN_AI_PROVIDERS: readonly OwnAiProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyPageUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    keyRequired: true,
    nativeTools: true,
    icon: 'stars',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    keyPageUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-…',
    keyRequired: true,
    nativeTools: true,
    icon: 'asterisk',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyPageUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza…',
    keyRequired: true,
    nativeTools: true,
    icon: 'gem',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPageUrl: 'https://openrouter.ai/settings/keys',
    keyPlaceholder: 'sk-or-…',
    keyRequired: true,
    nativeTools: true,
    icon: 'signpost-split',
  },
  {
    id: 'custom',
    label: 'Other',
    baseUrl: '',
    keyPageUrl: '',
    keyPlaceholder: 'Optional',
    keyRequired: false,
    nativeTools: false,
    icon: 'hdd-network',
  },
];

export function ownAiProvider(id: unknown): OwnAiProvider | null {
  return OWN_AI_PROVIDERS.find((p) => p.id === id) ?? null;
}

/** What the settings pages are told about the connection. The key itself is never in it. */
export type OwnAiStatusView =
  | { status: 'none' }
  /** Saved, but this device cannot open it: it holds no family key yet. */
  | { status: 'locked' }
  | {
      status: 'connected';
      provider: OwnAiProviderId;
      providerLabel: string;
      baseUrl: string;
      model: string;
      keyHint: string;
      connectedBy: string;
      connectedAt: number | null;
    };

/** The connection as every device reads it once decrypted. */
export type OwnAiConnection = {
  provider: OwnAiProviderId;
  /** The provider's base address, or the family's own for custom; no trailing slash. */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** The adult who connected it, by display name, for the summary row. */
  connectedBy?: string;
  connectedAt?: number;
};

/**
 * What `account.options.ownAi` holds: the connection, encrypted with the family's account key
 * (`KeyManager.encryptString`). Nothing in it is readable without that key.
 */
export type OwnAiStored = { v: 1; keyId: string; data: string; updatedAt: number };

/** True for a value shaped like `OwnAiStored`; the server refuses anything else. */
export function isOwnAiStored(value: unknown): value is OwnAiStored {
  const v = value as Partial<OwnAiStored> | null;
  return (
    !!v &&
    typeof v === 'object' &&
    v.v === 1 &&
    typeof v.keyId === 'string' &&
    v.keyId.length > 0 &&
    v.keyId.length < 200 &&
    typeof v.data === 'string' &&
    v.data.length > 0 &&
    v.data.length < 20_000 &&
    typeof v.updatedAt === 'number'
  );
}

/** A decrypted value that is a usable connection. */
export function isOwnAiConnection(value: unknown): value is OwnAiConnection {
  const v = value as Partial<OwnAiConnection> | null;
  return (
    !!v &&
    typeof v === 'object' &&
    !!ownAiProvider(v.provider) &&
    typeof v.baseUrl === 'string' &&
    /^https?:\/\//.test(v.baseUrl) &&
    typeof v.apiKey === 'string' &&
    typeof v.model === 'string' &&
    v.model.length > 0
  );
}

/** The last four characters of a key, for "Key ending 4f2a". Empty for no key. */
export function ownAiKeyHint(apiKey: string): string {
  const trimmed = (apiKey || '').trim();
  return trimmed.length > 8 ? trimmed.slice(-4) : '';
}

/** Base address without trailing slashes, and without a pasted `/chat/completions`. */
export function normalizeOwnAiBaseUrl(url: string): string {
  return (url || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '')
    .replace(/\/+$/, '');
}

/**
 * Model ids that are not chat models (embeddings, speech, pictures, moderation), left out of the
 * model list so an adult cannot pick one Kinbot cannot talk to.
 */
export function isLikelyChatModel(id: string): boolean {
  return !/(embed|whisper|tts|dall-e|moderation|transcribe|audio|realtime|image|imagen|veo|aqa|davinci|babbage|search|computer-use)/i.test(
    id,
  );
}

export type OwnAiModel = { id: string; label: string };

/**
 * A provider's `/models` answer as a list to pick from: chat models only, newest first when the
 * provider says when each came out (OpenAI, Anthropic and OpenRouter do), each once. Google's ids
 * come as `models/gemini-…`; the chat API takes them without the prefix.
 */
export function modelsFromListResponse(body: any): OwnAiModel[] {
  const rows: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
  const models = rows
    .map((r) => {
      const id = String(r?.id || r?.name || '').replace(/^models\//, '');
      const created = Number(r?.created ?? (r?.created_at ? Date.parse(r.created_at) / 1000 : 0)) || 0;
      const name = String(r?.display_name || r?.name || id).replace(/^models\//, '');
      return { id, label: name && name !== id ? `${name} (${id})` : id, created };
    })
    .filter((m) => m.id && isLikelyChatModel(m.id));
  const seen = new Set<string>();
  return models
    .sort((a, b) => b.created - a.created)
    .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    .map(({ id, label }) => ({ id, label }));
}
