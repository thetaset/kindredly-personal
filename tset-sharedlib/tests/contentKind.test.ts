import {classifyFetchedContentKind, looksLikePdf} from '../src/extraction.utils';

function bytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

const RSS = '<?xml version="1.0"?><rss version="2.0"><channel><title>A</title></channel></rss>';
const HTML = '<!doctype html><html><head><title>A page</title></head><body></body></html>';

describe('looksLikePdf', () => {
  it('matches the %PDF- header as bytes and as a string', () => {
    expect(looksLikePdf(bytes('%PDF-1.7\n...'))).toBe(true);
    expect(looksLikePdf('%PDF-1.4')).toBe(true);
  });

  it('matches when the header sits behind leading junk, as readers allow', () => {
    expect(looksLikePdf(bytes(`${' '.repeat(200)}%PDF-1.5`))).toBe(true);
  });

  it('does not match a page that merely mentions PDF', () => {
    expect(looksLikePdf(bytes('<html><body>Download the PDF here</body></html>'))).toBe(false);
    expect(looksLikePdf(null)).toBe(false);
    expect(looksLikePdf(new Uint8Array(0))).toBe(false);
  });

  it('does not match when the header is past the 1KB scan window', () => {
    expect(looksLikePdf(bytes(`${'x'.repeat(2000)}%PDF-1.5`))).toBe(false);
  });
});

describe('classifyFetchedContentKind', () => {
  it('classifies a well-labelled response by its header', () => {
    expect(classifyFetchedContentKind({contentType: 'text/html; charset=utf-8', bytes: HTML})).toBe('html');
    expect(classifyFetchedContentKind({contentType: 'application/pdf', bytes: null})).toBe('pdf');
    expect(classifyFetchedContentKind({contentType: 'application/rss+xml', bytes: RSS})).toBe('feed');
    expect(classifyFetchedContentKind({contentType: 'application/zip', bytes: null})).toBe('binary');
    expect(classifyFetchedContentKind({contentType: 'image/png', bytes: null})).toBe('binary');
    expect(classifyFetchedContentKind({contentType: 'audio/mpeg', bytes: null})).toBe('binary');
  });

  it('trusts the magic bytes over a wrong header — the academic-host case', () => {
    expect(classifyFetchedContentKind({contentType: 'text/plain', bytes: bytes('%PDF-1.4')})).toBe('pdf');
    expect(classifyFetchedContentKind({contentType: 'text/html', bytes: bytes('%PDF-1.4')})).toBe('pdf');
    expect(classifyFetchedContentKind({contentType: '', bytes: bytes('%PDF-1.4')})).toBe('pdf');
  });

  it('sniffs a feed served under a generic XML or missing type', () => {
    expect(classifyFetchedContentKind({contentType: 'text/xml', bytes: RSS})).toBe('feed');
    expect(classifyFetchedContentKind({contentType: '', bytes: RSS})).toBe('feed');
  });

  it('treats an unlabelled or textual response as HTML, preserving today behaviour', () => {
    expect(classifyFetchedContentKind({contentType: '', bytes: HTML})).toBe('html');
    expect(classifyFetchedContentKind({contentType: 'text/plain', bytes: 'just words'})).toBe('html');
    expect(classifyFetchedContentKind({contentType: undefined, bytes: undefined})).toBe('html');
  });
});
