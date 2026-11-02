import {
  GOOGLE_PHOTOS_MAX_PICTURES,
  googlePhotosFetchUrl,
  googlePhotosPostMedia,
  googlePhotosToItemMeta,
  googlePhotosVideoProbeUrl,
  isGooglePhotosShareUrl,
  readGooglePhotosSharePage,
  readGooglePhotosVideoProbe,
} from '../src/google-photos.utils';

// HAT-651: a shared Google Photos link. The pages below keep the layout of a real public album's
// page and of one photo's page inside it (2026-10-20), with made-up keys and addresses.
const LH3 = 'https://lh3.googleusercontent.com/pw/';
const item = (key: string, address: string, width = 7008, height = 4672, bytes = 12894142) =>
  [key, [`${LH3}${address}`, width, height, null, null, null, null, null, [null, null, 14], [bytes]], 1680420498744, 'x', 3600000, 1680609070369, ['owner'], [[2]], 2, { '15': 1 }];
const block = (key: string, data: unknown) =>
  `<script nonce="n">AF_initDataCallback({key: '${key}', hash: '2', data:${JSON.stringify(data)}, sideChannel: {}});</script>`;

function albumPage(items: unknown[], next = '') {
  return (
    '<!doctype html><html><head>' +
    '<meta property="og:title" content="Milan Marathon 2023 · Sunday, Apr 2, 2023 &#128248;">' +
    `<meta property="og:image" content="${LH3}COVER=w600-h315-p-k">` +
    '</head><body>' +
    block('ds:0', [[['AF1QipALBUM'], null, []]]) +
    block('ds:1', [null, items, next, ['AF1QipALBUM', 'Milan Marathon 2023', [1680420498000]], [], 0]) +
    '</body></html>'
  );
}
const ALBUM = 'https://photos.google.com/share/AF1QipALBUM?key=K';

describe('isGooglePhotosShareUrl', () => {
  test('a short link, an album, an album under an account, and one photo in an album', () => {
    expect(isGooglePhotosShareUrl('https://photos.app.goo.gl/JEadX4KBqViVFXdm9')).toBe(true);
    expect(isGooglePhotosShareUrl(ALBUM)).toBe(true);
    expect(isGooglePhotosShareUrl('https://photos.google.com/u/1/share/AF1QipALBUM?key=K')).toBe(true);
    expect(isGooglePhotosShareUrl('https://photos.google.com/share/AF1QipALBUM/photo/AF1QipPHOTO?key=K')).toBe(true);
  });

  test('not a library, another Google page, or another site', () => {
    expect(isGooglePhotosShareUrl('https://photos.google.com/')).toBe(false);
    expect(isGooglePhotosShareUrl('https://photos.google.com/album/AF1Qip')).toBe(false);
    expect(isGooglePhotosShareUrl('https://www.google.com/search?q=photos')).toBe(false);
    expect(isGooglePhotosShareUrl('https://photos.app.goo.gl/')).toBe(false);
    expect(isGooglePhotosShareUrl(null)).toBe(false);
  });

  test('a short link is asked for with the address that redirects a browser too', () => {
    expect(googlePhotosFetchUrl('https://photos.app.goo.gl/JEadX4KBqViVFXdm9')).toBe('https://photos.app.goo.gl/JEadX4KBqViVFXdm9?_imcp=1');
    expect(googlePhotosFetchUrl(ALBUM)).toBe(ALBUM);
  });
});

describe('readGooglePhotosSharePage', () => {
  test("an album's name, its photos with their sizes, and its cover", () => {
    const share = readGooglePhotosSharePage(albumPage([item('A', 'PHOTO_A=w300'), item('B', 'PHOTO_B', 4672, 7008, 10590360)]), ALBUM);
    expect(share).toEqual({
      title: 'Milan Marathon 2023',
      items: [
        { url: `${LH3}PHOTO_A`, width: 7008, height: 4672, bytes: 12894142 },
        { url: `${LH3}PHOTO_B`, width: 4672, height: 7008, bytes: 10590360 },
      ],
      more: false,
      cover: `${LH3}COVER`,
    });
  });

  test('passes over an entry that is not a photo or video, keeping the rest', () => {
    const card = ['AF1QipCARD', null, 1680420498744, 'x'];
    const share = readGooglePhotosSharePage(albumPage([item('A', 'PHOTO_A'), card, item('B', 'PHOTO_B')]), ALBUM);
    expect(share?.items.map((i) => i.url)).toEqual([`${LH3}PHOTO_A`, `${LH3}PHOTO_B`]);
  });

  test('says when the album has more than the page lists', () => {
    expect(readGooglePhotosSharePage(albumPage([item('A', 'PHOTO_A')], 'NEXT_PAGE_TOKEN'), ALBUM)?.more).toBe(true);
  });

  test('a page of one photo reached by an address that does not name it gives that photo', () => {
    const page = '<html><body>' + block('ds:0', [item('AF1QipPHOTO', 'PHOTO_ONE'), null, [], 0, null]) + '</body></html>';
    expect(readGooglePhotosSharePage(page, 'https://photos.app.goo.gl/AbCdEf')).toMatchObject({ items: [{ url: `${LH3}PHOTO_ONE` }] });
  });

  test('a link to one photo in an album gives that photo alone', () => {
    const page = '<html><body>' + block('ds:0', [item('AF1QipPHOTO', 'PHOTO_ONE'), null, [], 0, null]) + '</body></html>';
    const share = readGooglePhotosSharePage(page, 'https://photos.google.com/share/AF1QipALBUM/photo/AF1QipPHOTO?key=K');
    expect(share).toMatchObject({ title: null, items: [{ url: `${LH3}PHOTO_ONE` }], more: false });
  });

  test('nothing from a page without the list, or a block that is not JSON', () => {
    expect(readGooglePhotosSharePage('<html><body>Sign in</body></html>', ALBUM)).toBeNull();
    expect(readGooglePhotosSharePage("<script>AF_initDataCallback({key: 'ds:1', hash: '2', data:function(){}, sideChannel: {}});</script>", ALBUM)).toBeNull();
    expect(readGooglePhotosSharePage(null)).toBeNull();
  });
});

