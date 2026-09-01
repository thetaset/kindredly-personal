import axios from 'axios';
import * as crypto from 'crypto';
import * as cheerio from 'cheerio';
import {v4 as uuidv4} from 'uuid';

import {config} from '@/config';
import {urlToKey} from 'tset-sharedlib/text.utils';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import ExternalDataService from '@/services/external_data.service';
import {ContentSourceDraftRepo, type ContentSourceDraftRow} from '@/db/content_source_draft.repo';

import type {
  AdminContentSourceAppendCandidatesRequest,
  AdminContentSourceAppendCandidatesResponse,
  AdminContentSourceCreateDraftRequest,
  AdminContentSourceCreateDraftResponse,
  AdminContentSourceDraft,
  AdminContentSourceFetchUrlsRequest,
  AdminContentSourceFetchUrlsResponse,
  AdminContentSourceGetDraftRequest,
  AdminContentSourceGetDraftResponse,
  AdminContentSourceListDraftsResponse,
  AdminContentSourceParseFeedRequest,
  AdminContentSourceParseFeedResponse,
  AdminContentSourcePromoteDraftRequest,
  AdminContentSourcePromoteDraftResponse,
  AdminContentSourceRemoveCandidateRequest,
  AdminContentSourceRemoveCandidateResponse,
  AdminContentSourceSearchPodcastsRequest,
  AdminContentSourceSearchPodcastsResponse,
  AdminContentLoaderManifestRecord,
  ContentSourceCandidate,
  PodcastFeedLookupRequest,
  PodcastFeedLookupResponse,
} from 'tset-sharedlib/api';

const PODCAST_USE_CRITERIA = ['ct_other', 'topic_podcasts'];
const MANIFEST_SCHEMA = 'kindredly.admin-content-loader-manifest.v1';

/**
 * ContentSourceService — the "front door" of the agent-driven importer.
 *
 * Connectors pull candidate content from external sources (Apple/iTunes,
 * Podcast Index, RSS/feed URLs, arbitrary URLs); candidates accumulate in a
 * staging draft. `promoteDraft` emits a normal content-loader manifest that
 * rides the existing dry-run/enrich/human-approve pipeline — nothing here
 * publishes anything directly.
 */
class ContentSourceService {
  private repo = new ContentSourceDraftRepo();
  private externalDataService = new ExternalDataService();

  // ------------------------------------------------------------------
  // Connectors
  // ------------------------------------------------------------------

  async searchPodcasts(
    req: AdminContentSourceSearchPodcastsRequest,
  ): Promise<AdminContentSourceSearchPodcastsResponse> {
    const term = (req.term || '').trim();
    if (!term) throw new Error('A search term is required.');
    const limit = Math.min(Math.max(req.limit || 25, 1), 100);
    const provider = req.provider === 'podcastindex' ? 'podcastindex' : 'itunes';

    if (provider === 'podcastindex') {
      return await this.searchPodcastIndex(term, limit);
    }
    return await this.searchItunes(term, limit, req.country || 'US');
  }

  private async searchItunes(
    term: string,
    limit: number,
    country: string,
  ): Promise<AdminContentSourceSearchPodcastsResponse> {
    const resp = await axios.get(
      'https://itunes.apple.com/search',
      safeFetchConfig({params: {media: 'podcast', term, limit, country}}),
    );
    const results: any[] = Array.isArray(resp.data?.results) ? resp.data.results : [];
    const candidates = results.map((r) => this.candidateFromItunes(r)).filter((c): c is ContentSourceCandidate => !!c);
    return {provider: 'itunes', candidates};
  }

