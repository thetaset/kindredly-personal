import { pageKindForUrl } from '../src/classifiers/pageKind';

// CLS-10: the kind of page, from the address alone.
describe('pageKindForUrl', () => {
  it.each([
    ['https://www.youtube.com/@crashcourse', 'YouTube channel'],
    ['https://www.youtube.com/channel/UC123', 'YouTube channel'],
    ['https://www.youtube.com/watch?v=abc', 'YouTube video'],
    ['https://youtu.be/abc', 'YouTube video'],
    ['https://m.youtube.com/shorts/abc', 'YouTube video'],
    ['https://duckduckgo.com/html/?q=photosynthesis', 'Search results'],
    ['https://www.bing.com/search?q=minecraft+servers', 'Search results'],
    ['https://search.brave.com/search?q=volcano+facts', 'Search results'],
    ['https://www.reddit.com/r/science/', 'Social site'],
    ['https://old.reddit.com/r/funny/', 'Social site'],
    ['https://www.pinterest.com/ideas/', 'Social site'],
    ['https://apnews.com/', 'Home page'],
    ['https://www.google.com/', 'Home page'],
    ['https://www.youtube.com/', 'Home page'],
    ['https://www.bbc.com/news', 'Other page'],
    ['not an address', 'Other page'],
    [null, 'Other page'],
  ])('%s is %s', (url, kind) => {
    expect(pageKindForUrl(url)).toBe(kind);
  });
});
