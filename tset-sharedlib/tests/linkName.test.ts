import { getAddressKind, getNameFromAddress, isErrorPageTitle, isSiteNameOnlyTitle, pickPageTitle, withNameFromAddress } from '../src/link-name.utils';
import { isLikelyChallengeTitle } from '../src/extraction.pure.utils';
import { extractMetadata, mergeMetadataBySourcePriority, mergeMetadataPreferPrimary } from '../src/extraction.utils';
import type { ItemMeta } from '../src/shared.types';

const CLAUDE_SHARE = 'https://claude.ai/share/a6f45553-2e42-453d-9e4f-55e1d6e59cb8';

// HAT-619: a shared Claude chat was saved as "Claude", which reads like Claude's home page.
describe('isSiteNameOnlyTitle', () => {
  test("a page below the home page titled with only its site's name", () => {
    expect(isSiteNameOnlyTitle(CLAUDE_SHARE, 'Claude')).toBe(true);
    expect(isSiteNameOnlyTitle('https://www.reddit.com/r/a/comments/1g3l2vb/', 'Reddit')).toBe(true);
    expect(isSiteNameOnlyTitle('https://www.reddit.com/r/a/comments/1g3l2vb/', 'Reddit - Dive into anything')).toBe(true);
    expect(isSiteNameOnlyTitle('https://gemini.google.com/share/abc123', '\u200eGemini')).toBe(true);
    expect(isSiteNameOnlyTitle('https://news.example.org/story/42', 'Example Daily', 'Example Daily')).toBe(true);
    expect(isSiteNameOnlyTitle('https://claude.ai/share/x', 'claude.ai')).toBe(true);
  });

  test('the home page keeps its site name, tracking parameters or not', () => {
    expect(isSiteNameOnlyTitle('https://claude.ai/', 'Claude')).toBe(false);
    expect(isSiteNameOnlyTitle('https://claude.ai/?utm_source=x', 'Claude')).toBe(false);
  });

  test('a real title that mentions the site is a real title', () => {
    expect(isSiteNameOnlyTitle('https://github.com/mozilla/readability', 'GitHub - mozilla/readability: A standalone version')).toBe(false);
    expect(isSiteNameOnlyTitle('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Never Gonna Give You Up - YouTube')).toBe(false);
    expect(isSiteNameOnlyTitle(CLAUDE_SHARE, 'Planning a garden')).toBe(false);
    expect(isSiteNameOnlyTitle(CLAUDE_SHARE, '')).toBe(false);
  });

  test("ChatGPT's drawn share page says only \"Check out this chat\" in og:title", () => {
    expect(isSiteNameOnlyTitle('https://chatgpt.com/share/6a5fdc7a-d6f8', 'Check out this chat')).toBe(true);
    expect(isSiteNameOnlyTitle('https://chatgpt.com/share/6a5fdc7a-d6f8', 'Jacobian Conjecture Counterexample')).toBe(false);
  });
});

describe('getAddressKind', () => {
  test('knows shared chats and Google files from their address', () => {
    expect(getAddressKind(CLAUDE_SHARE)?.kind).toBe('Shared Claude chat');
    expect(getAddressKind('https://chatgpt.com/share/6720-abc')?.kind).toBe('Shared ChatGPT chat');
    expect(getAddressKind('https://gemini.google.com/share/abc123')?.kind).toBe('Shared Gemini chat');
    expect(getAddressKind('https://g.co/gemini/share/abc123')?.kind).toBe('Shared Gemini chat');
    expect(getAddressKind('https://docs.google.com/document/d/1AbC/edit')?.kind).toBe('Google Doc');
    expect(getAddressKind('https://claude.ai/new')).toBeNull();
  });
});

describe('getNameFromAddress', () => {
  test('what the address says, then its words, then the site', () => {
    expect(getNameFromAddress(CLAUDE_SHARE)).toBe('Shared Claude chat');
    expect(getNameFromAddress('https://www.reddit.com/r/uichicago/')).toBe('r/uichicago');
    expect(getNameFromAddress('https://example.com/blog/how-to-start-a-garden.html')).toBe('How to start a garden');
    expect(getNameFromAddress('https://x.com/i/status/1849123456789')).toBe('Page on x.com');
    expect(getNameFromAddress('https://example.com/p/a6f45553-2e42-453d')).toBe('Page on example.com');
  });

  test('a home page has none', () => {
    expect(getNameFromAddress('https://claude.ai/')).toBeNull();
  });
});

describe('withNameFromAddress', () => {
  test("replaces a site's bare name and marks it", () => {
    const read: ItemMeta = { url: CLAUDE_SHARE, title: 'Claude', tsExtractedInfo: { pageType: null, sourceId: 'parser_1' } };
    const meta = withNameFromAddress(read);
    expect(meta.title).toBe('Shared Claude chat');
    expect(meta.tsExtractedInfo?.nameFromAddress).toBe(true);
    expect(meta.tsExtractedInfo?.sourceId).toBe('parser_1');
  });

  test('leaves a real title and a home page alone', () => {
    const real: ItemMeta = { url: CLAUDE_SHARE, title: 'Planning a garden' };
    expect(withNameFromAddress(real)).toBe(real);
    const home: ItemMeta = { url: 'https://claude.ai/', title: 'Claude' };
    expect(withNameFromAddress(home)).toBe(home);
  });
});

