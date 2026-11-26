import {
  galleryHasMore,
  getRedditPostEmbedUrl,
  getRedditPostId,
  imageContentType,
  originalRedditImageUrl,
  pickRedditVideoFiles,
  postMediaFromRedditPage,
  readRedditEmbedPostMedia,
} from '../src/reddit-media.utils';

// HAT-635: a parent can save a Reddit post's picture instead of its link.
// HAT-1260: Reddit's post feed stopped answering on 2026-11-13; the embed page replaces it.
describe('getRedditPostEmbedUrl', () => {
  test("a post's embed page, from any of its addresses", () => {
    expect(getRedditPostEmbedUrl('https://www.reddit.com/r/EarthPorn/comments/1xa1mu2/dawn_in_the_north/')).toBe(
      'https://embed.reddit.com/r/EarthPorn/comments/1xa1mu2/',
    );
    expect(getRedditPostEmbedUrl('https://old.reddit.com/r/pics/comments/1XA1MU2')).toBe(
      'https://embed.reddit.com/r/pics/comments/1xa1mu2/',
    );
  });

  // HAT-1269: the bare `/comments/<id>/` embed does not name the post, but any subreddit finds it.
  test('a link with no subreddit asks under r/all', () => {
    expect(getRedditPostEmbedUrl('https://redd.it/1xa1mu2')).toBe('https://embed.reddit.com/r/all/comments/1xa1mu2/');
    expect(getRedditPostEmbedUrl('https://www.reddit.com/comments/1XA1MU2/')).toBe(
      'https://embed.reddit.com/r/all/comments/1xa1mu2/',
    );
  });

  test('nothing for a subreddit, a share link before it is followed, or another site', () => {
    expect(getRedditPostEmbedUrl('https://www.reddit.com/r/pics/')).toBeNull();
    expect(getRedditPostEmbedUrl('https://www.reddit.com/r/pics/s/AbC123')).toBeNull();
    expect(getRedditPostEmbedUrl('https://example.com/r/pics/comments/abc/')).toBeNull();
    expect(getRedditPostId('https://www.reddit.com/user/someone/')).toBeNull();
  });
});

describe('originalRedditImageUrl', () => {
  test('an original as it is, and the original behind a resized copy', () => {
    expect(originalRedditImageUrl('https://i.redd.it/kpdiy8h3bgwh1.jpeg')).toBe('https://i.redd.it/kpdiy8h3bgwh1.jpeg');
    expect(originalRedditImageUrl('https://preview.redd.it/kpdiy8h3bgwh1.jpeg?width=640&crop=smart&auto=webp&s=f70a')).toBe(
      'https://i.redd.it/kpdiy8h3bgwh1.jpeg',
    );
    expect(
      originalRedditImageUrl('https://preview.redd.it/after-losing-my-right-arm-v0-we7cvor9gvqh1.png?width=640&crop=smart'),
    ).toBe('https://i.redd.it/we7cvor9gvqh1.png');
  });

  test('nothing for a video, a page, or a picture on another host', () => {
    expect(originalRedditImageUrl('https://v.redd.it/8ale3ufsygwh1')).toBeNull();
    expect(originalRedditImageUrl('https://www.reddit.com/gallery/1wmc84j')).toBeNull();
    expect(originalRedditImageUrl('https://example.com/a.jpg')).toBeNull();
  });
});

describe('postMediaFromRedditPage', () => {
  test('a picture post, a gallery and a video, as Reddit marks them on the open page', () => {
    expect(postMediaFromRedditPage({ postType: 'image', contentHref: 'https://i.redd.it/qafrrnh5fgwh1.jpeg' })).toEqual({
      kind: 'image',
      urls: ['https://i.redd.it/qafrrnh5fgwh1.jpeg'],
    });
    expect(
      postMediaFromRedditPage({
        postType: 'gallery',
        contentHref: 'https://www.reddit.com/gallery/1wmc84j',
        galleryUrls: [
          'https://preview.redd.it/after-losing-v0-we7cvor9gvqh1.png?width=640&crop=smart',
          'https://i.redd.it/we7cvor9gvqh1.png',
          'https://preview.redd.it/after-losing-v0-uj7bdscagvqh1.png?width=1080&crop=smart',
        ],
      }),
    ).toEqual({ kind: 'gallery', urls: ['https://i.redd.it/we7cvor9gvqh1.png', 'https://i.redd.it/uj7bdscagvqh1.png'] });
    expect(
      postMediaFromRedditPage({ postType: 'video', contentHref: 'https://v.redd.it/8ale3ufsygwh1', poster: 'https://external-preview.redd.it/p.png' }),
    ).toEqual({ kind: 'video', urls: ['https://v.redd.it/8ale3ufsygwh1'], poster: 'https://external-preview.redd.it/p.png' });
  });

  // HAT-689: a comic strip's other panels, which the page counts but may not give an address for.
  test("a gallery counts the pictures it shows but gave no address for", () => {
    const galleryUrls = ['https://preview.redd.it/a1b2c3.png?width=640', 'https://preview.redd.it/d4e5f6.png?width=640'];
    expect(postMediaFromRedditPage({ postType: 'gallery', galleryUrls, galleryCount: 4 })).toEqual({
      kind: 'gallery',
      urls: ['https://i.redd.it/a1b2c3.png', 'https://i.redd.it/d4e5f6.png'],
      total: 4,
    });
    expect(postMediaFromRedditPage({ postType: 'gallery', galleryUrls, galleryCount: 2 })).toEqual({
      kind: 'gallery',
      urls: ['https://i.redd.it/a1b2c3.png', 'https://i.redd.it/d4e5f6.png'],
    });
  });

  test('nothing for a text or link post', () => {
    expect(postMediaFromRedditPage({ postType: 'self', contentHref: 'https://www.reddit.com/r/x/comments/abc/' })).toBeNull();
    expect(postMediaFromRedditPage({ postType: 'link', contentHref: 'https://example.com/story' })).toBeNull();
    expect(postMediaFromRedditPage(null)).toBeNull();
  });
});

