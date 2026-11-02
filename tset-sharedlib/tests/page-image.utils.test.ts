import {
  headTagsDescribeAnotherPage,
  isLikelySiteImage,
  jsonLdImageUrls,
  pickPageImage,
  youTubeThumbnailUrl,
} from '../src/page-image.utils';

const VIDEO = 'https://www.youtube.com/watch?v=BBBBBBBBBBB';

describe('youTubeThumbnailUrl', () => {
  it("gives a video's thumbnail from its address", () => {
    expect(youTubeThumbnailUrl(VIDEO)).toBe('https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg');
    expect(youTubeThumbnailUrl('https://youtu.be/BBBBBBBBBBB')).toBe('https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg');
  });

  it('gives nothing for a page that is not a video', () => {
    expect(youTubeThumbnailUrl('https://www.youtube.com/')).toBeUndefined();
    expect(youTubeThumbnailUrl('https://www.youtube.com/feed/subscriptions')).toBeUndefined();
    expect(youTubeThumbnailUrl('https://example.com/watch?v=BBBBBBBBBBB')).toBeUndefined();
    expect(youTubeThumbnailUrl(null)).toBeUndefined();
  });
});

describe('headTagsDescribeAnotherPage', () => {
  it("trusts a YouTube video page's tags only when og:url names that video", () => {
    expect(headTagsDescribeAnotherPage(VIDEO, VIDEO)).toBe(false);
    expect(headTagsDescribeAnotherPage(VIDEO, 'https://www.youtube.com/watch?v=AAAAAAAAAAA')).toBe(true);
  });

  it("distrusts the home page's tags left on a video opened from it (HAT-323)", () => {
    expect(headTagsDescribeAnotherPage(VIDEO, null)).toBe(true);
    expect(headTagsDescribeAnotherPage(VIDEO, 'https://www.youtube.com/')).toBe(true);
  });

  it('trusts an ordinary page', () => {
    expect(headTagsDescribeAnotherPage('https://example.com/post', null)).toBe(false);
  });
});

describe('headTagsDescribeAnotherPage on a site that changes pages in place', () => {
  const POST = 'https://social.example/post/42';

  it("distrusts the first page's tags after the address changed", () => {
    expect(headTagsDescribeAnotherPage(POST, 'https://social.example/home', 'https://social.example/home')).toBe(true);
    expect(headTagsDescribeAnotherPage(POST, null, 'https://social.example/home')).toBe(true);
  });

  it('trusts tags the site updated for the page now shown', () => {
    expect(headTagsDescribeAnotherPage(POST, 'https://www.social.example/post/42/', 'https://social.example/home')).toBe(false);
  });

  it('trusts a page still at the address it loaded at', () => {
    expect(headTagsDescribeAnotherPage(POST, 'https://social.example/canonical', `${POST}#comments`)).toBe(false);
    expect(headTagsDescribeAnotherPage(POST, 'https://social.example/canonical')).toBe(false);
  });
});

describe('isLikelySiteImage', () => {
  it("knows the site's icon and logo-named files", () => {
    expect(isLikelySiteImage('/apple-icon.png?v=2', 'https://a.example/p', ['https://a.example/apple-icon.png'])).toBe(true);
    expect(isLikelySiteImage('https://m.media-amazon.com/images/G/01/social_share/amazon_logo._CB6_.png', null)).toBe(true);
    expect(isLikelySiteImage('https://a.example/img/og-default.jpg', null)).toBe(true);
  });

  it("leaves a page's own picture alone", () => {
    expect(isLikelySiteImage('https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg', null)).toBe(false);
    expect(isLikelySiteImage('https://a.example/img/dialogue-scene.jpg', null)).toBe(false);
  });
});

describe('pickPageImage', () => {
  const page = 'https://a.example/blog/post';

  it("gives a YouTube video its own thumbnail whatever the tags say", () => {
    expect(pickPageImage({ pageUrl: VIDEO, tagged: ['https://www.youtube.com/img/desktop/yt_1200.png'] }))
      .toBe('https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg');
  });

  it('takes the first tagged picture, as before', () => {
    expect(pickPageImage({ pageUrl: page, tagged: [null, ' https://a.example/hero.jpg ', 'https://a.example/b.jpg'] }))
      .toBe('https://a.example/hero.jpg');
  });

  it("passes over the site's logo for the structured data's, a poster, or the biggest picture in view", () => {
    const logo = 'https://a.example/logo.png';
    expect(pickPageImage({ pageUrl: page, tagged: [logo], structured: ['https://a.example/article.jpg'] })).toBe('https://a.example/article.jpg');
    expect(pickPageImage({ pageUrl: page, tagged: [logo], poster: 'https://a.example/poster.jpg' })).toBe('https://a.example/poster.jpg');
    expect(pickPageImage({
      pageUrl: page,
      tagged: [logo],
      shown: [
        { src: 'https://a.example/small.jpg', width: 300, height: 200 },
        { src: 'https://a.example/banner.jpg', width: 1200, height: 100 },
        { src: 'https://a.example/big.jpg', width: 700, height: 500 },
      ],
    })).toBe('https://a.example/big.jpg');
  });

  it("keeps the site's logo when it is all the page offers", () => {
    expect(pickPageImage({ pageUrl: page, tagged: ['https://a.example/logo.png'] })).toBe('https://a.example/logo.png');
  });

  it("keeps the site's own picture on its home page", () => {
    expect(pickPageImage({
      pageUrl: 'https://a.example/',
      tagged: ['https://a.example/logo.png'],
      shown: [{ src: 'https://a.example/headline.jpg', width: 700, height: 500 }],
    })).toBe('https://a.example/logo.png');
  });

  it("skips the tags and structured data that describe another page", () => {
    expect(pickPageImage({
      pageUrl: page,
      tagged: ['https://a.example/first-page.jpg'],
      structured: ['https://a.example/first-page-2.jpg'],
      shown: [{ src: 'https://a.example/this-page.jpg', width: 400, height: 300 }],
      tagsAreStale: true,
    })).toBe('https://a.example/this-page.jpg');
    expect(pickPageImage({ pageUrl: page, tagged: ['https://a.example/first-page.jpg'], tagsAreStale: true })).toBeUndefined();
  });

  it('never takes a picture written into the page as data', () => {
    expect(pickPageImage({ pageUrl: page, tagged: ['data:image/png;base64,AAAA'] })).toBeUndefined();
  });
});

describe('jsonLdImageUrls', () => {
  it('reads image and thumbnailUrl in any of their shapes, but never logo', () => {
    expect(jsonLdImageUrls([
      { '@type': 'Organization', logo: 'https://a.example/logo.png' },
      { '@type': 'VideoObject', thumbnailUrl: ['https://a.example/thumb.jpg'] },
      { '@graph': [{ '@type': 'Article', image: { '@type': 'ImageObject', url: 'https://a.example/article.jpg' } }] },
      { image: ['https://a.example/one.jpg', { contentUrl: 'https://a.example/two.jpg' }] },
    ])).toEqual([
      'https://a.example/thumb.jpg',
      'https://a.example/article.jpg',
      'https://a.example/one.jpg',
      'https://a.example/two.jpg',
    ]);
    expect(jsonLdImageUrls(undefined)).toEqual([]);
  });
});
