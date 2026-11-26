/**
 * The suggestion lists the native Home searches before the web app is up (PNH-5).
 *
 * Three files beside the Home copy, each written by the web app (`tset-client/src/app/nativeHomeSuggest.ts`)
 * and read by the phones (`HomeSuggestStore.kt`, `HomeSuggestStore.swift`):
 * - the person's own (`home-suggest-own.json`): their recent searches and their library links;
 * - the known sites (`home-suggest-sites.json`): the page classifier's sites, with their Category;
 * - the catalog (`home-suggest-catalog.json`): the titles in Kindredly's curated catalog.
 * The fourth source, visited pages with their titles, the phones keep themselves
 * (`BrowserHistoryRepository.kt`, `BrowserHistoryStore.swift`).
 *
 * Every file names the person it was written for, and a child's known sites and catalog are filtered
 * before they are written, so a reader never applies the child rule itself: it only refuses a file
 * written for someone else. Nothing here is encrypted: it never leaves the phone (tracker decision 5).
 */
import type { EduValue } from '../content.types';

export const HOME_SUGGEST_VERSION = 1;

export const HOME_SUGGEST_OWN_FILE = 'home-suggest-own.json';
export const HOME_SUGGEST_SITES_FILE = 'home-suggest-sites.json';
export const HOME_SUGGEST_CATALOG_FILE = 'home-suggest-catalog.json';

export const HOME_SUGGEST_MAX_SEARCHES = 20;
export const HOME_SUGGEST_MAX_LINKS = 500;
export const HOME_SUGGEST_MAX_SITES = 2000;
export const HOME_SUGGEST_MAX_CATALOG = 1500;

/** The Categories a child is offered as known sites (tracker decision 4). */
export const HOME_SUGGEST_CHILD_SITE_CATEGORIES: readonly EduValue[] = ['eduval_educational', 'eduval_edutainment'];

/**
 * The Categories that take a catalog title off a child's list when its site is known to be one of
 * them. The catalog is curated, so its titles are offered to a child unless the known sites say the
 * site itself is Entertainment or Junk (agent's reading of decision 4, not the founder's).
 */
export const HOME_SUGGEST_CHILD_CATALOG_REFUSED: readonly EduValue[] = ['eduval_fun', 'eduval_junk'];

export type HomeSuggestLink = { title: string; url: string };

/** The person's own: what they searched for, most recent first, and the links in their library. */
export type HomeSuggestOwn = {
  v: typeof HOME_SUGGEST_VERSION;
  userId: string;
  searches: string[];
  /** Most recently used first. */
  links: HomeSuggestLink[];
  savedAt: number;
};

export type HomeSuggestSite = {
  /** A bare host, lower case, no `www.` (`khanacademy.org`). */
  domain: string;
  /** The site's name as the classifier version gives it (`Khan Academy`). */
  name: string;
  eduValue: EduValue;
};

export type HomeSuggestSites = {
  v: typeof HOME_SUGGEST_VERSION;
  userId: string;
  isChild: boolean;
  /** The classifier version the list was taken from, so a new version is written once. */
  classifierVersionId: string;
  sites: HomeSuggestSite[];
  savedAt: number;
};

export type HomeSuggestCatalogItem = {
  /** The catalog item's id, for the web app to open when there is no address. */
  id: string;
  title: string;
  url: string | null;
  type: string | null;
};

export type HomeSuggestCatalog = {
  v: typeof HOME_SUGGEST_VERSION;
  userId: string;
  isChild: boolean;
  items: HomeSuggestCatalogItem[];
  savedAt: number;
};

/** A known-site rule as the classifier version has it; only the fields the list needs. */
export type HomeSuggestSiteRule = {
  label: string;
  domains: string[];
  pathPrefixes?: string[];
  eduValue: EduValue;
};