  /**
   * Resolve a podcast's RSS feed from an Apple Podcasts show id.
   *
   * A saved podcast is usually a `podcasts.apple.com/…/id1234567890` directory
   * page, which declares no feed in its `<head>` — so feed autodiscovery can
   * never repair those items. iTunes' lookup endpoint maps the id straight to
   * `feedUrl`. Separate from `searchItunes` because that one is term-only.
   */
  async lookupPodcastFeed(req: PodcastFeedLookupRequest): Promise<PodcastFeedLookupResponse> {
    const appleId = String(req?.appleId || '').trim();
    const term = String(req?.term || '').trim();

    if (appleId) {
      if (!/^\d{1,20}$/.test(appleId)) throw new Error('appleId must be numeric.');
      const resp = await axios.get(
        'https://itunes.apple.com/lookup',
        safeFetchConfig({params: {id: appleId, entity: 'podcast'}}),
      );
      const results: any[] = Array.isArray(resp.data?.results) ? resp.data.results : [];
      const candidates = results
        .map((r) => this.candidateFromItunes(r))
        .filter((c): c is ContentSourceCandidate => !!c);
      return {provider: 'itunes', candidates};
    }

    if (!term) throw new Error('Provide an appleId or a term.');
    return await this.searchItunes(term, Math.min(Math.max(req.limit || 5, 1), 25), req.country || 'US');
  }

  private candidateFromItunes(r: any): ContentSourceCandidate | null {
    const name = r?.collectionName || r?.trackName;
    if (!name) return null;
    const feedUrl = r?.feedUrl || null;
    return {
      source: 'itunes',
      sourceRef: r?.collectionId ? String(r.collectionId) : feedUrl,
      name,
      // iTunes search has no real description field (collectionCensoredName is just the name).
      description: null,
      url: feedUrl || r?.collectionViewUrl || null,
      resourceKind: 'podcast',
      imageSrc: r?.artworkUrl600 || r?.artworkUrl100 || null,
      provider: r?.artistName || null,
      suggestedCategories: [],
      suggestedUseCriteria: [...PODCAST_USE_CRITERIA],
      raw: {feedUrl, genre: r?.primaryGenreName, viewUrl: r?.collectionViewUrl, trackCount: r?.trackCount},
    };
  }

  private async searchPodcastIndex(term: string, limit: number): Promise<AdminContentSourceSearchPodcastsResponse> {
    const key = config.podcastIndex?.key;
    const secret = config.podcastIndex?.secret;
    if (!key || !secret) {
      return {
        provider: 'podcastindex',
        candidates: [],
        warnings: ['Podcast Index is not configured (set PODCAST_INDEX_KEY and PODCAST_INDEX_SECRET).'],
      };
    }
    const authDate = Math.floor(Date.now() / 1000).toString();
    const authHash = crypto
      .createHash('sha1')
      .update(key + secret + authDate)
      .digest('hex');
    const resp = await axios.get(
      'https://api.podcastindex.org/api/1.0/search/byterm',
      safeFetchConfig({
        params: {q: term, max: limit},
        headers: {
          'X-Auth-Key': key,
          'X-Auth-Date': authDate,
          Authorization: authHash,
          'User-Agent': 'Kindredly-ContentSource/1.0',
        },
      }),
    );
    const feeds: any[] = Array.isArray(resp.data?.feeds) ? resp.data.feeds : [];
    const candidates = feeds
      .map((f) => this.candidateFromPodcastIndex(f))
      .filter((c): c is ContentSourceCandidate => !!c);
    return {provider: 'podcastindex', candidates};
  }

  private candidateFromPodcastIndex(f: any): ContentSourceCandidate | null {
    const name = f?.title;
    if (!name) return null;
    return {
      source: 'podcastindex',
      sourceRef: f?.id ? String(f.id) : f?.url || null,
      name,
      description: f?.description || null,
      url: f?.url || f?.link || null,
      resourceKind: 'podcast',
      imageSrc: f?.artwork || f?.image || null,
      provider: f?.author || f?.ownerName || null,
      suggestedCategories: [],
      suggestedUseCriteria: [...PODCAST_USE_CRITERIA],
      raw: {feedUrl: f?.url, link: f?.link},
    };
  }

