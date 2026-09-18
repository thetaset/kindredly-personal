/**
 * The hosted image models a family may pick, and what each one is for.
 *
 * One list, read by three places that would otherwise drift: the settings page renders it as
 * the choice, the server treats it as a ceiling on what a request may ask for, and admin
 * pricing puts a price against each id. Order matters — [0] is the default and the fallback
 * for anything outside the list, exactly as `AI_MODEL_ALLOWLIST[0]` is for text.
 *
 * An image model a family runs themselves (Stable Diffusion and friends) never appears here:
 * it is reached directly from their own device, costs us nothing, and has no allowlist.
 */
export type AiImageModelId = 'gpt-image-1';

export type AiImageModel = {
  id: AiImageModelId;
  /** What the settings page calls it. */
  label: string;
  /** One phrase, for the line under the select. */
  note: string;
  /** What the provider is asked for. Square: every caller crops its own shape. */
  size: '1024x1024';
  /**
   * The two models take different parameters. DALL·E 3 wants `quality: 'standard'` and has
   * to be asked for base64; GPT Image 1 rejects both — it grades quality low/medium/high and
   * always returns base64. Sending one model's parameters to the other is a 400.
   */
  quality: 'standard' | 'low' | 'medium' | 'high';
  /** False when the model always returns base64 and rejects the parameter. */
  acceptsResponseFormat: boolean;
};

/**
 * DALL·E 3 was the default until 2026-09-15 and is gone from OpenAI's API (observation #95), so a
 * device still set to it resolves to the default below.
 */
export const AI_IMAGE_MODELS: readonly AiImageModel[] = [
  {
    id: 'gpt-image-1',
    label: 'GPT Image 1',
    note: 'Detailed pictures, including readable text.',
    size: '1024x1024',
    quality: 'medium',
    acceptsResponseFormat: false,
  },
] as const;

export const DEFAULT_AI_IMAGE_MODEL: AiImageModelId = AI_IMAGE_MODELS[0].id;

/**
 * Whether Kindredly.ai makes pictures for families. On since 2026-09-15: each family gets weekly
 * image credits (`ai-image-credits.ts`, 2 on Standard, 6 on Plus), and the server refuses a
 * picture once they are used.
 *
 * One flag, read by the settings page and by the transport, so the control and the behaviour
 * cannot disagree: a greyed option that still quietly generates would be the worse failure.
 */
export const HOSTED_IMAGE_SERVICE_AVAILABLE = true;

/** Said in one place, so the settings page and the refusal use the same words. */
export const HOSTED_IMAGE_SERVICE_COMING_SOON =
  "Kindredly.ai's image service is coming soon. To make pictures now, point image generation at an image server you run.";

/** The requested model when it is one we host, else the default. Never throws. */
export function resolveAiImageModel(requested: unknown): AiImageModelId {
  const id = typeof requested === 'string' ? requested.trim() : '';
  const known = AI_IMAGE_MODELS.find((m) => m.id === id);
  return known ? known.id : DEFAULT_AI_IMAGE_MODEL;
}

/** The provider call for one model, with only the parameters that model accepts. */
export function aiImageRequestParams(id: AiImageModelId, prompt: string): Record<string, unknown> {
  const model = AI_IMAGE_MODELS.find((m) => m.id === id) || AI_IMAGE_MODELS[0];
  const params: Record<string, unknown> = {
    model: model.id,
    prompt,
    n: 1,
    size: model.size,
    quality: model.quality,
  };
  if (model.acceptsResponseFormat) params.response_format = 'b64_json';
  return params;
}

export function aiImageModelLabel(id: string): string {
  return AI_IMAGE_MODELS.find((m) => m.id === id)?.label || id;
}