describe('extractMetadata names a page that only names its site', () => {
  // The head every Claude share serves (curl, 2026-10-19), whatever the chat.
  const CLAUDE_SHARE_HEAD = `<!doctype html><html><head>
<meta property="og:title" content="Claude">
<meta property="og:description" content="Shared via Claude, an AI assistant from Anthropic">
<meta property="og:image" content="https://claude.ai/images/claude_ogimage.png">
<title data-react-fallback>Claude</title></head><body><div id="root"></div></body></html>`;

  test('a Claude share is a "Shared Claude chat", not "Claude"', async () => {
    const meta = await extractMetadata(CLAUDE_SHARE, CLAUDE_SHARE_HEAD);
    expect(meta.title).toBe('Shared Claude chat');
    expect(meta.tsExtractedInfo?.nameFromAddress).toBe(true);
    expect(meta.description).toBe('Shared via Claude, an AI assistant from Anthropic');
  });

  test('a page with its own title keeps it', async () => {
    const meta = await extractMetadata('https://example.com/a/b', '<html><head><title>A real page</title></head></html>');
    expect(meta.title).toBe('A real page');
    expect(meta.tsExtractedInfo?.nameFromAddress).toBeUndefined();
  });
});

describe('a name from the address gives way to a real one in a merge', () => {
  const fromAddress: ItemMeta = {
    url: CLAUDE_SHARE,
    title: 'Shared Claude chat',
    description: 'Shared via Claude',
    tsExtractedInfo: { pageType: null, sourceId: 'live_dom', nameFromAddress: true },
  };
  const shared: ItemMeta = {
    url: CLAUDE_SHARE,
    title: 'Planning a garden',
    tsExtractedInfo: { pageType: null, sourceId: 'shared_title' },
  };

  test('the higher-ranked read keeps its description, the real title comes from the other', () => {
    const merged = mergeMetadataBySourcePriority(shared, fromAddress);
    expect(merged.title).toBe('Planning a garden');
    expect(merged.description).toBe('Shared via Claude');
    expect(merged.tsExtractedInfo?.nameFromAddress).toBeUndefined();
  });

  test('a real title stays when the other read only had the address', () => {
    expect(mergeMetadataPreferPrimary(shared, fromAddress).title).toBe('Planning a garden');
  });

  test('with no real title anywhere, the name from the address stays and stays marked', () => {
    const merged = mergeMetadataPreferPrimary(fromAddress, { url: CLAUDE_SHARE, tsExtractedInfo: { pageType: null } });
    expect(merged.title).toBe('Shared Claude chat');
    expect(merged.tsExtractedInfo?.nameFromAddress).toBe(true);
  });
});

// link-read-check 2026-10-19: what 62 real links showed.
describe('names from 62 real links', () => {
  test('address words drop an id at the end and never read an id as a word', () => {
    expect(getNameFromAddress('https://www.perplexity.ai/page/lab-mice-give-first-aid-Cr8kRPgoTLSBbXUWtl48AQ')).toBe('Lab mice give first aid');
    expect(getNameFromAddress('https://www.threads.com/@therab/post/DZqsiiWjI-k')).toBe('Page on threads.com');
    expect(getNameFromAddress('https://www.nytimes.com/2026/10/19/world/africa/dirty-gold-industry-coverup-launder-madagascar.html')).toBe(
      'Dirty gold industry coverup launder madagascar',
    );
  });

  test("a site's tagline titles count as its name", () => {
    expect(isSiteNameOnlyTitle('https://gemini.google.com/share/4c9aadaf7f0e', '‎Gemini - direct access to Google AI')).toBe(true);
    expect(isSiteNameOnlyTitle('https://open.spotify.com/episode/abc', 'Spotify – Web Player')).toBe(true);
  });

  test("the page's own heading wins over a title that only names the site", () => {
    expect(pickPageTitle('https://www.netflix.com/title/81780016', ['Netflix', 'Netflix', undefined, 'Famous Last Words: Dr. Jane Goodall'])).toBe(
      'Famous Last Words: Dr. Jane Goodall',
    );
    expect(pickPageTitle('https://claude.ai/share/x', ['Claude', 'Claude'])).toBe('Claude');
  });

  test("a block or consent page's heading never names the page; the address does", async () => {
    const post = 'https://www.reddit.com/r/science/comments/1g3l2vb/lab_mice_give_first_aid/';
    expect(pickPageTitle(post, ['Reddit', undefined, undefined, undefined, "You've been blocked by network security."])).toBe('Reddit');
    expect(pickPageTitle('https://www.youtube.com/watch?v=abc', ['YouTube', 'Before you continue to YouTube'])).toBe('YouTube');
    const meta = await extractMetadata(post, "<html><head><title>Reddit</title></head><body><h1>You've been blocked by network security.</h1></body></html>");
    expect(meta.title).not.toMatch(/blocked/i);
    expect(meta.tsExtractedInfo?.nameFromAddress).toBe(true);
  });

  test('an error page is named from its address, and is not a bot check', () => {
    expect(isErrorPageTitle('https://www.ebay.com/itm/123456', 'Error Page | eBay')).toBe(true);
    expect(isErrorPageTitle('https://www.facebook.com/share/p/abc', 'Error')).toBe(true);
    expect(isErrorPageTitle('https://example.com/rust', 'Error handling in Rust')).toBe(false);
    expect(isErrorPageTitle('https://example.com/a', 'Error Page | Some Other Site')).toBe(false);
    expect(isLikelyChallengeTitle('Error')).toBe(false);
    expect(isLikelyChallengeTitle('Error Page')).toBe(false);
    const named = withNameFromAddress({ url: 'https://www.ebay.com/itm/123456', title: 'Error Page | eBay' } as ItemMeta);
    expect(named.title).not.toBe('Error Page | eBay');
    expect(named.tsExtractedInfo?.nameFromAddress).toBe(true);
  });
});