  async parseFeed(req: AdminContentSourceParseFeedRequest): Promise<AdminContentSourceParseFeedResponse> {
    const feedUrl = (req.feedUrl || '').trim();
    assertSafeExternalUrl(feedUrl);
    // `?? 5` so an explicit maxItems of 0 (just the show candidate) is honored.
    const maxItems = Math.min(Math.max(req.maxItems ?? 5, 0), 25);

    const resp = await axios.get(
      feedUrl,
      safeFetchConfig({responseType: 'text', headers: {Accept: 'application/rss+xml, application/xml, text/xml, */*'}}),
    );
    const xml = typeof resp.data === 'string' ? resp.data : String(resp.data ?? '');
    const $ = cheerio.load(xml, {xmlMode: true});

    const channel = $('channel').first();
    const isAtom = channel.length === 0 && $('feed').first().length > 0;
    const root = isAtom ? $('feed').first() : channel;

    const pick = (sel: string) => root.children(sel).first().text().trim();
    // Atom: prefer the human page (rel="alternate" / no rel) over the feed's own rel="self".
    const atomLink = () => {
      let alt = '';
      let noRel = '';
      let other = '';
      root.children('link').each((_i, el) => {
        const rel = String($(el).attr('rel') || '').toLowerCase();
        const href = $(el).attr('href') || '';
        if (!href) return;
        if (rel === 'alternate' && !alt) alt = href;
        else if (!rel && !noRel) noRel = href;
        else if (rel !== 'self' && !other) other = href;
      });
      return alt || noRel || other || root.children('link').first().attr('href') || '';
    };
    const title = pick('title') || $('title').first().text().trim();
    const link = isAtom ? atomLink() : pick('link');
    const description =
      pick('description') || this.nsText($, root, 'itunes:summary') || this.nsText($, root, 'subtitle');
    const image =
      root.children('image').children('url').first().text().trim() ||
      this.nsAttr($, root, 'itunes:image', 'href') ||
      this.nsAttr($, root, 'logo', 'href') ||
      null;
    const author = this.nsText($, root, 'itunes:author') || pick('managingEditor') || null;
    const isPodcast =
      !!this.nsAttr($, root, 'itunes:image', 'href') ||
      !!this.nsText($, root, 'itunes:author') ||
      /itunes/i.test(xml.slice(0, 600));

    const itemSel = isAtom ? 'entry' : 'item';
    const recentItems: Array<{title: string; url?: string | null; publishedAt?: string | null}> = [];
    root
      .find(itemSel)
      .slice(0, maxItems)
      .each((_i, el) => {
        const node = $(el);
        const itemTitle = node.children('title').first().text().trim();
        if (!itemTitle) return;
        const itemUrl = isAtom
          ? node.children('link').first().attr('href') || null
          : node.children('link').first().text().trim() || node.children('enclosure').first().attr('url') || null;
        const publishedAt =
          node.children('pubDate').first().text().trim() || node.children('published').first().text().trim() || null;
        recentItems.push({title: itemTitle, url: itemUrl, publishedAt});
      });

    const candidate: ContentSourceCandidate = {
      source: 'feed',
      sourceRef: feedUrl,
      name: title || feedUrl,
      description: description || null,
      url: link || feedUrl,
      resourceKind: isPodcast ? 'podcast' : 'feed',
      imageSrc: image,
      provider: author,
      suggestedCategories: [],
      suggestedUseCriteria: isPodcast ? [...PODCAST_USE_CRITERIA] : [],
      raw: {feedUrl, isAtom},
    };

    return {candidate, recentItems};
  }

