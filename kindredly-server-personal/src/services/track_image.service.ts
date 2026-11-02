import axios from 'axios';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import {fetchImageAsDataUrl} from '@/utils/fetch_helpers';

/**
 * Images for learning track items (docs/trackers/learning-tracks-tracker.md, TRK-11).
 *
 * An image comes from Wikimedia Commons, where every file carries its license, and is copied to
 * Kindredly once, with its credit, license and source page. A track item never links to the image
 * where it came from: that would tell Wikimedia what a child reads, show no credit, and break when
 * the file moves.
 *
 * Wikimedia asks for a User-Agent with a contact; this is Kindredly's, never a person's.
 */

const USER_AGENT = 'KindredlyLearningTracks/1.0 (https://kindredly.ai)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
/** Rendered width to copy: Commons originals can be huge or TIFF; the rendered thumb is web-sized. */
const COPY_WIDTH = 1280;
const MIN_WIDTH = 600;

export type TrackImageCandidate = {
  title: string;
  /** The rendered image to copy, never shown to a reader. */
  fileUrl: string;
  /** The file's Commons page, shown as the credit's link. */
  sourceUrl: string;
  credit: string;
  license: string;
  alt: string;
  width?: number;
  height?: number;
};

export type CopiedTrackImage = {
  /** The image bytes as a data URL, for the client to save with the item. */
  imageData: string;
  credit: string;
  license: string;
  sourceUrl: string;
  alt: string;
};

function stripHtml(value?: string): string {
  if (!value) return '';
  return (
    value
      // Commons descriptions carry template styles; their CSS is not description.
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .trim()
  );
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** Commons hosts only free files, but a missing or non-free license is still refused. */
export function isOpenLicense(license: string): boolean {
  const l = license.trim().toLowerCase();
  if (!l) return false;
  if (l.includes('fair use') || l.includes('non-free') || l.includes('all rights reserved')) return false;
  return true;
}

/** One Commons page from `prop=imageinfo&iiprop=url|extmetadata|size`, or null when unusable. */
export function toTrackImageCandidate(page: any): TrackImageCandidate | null {
  const info = page?.imageinfo?.[0];
  if (!info?.url) return null;
  const meta = info.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (!isOpenLicense(license)) return null;

  const title = String(page.title || 'Image')
    .replace(/^File:/, '')
    .replace(/\.[a-z0-9]+$/i, '');
  const artist = truncate(stripHtml(meta.Artist?.value), 120);
  const description = truncate(stripHtml(meta.ImageDescription?.value), 200);

  return {
    title,
    fileUrl: info.thumburl || info.url,
    sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
    credit: artist || 'Wikimedia Commons',
    license,
    alt: description || title,
    width: info.thumbwidth || info.width,
    height: info.thumbheight || info.height,
  };
}

async function queryCommons(params: string): Promise<any[]> {
  const url = `${COMMONS_API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=${COPY_WIDTH}${params}`;
  assertSafeExternalUrl(url);
  const res = await axios.get(
    url,
    safeFetchConfig({timeout: 15000, headers: {'User-Agent': USER_AGENT}, validateStatus: () => true}),
  );
  const pages = res.status === 200 ? res.data?.query?.pages : null;
  if (!pages || typeof pages !== 'object') return [];
  // Keyed by pageid; `index` restores the search rank.
  return Object.values(pages as Record<string, any>).sort((a: any, b: any) => (a?.index ?? 0) - (b?.index ?? 0));
}

/** The Commons file title from "File:X.jpg", a Commons page URL, or an upload URL. */
export function commonsFileTitle(value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (/^file:/i.test(v)) return `File:${v.slice(5)}`;
  try {
    const url = new URL(v);
    if (url.hostname === 'commons.wikimedia.org' && url.pathname.startsWith('/wiki/')) {
      return decodeURIComponent(url.pathname.slice('/wiki/'.length));
    }
    if (url.hostname === 'upload.wikimedia.org') {
      const parts = url.pathname.split('/').filter(Boolean);
      // /wikipedia/commons/thumb/a/ab/Name.jpg/1280px-Name.jpg or /wikipedia/commons/a/ab/Name.jpg
      const thumbIndex = parts.indexOf('thumb');
      const name = thumbIndex >= 0 ? parts[thumbIndex + 3] : parts[parts.length - 1];
      return name ? `File:${decodeURIComponent(name)}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export class TrackImageService {
  /** Openly licensed Commons images for a subject, best match first. */
  async search(query: string, limit = 6): Promise<TrackImageCandidate[]> {
    const q = (query || '').trim();
    if (!q) return [];
    const pages = await queryCommons(
      `&generator=search&gsrsearch=${encodeURIComponent('filetype:bitmap ' + q)}&gsrnamespace=6&gsrlimit=${Math.min(20, Math.max(1, limit * 2))}`,
    );
    return pages
      .map(toTrackImageCandidate)
      .filter((c): c is TrackImageCandidate => !!c && (!c.width || c.width >= MIN_WIDTH))
      .slice(0, limit);
  }

  /** One named Commons file ("File:X.jpg" or its page or upload URL), with its license and credit. */
  async lookup(fileTitleOrUrl: string): Promise<TrackImageCandidate | null> {
    const title = commonsFileTitle(fileTitleOrUrl);
    if (!title) return null;
    const pages = await queryCommons(`&titles=${encodeURIComponent(title)}`);
    return pages.map(toTrackImageCandidate).find((c): c is TrackImageCandidate => !!c) ?? null;
  }

  /** Copies the image once: its bytes, with the credit, license and source page it carries. */
  async copy(candidate: TrackImageCandidate): Promise<CopiedTrackImage | null> {
    const imageData = await fetchImageAsDataUrl(candidate.fileUrl, {'User-Agent': USER_AGENT});
    if (!imageData) return null;
    return {
      imageData,
      credit: candidate.credit,
      license: candidate.license,
      sourceUrl: candidate.sourceUrl,
      alt: candidate.alt,
    };
  }
}

export default TrackImageService;
