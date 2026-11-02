/**
 * When a saved page's details need the server, and when the device already has them.
 *
 * The device reads the page the person has open, signed in as them. The server reads it without
 * their cookies, so a private Google Doc came back as "Google Docs: Sign-in" and that title
 * replaced the doc's own (HAT-168). So the server is asked only for what it alone knows: the
 * media lookup's clean title (Audible, Spotify…), YouTube's own data, what a file is, or a page
 * the device could not read. Otherwise the address never leaves the device.
 *
 * Which answer wins when both exist is `METADATA_SOURCE_PRIORITY` in extraction.pure.utils.
 */
import { ItemResourceType } from './constants';
import { classifyFetchedContentKind, isLikelyChallengeTitle } from './extraction.pure.utils';
import { recognizeMediaMetadataUrl } from './media-metadata.utils';
import { recognizePage, recognizedToItemResourceType } from './page-recognition.utils';
import { getFileNameForUrl } from './pdf-metadata.utils';
import type { ItemMeta } from './shared.types';
import { getYTResourceTypeFromURL, isYTChannelURL, isYTVideoURL } from './url.utils';

/** Why the server is asked about a page. */
export type ServerMetadataReason = 'media' | 'youtube' | 'file' | 'unread';

/** What the device has: the read's source, its title, and the content type the browser reported. */
export type DeviceMetadataRead = {
  sourceId?: string | null;
  title?: string | null;
  contentType?: string | null;
};

/** Reads of the whole page made on the device, signed in as the person. */
const DEVICE_PAGE_READS = new Set(['live_dom', 'full_page', 'device_fetch']);

/**
 * Extensions of addresses that serve a file rather than a page. Matches what
 * `classifyFetchedContentKind` treats as a file; svg, csv and txt are left out because the server
 * reads those as pages.
 */
const FILE_EXTENSIONS = new Set([
  'pdf', 'epub', 'mobi',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf',
  'zip', 'gz', 'tgz', '7z', 'rar',
  'mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus',
  'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'tif', 'tiff',
]);

function parseUrl(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** True for an address whose last path segment has a file extension: `…/report.pdf`. */
export function isLikelyFileUrl(url: string | null | undefined): boolean {
  if (!parseUrl(url)) return false;
  const extension = /\.([a-z0-9]{1,5})$/i.exec(getFileNameForUrl(url) || '')?.[1]?.toLowerCase();
  return !!extension && FILE_EXTENSIONS.has(extension);
}

/** True for a content type the browser shows as a file (PDF, image, video), not a page. */
export function isFileContentType(contentType: string | null | undefined): boolean {
  if (!contentType?.trim()) return false;
  const kind = classifyFetchedContentKind({ contentType });
  return kind === 'pdf' || kind === 'binary';
}

/**
 * Why the server should be asked about `url`, or null when the device's read is enough.
 *
 * `read` is what the device has. A title alone (a phone's share sheet) is not a read of the
 * page, so the server is still asked for its picture and description; the shared title still
 * wins over the server's.
 */
export function getServerMetadataReason(
  url: string | null | undefined,
  read?: DeviceMetadataRead | null,
): ServerMetadataReason | null {
  if (!url || !parseUrl(url)) return null;
  if (recognizeMediaMetadataUrl(url)) return 'media';
  if (isYTVideoURL(url) || isYTChannelURL(url)) return 'youtube';
  if (isLikelyFileUrl(url) || isFileContentType(read?.contentType)) return 'file';

  const title = read?.title?.trim();
  if (!DEVICE_PAGE_READS.has(read?.sourceId || '') || !title || isLikelyChallengeTitle(title)) {
    return 'unread';
  }
  return null;
}

/** True for metadata the device read from the whole page itself. */
export function isDeviceMetadataRead(meta?: ItemMeta | null): boolean {
  return DEVICE_PAGE_READS.has(meta?.tsExtractedInfo?.sourceId || '');
}

/**
 * True when the server has something to add to `meta` that it does not have yet: the media
 * lookup's details, YouTube's channel, a file's details, or anything at all for a page the device
 * could not read.
 */
export function isServerMetadataMissing(url: string | null | undefined, meta?: ItemMeta | null): boolean {
  const extracted = meta?.tsExtractedInfo;
  switch (getServerMetadataReason(url, { sourceId: extracted?.sourceId, title: meta?.title })) {
    case 'media':
      return !meta?.tsManifest?.mediaMetadata;
    case 'youtube':
      return extracted?.sourceId !== 'yt_api' && !extracted?.channelId && !extracted?.youtubeChannelIds?.length;
    case 'file':
      return !meta?.fileInfo;
    case 'unread':
      return true;
    default:
      return false;
  }
}

/**
 * The page type the device can tell from the address alone, as the server's reader sets it: a
 * site's home page, a YouTube video or channel, or what the page recognizers make of it (an
 * ordinary page is SITE_ITEM). Null only for an address that does not parse.
 */
export function getPageTypeFromUrl(url: string | null | undefined): ItemResourceType | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  if (parsed.pathname === '/' || !parsed.pathname) return ItemResourceType.SITE_ROOT;

  const youtube = getYTResourceTypeFromURL(parsed.href);
  if (youtube) return youtube;

  const recognized = recognizePage({ url: parsed.href });
  return recognized ? recognizedToItemResourceType(recognized) : null;
}
