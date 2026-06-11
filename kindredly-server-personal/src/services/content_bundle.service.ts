import {RequestContext} from '@/base/request_context';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import InternalPublishedService from '@/services/_internal/internal_published.service';
import type {
  AdminContentBundleCatalogResponse,
  AdminContentBundleDefinition,
  AdminContentBundleSectionDefinition,
  AdminUpdateContentBundleCatalogRequest,
  ContentBundleLinkItem,
  ContentBundleSectionSelectionMode,
  ContentBundleSectionView,
  ContentBundleView,
  RecommendContentBundlesRequest,
  RecommendContentBundlesResponse,
} from 'tset-sharedlib/api';
import {minAgeTagList, type MinAgeGroup} from 'tset-sharedlib/content.types';
import type Published from 'tset-sharedlib/schemas/public/Published';

type BundleDefinition = AdminContentBundleDefinition;

type StoredBundleCatalog = {
  bundles: BundleDefinition[];
};

type BundleSectionDefinition = AdminContentBundleSectionDefinition;

const SYSINFO_ID = 'content_bundles_default';
const VALID_MIN_AGE_GROUPS = new Set<MinAgeGroup>(minAgeTagList.map((tag) => tag.key));
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:']);

const DEFAULT_BUNDLES: BundleDefinition[] = [
  {
    bundleId: 'starter-ages-5-7',
    title: 'Starter Bundle (Ages 5-7)',
    description: 'A small starter set of curated content for early readers and young kids.',
    recommendedAgesLabel: 'Ages 5-7',
    minAge: 5,
    maxAge: 7,
    minAgeGroups: ['minage_prek', 'minage_kids'],
    itemLimit: 8,
    source: 'dynamic_curated',
  },
  {
    bundleId: 'starter-ages-8-10',
    title: 'Starter Bundle (Ages 8-10)',
    description: 'Curated starter content for kids who are ready for broader exploration.',
    recommendedAgesLabel: 'Ages 8-10',
    minAge: 8,
    maxAge: 10,
    minAgeGroups: ['minage_kids', 'minage_preteen'],
    itemLimit: 8,
    source: 'dynamic_curated',
  },
  {
    bundleId: 'starter-ages-11-13',
    title: 'Starter Bundle (Ages 11-13)',
    description: 'A curated starter set for preteens with broader educational and entertainment options.',
    recommendedAgesLabel: 'Ages 11-13',
    minAge: 11,
    maxAge: 13,
    minAgeGroups: ['minage_preteen', 'minage_teen'],
    itemLimit: 8,
    source: 'dynamic_curated',
  },
  {
    bundleId: 'starter-ages-14-17',
    title: 'Starter Bundle (Ages 14-17)',
    description: 'A curated starter set for teens with more independent exploration.',
    recommendedAgesLabel: 'Ages 14-17',
    minAge: 14,
    maxAge: 17,
    minAgeGroups: ['minage_teen'],
    itemLimit: 8,
    source: 'dynamic_curated',
  },
];

class ContentBundleService {
  private sysInfo = new SysInfoRepo();
  private publishedService = new InternalPublishedService();

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

  private normalizeSelectionMode(
    value: unknown,
    fallback: ContentBundleSectionSelectionMode,
  ): ContentBundleSectionSelectionMode {
    return value === 'single' ? 'single' : fallback;
  }