  async fetchUrls(req: AdminContentSourceFetchUrlsRequest): Promise<AdminContentSourceFetchUrlsResponse> {
    const urls = Array.from(new Set((req.urls || []).map((u) => (u || '').trim()).filter(Boolean))).slice(0, 50);
    const candidates: ContentSourceCandidate[] = [];
    const errors: Array<{url: string; error: string}> = [];

    // Bounded parallelism: fetching up to 50 URLs serially can blow past the
    // request timeout. Fetch in small concurrent batches instead.
    const CONCURRENCY = 6;
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (url): Promise<{candidate?: ContentSourceCandidate; error?: {url: string; error: string}}> => {
          try {
            assertSafeExternalUrl(url);
            const meta = await this.externalDataService.fetchMetadata(url);
            const m = meta as Record<string, any>;
            return {
              candidate: {
                source: 'url',
                sourceRef: url,
                name: m.title || url,
                description: m.description || null,
                url,
                resourceKind: m.type || 'website',
                imageSrc: m.imageSrc || m.bannerImageSrcPath || null,
                provider: m.siteName || null,
                suggestedCategories: [],
                suggestedUseCriteria: [],
                raw: {favicon: m.favicon || null},
              },
            };
          } catch (e: any) {
            return {error: {url, error: e?.message || 'Failed to fetch URL'}};
          }
        }),
      );
      for (const r of results) {
        if (r.candidate) candidates.push(r.candidate);
        else if (r.error) errors.push(r.error);
      }
    }

    return {candidates, errors};
  }

  // ------------------------------------------------------------------
  // Staging drafts
  // ------------------------------------------------------------------

  async createDraft(
    req: AdminContentSourceCreateDraftRequest,
    createdByUserId: string | null = null,
  ): Promise<AdminContentSourceCreateDraftResponse> {
    const row = await this.repo.insert({
      _id: `csd_${uuidv4()}`,
      label: (req.label || '').trim() || null,
      status: 'open',
      candidates: [],
      createdByUserId,
    });
    return {draft: this.toDraft(row)};
  }

  async listDrafts(): Promise<AdminContentSourceListDraftsResponse> {
    const rows = await this.repo.list();
    return {
      drafts: rows.map((row) => {
        const d = this.toDraft(row);
        const {candidates, ...summary} = d;
        return summary;
      }),
    };
  }

  async getDraft(req: AdminContentSourceGetDraftRequest): Promise<AdminContentSourceGetDraftResponse> {
    const row = await this.requireDraft(req.draftId);
    return {draft: this.toDraft(row)};
  }

  async appendCandidates(
    req: AdminContentSourceAppendCandidatesRequest,
  ): Promise<AdminContentSourceAppendCandidatesResponse> {
    const row = await this.requireDraft(req.draftId);
    const existing = this.candidatesOf(row);
    const seen = new Set(existing.map((c) => this.candidateKey(c)));

    let addedCount = 0;
    let skippedDuplicateCount = 0;
    const defaults = req.defaults || {};

    for (const incoming of req.candidates || []) {
      if (!incoming || !incoming.name) continue;
      const candidate = this.applyDefaults(incoming, defaults);
      const key = this.candidateKey(candidate);
      if (seen.has(key)) {
        skippedDuplicateCount++;
        continue;
      }
      seen.add(key);
      existing.push(candidate);
      addedCount++;
    }

    const updated = await this.repo.updateCandidates(req.draftId, existing);
    return {draft: this.toDraft(updated), addedCount, skippedDuplicateCount};
  }

  async removeCandidate(
    req: AdminContentSourceRemoveCandidateRequest,
  ): Promise<AdminContentSourceRemoveCandidateResponse> {
    const row = await this.requireDraft(req.draftId);
    const remaining = this.candidatesOf(row).filter((c) => this.candidateKey(c) !== req.candidateKey);
    const updated = await this.repo.updateCandidates(req.draftId, remaining);
    return {draft: this.toDraft(updated)};
  }

  async promoteDraft(req: AdminContentSourcePromoteDraftRequest): Promise<AdminContentSourcePromoteDraftResponse> {
    const row = await this.requireDraft(req.draftId);
    const candidates = this.candidatesOf(row);
    const usedLocalIds = new Set<string>();
    const records: AdminContentLoaderManifestRecord[] = candidates.map((c, i) =>
      this.toManifestRecord(c, i, usedLocalIds),
    );

    const manifest = {
      schema: MANIFEST_SCHEMA,
      title: row.label || 'Agent import draft',
      version: new Date().toISOString().slice(0, 10),
      notes: [
        'Generated from an agent-driven content-source draft.',
        'Records import as inactive (published: false) and require admin review via the standard dry-run pipeline.',
      ],
      records,
    };

    return {manifestText: JSON.stringify(manifest, null, 2), recordCount: records.length};
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private async requireDraft(draftId: string): Promise<ContentSourceDraftRow> {
    const row = await this.repo.findById(draftId);
    if (!row) throw new Error(`Content source draft not found: ${draftId}`);
    return row;
  }

  private candidatesOf(row: ContentSourceDraftRow): ContentSourceCandidate[] {
    const raw = row.candidates as unknown;
    if (Array.isArray(raw)) return raw as ContentSourceCandidate[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private applyDefaults(
    c: ContentSourceCandidate,
    defaults: {categories?: string[]; useCriteria?: string[]},
  ): ContentSourceCandidate {
    return {
      ...c,
      suggestedCategories:
        c.suggestedCategories && c.suggestedCategories.length ? c.suggestedCategories : defaults.categories || [],
      suggestedUseCriteria:
        c.suggestedUseCriteria && c.suggestedUseCriteria.length ? c.suggestedUseCriteria : defaults.useCriteria || [],
    };
  }

  /**
   * Text of a namespaced channel-level tag (e.g. "itunes:summary"). Uses direct
   * children so values don't leak in from a nested <item> when the channel
   * itself lacks the tag.
   */
  private nsText(_$: any, root: any, tag: string): string {
    return root.children(tag.replace(':', '\\:')).first().text().trim();
  }

  /** Attribute of a namespaced channel-level tag (e.g. "itunes:image" href), direct children only. */
  private nsAttr(_$: any, root: any, tag: string, attr: string): string | null {
    return root.children(tag.replace(':', '\\:')).first().attr(attr) || null;
  }

  private candidateKey(c: ContentSourceCandidate): string {
    // urlToKey canonicalizes scheme/www/trailing-slash so the same resource
    // dedupes regardless of how its URL was written.
    const key = c.url ? urlToKey(c.url) : '';
    return key || (c.sourceRef ? `${c.source}:${c.sourceRef}` : '') || (c.name || '').trim().toLowerCase();
  }

  private slugify(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  private kindToken(resourceKind?: string | null): string {
    switch ((resourceKind || '').toLowerCase()) {
      case 'podcast':
        return 'podcast';
      case 'feed':
        return 'feed';
      case 'yt_channel':
        return 'youtube';
      case 'app':
        return 'app';
      default:
        return 'web';
    }
  }

  /**
   * Records are always the primary `link` type; the specific kind goes in
   * subType (website/podcast/yt_channel/app) so the published item flows through
   * the same link-family code paths (search, metadata enrichment, open action).
   */
  private subTypeForKind(resourceKind?: string | null): string {
    switch ((resourceKind || '').toLowerCase()) {
      case 'podcast':
        return 'podcast';
      case 'yt_channel':
        return 'yt_channel';
      case 'yt_video':
        return 'yt_video';
      case 'app':
        return 'app';
      default:
        // website, feed, interactive, and anything else.
        return 'website';
    }
  }

  private toManifestRecord(
    c: ContentSourceCandidate,
    index: number,
    usedLocalIds: Set<string>,
  ): AdminContentLoaderManifestRecord {
    const baseSlug = this.slugify(c.name) || `item-${index + 1}`;
    let localId = baseSlug;
    let n = 2;
    while (usedLocalIds.has(localId)) {
      localId = `${baseSlug}-${n++}`;
    }
    usedLocalIds.add(localId);

    const kind = this.kindToken(c.resourceKind);
    const data: Record<string, any> = {sourceKind: 'agent_import', source: c.source};
    if (c.url) data.url = c.url;
    if (c.provider) data.provider = c.provider;
    if (c.resourceKind) data.resourceKind = c.resourceKind;
    if (c.imageSrc) data.imageSrc = c.imageSrc;

    return {
      localId,
      // Identity keys derive from the de-duplicated localId so two same-named
      // candidates don't collide on easyId/sourceItemId at import time.
      easyId: `agent-${c.source}-${localId}`,
      sourceItemId: `agent-${c.source}:${kind}:${localId}`,
      type: 'link',
      subType: this.subTypeForKind(c.resourceKind),
      name: c.name,
      description: c.description || undefined,
      url: c.url || undefined,
      categories: c.suggestedCategories || [],
      useCriteria: c.suggestedUseCriteria || [],
      childLocalIds: [],
      data,
      // meta.imageSrc is the content loader's canonical image field (drives the
      // banner download + enrich). Seed it from the candidate artwork (e.g. the
      // iTunes podcast cover) so the image carries through import — data.imageSrc
      // alone is ignored by the loader.
      meta: {seedTheme: 'agent-import', source: c.source, ...(c.imageSrc ? {imageSrc: c.imageSrc} : {})},
      published: false,
    };
  }

  private toDraft(row: ContentSourceDraftRow): AdminContentSourceDraft {
    const candidates = this.candidatesOf(row);
    return {
      draftId: row._id,
      label: row.label ?? null,
      status: row.status,
      candidateCount: candidates.length,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      candidates,
    };
  }
}

export default ContentSourceService;
