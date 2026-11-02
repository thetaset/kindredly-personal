/**
 * Sites that refuse a page read but answer a public API without a key (HAT-619). Stack Overflow
 * shows every read, even a real browser, a Cloudflare check (link-read-check, 2026-10-19), while
 * api.stackexchange.com names the question.
 *
 * Parser-free, so the device and the server use the same recipes.
 */

export interface SiteApiRecipe {
  id: string;
  endpoint: string;
  parse(payload: unknown): { title: string; description?: string } | null;
}

/** Stack Exchange's own sites, and the `site` value its API knows each by. */
const STACK_EXCHANGE_SITES: Record<string, string> = {
  'stackoverflow.com': 'stackoverflow',
  'superuser.com': 'superuser',
  'serverfault.com': 'serverfault',
  'askubuntu.com': 'askubuntu',
  'mathoverflow.net': 'mathoverflow.net',
  'stackapps.com': 'stackapps',
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stackExchangeSite(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (STACK_EXCHANGE_SITES[host]) return STACK_EXCHANGE_SITES[host];
  const match = host.match(/^([a-z0-9-]+)\.stackexchange\.com$/);
  return match && match[1] !== 'api' && match[1] !== 'meta' ? match[1] : null;
}

/** The public API that names this page, or null. */
export function getSiteApiRecipe(url: string | null | undefined): SiteApiRecipe | null {
  if (!url || typeof url !== 'string') return null;
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return null;
  }

  const site = stackExchangeSite(urlObj.hostname);
  const questionId = urlObj.pathname.match(/^\/(?:questions|q)\/(\d+)/)?.[1];
  if (site && questionId) {
    return {
      id: 'stack-exchange',
      endpoint: `https://api.stackexchange.com/2.3/questions/${questionId}?site=${encodeURIComponent(site)}`,
      parse(payload) {
        const item = (payload as { items?: Array<{ title?: string; tags?: string[] }> })?.items?.[0];
        const title = typeof item?.title === 'string' ? decodeEntities(item.title).trim() : '';
        if (!title) return null;
        const tags = Array.isArray(item?.tags) ? item.tags.filter((tag) => typeof tag === 'string').slice(0, 5) : [];
        return { title, description: tags.length ? `Question tagged ${tags.join(', ')}` : undefined };
      },
    };
  }

  return null;
}
