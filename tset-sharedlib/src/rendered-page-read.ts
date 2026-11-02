/**
 * What a page shows once its scripts have run, read inside the page itself (HAT-619).
 *
 * `readRenderedPage` is injected whole into a loaded page: the extension's read of an open tab, the
 * full-page read (a window on a computer, a sheet on a phone) and `tools/link-read-check`. It must
 * stay self-contained: no imports, no references to anything outside its own body, plain
 * JavaScript features only, because it is turned into text and run in someone else's page.
 */

import type { readRedditPostPage } from './reddit-media.utils';

export interface RenderedPageRead {
  url: string;
  title: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  siteName: string | null;
  h1: string | null;
  headings: string[];
  /** The page's visible text, whitespace collapsed, cut at `maxTextChars`. */
  text: string;
  textChars: number;
  /** A site recipe's answer, for pages whose title never names them (a shared chat). */
  recipe: { id: string; name: string | null; author: string | null } | null;
  flags: { botCheck: boolean; signIn: boolean; emptyPage: boolean };
  /** A Reddit post's own marks, read beside this by `readRedditPostPage` on a post's page (HAT-689). */
  redditPost?: ReturnType<typeof readRedditPostPage>;
}

export function readRenderedPage(maxTextChars = 20000): RenderedPageRead {
  const clean = (value: unknown, max = 300): string => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  };
  const meta = (key: string): string | null => {
    const el = document.querySelector(`meta[property="${key}"],meta[name="${key}"]`);
    const value = el ? clean(el.getAttribute('content')) : '';
    return value || null;
  };
  /** The first sentence or line of a message, short enough to be a name. */
  const firstSentence = (value: string): string | null => {
    const line = clean(value.split(/\n/).find((part) => part.trim()) || '', 400);
    if (!line) return null;
    const sentence = line.match(/^.{12,}?[.?!](?=\s|$)/)?.[0] || line;
    return clean(sentence, 120) || null;
  };

  const body = document.body;
  const fullText = clean(body ? body.innerText : '', 1_000_000);
  const title = clean(document.title);
  const host = location.hostname.replace(/^www\./, '');
  const path = location.pathname;

  let recipe: RenderedPageRead['recipe'] = null;
  if (host === 'claude.ai' && /^\/share\//.test(path)) {
    const first = document.querySelector('[data-testid="user-message"]') as HTMLElement | null;
    const author = fullText.match(/Shared by ([^.]{1,60})\./)?.[1] || null;
    recipe = { id: 'claude-share', name: first ? firstSentence(first.innerText) : null, author: author ? clean(author, 60) : null };
  } else if ((host === 'chatgpt.com' || host === 'chat.openai.com') && /^\/share\//.test(path)) {
    // Once it has run, a ChatGPT share's title is the chat's own name; its first message may be
    // only "Uploaded a file".
    const chatTitle = clean(title.replace(/^ChatGPT\s*[-–—|]\s*/i, ''), 160);
    const first = document.querySelector('[data-message-author-role="user"]') as HTMLElement | null;
    const name = chatTitle && chatTitle.toLowerCase() !== 'chatgpt' ? chatTitle : first ? firstSentence(first.innerText) : null;
    recipe = { id: 'chatgpt-share', name, author: null };
  } else if ((host === 'gemini.google.com' && /^\/share\//.test(path)) || host === 'g.co') {
    // A Gemini share's heading is the chat's name; its messages start with a "You said" label.
    const heading = clean((document.querySelector('h1') as HTMLElement | null)?.innerText, 160);
    const first = document.querySelector('user-query, .query-text, [class*="user-query"]') as HTMLElement | null;
    const firstText = first ? first.innerText.replace(/^\s*you said:?\s*/i, '') : '';
    const name = heading && !/^gemini\b/i.test(heading) ? heading : firstText ? firstSentence(firstText) : null;
    recipe = { id: 'gemini-share', name, author: null };
  }

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((el) => clean((el as HTMLElement).innerText, 160))
    .filter(Boolean)
    .slice(0, 12);
  const lowerTitle = title.toLowerCase();
  const lowerStart = fullText.slice(0, 600).toLowerCase();

  return {
    url: location.href,
    title,
    ogTitle: meta('og:title') || meta('twitter:title'),
    ogDescription: meta('og:description') || meta('description') || meta('twitter:description'),
    ogImage: meta('og:image') || meta('twitter:image'),
    siteName: meta('og:site_name'),
    h1: headings.length ? clean((document.querySelector('h1') as HTMLElement | null)?.innerText, 160) || null : null,
    headings,
    text: fullText.slice(0, maxTextChars),
    textChars: fullText.length,
    recipe,
    flags: {
      botCheck:
        /^(just a moment|attention required|client challenge|robot or human|are you a robot|access denied|please wait|human verification)/.test(lowerTitle) ||
        /verify you are human|performing security verification|checking your browser|press (and|&) hold/.test(lowerStart),
      signIn:
        /\b(sign in|log in|login|sign-in)\b/.test(lowerTitle) && !!document.querySelector('input[type="password"], input[type="email"]'),
      emptyPage: fullText.length < 80,
    },
  };
}
