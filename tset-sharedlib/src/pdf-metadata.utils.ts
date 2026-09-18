/**
 * Title/description recovery for URLs that serve a file rather than a page.
 *
 * A PDF URL has no `<head>`, so the ordinary metadata path returns nothing and the
 * saved item shows a bare URL. Three sources are tried, best first:
 *
 *   1. The sibling landing page — `…/2025/1237.pdf` → `…/2025/1237`, arXiv
 *      `/pdf/<id>` → `/abs/<id>`. Publishers put the real title and abstract there.
 *   2. The PDF's own embedded metadata — XMP packet, then the Info dictionary.
 *   3. The filename — last resort, and it yields a title only, never a description.
 *
 * Deliberately dependency-free: this runs on the server, in the client background,
 * and in the MV3 service worker, and none of them should pull in a PDF library to
 * read a title. The cost is that a PDF 1.5+ file which compresses its Info dictionary
 * into an object stream reads as having none — we do not inflate. That is not a
 * regression (there was no PDF support at all), and source 1 covers the common case.
 */

/** How much of each end of the file to scan. PDFs put XMP near the front and the
 * trailer at the very back; scanning both ends bounds the work for a large file
 * while covering anything under twice this size completely. */
const SCAN_REGION_BYTES = 4 * 1024 * 1024;

const JUNK_TITLE_VALUES = new Set([
  'untitled',
  'untitled document',
  'untitled1',
  'no title',
  'document',
  'document1',
  'microsoft word',
  'title',
  'unknown',
  'pdf document',
]);

/** Toolchains that write their own name into /Title or /Creator when the author set none. */
const PRODUCER_LIKE_TITLE_RE =
  /^(microsoft\s+word|microsoft\s+powerpoint|microsoft\s+excel|libreoffice|openoffice|pdftex|pdflatex|latex|xetex|luatex|ghostscript|quartz|acrobat|distiller|word|powerpoint|excel|pages|keynote|canva|google\s+docs|adobe\s+\w+|skia\/pdf|wkhtmltopdf|chromium|印刷)\b/i;

/** `Microsoft Word - paper_final.docx` and `paper.tex` — the source file, not a title. */
const SOURCE_FILENAME_TITLE_RE = /\.(docx?|pptx?|xlsx?|tex|dvi|ps|rtf|odt|pages|indd|pdf)$/i;

// ---------------------------------------------------------------------------
// Byte helpers
// ---------------------------------------------------------------------------

/**
 * Bytes → a string where character N is byte N (true latin1, not the windows-1252
 * that `TextDecoder('latin1')` actually implements). Structural scanning below is
 * all ASCII, and keeping the mapping exact means extracted values can be turned
 * back into their original bytes without loss.
 */
function bytesToBinaryString(bytes: Uint8Array, start: number, end: number): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  const stop = Math.min(end, bytes.length);
  for (let i = Math.max(0, start); i < stop; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, stop));
    parts.push(String.fromCharCode(...(slice as unknown as number[])));
  }
  return parts.join('');
}

/** The head and tail of the file as scannable strings (one region when it fits). */
function getScanRegions(bytes: Uint8Array): string[] {
  if (bytes.length <= SCAN_REGION_BYTES * 2) {
    return [bytesToBinaryString(bytes, 0, bytes.length)];
  }
  return [
    bytesToBinaryString(bytes, 0, SCAN_REGION_BYTES),
    bytesToBinaryString(bytes, bytes.length - SCAN_REGION_BYTES, bytes.length),
  ];
}

function binaryStringToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/** XMP packets are UTF-8; undo the latin1 round-trip taken to scan for them. */
function decodeUtf8(value: string): string {
  try {
    return new TextDecoder('utf-8').decode(binaryStringToBytes(value));
  } catch {
    return value;
  }
}

/** PDF text strings are UTF-16BE when they open with a BOM, else PDFDocEncoding. */
function decodePdfTextBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return out;
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    try {
      return new TextDecoder('utf-8').decode(bytes.subarray(3));
    } catch {
      /* fall through */
    }
  }
  // PDFDocEncoding agrees with latin1 across the printable range, which is as much
  // as a title needs.
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cleaning and junk rejection
// ---------------------------------------------------------------------------

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * A PDF title is only useful if a person wrote it. Reject the generator's own name,
 * the source filename, and the stock placeholders — showing "Microsoft Word 2016" as
 * an item title is worse than showing nothing, because it looks deliberate.
 */