describe('readRedditEmbedPostMedia', () => {
  // What an embed page marks a post with (r/AbsoluteUnits, r/EarthPorn and r/pics, read 2026-11-21),
  // shortened.
  const embed = (post: { type: string; url: string }, body = '') => {
    const data = JSON.stringify({ post, subreddit: { name: 'pics' } }).replace(/"/g, '&quot;');
    return `<html><body><shreddit-screenview-data data="${data}"></shreddit-screenview-data>${body}</body></html>`;
  };

  test("the post's picture, as the embed names it", () => {
    expect(readRedditEmbedPostMedia(embed({ type: 'image', url: 'https://i.redd.it/kpdiy8h3bgwh1.jpeg' }))).toEqual({
      kind: 'image',
      urls: ['https://i.redd.it/kpdiy8h3bgwh1.jpeg'],
    });
  });

  test("a video post, with its still from the player", () => {
    const player =
      '<shreddit-player src="https://v.redd.it/3tcm7u6bot2i1/HLSPlaylist.m3u8" ' +
      'poster="https://external-preview.redd.it/p.png?width=640&amp;crop=smart"></shreddit-player>';
    expect(readRedditEmbedPostMedia(embed({ type: 'video', url: 'https://v.redd.it/3tcm7u6bot2i1' }, player))).toEqual({
      kind: 'video',
      urls: ['https://v.redd.it/3tcm7u6bot2i1'],
      poster: 'https://external-preview.redd.it/p.png?width=640&crop=smart',
    });
  });

  test("a gallery's pictures, from its resized copies", () => {
    const body =
      '<li slot="page-1"><img src="https://preview.redd.it/after-v0-we7cvor9gvqh1.png?width=640&amp;crop=smart"></li>' +
      '<li slot="page-2"><img src="https://preview.redd.it/after-v0-uj7bdscagvqh1.png?width=640"></li>';
    expect(readRedditEmbedPostMedia(embed({ type: 'gallery', url: 'https://www.reddit.com/gallery/1wmc84j' }, body))).toEqual({
      kind: 'gallery',
      urls: ['https://i.redd.it/we7cvor9gvqh1.png', 'https://i.redd.it/uj7bdscagvqh1.png'],
    });
  });

  test('a gallery counts the pictures it drew no address for', () => {
    const body =
      '<li slot="page-1"><img src="https://preview.redd.it/a1b2c3.png?width=640"></li>' +
      '<li slot="page-2"><img src="https://preview.redd.it/d4e5f6.png?width=640"></li>' +
      '<li slot="page-3"></li>';
    expect(readRedditEmbedPostMedia(embed({ type: 'gallery', url: 'https://www.reddit.com/gallery/1wmc84j' }, body))).toEqual({
      kind: 'gallery',
      urls: ['https://i.redd.it/a1b2c3.png', 'https://i.redd.it/d4e5f6.png'],
      total: 3,
    });
  });

  test('nothing for a text or link post, another site, or no page', () => {
    expect(readRedditEmbedPostMedia(embed({ type: 'text', url: 'https://www.reddit.com/r/x/comments/abc/' }))).toBeNull();
    expect(readRedditEmbedPostMedia(embed({ type: 'link', url: 'https://example.com/story' }))).toBeNull();
    expect(readRedditEmbedPostMedia('<html>Prove your humanity</html>')).toBeNull();
    expect(readRedditEmbedPostMedia(null)).toBeNull();
  });
});

describe('imageContentType', () => {
  test("from the original's file name", () => {
    expect(imageContentType('https://i.redd.it/a.png')).toBe('image/png');
    expect(imageContentType('https://i.redd.it/a.jpeg')).toBe('image/jpeg');
    expect(imageContentType('https://i.redd.it/a.gif')).toBe('image/gif');
  });
});

describe('pickRedditVideoFiles', () => {
  // A real video's playlist (v.redd.it/8ale3ufsygwh1, 2026-10-19), trimmed to its parts.
  const MPD = `<MPD mediaPresentationDuration="PT1M1.046665S" type="static">
  <Period duration="PT1M1.046665S" id="0">
    <AdaptationSet contentType="video" id="1">
      <Representation bandwidth="242520" codecs="avc1.4d401e" height="392" id="5" mimeType="video/mp4" width="220"><BaseURL>CMAF_220.mp4</BaseURL></Representation>
      <Representation bandwidth="1147238" codecs="avc1.4d401f" height="854" id="8" mimeType="video/mp4" width="480"><BaseURL>CMAF_480.mp4</BaseURL></Representation>
      <Representation bandwidth="2133572" codecs="avc1.4d401f" height="1280" id="9" mimeType="video/mp4" width="720"><BaseURL>CMAF_720.mp4</BaseURL></Representation>
    </AdaptationSet>
    <AdaptationSet contentType="audio" id="2">
      <Representation audioSamplingRate="48000" bandwidth="66324" codecs="mp4a.40.2" id="10" mimeType="audio/mp4"><BaseURL>CMAF_AUDIO_64.mp4</BaseURL></Representation>
      <Representation audioSamplingRate="48000" bandwidth="133201" codecs="mp4a.40.2" id="11" mimeType="audio/mp4"><BaseURL>CMAF_AUDIO_128.mp4</BaseURL></Representation>
    </AdaptationSet>
  </Period>
</MPD>`;
  const MB = 1024 * 1024;

  test('the largest picture that fits with the best sound', () => {
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 24 * MB)).toMatchObject({
      video: 'https://v.redd.it/8ale3ufsygwh1/CMAF_720.mp4',
      audio: 'https://v.redd.it/8ale3ufsygwh1/CMAF_AUDIO_128.mp4',
    });
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 10 * MB)).toMatchObject({
      video: 'https://v.redd.it/8ale3ufsygwh1/CMAF_480.mp4',
    });
  });

  test('too large when even the smallest does not fit; nothing without a playlist', () => {
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 1 * MB)).toMatchObject({ tooLarge: true });
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', null, 24 * MB)).toBeNull();
    expect(pickRedditVideoFiles('https://example.com/v', MPD, 24 * MB)).toBeNull();
  });

  test('names the quality by the short side, and gives the length', () => {
    const picked = pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 24 * MB) as any;
    expect(picked.quality).toBe(720);
    expect(picked.seconds).toBeCloseTo(61.05, 1);
    expect(picked.estimatedBytes).toBeGreaterThan(17 * MB);
  });

  test('part of a video is estimated by the part, but the whole file still has to download', () => {
    const part = pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 10 * MB, { keepSeconds: 20 }) as any;
    expect(part.video).toBe('https://v.redd.it/8ale3ufsygwh1/CMAF_720.mp4');
    expect(part.estimatedBytes).toBeLessThan(7 * MB);

    const capped = pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 10 * MB, { keepSeconds: 20, maxDownloadBytes: 12 * MB });
    expect(capped).toMatchObject({ video: 'https://v.redd.it/8ale3ufsygwh1/CMAF_480.mp4', quality: 480 });

    // Too long whole, but a part fits.
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 1 * MB)).toMatchObject({ tooLarge: true });
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 1 * MB, { keepSeconds: 5 })).toMatchObject({ quality: 480 });
  });

  test('says when the whole download is the limit, which no part can get under', () => {
    // 30 minutes: even the smallest whole file is about 85 MB to download.
    const long = MPD.replace(/PT1M1\.046665S/g, 'PT30M0S');
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', long, 24 * MB, { keepSeconds: 10, maxDownloadBytes: 50 * MB })).toMatchObject({
      tooLarge: true,
      reason: 'download',
    });
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', MPD, 1 * MB)).toMatchObject({ tooLarge: true, reason: 'size' });
  });

  test('a video with no sound saves its picture alone', () => {
    const silent = MPD.replace(/<AdaptationSet contentType="audio"[\s\S]*?<\/AdaptationSet>/, '');
    expect(pickRedditVideoFiles('https://v.redd.it/8ale3ufsygwh1', silent, 24 * MB)).toMatchObject({
      video: 'https://v.redd.it/8ale3ufsygwh1/CMAF_720.mp4',
      audio: null,
    });
  });
});

// HAT-1269: an embed page that drew fewer slides than the gallery has still sends the popup to read
// the rest, as a feed's first picture did (HAT-689).
describe('galleryHasMore', () => {
  test('a count above the addresses, or only the first known', () => {
    expect(galleryHasMore({kind: 'gallery', urls: ['a', 'b'], total: 8})).toBe(true);
    expect(galleryHasMore({kind: 'gallery', urls: ['a'], total: null})).toBe(true);
    expect(galleryHasMore({kind: 'gallery', urls: ['a', 'b'], total: 2})).toBe(false);
    expect(galleryHasMore({kind: 'gallery', urls: ['a', 'b']})).toBe(false);
    expect(galleryHasMore({kind: 'image', urls: ['a'], total: null})).toBe(false);
    expect(galleryHasMore(null)).toBe(false);
  });
});

