import type { EduValue } from '../content.types';

/**
 * Which pages a device may send for the classifier's datasets (CLS-19), and in what shape. The
 * device applies it before sending and the server again before keeping anything, so a device that
 * skips it still can't have a page kept that it shouldn't.
 *
 * Left out:
 * - anything but an http(s) address;
 * - email, chat, document, calendar, payment and sign-in sites;
 * - a page that shows a Sign out link: the person is signed in, so the page may be about them;
 * - an address that carries personal details (a token, a session, an email address, an account id);
 * - a search results page: what someone typed is theirs.
 *
 * A page that is kept carries only its address, title, description, text, the Category the app gave
 * it and where that Category came from: never whose it was, when it was visited, or on which device.
 */

export const MAX_SHARED_PAGES_PER_UPLOAD = 200;
export const MAX_SHARED_TEXT_CHARS = 20_000;
const MAX_TITLE_CHARS = 500;
const MAX_DESCRIPTION_CHARS = 2_000;

/**
 * Where the app's Category for the page came from (the content script's `contentInfo.srcInfo`): a
 * library item (`library`, a parent's or curator's choice) or the classifier, among others. The
 * Category is the app's answer, never a label; this says whose answer it was.
 */
export type CategorySource = 'library' | 'metadata' | 'classifier' | 'unknown' | 'internal' | 'external';
const CATEGORY_SOURCES = new Set<string>(['library', 'metadata', 'classifier', 'unknown', 'internal', 'external']);

/** The source of a page's Category from its `srcInfo`: any library item makes it `library`. */
export function categorySourceOf(srcInfo: unknown): CategorySource | null {
  if (!srcInfo || typeof srcInfo !== 'object') return null;
  const info = srcInfo as { srcType?: unknown; itemId?: unknown };
  if (info.itemId || info.srcType === 'library') return 'library';
  return typeof info.srcType === 'string' && CATEGORY_SOURCES.has(info.srcType) ? (info.srcType as CategorySource) : null;
}

export type SharedPage = {
  url: string;
  title: string;
  description: string;
  text: string;
  eduValue: EduValue | null;
  categoryFrom: CategorySource | null;
};

const EDU_VALUES = new Set<string>(['eduval_educational', 'eduval_edutainment', 'eduval_fun', 'eduval_task', 'eduval_junk', 'eduval_unknown']);

/** Sites whose pages are a person's own: mail, chat, documents, calendars, payments. */
const PERSONAL_HOSTS = [
  'mail.google.com',
  'docs.google.com',
  'drive.google.com',
  'calendar.google.com',
  'classroom.google.com',
  'meet.google.com',
  'keep.google.com',
  'photos.google.com',
  'contacts.google.com',
  'outlook.live.com',
  'outlook.office.com',
  'outlook.office365.com',
  'teams.microsoft.com',
  'teams.live.com',
  'onedrive.live.com',
  'office.com',
  'sharepoint.com',
  'icloud.com',
  'dropbox.com',
  'box.com',
  'notion.so',
  'web.whatsapp.com',
  'messenger.com',
  'web.telegram.org',
  'discord.com',
  'slack.com',
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'zoom.us',
  'paypal.com',
  'venmo.com',
  'mail.yahoo.com',
  'mail.proton.me',
];

/** Sub-sites that are a person's own wherever they appear: mail.x, accounts.x, login.x. */
const PERSONAL_SUBDOMAIN = /^(mail|webmail|accounts?|login|signin|auth|sso|id|secure|my|portal|app|dashboard|billing|checkout)\./i;

/** Parameter names that carry who someone is or a way in as them. */
const PERSONAL_PARAM =
  /(token|session|sess|sid|auth|key|code|email|mail|pass|pwd|user|uid|account|acct|phone|tel|ticket|otp|sig|signature|secret|credential|login|name|address|zip|dob|birth)/i;
/** A parameter value that is an email address, or long enough to be a token. */
const PERSONAL_VALUE = /(@|^[A-Za-z0-9_\-+/=.]{32,}$)/;
/** A search: what someone typed is theirs, so a results page is never sent. */
const SEARCH_PARAM = /^(q|query|search|search_query|searchterm|keywords?|wd|p|k|term|text)$/i;
const EMAIL_IN_PATH = /[^/@\s]+@[^/@\s]+\.[a-z]{2,}/i;

/** A page showing one of these is a signed-in page. */
const SIGNED_IN = /\b(sign[\s-]?out|log[\s-]?out)\b/i;

/** Parameters that only say where a click came from. */
const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_|igshid$|si$)/i;

function isPersonalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (PERSONAL_SUBDOMAIN.test(host)) return true;
  return PERSONAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * The address as it may be sent, or null when the page may not be sent at all: no fragment, no
 * tracking parameters, and nothing personal.
 */
export function shareableAddress(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (isPersonalHost(u.hostname)) return null;
  for (const [name, value] of [...u.searchParams.entries()]) {
    if (TRACKING_PARAM.test(name)) {
      // A click id is a long token and is dropped; an email address in one leaves the page out.
      if (value.includes('@')) return null;
      u.searchParams.delete(name);
      continue;
    }
    if (SEARCH_PARAM.test(name) || PERSONAL_PARAM.test(name) || PERSONAL_VALUE.test(value)) return null;
  }
  let path = u.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep it as written
  }
  // A YouTube handle (/@name) is public; an email address in the path is not.
  if (EMAIL_IN_PATH.test(path)) return null;
  u.hash = '';
  return u.toString();
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** A page as it may be sent, or null when it may not be. Applied on the device and on the server. */
export function sharedPageFrom(raw: unknown): SharedPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const page = raw as Record<string, unknown>;
  const url = typeof page.url === 'string' ? shareableAddress(page.url) : null;
  if (!url) return null;
  const title = clean(page.title, MAX_TITLE_CHARS);
  const description = clean(page.description, MAX_DESCRIPTION_CHARS);
  // Read the whole text for a Sign out link before it is cut, so a footer link still counts.
  const fullText = typeof page.text === 'string' ? page.text : '';
  if (SIGNED_IN.test(fullText) || SIGNED_IN.test(title)) return null;
  const text = clean(fullText, MAX_SHARED_TEXT_CHARS);
  if (!title && !text) return null;
  const eduValue = typeof page.eduValue === 'string' && EDU_VALUES.has(page.eduValue) ? (page.eduValue as EduValue) : null;
  const categoryFrom =
    typeof page.categoryFrom === 'string' && CATEGORY_SOURCES.has(page.categoryFrom) ? (page.categoryFrom as CategorySource) : null;
  return { url, title, description, text, eduValue, categoryFrom };
}