export function cleanPdfTitleCandidate(
  raw: string | null | undefined,
  context: { producer?: string | null; creatorTool?: string | null } = {},
): string | null {
  let value = collapseWhitespace(String(raw || ''));
  if (!value) return null;

  // `Microsoft Word - Paper Final.docx` → `Paper Final.docx`, then the extension goes.
  value = value.replace(/^(microsoft\s+word|microsoft\s+powerpoint)\s+-\s+/i, '');
  value = value.replace(SOURCE_FILENAME_TITLE_RE, '');
  value = collapseWhitespace(value);

  if (!value || value.length < 2) return null;
  if (JUNK_TITLE_VALUES.has(value.toLowerCase())) return null;
  if (PRODUCER_LIKE_TITLE_RE.test(value)) return null;
  // Bare identifiers: "2025-1237", "doc_003", a UUID.
  if (/^[\d\W_]+$/.test(value)) return null;

  const producer = collapseWhitespace(String(context.producer || '')).toLowerCase();
  const creatorTool = collapseWhitespace(String(context.creatorTool || '')).toLowerCase();
  const lowered = value.toLowerCase();
  if ((producer && lowered === producer) || (creatorTool && lowered === creatorTool)) {
    return null;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Source 2a — XMP packet
// ---------------------------------------------------------------------------

function readXmpTag(xmp: string, tag: string): string | null {
  const block = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xmp);
  if (!block) return null;

  const inner = block[1];
  // dc:* values are usually wrapped in <rdf:Alt>/<rdf:Bag>/<rdf:Seq> + <rdf:li>.
  const listItems = [...inner.matchAll(/<rdf:li(?:\s[^>]*)?>([\s\S]*?)<\/rdf:li>/gi)].map((m) => m[1]);
  const text = (listItems.length ? listItems.join(', ') : inner).replace(/<[^>]*>/g, '');

  const decoded = decodeUtf8(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  const cleaned = collapseWhitespace(decoded);
  return cleaned || null;
}

function findXmpPacket(region: string): string | null {
  const start = region.indexOf('<x:xmpmeta');
  if (start !== -1) {
    const end = region.indexOf('</x:xmpmeta>', start);
    if (end !== -1) return region.slice(start, end + '</x:xmpmeta>'.length);
  }
  const rdfStart = region.indexOf('<rdf:RDF');
  if (rdfStart !== -1) {
    const rdfEnd = region.indexOf('</rdf:RDF>', rdfStart);
    if (rdfEnd !== -1) return region.slice(rdfStart, rdfEnd + '</rdf:RDF>'.length);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source 2b — Info dictionary
// ---------------------------------------------------------------------------

/** Read a `(literal)` PDF string starting at `open` (the index of `(`). */
function readLiteralString(region: string, open: number): string | null {
  let depth = 0;
  let out = '';
  for (let i = open; i < region.length; i += 1) {
    const ch = region[i];
    if (ch === '\\') {
      const next = region[i + 1];
      if (next === undefined) return null;
      if (next >= '0' && next <= '7') {
        let octal = '';
        let j = i + 1;
        while (j < region.length && octal.length < 3 && region[j] >= '0' && region[j] <= '7') {
          octal += region[j];
          j += 1;
        }
        out += String.fromCharCode(parseInt(octal, 8) & 0xff);
        i = j - 1;
        continue;
      }
      const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
      // A backslash before a newline is a line continuation and contributes nothing.
      if (next === '\n' || next === '\r') {
        i += 1;
        continue;
      }
      out += escapes[next] ?? next;
      i += 1;
      continue;
    }
    if (ch === '(') {
      depth += 1;
      if (depth === 1) continue;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return out;
    }
    if (depth >= 1) out += ch;
    // Runaway guard: a title is never this long, so an unbalanced paren means we
    // are reading compressed stream data, not a string.
    if (out.length > 4000) return null;
  }
  return null;
}

/** Read the value of `/<key>` from a dictionary region, literal or hex form. */
function readInfoDictValue(region: string, key: string): string | null {
  const pattern = new RegExp(`/${key}\\s*(\\(|<(?![<]))`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(region)) !== null) {
    if (match[1] === '(') {
      const literal = readLiteralString(region, match.index + match[0].length - 1);
      if (literal !== null) {
        const value = decodePdfTextBytes(binaryStringToBytes(literal));
        if (collapseWhitespace(value)) return collapseWhitespace(value);
      }
      continue;
    }
    const close = region.indexOf('>', match.index);
    if (close === -1) continue;
    const hex = region.slice(match.index + match[0].length, close).replace(/\s+/g, '');
    if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) continue;
    const padded = hex.length % 2 === 1 ? `${hex}0` : hex;
    const bytes = new Uint8Array(padded.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
    }
    const value = collapseWhitespace(decodePdfTextBytes(bytes));
    if (value) return value;
  }
  return null;
}

/**
 * Narrow the search to the object the trailer names as `/Info`, so a `/Title` in an
 * outline entry or annotation can't be mistaken for the document's own. Falls back
 * to the whole region when the reference or the object can't be located.
 */
function getInfoDictRegion(region: string): string {
  const refs = [...region.matchAll(/\/Info\s+(\d+)\s+(\d+)\s+R/g)];
  const lastRef = refs[refs.length - 1];
  if (!lastRef) return region;

  const objPattern = new RegExp(`(?:^|[^\\d])${lastRef[1]}\\s+${lastRef[2]}\\s+obj\\b`, 'g');
  const objMatch = objPattern.exec(region);
  if (!objMatch) return region;

  const start = objMatch.index;
  const end = region.indexOf('endobj', start);
  return end === -1 ? region.slice(start, start + 8192) : region.slice(start, end);
}

export type PdfEmbeddedMetadata = {
  title: string | null;
  description: string | null;
  author: string | null;
};

/**
 * Read what the PDF says about itself. Returns nulls rather than guesses — every
 * field is run through {@link cleanPdfTitleCandidate}'s junk rules first, because a
 * producer string presented as a title is a worse outcome than an empty one.
 */
export function extractPdfEmbeddedMetadata(bytes: Uint8Array | null | undefined): PdfEmbeddedMetadata {
  const empty: PdfEmbeddedMetadata = { title: null, description: null, author: null };
  if (!bytes || !bytes.length) return empty;

  let producer: string | null = null;
  let creatorTool: string | null = null;
  let title: string | null = null;
  let description: string | null = null;
  let author: string | null = null;

  for (const region of getScanRegions(bytes)) {
    const xmp = findXmpPacket(region);
    if (xmp) {
      producer = producer || readXmpTag(xmp, 'pdf:Producer');
      creatorTool = creatorTool || readXmpTag(xmp, 'xmp:CreatorTool');
      title = title || readXmpTag(xmp, 'dc:title');
      description = description || readXmpTag(xmp, 'dc:description');
      author = author || readXmpTag(xmp, 'dc:creator');
    }

    const infoRegion = getInfoDictRegion(region);
    producer = producer || readInfoDictValue(infoRegion, 'Producer');
    creatorTool = creatorTool || readInfoDictValue(infoRegion, 'Creator');
    title = title || readInfoDictValue(infoRegion, 'Title');
    description = description || readInfoDictValue(infoRegion, 'Subject');
    author = author || readInfoDictValue(infoRegion, 'Author');

    if (title && description && author) break;
  }

  const context = { producer, creatorTool };
  return {
    title: cleanPdfTitleCandidate(title, context),
    description: cleanPdfTitleCandidate(description, context),
    author: cleanPdfTitleCandidate(author, context),
  };
}

// ---------------------------------------------------------------------------
// Source 1 — sibling landing page
// ---------------------------------------------------------------------------

/**
 * URLs that are likely to be the human-facing page for this PDF, best first.
 *
 * Publishers serve the file and its abstract page from neighbouring paths. Dropping
 * the `.pdf` covers IACR ePrint, most journals, and most CMSes; arXiv needs its own
 * rule because it swaps a path segment rather than an extension.
 *
 * Callers must use these for metadata only — the item's URL stays the PDF. See
 * `content_lookup.service.ts`, which would otherwise adopt the landing page as the
 * canonical URL and silently save the abstract instead of the file.
 */
export function getPdfLandingPageCandidates(url: string | null | undefined): string[] {
  const raw = String(url || '').trim();
  if (!raw) return [];

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return [];
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return [];

  const candidates: string[] = [];
  const push = (pathname: string) => {
    if (!pathname || pathname === parsed.pathname) return;
    const candidate = new URL(parsed.toString());
    candidate.pathname = pathname;
    candidate.hash = '';
    const value = candidate.toString();
    if (value !== raw && !candidates.includes(value)) candidates.push(value);
  };

  // arXiv: /pdf/2401.12345, /pdf/2401.12345v2, /pdf/2401.12345.pdf → /abs/2401.12345
  const arxiv = /^\/pdf\/(.+?)(?:v\d+)?(?:\.pdf)?$/i.exec(parsed.pathname);
  if (arxiv && /arxiv\.org$/i.test(parsed.hostname.replace(/^www\./i, ''))) {
    push(`/abs/${arxiv[1]}`);
  }

  if (/\.pdf$/i.test(parsed.pathname)) {
    push(parsed.pathname.replace(/\.pdf$/i, ''));
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Source 3 — the filename
// ---------------------------------------------------------------------------

/**
 * Auto-generated filenames that make bad item names: camera rolls, screenshots,
 * messaging-app exports, UUID/hex blobs, and bare timestamps.
 */
const JUNK_FILENAME_PATTERNS: RegExp[] = [
  /^(img|pxl|dsc|dscf|dscn|dcim|mvimg|vid|mov|gopr\w*|dji|rpreplay|trim)[-_ ]?\d[\d\-_. ]*$/i,
  /^(screenshot|screen[ _-]?shot|screen[ _-]?recording|capture|snip)\b.*/i,
  /^(image|photo|video|file|document|scan|scanned|download|unnamed|untitled|attachment|clipboard|pasted[ _-]?image|fullsizerender|resized|edited|export)[-_ ]?\(?\d*\)?$/i,
  /^whatsapp[ _-](image|video)\b.*/i,
  /^signal-\d.*/i,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^[0-9a-f]{12,}$/i,
  /^[\d\-_. ()]+$/,
];

export function stripFileExtension(filename: string): string {
  return filename.replace(/(.)\.[a-z0-9]{1,5}$/i, '$1');
}

export function isJunkFilenameStem(stem: string): boolean {
  return JUNK_FILENAME_PATTERNS.some((pattern) => pattern.test(stem));
}

export function humanizeFilenameStem(stem: string): string {
  const spaced = stem.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return '';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** `Content-Disposition: inline; filename="2025-1237.pdf"` → `2025-1237.pdf`. */
export function parseContentDispositionFilename(header: string | null | undefined): string | null {
  const value = String(header || '');
  if (!value) return null;

  // RFC 5987 `filename*=UTF-8''name.pdf` wins when present — it carries the encoding.
  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(value);
  if (extended) {
    try {
      return decodeURIComponent(extended[2].trim()) || null;
    } catch {
      return extended[2].trim() || null;
    }
  }

  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(value);
  if (!plain) return null;
  const name = (plain[2] ?? plain[1] ?? '').trim();
  return name || null;
}

/** The filename to show for a file URL, from the header if given, else the path. */
export function getFileNameForUrl(url: string | null | undefined, contentDisposition?: string | null): string | null {
  const fromHeader = parseContentDispositionFilename(contentDisposition);
  if (fromHeader) return fromHeader;

  try {
    const segments = new URL(String(url || '')).pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

/**
 * Last-resort title: `chore-chart.pdf` → `Chore chart`. Returns null for the
 * auto-generated names above rather than surfacing `IMG_20260101` as a title.
 */
export function deriveTitleFromFileName(filename: string | null | undefined): string | null {
  const stem = stripFileExtension(String(filename || '').trim());
  if (!stem || isJunkFilenameStem(stem)) return null;
  return humanizeFilenameStem(stem) || null;
}