  private normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(min, Math.min(max, Math.round(numericValue)));
  }

  private stripOwnerUserId<T extends Published>(published: T): T {
    if (!published) return published;
    delete (published as any).ownerUserId;
    return published;
  }

  private dedupeIds(ids: string[] | undefined | null): string[] {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  }

  private sanitizeLinkItems(links: ContentBundleLinkItem[] | undefined | null): ContentBundleLinkItem[] {
    const sanitized: ContentBundleLinkItem[] = [];
    const seenLinkIds = new Set<string>();

    for (const link of links || []) {
      const title = this.normalizeString(link?.title);
      const url = this.normalizeURL(link?.url);
      if (!url) continue;

      const linkId = this.createSlug(
        this.normalizeString(link?.linkId) || title || url,
        `link-${sanitized.length + 1}`,
      );

      if (seenLinkIds.has(linkId)) continue;
      seenLinkIds.add(linkId);

      sanitized.push({
        linkId,
        title: title || url,
        url,
        description: this.normalizeOptionalString(link?.description),
        icon: this.normalizeOptionalString(link?.icon),
        categories: this.dedupeIds(link?.categories),
      });
    }

    return sanitized;
  }

  private normalizeURL(value: unknown): string | null {
    const raw = this.normalizeString(value);
    if (!raw) return null;

    try {
      const parsed = new URL(raw);
      if (!ALLOWED_LINK_PROTOCOLS.has(parsed.protocol)) {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private sanitizeSectionDefinition(
    section: Partial<BundleSectionDefinition> | null | undefined,
    fallbackPrefix: string,
    fallbackIndex: number,
  ): BundleSectionDefinition | null {
    const kind = section?.kind === 'links' ? 'links' : 'published';
    const sectionId = this.createSlug(
      this.normalizeString(section?.sectionId) || this.normalizeString(section?.title),
      `${fallbackPrefix}-${fallbackIndex + 1}`,
    );

    const title = this.normalizeString(section?.title) || `Section ${fallbackIndex + 1}`;

    if (kind === 'links') {
      return {
        sectionId,
        title,
        description: this.normalizeOptionalString(section?.description),
        kind,
        selectionMode: this.normalizeSelectionMode(section?.selectionMode, 'multiple'),
        links: this.sanitizeLinkItems(section?.links),
      };
    }

    const minAgeGroups = this.dedupeIds(section?.minAgeGroups as string[]).filter((group): group is MinAgeGroup =>
      VALID_MIN_AGE_GROUPS.has(group as MinAgeGroup),
    );

    return {
      sectionId,
      title,
      description: this.normalizeOptionalString(section?.description),
      kind,
      selectionMode: this.normalizeSelectionMode(section?.selectionMode, 'multiple'),
      source: section?.source === 'manual' ? 'manual' : 'dynamic_curated',
      minAgeGroups,
      itemLimit: this.normalizeNumber(section?.itemLimit, 8, 1, 24),
      itemIds: this.dedupeIds(section?.itemIds),
      curated: this.normalizeBoolean(section?.curated, true),
    };
  }

  private buildLegacySection(definition: Partial<BundleDefinition>, bundleId: string): BundleSectionDefinition {
    return {
      sectionId: `${bundleId}-content`,
      title: 'Main Picks',
      description: undefined,
      kind: 'published',
      selectionMode: 'multiple',
      source: definition?.source === 'manual' ? 'manual' : 'dynamic_curated',
      minAgeGroups: this.dedupeIds(definition?.minAgeGroups as string[]).filter((group): group is MinAgeGroup =>
        VALID_MIN_AGE_GROUPS.has(group as MinAgeGroup),
      ),
      itemLimit: this.normalizeNumber(definition?.itemLimit, 8, 1, 24),
      itemIds: this.dedupeIds(definition?.itemIds),
      curated: this.normalizeBoolean(definition?.curated, true),
    };
  }

  private getSectionsForDefinition(definition: Partial<BundleDefinition>, bundleId: string): BundleSectionDefinition[] {
    const sectionInput =
      Array.isArray(definition?.sections) && definition.sections.length > 0
        ? definition.sections
        : [this.buildLegacySection(definition, bundleId)];

    const sanitized: BundleSectionDefinition[] = [];
    const seenSectionIds = new Set<string>();

    sectionInput.forEach((section, index) => {
      const nextSection = this.sanitizeSectionDefinition(section, `${bundleId}-section`, index);
      if (!nextSection || seenSectionIds.has(nextSection.sectionId)) return;
      seenSectionIds.add(nextSection.sectionId);
      sanitized.push(nextSection);
    });

    return sanitized;
  }

  private sanitizeDefinition(definition: Partial<BundleDefinition> | null | undefined): BundleDefinition | null {
    const bundleId = this.normalizeString(definition?.bundleId);
    if (!bundleId) return null;

    const minAge = this.normalizeNumber(definition?.minAge, 5, 0, 99);
    const maxAge = Math.max(minAge, this.normalizeNumber(definition?.maxAge, minAge, 0, 99));
    const source = definition?.source === 'manual' ? 'manual' : 'dynamic_curated';
    const minAgeGroups = this.dedupeIds(definition?.minAgeGroups as string[]).filter((group): group is MinAgeGroup =>
      VALID_MIN_AGE_GROUPS.has(group as MinAgeGroup),
    );

    return {
      bundleId,
      title: this.normalizeString(definition?.title) || bundleId,
      description: this.normalizeString(definition?.description),
      recommendedAgesLabel: this.normalizeString(definition?.recommendedAgesLabel) || `Ages ${minAge}-${maxAge}`,
      minAge,
      maxAge,
      minAgeGroups,
      itemLimit: this.normalizeNumber(definition?.itemLimit, 8, 1, 24),
      itemIds: this.dedupeIds(definition?.itemIds),
      curated: this.normalizeBoolean(definition?.curated, true),
      source,
      sections: this.getSectionsForDefinition(definition, bundleId),
    };
  }

  private sanitizeDefinitions(definitions: Partial<BundleDefinition>[] | null | undefined): BundleDefinition[] {
    const sanitized: BundleDefinition[] = [];
    const seenBundleIds = new Set<string>();

    for (const definition of definitions || []) {
      const nextDefinition = this.sanitizeDefinition(definition);
      if (!nextDefinition || seenBundleIds.has(nextDefinition.bundleId)) {
        continue;
      }
      seenBundleIds.add(nextDefinition.bundleId);
      sanitized.push(nextDefinition);
    }

    return sanitized;
  }

  private async readStoredCatalog(): Promise<{usesDefaultCatalog: boolean; bundles: BundleDefinition[]}> {
    const record = await this.sysInfo.findById(SYSINFO_ID);
    const storedBundles = this.sanitizeDefinitions((record?.data as StoredBundleCatalog | null)?.bundles);
    if (storedBundles.length > 0) {
      return {
        usesDefaultCatalog: false,
        bundles: storedBundles,
      };
    }

    return {
      usesDefaultCatalog: true,
      bundles: this.sanitizeDefinitions(DEFAULT_BUNDLES),
    };
  }

  private async getDefinitions(): Promise<BundleDefinition[]> {
    const {bundles} = await this.readStoredCatalog();
    return bundles;
  }

  private getRecommendedBundleId(bundles: ContentBundleView[], age?: number | null): string | null {
    if (typeof age !== 'number' || Number.isNaN(age)) {
      return bundles[0]?.bundleId || null;
    }

    const directMatch = bundles.find((bundle) => age >= bundle.minAge && age <= bundle.maxAge);
    return directMatch?.bundleId || bundles[0]?.bundleId || null;
  }

  private async resolveBundleItems(
    ctx: RequestContext,
    definition: BundleDefinition,
    limitOverride?: number,
  ): Promise<ContentBundleView> {
    const bundleSections = Array.isArray(definition.sections) ? definition.sections : [];
    const sections: ContentBundleSectionView[] = [];
    let resolvedSource: 'dynamic_curated' | 'manual' = definition.source;

    for (const section of bundleSections) {
      if (section.kind === 'links') {
        const links = this.sanitizeLinkItems(section.links);
        const defaultSelectedEntryIds = links.map((link) => `link:${section.sectionId}:${link.linkId}`);
        sections.push({
          sectionId: section.sectionId,
          title: section.title,
          description: this.normalizeString(section.description),
          kind: 'links',
          selectionMode: section.selectionMode || 'multiple',
          defaultSelectedEntryIds: (section.selectionMode || 'multiple') === 'single' ? [] : defaultSelectedEntryIds,
          links,
        });
        continue;
      }

      const sectionItemLimit = Math.max(
        1,
        Math.min(24, Math.round(limitOverride || section.itemLimit || definition.itemLimit || 8)),
      );

      let sectionItems: Published[] = [];
      const sectionSource = section.source === 'manual' ? 'manual' : 'dynamic_curated';
      if (sectionSource === 'manual') {
        const itemIds = this.dedupeIds(section.itemIds).slice(0, sectionItemLimit);
        if (itemIds.length > 0) {
          const manualItems = await this.publishedService.getPublishedWithIdsForView(ctx, itemIds);
          const itemLookup = new Map(manualItems.filter((item) => !!item?._id).map((item) => [item._id, item]));
          sectionItems = itemIds.map((itemId) => itemLookup.get(itemId)).filter((item): item is Published => !!item);
        }
      } else {
        const result = await this.publishedService.filteredSearchPublished(
          ctx,
          {
            curated: section.curated ?? true,
            minAgeGroup:
              Array.isArray(section.minAgeGroups) && section.minAgeGroups.length > 0 ? section.minAgeGroups : undefined,
          },
          {
            pageNum: 0,
            perPage: sectionItemLimit,
          },
        );

        sectionItems = ((result?.rows || []) as Published[]).filter((item) => !!item?._id);
      }

      if (sectionSource === 'dynamic_curated') {
        resolvedSource = 'dynamic_curated';
      }

      const defaultSelectedEntryIds = this.dedupeIds(sectionItems.map((item) => item._id)).map(
        (itemId) => `published:${itemId}`,
      );

      sections.push({
        sectionId: section.sectionId,
        title: section.title,
        description: this.normalizeString(section.description),
        kind: 'published',
        selectionMode: section.selectionMode || 'multiple',
        defaultSelectedEntryIds: (section.selectionMode || 'multiple') === 'single' ? [] : defaultSelectedEntryIds,
        items: sectionItems,
      });
    }

    return {
      bundleId: definition.bundleId,
      title: definition.title,
      description: definition.description,
      recommendedAgesLabel: definition.recommendedAgesLabel,
      minAge: definition.minAge,
      maxAge: definition.maxAge,
      itemLimit: Math.max(1, Math.min(24, Math.round(limitOverride || definition.itemLimit || 8))),
      source: resolvedSource,
      sections,
    };
  }

  private async resolveAdminItemPreviews(section: BundleSectionDefinition): Promise<Published[]> {
    const itemIds = this.dedupeIds(section.itemIds).slice(0, 24);
    if (itemIds.length === 0) {
      return [];
    }

    const manualItems = await this.publishedService.getPublishedWithIds(itemIds);
    const itemLookup = new Map(
      manualItems.filter((item) => !!item?._id).map((item) => [item._id, this.stripOwnerUserId(item)]),
    );

    return itemIds.map((itemId) => itemLookup.get(itemId)).filter((item): item is Published => !!item);
  }

  async getAdminCatalog(): Promise<AdminContentBundleCatalogResponse> {
    const {bundles, usesDefaultCatalog} = await this.readStoredCatalog();
    const bundlesWithPreviews = await Promise.all(
      bundles.map(async (bundle) => ({
        ...bundle,
        sections: await Promise.all(
          (bundle.sections || []).map(async (section) => ({
            ...section,
            itemPreviews: section.kind === 'published' ? await this.resolveAdminItemPreviews(section) : [],
          })),
        ),
      })),
    );

    return {
      bundles: bundlesWithPreviews,
      usesDefaultCatalog,
    };
  }

  async updateAdminCatalog(data: AdminUpdateContentBundleCatalogRequest): Promise<AdminContentBundleCatalogResponse> {
    const bundles = this.sanitizeDefinitions(data?.bundles);
    if (bundles.length === 0) {
      await this.sysInfo.deleteWithId(SYSINFO_ID);
      return await this.getAdminCatalog();
    }

    await this.sysInfo.create({
      _id: SYSINFO_ID,
      data: {bundles},
    } as any);

    return await this.getAdminCatalog();
  }

  async resetAdminCatalog(): Promise<AdminContentBundleCatalogResponse> {
    await this.sysInfo.deleteWithId(SYSINFO_ID);
    return await this.getAdminCatalog();
  }

  async recommend(ctx: RequestContext, data: RecommendContentBundlesRequest): Promise<RecommendContentBundlesResponse> {
    const definitions = await this.getDefinitions();
    const bundles = await Promise.all(
      definitions.map((definition) => this.resolveBundleItems(ctx, definition, data?.limitPerBundle)),
    );
    const visibleBundles = bundles.filter((bundle) =>
      bundle.sections.some((section) =>
        section.kind === 'links' ? (section.links?.length || 0) > 0 : (section.items?.length || 0) > 0,
      ),
    );
    const finalBundles = visibleBundles.length > 0 ? visibleBundles : bundles;

    return {
      recommendedBundleId: this.getRecommendedBundleId(finalBundles, data?.age),
      bundles: finalBundles,
    };
  }
}

export default ContentBundleService;