/** A catalog row as `/published/listForMap` returns it; only the fields the list needs. */
export type HomeSuggestCatalogRow = {
  _id: string;
  name?: string | null;
  url?: string | null;
  type?: string | null;
};

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** An http(s) address with a host, or '' for anything else. */
function webAddress(value: unknown): string {
  const url = text(value, 500);
  if (!/^https?:\/\//i.test(url)) return '';
  return homeSuggestHost(url) ? url : '';
}

function bareDomain(value: unknown): string {
  return text(value, 200).toLowerCase().replace(/^www\./, '');
}

/** The host of an address, lower case and without `www.`, or '' when there is none. */
export function homeSuggestHost(url: string): string {
  const match = /^https?:\/\/(?:[^/?#@]*@)?([^/?#:]+)/i.exec(url);
  return match ? bareDomain(match[1]) : '';
}

/** The known site an address belongs to: its own host, or the nearest parent domain on the list. */
export function homeSuggestSiteFor(url: string, byDomain: Map<string, HomeSuggestSite>): HomeSuggestSite | null {
  let host = homeSuggestHost(url);
  while (host) {
    const site = byDomain.get(host);
    if (site) return site;
    const dot = host.indexOf('.');
    if (dot < 0) return null;
    host = host.slice(dot + 1);
  }
  return null;
}

export function buildHomeSuggestOwn(
  input: { userId: string; searches: string[]; links: Array<{ title?: unknown; url?: unknown }> },
  now: number = Date.now(),
): HomeSuggestOwn {
  const searches: string[] = [];
  const seenSearch = new Set<string>();
  for (const raw of input.searches) {
    if (searches.length >= HOME_SUGGEST_MAX_SEARCHES) break;
    const term = text(raw, 120);
    if (!term || seenSearch.has(term.toLowerCase())) continue;
    seenSearch.add(term.toLowerCase());
    searches.push(term);
  }

  const links: HomeSuggestLink[] = [];
  const seenUrl = new Set<string>();
  for (const raw of input.links) {
    if (links.length >= HOME_SUGGEST_MAX_LINKS) break;
    const url = webAddress(raw?.url);
    if (!url || seenUrl.has(url)) continue;
    seenUrl.add(url);
    links.push({ title: text(raw?.title, 120) || homeSuggestHost(url), url });
  }

  return { v: HOME_SUGGEST_VERSION, userId: input.userId, searches, links, savedAt: now };
}

/**
 * Every known site with its Category, one row per domain. A rule with path prefixes describes part
 * of a site (YouTube Shorts is Junk; YouTube is not), so it says nothing about the site and is left
 * out. When two rules name the same domain, the first wins, as it does when a page is classified.
 */
export function homeSuggestSitesFromRules(rules: HomeSuggestSiteRule[]): HomeSuggestSite[] {
  const sites: HomeSuggestSite[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    if (rule.pathPrefixes && rule.pathPrefixes.length > 0) continue;
    const name = text(rule.label, 80);
    if (!name || typeof rule.eduValue !== 'string') continue;
    for (const raw of rule.domains || []) {
      const domain = bareDomain(raw);
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      sites.push({ domain, name, eduValue: rule.eduValue });
    }
  }
  return sites;
}

export function buildHomeSuggestSites(
  input: { userId: string; isChild: boolean; classifierVersionId: string; rules: HomeSuggestSiteRule[] },
  now: number = Date.now(),
): HomeSuggestSites {
  const all = homeSuggestSitesFromRules(input.rules);
  const sites = (input.isChild ? all.filter((site) => HOME_SUGGEST_CHILD_SITE_CATEGORIES.includes(site.eduValue)) : all)
    .slice(0, HOME_SUGGEST_MAX_SITES);
  return {
    v: HOME_SUGGEST_VERSION,
    userId: input.userId,
    isChild: input.isChild,
    classifierVersionId: input.classifierVersionId,
    sites,
    savedAt: now,
  };
}

export function buildHomeSuggestCatalog(
  input: { userId: string; isChild: boolean; rows: HomeSuggestCatalogRow[]; rules: HomeSuggestSiteRule[] },
  now: number = Date.now(),
): HomeSuggestCatalog {
  const byDomain = new Map(homeSuggestSitesFromRules(input.rules).map((site) => [site.domain, site]));
  const items: HomeSuggestCatalogItem[] = [];
  const seen = new Set<string>();
  for (const row of input.rows) {
    if (items.length >= HOME_SUGGEST_MAX_CATALOG) break;
    const id = text(row?._id, 60);
    const title = text(row?.name, 120);
    if (!id || !title || seen.has(id)) continue;
    const url = webAddress(row?.url) || null;
    if (input.isChild && url) {
      const site = homeSuggestSiteFor(url, byDomain);
      if (site && HOME_SUGGEST_CHILD_CATALOG_REFUSED.includes(site.eduValue)) continue;
    }
    seen.add(id);
    items.push({ id, title, url, type: text(row?.type, 40) || null });
  }
  return { v: HOME_SUGGEST_VERSION, userId: input.userId, isChild: input.isChild, items, savedAt: now };
}
