import {config} from '@/config';
import type {ClientOptions, OpenAI} from 'openai';
import type {ArticleSignal, ArticleTrustLlm, ReputationRecord} from 'tset-sharedlib/types/articleTrust.types';

/**
 * Minimal pluggable inference seam for the article-trust pipeline.
 *
 * The baseline verdict is rule-based and does NOT use this. An inference
 * provider is an OPTIONAL, off-by-default enrichment that adds a short
 * neutral summary. The interface is deliberately small so a future local
 * provider (on-device model) is a drop-in replacement — selection is config +
 * adapter, not a rewrite. See the deferred screenshot OCR/search workstream for
 * the matching OcrProvider/SearchProvider seams.
 */
export interface ArticleInferenceInput {
  url: string;
  title: string | null;
  text: string;
  source: ReputationRecord | null;
  signals: ArticleSignal[];
}

export interface ArticleInferenceProvider {
  readonly id: string;
  /** Off by default — only true when explicitly configured. */
  isEnabled(): boolean;
  analyze(input: ArticleInferenceInput): Promise<ArticleTrustLlm | null>;
}

/** Default provider: does nothing. The baseline pipeline is fully non-LLM. */
export class NoopInferenceProvider implements ArticleInferenceProvider {
  readonly id = 'noop';
  isEnabled(): boolean {
    return false;
  }
  async analyze(): Promise<ArticleTrustLlm | null> {
    return null;
  }
}

/**
 * Hosted provider (OpenAI). Self-contained (own client, no RequestContext needed)
 * and gated behind ARTICLE_TRUST_LLM=true so it never runs unless opted in. A
 * future LocalInferenceProvider implements the same interface against on-device
 * inference.
 */
export class HostedInferenceProvider implements ArticleInferenceProvider {
  readonly id = 'hosted-openai';
  private client: OpenAI | null = null;

  isEnabled(): boolean {
    return process.env.ARTICLE_TRUST_LLM === 'true' && !!config.aiConfig?.secretKey;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const opts: ClientOptions = {apiKey: config.aiConfig.secretKey, timeout: 60000, maxRetries: 1};
      // Lazy, and the `import type` above is the other half of it: this file is
      // synced to the self-hosted repo but AI is out of scope for that tier, so
      // neither `openai` nor the withheld ai_config.store should be a package a
      // box has to install. isEnabled() is false there, so neither is reached.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {OpenAI: OpenAIClient} = require('openai');
      this.client = new OpenAIClient(opts);
    }
    return this.client;
  }

  async analyze(input: ArticleInferenceInput): Promise<ArticleTrustLlm | null> {
    if (!this.isEnabled()) return null;
    // personal-optional: guarded, never reached on a self-hosted server
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {AI_MODEL_ALLOWLIST} = require('../_internal/ai_config.store');
    const model = AI_MODEL_ALLOWLIST[0];
    const system =
      'You are a neutral media-literacy assistant. Given an article, return strict JSON ' +
      '{"summary": string, "notes": string[]} with one balanced sentence summarizing the content ' +
      'and 0-3 short, concrete media-literacy notes. Do not moralize or take a political side.';
    const user = JSON.stringify({
      title: input.title,
      url: input.url,
      source: input.source,
      ruleSignals: input.signals.map((s) => s.label),
      text: input.text.slice(0, 6000),
    });
    try {
      const completion = await this.getClient().chat.completions.create({
        model,
        response_format: {type: 'json_object'},
        messages: [
          {role: 'system', content: system},
          {role: 'user', content: user},
        ],
      });
      const raw = completion.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(raw);
      return {
        summary: typeof parsed?.summary === 'string' ? parsed.summary : null,
        notes: Array.isArray(parsed?.notes) ? parsed.notes.filter((n: any) => typeof n === 'string').slice(0, 3) : [],
        model,
      };
    } catch (e) {
      console.warn('HostedInferenceProvider.analyze failed', e);
      return null;
    }
  }
}

let _provider: ArticleInferenceProvider | null = null;

/** Resolve the active provider. Defaults to Noop unless ARTICLE_TRUST_LLM=true. */
export function getArticleInferenceProvider(): ArticleInferenceProvider {
  if (!_provider) {
    _provider = process.env.ARTICLE_TRUST_LLM === 'true' ? new HostedInferenceProvider() : new NoopInferenceProvider();
  }
  return _provider;
}

/** Test/override hook. */
export function setArticleInferenceProvider(p: ArticleInferenceProvider | null): void {
  _provider = p;
}
