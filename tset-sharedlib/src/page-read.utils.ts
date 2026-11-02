/**
 * Turns what `readRenderedPage` found in a loaded page into an item's details (HAT-619).
 *
 * The name, best first: a site recipe's answer (a shared chat's first message), then the page's own
 * og:title, title or first heading, skipping any that only name the site; failing all of those, the
 * name from the address, marked `nameFromAddress` so a real name from any other read wins.
 */
import type { ItemMeta } from './shared.types';
import type { RenderedPageRead } from './rendered-page-read';
import { isLikelyChallengeTitle } from './extraction.pure.utils';
import { getNameFromAddress, isErrorPageTitle, isSiteNameOnlyTitle } from './link-name.utils';
import { postMediaFromRedditPage } from './reddit-media.utils';

/** Why a rendered read gave nothing to use, or null when it did. */
export function getRenderedReadProblem(read: RenderedPageRead | null | undefined): 'bot-check' | 'sign-in' | 'empty' | null {
  if (!read) return 'empty';
  if (read.flags?.botCheck) return 'bot-check';
  if (read.flags?.signIn) return 'sign-in';
  if (read.flags?.emptyPage && !read.recipe?.name) return 'empty';
  return null;
}

export function renderedReadToItemMeta(url: string, read: RenderedPageRead): ItemMeta | null {
  if (getRenderedReadProblem(read)) return null;

  const pageTitles = [read.ogTitle, read.title, read.h1].filter((t): t is string => !!t && !isLikelyChallengeTitle(t));
  const pageName = pageTitles.find((t) => !isSiteNameOnlyTitle(url, t, read.siteName) && !isErrorPageTitle(url, t, read.siteName));
  const name = read.recipe?.name || pageName || null;
  const addressName = name ? null : getNameFromAddress(url);

  const description = read.recipe
    ? read.recipe.author
      ? `Shared by ${read.recipe.author}`
      : read.ogDescription || undefined
    : read.ogDescription || undefined;
  // A Reddit post's pictures, every one of a gallery's, which its feed does not list (HAT-689).
  const postMedia = postMediaFromRedditPage(read.redditPost);

  return {
    url,
    title: name || addressName || undefined,
    description,
    imageSrc: read.ogImage || undefined,
    siteName: read.siteName || undefined,
    tsExtractedInfo: {
      pageType: null,
      sourceId: 'full_page',
      ...(name ? {} : addressName ? { nameFromAddress: true } : {}),
      ...(postMedia ? { postMedia } : {}),
    },
  };
}
