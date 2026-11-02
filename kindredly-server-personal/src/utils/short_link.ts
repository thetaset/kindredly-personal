/**
 * Where a short link leads (SMB-4, docs/plans/social-media-and-shared-links-plan.md §2).
 *
 * A short link (`vm.tiktok.com/…`, `pin.it/…`, `t.co/…`) says nothing about the post until it is
 * followed, so an item saved from one could never be matched to the post a child opens. Each
 * redirect is followed by hand, through the SSRF guard, and the page it ends on is not read.
 */
import axios from 'axios';
import type {Readable} from 'stream';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import {buildDefaultBrowserHeaders} from '@/utils/fetch_helpers';
import {isSignInRedirect, isSignInUrl} from 'tset-sharedlib/sign-in-page.utils';
import {classifySocialMediaUrl, isShortLinkToResolve, tidyResolvedUrl} from 'tset-sharedlib/restrictions/socialMedia';

const MAX_HOPS = 6;
const HOP_TIMEOUT_MS = 4000;
/** A short link that answers with a page rather than a redirect (t.co does, to a browser) says where near its start. */
const REDIRECT_PAGE_BYTES = 16 * 1024;

/**
 * The full address a short link leads to, without the share's tracking, or `null` when it is not a
 * short link or could not be followed. A post seen on the way wins over a sign-in page at the end.
 */
export async function resolveShortLink(rawUrl: string): Promise<string | null> {
  if (!isShortLinkToResolve(rawUrl)) return null;
  const start = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  let current = start;
  let lastPost: string | null = null;
  for (let hop = 0; hop < MAX_HOPS && stillLeadsSomewhere(current); hop++) {
    const next = await followOnce(current);
    if (!next || next === current) break;
    current = next;
    if (classifySocialMediaUrl(current)?.kind === 'post') lastPost = current;
  }
  if (current === start || isShortLinkToResolve(current)) return null;
  if (isSignInRedirect(start, current)) return lastPost ? tidyResolvedUrl(lastPost) : null;
  return tidyResolvedUrl(current);
}

/** A short link, or a page on a social site that is not yet a post (Pinterest's own redirector); never a sign-in page. */
function stillLeadsSomewhere(url: string): boolean {
  if (isShortLinkToResolve(url)) return true;
  return classifySocialMediaUrl(url)?.kind === 'site' && !isSignInUrl(url);
}

/** Where one address sends the browser next, or `null` when it is a page. */
async function followOnce(url: string): Promise<string | null> {
  assertSafeExternalUrl(url);
  const response = await axios.get<Readable>(
    url,
    safeFetchConfig({
      timeout: HOP_TIMEOUT_MS,
      maxRedirects: 0,
      responseType: 'stream',
      validateStatus: (status) => status >= 200 && status < 400,
      headers: buildDefaultBrowserHeaders(),
    }),
  );
  const body = response.data;
  try {
    const location = headerValue(response.headers, 'location');
    if (response.status >= 300) return location ? new URL(location, url).href : null;
    if (!isShortLinkToResolve(url) || !body) return null;
    return redirectInPage(await readStart(body, REDIRECT_PAGE_BYTES), url);
  } finally {
    body?.destroy?.();
  }
}

function headerValue(headers: unknown, name: string): string | null {
  const value = (headers as Record<string, unknown> | null)?.[name];
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
  return typeof value === 'string' && value ? value : null;
}

async function readStart(stream: Readable, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    size += buffer.length;
    if (size >= maxBytes) break;
  }
  return Buffer.concat(chunks).toString('utf8').slice(0, maxBytes);
}

/** `<meta http-equiv="refresh" content="0;URL=…">`, or `location.replace("…")`. */
export function redirectInPage(html: string, base: string): string | null {
  const meta = /<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["']?\s*\d*\s*;\s*url=([^"'>\s]+)/i.exec(html);
  const script = /location\.replace\(\s*["']([^"']+)["']\s*\)/.exec(html);
  const raw = meta?.[1] ?? script?.[1];
  if (!raw) return null;
  try {
    const url = new URL(raw.replace(/\\\//g, '/').replace(/&amp;/g, '&'), base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
