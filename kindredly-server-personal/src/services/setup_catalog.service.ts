import {RequestContext} from '@/base/request_context';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {publishedReader} from '@/services/published_access';
import type {
  AdminSetupCatalogResponse,
  AdminUpdateSetupCatalogRequest,
  ContentBundleLinkItem,
  GetSetupCatalogResponse,
  SetupAppItem,
  SetupCardKind,
  SetupGroupDefinition,
  SetupGroupView,
  SetupPageDefinition,
  SetupPageView,
  SetupSelectionMode,
  SetupTaskbarTarget,
} from 'tset-sharedlib/api';
import type Published from 'tset-sharedlib/schemas/public/Published';

type StoredSetupCatalog = {
  pages: SetupPageDefinition[];
  featuresStepEnabled?: boolean;
};

const SYSINFO_ID = 'setup_catalog_default';
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:']);
const VALID_TASKBAR_TARGETS = new Set<SetupTaskbarTarget>([
  'search',
  'chat',
  'email',
  'photos',
  'files',
  'music',
  'calendar',
]);

// Seeded so the setup flow works out of the box; admins can override via
// /admin/setupCatalog/update, which replaces this whole catalog.
const DEFAULT_PAGES: SetupPageDefinition[] = [
  {
    pageId: 'apps',
    title: 'Your apps',
    description: 'Pick the apps you use. We add them to your Taskbar for quick access.',
    groups: [
      {
        groupId: 'search',
        title: 'Search',
        description: 'Your main search engine.',
        kind: 'apps',
        selectionMode: 'single',
        apps: [
          {appId: 'google', label: 'Google', url: 'https://www.google.com', taskbarTarget: 'search'},
          {appId: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com', taskbarTarget: 'search'},
          {appId: 'brave', label: 'Brave Search', url: 'https://search.brave.com', taskbarTarget: 'search'},
          {appId: 'bing', label: 'Bing', url: 'https://www.bing.com', taskbarTarget: 'search'},
          {appId: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org', taskbarTarget: 'search'},
        ],
      },
      {
        groupId: 'ai',
        title: 'AI',
        kind: 'apps',
        selectionMode: 'multiple',
        apps: [
          {appId: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com', taskbarTarget: 'chat'},
          {appId: 'claude', label: 'Claude', url: 'https://claude.ai', taskbarTarget: 'chat'},
          {appId: 'gemini', label: 'Gemini', url: 'https://gemini.google.com', taskbarTarget: 'chat'},
          {appId: 'perplexity', label: 'Perplexity', url: 'https://www.perplexity.ai', taskbarTarget: 'chat'},
          {appId: 'copilot', label: 'Copilot', url: 'https://copilot.microsoft.com', taskbarTarget: 'chat'},
        ],
      },
      {
        groupId: 'email',
        title: 'Email',
        kind: 'apps',
        selectionMode: 'multiple',
        apps: [
          {appId: 'gmail', label: 'Gmail', url: 'https://mail.google.com', taskbarTarget: 'email'},
          {appId: 'outlook', label: 'Outlook', url: 'https://outlook.com', taskbarTarget: 'email'},
          {appId: 'proton', label: 'Proton Mail', url: 'https://mail.proton.me', taskbarTarget: 'email'},
          {appId: 'yahoo', label: 'Yahoo Mail', url: 'https://mail.yahoo.com', taskbarTarget: 'email'},
          {appId: 'icloud-mail', label: 'iCloud Mail', url: 'https://www.icloud.com/mail', taskbarTarget: 'email'},
        ],
      },
      {
        groupId: 'photos',
        title: 'Photos',
        kind: 'apps',
        selectionMode: 'multiple',
        apps: [
          {appId: 'google-photos', label: 'Google Photos', url: 'https://photos.google.com', taskbarTarget: 'photos'},
          {
            appId: 'icloud-photos',
            label: 'iCloud Photos',
            url: 'https://www.icloud.com/photos',
            taskbarTarget: 'photos',
          },
          {
            appId: 'amazon-photos',
            label: 'Amazon Photos',
            url: 'https://www.amazon.com/photos',
            taskbarTarget: 'photos',
          },
          {appId: 'flickr', label: 'Flickr', url: 'https://www.flickr.com', taskbarTarget: 'photos'},
        ],
      },
      {
        groupId: 'documents',
        title: 'Documents',
        kind: 'apps',
        selectionMode: 'multiple',
        apps: [
          {appId: 'google-docs', label: 'Google Docs', url: 'https://docs.google.com', taskbarTarget: 'files'},
          {appId: 'notion', label: 'Notion', url: 'https://www.notion.so', taskbarTarget: 'files'},
          {appId: 'office', label: 'Microsoft Office', url: 'https://www.office.com', taskbarTarget: 'files'},
          {appId: 'dropbox', label: 'Dropbox', url: 'https://www.dropbox.com', taskbarTarget: 'files'},
        ],
      },
    ],
  },
  {
    pageId: 'interests',
    title: 'Your interests',
    description: 'Add a few things worth coming back to.',
    groups: [
      {
        groupId: 'learn',
        title: 'Learn & explore',
        kind: 'links',
        selectionMode: 'multiple',
        links: [
          {linkId: 'wikipedia', title: 'Wikipedia', url: 'https://www.wikipedia.org'},
          {linkId: 'khan-academy', title: 'Khan Academy', url: 'https://www.khanacademy.org'},
          {linkId: 'ted', title: 'TED Talks', url: 'https://www.ted.com'},
          {linkId: 'smithsonian', title: 'Smithsonian', url: 'https://www.si.edu'},
          {linkId: 'natgeo', title: 'National Geographic', url: 'https://www.nationalgeographic.com'},
          {linkId: 'gutenberg', title: 'Project Gutenberg', url: 'https://www.gutenberg.org'},
        ],
      },
      {
        groupId: 'news',
        title: 'News',
        description: 'Even-handed sources.',
        kind: 'links',
        selectionMode: 'multiple',
        links: [
          {linkId: 'reuters', title: 'Reuters', url: 'https://www.reuters.com'},
          {linkId: 'ap', title: 'AP News', url: 'https://apnews.com'},
          {linkId: 'bbc', title: 'BBC News', url: 'https://www.bbc.com/news'},
          {linkId: 'npr', title: 'NPR', url: 'https://www.npr.org'},
          {linkId: 'csmonitor', title: 'Christian Science Monitor', url: 'https://www.csmonitor.com'},
          {linkId: 'ground-news', title: 'Ground News', url: 'https://ground.news'},
        ],
      },
    ],
  },
  {
    pageId: 'fun',
    title: 'For fun',
    description: 'A little downtime never hurt.',
    groups: [
      {
        groupId: 'comics',
        title: 'Comics',
        kind: 'links',
        selectionMode: 'multiple',
        links: [
          {linkId: 'xkcd', title: 'xkcd', url: 'https://xkcd.com'},
          {linkId: 'gocomics', title: 'GoComics', url: 'https://www.gocomics.com'},
          {linkId: 'oatmeal', title: 'The Oatmeal', url: 'https://theoatmeal.com'},
        ],
      },
      {
        groupId: 'puzzles',
        title: 'Puzzles & games',
        kind: 'links',
        selectionMode: 'multiple',
        links: [
          {linkId: 'nyt-games', title: 'NYT Games', url: 'https://www.nytimes.com/crosswords'},
          {linkId: 'lichess', title: 'Lichess', url: 'https://lichess.org'},
          {linkId: 'chesscom', title: 'Chess.com', url: 'https://www.chess.com'},
          {linkId: 'sudoku', title: 'Sudoku', url: 'https://sudoku.com'},
        ],
      },
    ],
  },
];

class SetupCatalogService {
  private sysInfo = new SysInfoRepo();
  private publishedService = publishedReader();

  private normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    const normalized = this.normalizeString(value);
    return normalized || undefined;
  }

  private createSlug(value: string, fallback: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return slug || fallback;
  }

  private normalizeBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private normalizeSelectionMode(value: unknown, fallback: SetupSelectionMode): SetupSelectionMode {
    return value === 'single' ? 'single' : fallback;
  }

  private normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(min, Math.min(max, Math.round(numericValue)));
  }

  private normalizeKind(value: unknown): SetupCardKind {
    if (value === 'apps' || value === 'links' || value === 'published') return value;
    return 'links';
  }

  private normalizeTaskbarTarget(value: unknown): SetupTaskbarTarget {
    return VALID_TASKBAR_TARGETS.has(value as SetupTaskbarTarget) ? (value as SetupTaskbarTarget) : 'files';
  }

  private normalizeURL(value: unknown): string | null {
    const raw = this.normalizeString(value);
    if (!raw) return null;
    try {
      const parsed = new URL(raw);
      if (!ALLOWED_LINK_PROTOCOLS.has(parsed.protocol)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private dedupeIds(ids: string[] | undefined | null): string[] {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  }

  private stripOwnerUserId<T extends Published>(published: T): T {
    if (!published) return published;
    delete (published as any).ownerUserId;
    return published;
  }

  private sanitizeAppItems(apps: SetupAppItem[] | undefined | null): SetupAppItem[] {
    const sanitized: SetupAppItem[] = [];
    const seen = new Set<string>();

    for (const app of apps || []) {
      const url = this.normalizeURL(app?.url);
      if (!url) continue;
      const label = this.normalizeString(app?.label) || url;
      const appId = this.createSlug(this.normalizeString(app?.appId) || label || url, `app-${sanitized.length + 1}`);
      if (seen.has(appId)) continue;
      seen.add(appId);

      sanitized.push({
        appId,
        label,
        url,
        icon: this.normalizeOptionalString(app?.icon),
        description: this.normalizeOptionalString(app?.description),
        taskbarTarget: this.normalizeTaskbarTarget(app?.taskbarTarget),
      });
    }

    return sanitized;
  }

  private sanitizeLinkItems(links: ContentBundleLinkItem[] | undefined | null): ContentBundleLinkItem[] {
    const sanitized: ContentBundleLinkItem[] = [];
    const seen = new Set<string>();

    for (const link of links || []) {
      const url = this.normalizeURL(link?.url);
      if (!url) continue;
      const title = this.normalizeString(link?.title) || url;
      const linkId = this.createSlug(
        this.normalizeString(link?.linkId) || title || url,
        `link-${sanitized.length + 1}`,
      );
      if (seen.has(linkId)) continue;
      seen.add(linkId);

      sanitized.push({
        linkId,
        title,
        url,
        description: this.normalizeOptionalString(link?.description),
        icon: this.normalizeOptionalString(link?.icon),
        categories: this.dedupeIds(link?.categories),
      });
    }

    return sanitized;
  }

  private sanitizeGroup(
    group: Partial<SetupGroupDefinition> | null | undefined,
    fallbackPrefix: string,
    fallbackIndex: number,
  ): SetupGroupDefinition | null {
    const kind = this.normalizeKind(group?.kind);
    const groupId = this.createSlug(
      this.normalizeString(group?.groupId) || this.normalizeString(group?.title),
      `${fallbackPrefix}-${fallbackIndex + 1}`,
    );
    const title = this.normalizeString(group?.title) || `Group ${fallbackIndex + 1}`;
    const selectionMode = this.normalizeSelectionMode(group?.selectionMode, 'multiple');
    const description = this.normalizeOptionalString(group?.description);

    if (kind === 'apps') {
      return {groupId, title, description, kind, selectionMode, apps: this.sanitizeAppItems(group?.apps)};
    }

    if (kind === 'links') {
      return {groupId, title, description, kind, selectionMode, links: this.sanitizeLinkItems(group?.links)};
    }

    return {
      groupId,
      title,
      description,
      kind,
      selectionMode,
      source: group?.source === 'manual' ? 'manual' : 'dynamic_curated',
      itemLimit: this.normalizeNumber(group?.itemLimit, 8, 1, 24),
      itemIds: this.dedupeIds(group?.itemIds),
      curated: this.normalizeBoolean(group?.curated, true),
      interestTags: this.dedupeIds(group?.interestTags),
    };
  }

  private sanitizePage(
    page: Partial<SetupPageDefinition> | null | undefined,
    index: number,
  ): SetupPageDefinition | null {
    const pageId = this.createSlug(
      this.normalizeString(page?.pageId) || this.normalizeString(page?.title),
      `page-${index + 1}`,
    );
    if (!pageId) return null;

    const groupInput = Array.isArray(page?.groups) ? page!.groups : [];
    const groups: SetupGroupDefinition[] = [];
    const seenGroupIds = new Set<string>();
    groupInput.forEach((group, groupIndex) => {
      const next = this.sanitizeGroup(group, `${pageId}-group`, groupIndex);
      if (!next || seenGroupIds.has(next.groupId)) return;
      seenGroupIds.add(next.groupId);
      groups.push(next);
    });

    return {
      pageId,
      title: this.normalizeString(page?.title) || pageId,
      description: this.normalizeOptionalString(page?.description),
      // Off by default — a page is only shown once an admin enables it.
      enabled: this.normalizeBoolean(page?.enabled, false),
      groups,
    };
  }

  private sanitizePages(pages: Partial<SetupPageDefinition>[] | null | undefined): SetupPageDefinition[] {
    const sanitized: SetupPageDefinition[] = [];
    const seenPageIds = new Set<string>();
    for (const [index, page] of (pages || []).entries()) {
      const next = this.sanitizePage(page, index);
      if (!next || seenPageIds.has(next.pageId)) continue;
      seenPageIds.add(next.pageId);
      sanitized.push(next);
    }
    return sanitized;
  }

  private async readStoredCatalog(): Promise<{
    usesDefaultCatalog: boolean;
    pages: SetupPageDefinition[];
    featuresStepEnabled: boolean;
  }> {
    const record = await this.sysInfo.findById(SYSINFO_ID);
    const stored = record?.data as StoredSetupCatalog | null;
    const featuresStepEnabled = this.normalizeBoolean(stored?.featuresStepEnabled, false);
    const storedPages = this.sanitizePages(stored?.pages);
    if (storedPages.length > 0) {
      return {usesDefaultCatalog: false, pages: storedPages, featuresStepEnabled};
    }
    return {usesDefaultCatalog: true, pages: this.sanitizePages(DEFAULT_PAGES), featuresStepEnabled};
  }

  private async resolveGroup(ctx: RequestContext, group: SetupGroupDefinition): Promise<SetupGroupView> {
    const selectionMode = group.selectionMode || 'multiple';

    if (group.kind === 'apps') {
      const apps = this.sanitizeAppItems(group.apps);
      const defaultSelectedEntryIds =
        selectionMode === 'single' ? [] : apps.map((app) => `app:${group.groupId}:${app.appId}`);
      return {
        groupId: group.groupId,
        title: group.title,
        description: this.normalizeString(group.description) || undefined,
        kind: 'apps',
        selectionMode,
        defaultSelectedEntryIds,
        apps,
      };
    }

    if (group.kind === 'links') {
      const links = this.sanitizeLinkItems(group.links);
      const defaultSelectedEntryIds =
        selectionMode === 'single' ? [] : links.map((link) => `link:${group.groupId}:${link.linkId}`);
      return {
        groupId: group.groupId,
        title: group.title,
        description: this.normalizeString(group.description) || undefined,
        kind: 'links',
        selectionMode,
        defaultSelectedEntryIds,
        links,
      };
    }

    const itemLimit = this.normalizeNumber(group.itemLimit, 8, 1, 24);
    let items: Published[] = [];
    if ((group.source === 'manual' ? 'manual' : 'dynamic_curated') === 'manual') {
      const itemIds = this.dedupeIds(group.itemIds).slice(0, itemLimit);
      if (itemIds.length > 0) {
        const manualItems = await this.publishedService.getPublishedWithIdsForView(ctx, itemIds);
        const lookup = new Map(manualItems.filter((item) => !!item?._id).map((item) => [item._id, item]));
        items = itemIds.map((id) => lookup.get(id)).filter((item): item is Published => !!item);
      }
    } else {
      const result = await this.publishedService.filteredSearchPublished(
        ctx,
        {curated: group.curated ?? true},
        {pageNum: 0, perPage: itemLimit},
      );
      items = ((result?.rows || []) as Published[]).filter((item) => !!item?._id);
    }

    const defaultSelectedEntryIds =
      selectionMode === 'single' ? [] : this.dedupeIds(items.map((item) => item._id)).map((id) => `published:${id}`);

    return {
      groupId: group.groupId,
      title: group.title,
      description: this.normalizeString(group.description) || undefined,
      kind: 'published',
      selectionMode,
      defaultSelectedEntryIds,
      items,
    };
  }

  private async resolveAdminItemPreviews(group: SetupGroupDefinition): Promise<Published[]> {
    if (group.kind !== 'published') return [];
    const itemIds = this.dedupeIds(group.itemIds).slice(0, 24);
    if (itemIds.length === 0) return [];
    const manualItems = await this.publishedService.getPublishedWithIds(itemIds);
    const lookup = new Map(
      manualItems.filter((item) => !!item?._id).map((item) => [item._id, this.stripOwnerUserId(item)]),
    );
    return itemIds.map((id) => lookup.get(id)).filter((item): item is Published => !!item);
  }

  async getAdminCatalog(): Promise<AdminSetupCatalogResponse> {
    const {pages, usesDefaultCatalog, featuresStepEnabled} = await this.readStoredCatalog();
    const pagesWithPreviews = await Promise.all(
      pages.map(async (page) => ({
        ...page,
        groups: await Promise.all(
          page.groups.map(async (group) => ({
            ...group,
            itemPreviews: await this.resolveAdminItemPreviews(group),
          })),
        ),
      })),
    );
    return {pages: pagesWithPreviews, usesDefaultCatalog, featuresStepEnabled};
  }

  async updateAdminCatalog(data: AdminUpdateSetupCatalogRequest): Promise<AdminSetupCatalogResponse> {
    const pages = this.sanitizePages(data?.pages);
    const featuresStepEnabled = this.normalizeBoolean(data?.featuresStepEnabled, false);
    // No custom pages and features off => fall back to the seeded defaults.
    if (pages.length === 0 && !featuresStepEnabled) {
      await this.sysInfo.deleteWithId(SYSINFO_ID);
      return await this.getAdminCatalog();
    }
    await this.sysInfo.create({_id: SYSINFO_ID, data: {pages, featuresStepEnabled}} as any);
    return await this.getAdminCatalog();
  }

  async resetAdminCatalog(): Promise<AdminSetupCatalogResponse> {
    await this.sysInfo.deleteWithId(SYSINFO_ID);
    return await this.getAdminCatalog();
  }

  async getCatalog(ctx: RequestContext): Promise<GetSetupCatalogResponse> {
    const {pages, featuresStepEnabled} = await this.readStoredCatalog();
    // Only resolve pages an admin has explicitly enabled — disabled pages are hidden
    // from onboarding entirely.
    const enabledPages = pages.filter((page) => page.enabled === true);
    const resolvedPages: SetupPageView[] = await Promise.all(
      enabledPages.map(async (page) => ({
        pageId: page.pageId,
        title: page.title,
        description: this.normalizeString(page.description) || undefined,
        groups: await Promise.all(page.groups.map((group) => this.resolveGroup(ctx, group))),
      })),
    );
    // Keep only groups that actually have something to show.
    const visiblePages = resolvedPages
      .map((page) => ({
        ...page,
        groups: page.groups.filter((group) =>
          group.kind === 'apps'
            ? (group.apps?.length || 0) > 0
            : group.kind === 'links'
              ? (group.links?.length || 0) > 0
              : (group.items?.length || 0) > 0,
        ),
      }))
      .filter((page) => page.groups.length > 0);

    return {pages: visiblePages, featuresStepEnabled};
  }
}

export default SetupCatalogService;