describe('googlePhotosPostMedia', () => {
  const one = readGooglePhotosSharePage(albumPage([item('A', 'PHOTO_A')]), ALBUM);

  test('one photo at full size, as a JPEG', () => {
    expect(googlePhotosPostMedia(one)).toEqual({ kind: 'image', urls: [`${LH3}PHOTO_A=s0`], provider: 'google_photos' });
  });

  test('one video: its file, its still, and its size', () => {
    expect(googlePhotosVideoProbeUrl(one)).toBe(`${LH3}PHOTO_A=dv`);
    expect(googlePhotosPostMedia(one, { sizeBytes: 9_000_000 })).toEqual({
      kind: 'video',
      urls: [`${LH3}PHOTO_A=dv`],
      poster: `${LH3}PHOTO_A=w1024-h1024`,
      provider: 'google_photos',
      sizeBytes: 9_000_000,
    });
  });

  test("an album's first pictures at a smaller size, saying how many it holds when that is more", () => {
    const many = Array.from({ length: GOOGLE_PHOTOS_MAX_PICTURES + 5 }, (_, i) => item(`K${i}`, `P${i}`));
    const media = googlePhotosPostMedia(readGooglePhotosSharePage(albumPage(many), ALBUM));
    expect(media).toMatchObject({ kind: 'gallery', provider: 'google_photos', total: GOOGLE_PHOTOS_MAX_PICTURES + 5 });
    expect(media?.urls).toHaveLength(GOOGLE_PHOTOS_MAX_PICTURES);
    expect(media?.urls[0]).toBe(`${LH3}P0=w2048-h2048`);

    const two = googlePhotosPostMedia(readGooglePhotosSharePage(albumPage([item('A', 'A'), item('B', 'B')]), ALBUM));
    expect(two).not.toHaveProperty('total');
    expect(googlePhotosPostMedia(readGooglePhotosSharePage(albumPage([item('A', 'A'), item('B', 'B')], 'NEXT'), ALBUM))?.total).toBeNull();
    expect(googlePhotosVideoProbeUrl(readGooglePhotosSharePage(albumPage([item('A', 'A'), item('B', 'B')]), ALBUM))).toBeNull();
  });
});

describe('readGooglePhotosVideoProbe', () => {
  test("a video's first byte gives its size; a photo's 404 gives nothing", () => {
    expect(readGooglePhotosVideoProbe({ status: 206, contentType: 'video/mp4', contentRange: 'bytes 0-0/11673600' })).toEqual({ sizeBytes: 11673600 });
    expect(readGooglePhotosVideoProbe({ status: 200, contentType: 'video/mp4', contentLength: '500' })).toEqual({ sizeBytes: 500 });
    expect(readGooglePhotosVideoProbe({ status: 206, contentType: 'video/mp4' })).toEqual({ sizeBytes: null });
    expect(readGooglePhotosVideoProbe({ status: 404, contentType: 'image/png' })).toBeNull();
    expect(readGooglePhotosVideoProbe({ status: 200, contentType: 'image/jpeg' })).toBeNull();
  });
});

describe('googlePhotosToItemMeta', () => {
  test("the album's name and cover, what can be saved, and the share link as the source", () => {
    const share = readGooglePhotosSharePage(albumPage([item('A', 'A'), item('B', 'B')]), ALBUM)!;
    const media = googlePhotosPostMedia(share);
    expect(googlePhotosToItemMeta('https://photos.app.goo.gl/X', share, media)).toMatchObject({
      url: 'https://photos.app.goo.gl/X',
      title: 'Milan Marathon 2023',
      siteName: 'Google Photos',
      imageSrc: `${LH3}COVER=w1024-h1024`,
      tsExtractedInfo: {
        sourceId: 'provider_api',
        postMedia: { kind: 'gallery' },
        recognized: { provider: 'google_photos', resourceType: 'GOOGLE_PHOTOS_SHARE', contentKind: 'album', canonicalUrl: 'https://photos.app.goo.gl/X' },
      },
    });
  });

  test('leaves the cover out when asked, for a result others can read', () => {
    const share = readGooglePhotosSharePage(albumPage([item('A', 'A'), item('B', 'B')]), ALBUM)!;
    const meta = googlePhotosToItemMeta(ALBUM, share, null, { cover: false });
    expect(meta).not.toHaveProperty('imageSrc');
    expect(JSON.stringify(meta)).not.toContain(LH3);
  });

  test('a share with no name is named for what it holds', () => {
    const page = '<html><body>' + block('ds:0', [item('P', 'ONE'), null]) + '</body></html>';
    const share = readGooglePhotosSharePage(page, 'https://photos.google.com/share/AL/photo/P?key=K')!;
    expect(googlePhotosToItemMeta('u', share, googlePhotosPostMedia(share)).title).toBe('Shared photo');
    expect(googlePhotosToItemMeta('u', share, googlePhotosPostMedia(share, { sizeBytes: 1 })).title).toBe('Shared video');
  });
});
