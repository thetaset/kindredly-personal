import { getRenderedReadProblem, renderedReadToItemMeta } from '../src/page-read.utils';
import type { RenderedPageRead } from '../src/rendered-page-read';

const SHARE = 'https://claude.ai/share/a6f45553-2e42-453d-9e4f-55e1d6e59cb8';

function read(overrides: Partial<RenderedPageRead> = {}): RenderedPageRead {
  return {
    url: SHARE,
    title: 'Claude',
    ogTitle: 'Claude',
    ogDescription: 'Shared via Claude, an AI assistant from Anthropic',
    ogImage: 'https://claude.ai/images/claude_ogimage.png',
    siteName: null,
    h1: null,
    headings: [],
    text: '',
    textChars: 5764,
    recipe: null,
    flags: { botCheck: false, signIn: false, emptyPage: false },
    ...overrides,
  };
}

// HAT-619: what a page shows once its scripts ran, as an item's details.
describe('renderedReadToItemMeta', () => {
  // HAT-689: a gallery's feed lists its first picture; the post's page shows every one.
  test("a Reddit post's pictures, read beside the page", () => {
    const POST = 'https://www.reddit.com/r/comics/comments/1abc2de/strip/';
    const meta = renderedReadToItemMeta(
      POST,
      read({
        url: POST,
        title: 'A strip : r/comics',
        ogTitle: 'A strip',
        redditPost: {
          postType: 'gallery',
          contentHref: 'https://www.reddit.com/gallery/1abc2de',
          galleryUrls: ['https://preview.redd.it/p1.png?width=640', 'https://preview.redd.it/p2.png?width=640', 'https://i.redd.it/p3.png'],
          galleryCount: 3,
          poster: null,
        },
      }),
    );
    expect(meta?.tsExtractedInfo?.postMedia).toEqual({
      kind: 'gallery',
      urls: ['https://i.redd.it/p1.png', 'https://i.redd.it/p2.png', 'https://i.redd.it/p3.png'],
    });
    expect(renderedReadToItemMeta(SHARE, read({ recipe: { id: 'claude-share', name: 'x', author: null } }))?.tsExtractedInfo?.postMedia).toBeUndefined();
  });

  test("a recipe's answer names the page, with who shared it", () => {
    const meta = renderedReadToItemMeta(SHARE, read({ recipe: { id: 'claude-share', name: 'Planning a garden?', author: 'James' } }));
    expect(meta?.title).toBe('Planning a garden?');
    expect(meta?.description).toBe('Shared by James');
    expect(meta?.tsExtractedInfo?.sourceId).toBe('full_page');
    expect(meta?.tsExtractedInfo?.nameFromAddress).toBeUndefined();
  });

  test("the page's own title when it names the page, skipping the site's bare name", () => {
    const meta = renderedReadToItemMeta('https://example.com/a/b', read({ title: 'Example', ogTitle: 'Example', siteName: 'Example', h1: 'The real heading' }));
    expect(meta?.title).toBe('The real heading');
  });

  test('the address when nothing on the page names it, marked so a real name wins', () => {
    const meta = renderedReadToItemMeta(SHARE, read());
    expect(meta?.title).toBe('Shared Claude chat');
    expect(meta?.tsExtractedInfo?.nameFromAddress).toBe(true);
  });

  test('nothing from a bot check, a sign-in page or an empty page', () => {
    expect(renderedReadToItemMeta(SHARE, read({ flags: { botCheck: true, signIn: false, emptyPage: false } }))).toBeNull();
    expect(getRenderedReadProblem(read({ flags: { botCheck: false, signIn: true, emptyPage: false } }))).toBe('sign-in');
    expect(getRenderedReadProblem(read({ flags: { botCheck: false, signIn: false, emptyPage: true } }))).toBe('empty');
    expect(getRenderedReadProblem(null)).toBe('empty');
  });
});
