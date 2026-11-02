import { ItemResourceType } from '../src/constants';
import {
  getPageTypeFromUrl,
  getServerMetadataReason,
  isDeviceMetadataRead,
  isFileContentType,
  isLikelyFileUrl,
  isServerMetadataMissing,
} from '../src/server-metadata.utils';

const pageRead = (title: string | null) => ({ sourceId: 'live_dom', title });

describe('getServerMetadataReason (HAT-168)', () => {
  test('a page the device read stays on the device', () => {
    expect(getServerMetadataReason('https://docs.google.com/document/d/1AbC/edit', pageRead('Quarterly plan - Google Docs'))).toBeNull();
    expect(getServerMetadataReason('https://example.com/blog/post', pageRead('A post'))).toBeNull();
    expect(getServerMetadataReason('https://example.com/blog/post', { sourceId: 'device_fetch', title: 'A post' })).toBeNull();
  });

  test('media links ask for the media lookup', () => {
    expect(getServerMetadataReason('https://www.audible.com/pd/Atomic-Habits-Audiobook/B07RFSSYBH', pageRead('Atomic Habits'))).toBe('media');
  });

  test("YouTube asks for YouTube's own data", () => {
    expect(getServerMetadataReason('https://www.youtube.com/watch?v=abc123xyz00', pageRead('A video'))).toBe('youtube');
    expect(getServerMetadataReason('https://www.youtube.com/@kurzgesagt', pageRead('Kurzgesagt'))).toBe('youtube');
  });

  test('a file asks for the file details', () => {
    expect(getServerMetadataReason('https://eprint.iacr.org/2025/1237.pdf', null)).toBe('file');
    expect(getServerMetadataReason('https://arxiv.org/pdf/2501.01234', { ...pageRead('2501.01234'), contentType: 'application/pdf' })).toBe('file');
  });

  test('a page the device could not read asks the server', () => {
    expect(getServerMetadataReason('https://example.com/post', null)).toBe('unread');
    expect(getServerMetadataReason('https://example.com/post', pageRead(''))).toBe('unread');
    expect(getServerMetadataReason('https://example.com/post', pageRead('Just a moment...'))).toBe('unread');
  });

  test('a title from the share sheet still asks, for the picture and description', () => {
    expect(getServerMetadataReason('https://example.com/post', { sourceId: 'shared_title', title: 'A post' })).toBe('unread');
  });

  test('no usable address asks nothing', () => {
    expect(getServerMetadataReason(null, null)).toBeNull();
    expect(getServerMetadataReason('not a url', null)).toBeNull();
  });
});

describe('isLikelyFileUrl and isFileContentType', () => {
  test('file extensions', () => {
    expect(isLikelyFileUrl('https://example.com/report.PDF')).toBe(true);
    expect(isLikelyFileUrl('https://example.com/photos/cat.jpeg?size=large')).toBe(true);
    expect(isLikelyFileUrl('https://example.com/blog/post')).toBe(false);
    expect(isLikelyFileUrl('https://example.com/sitemap.xml')).toBe(false);
    expect(isLikelyFileUrl('https://example.com/notes.txt')).toBe(false);
    expect(isLikelyFileUrl('https://example.com/')).toBe(false);
  });

  test('content types', () => {
    expect(isFileContentType('application/pdf')).toBe(true);
    expect(isFileContentType('image/png')).toBe(true);
    expect(isFileContentType('text/html')).toBe(false);
    expect(isFileContentType('application/xhtml+xml')).toBe(false);
    expect(isFileContentType('')).toBe(false);
    expect(isFileContentType(null)).toBe(false);
  });
});

describe('isServerMetadataMissing', () => {
  test('an ordinary page the device read needs nothing', () => {
    expect(
      isServerMetadataMissing('https://example.com/post', { title: 'A post', tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } }),
    ).toBe(false);
  });

  test('media without the lookup, YouTube without its channel, a file without its details', () => {
    const live = { pageType: null, sourceId: 'live_dom' as const };
    expect(isServerMetadataMissing('https://www.audible.com/pd/B07RFSSYBH', { title: 'Atomic Habits', tsExtractedInfo: live })).toBe(true);
    expect(isServerMetadataMissing('https://www.youtube.com/watch?v=abc123xyz00', { title: 'A video', tsExtractedInfo: live })).toBe(true);
    expect(isServerMetadataMissing('https://example.com/report.pdf', { title: 'Report', tsExtractedInfo: live })).toBe(true);
  });

  test('media, YouTube and files that already have it', () => {
    expect(
      isServerMetadataMissing('https://www.audible.com/pd/B07RFSSYBH', {
        title: 'Atomic Habits',
        tsManifest: { mediaMetadata: { provider: 'audible' } },
        tsExtractedInfo: { pageType: null, sourceId: 'parser_1' },
      }),
    ).toBe(false);
    expect(
      isServerMetadataMissing('https://www.youtube.com/watch?v=abc123xyz00', {
        title: 'A video',
        tsExtractedInfo: { pageType: ItemResourceType.YT_VIDEO, sourceId: 'live_dom', channelId: 'UC123' },
      }),
    ).toBe(false);
    expect(
      isServerMetadataMissing('https://example.com/report.pdf', {
        title: 'Report',
        fileInfo: { kind: 'pdf' } as any,
        tsExtractedInfo: { pageType: null, sourceId: 'pdf_embedded' },
      }),
    ).toBe(false);
  });

  test('an untitled read needs the server', () => {
    expect(isServerMetadataMissing('https://example.com/post', { tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } })).toBe(true);
  });
});

describe('isDeviceMetadataRead', () => {
  test('only whole-page reads made on the device', () => {
    expect(isDeviceMetadataRead({ tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } })).toBe(true);
    expect(isDeviceMetadataRead({ tsExtractedInfo: { pageType: null, sourceId: 'device_fetch' } })).toBe(true);
    expect(isDeviceMetadataRead({ tsExtractedInfo: { pageType: null, sourceId: 'shared_title' } })).toBe(false);
    expect(isDeviceMetadataRead({ tsExtractedInfo: { pageType: null, sourceId: 'parser_1' } })).toBe(false);
    expect(isDeviceMetadataRead(null)).toBe(false);
  });
});

describe('getPageTypeFromUrl', () => {
  test('home pages, YouTube, and every other page, as the server reader sets them', () => {
    expect(getPageTypeFromUrl('https://example.com/')).toBe(ItemResourceType.SITE_ROOT);
    expect(getPageTypeFromUrl('https://example.com')).toBe(ItemResourceType.SITE_ROOT);
    expect(getPageTypeFromUrl('https://www.youtube.com/watch?v=abc123xyz00')).toBe(ItemResourceType.YT_VIDEO);
    expect(getPageTypeFromUrl('https://www.youtube.com/@kurzgesagt')).toBe(ItemResourceType.YT_CHANNEL);
    expect(getPageTypeFromUrl('https://example.com/blog/post')).toBe(ItemResourceType.SITE_ITEM);
    expect(getPageTypeFromUrl('not a url')).toBeNull();
  });
});
