import {
  cleanPdfTitleCandidate,
  deriveTitleFromFileName,
  extractPdfEmbeddedMetadata,
  getFileNameForUrl,
  getPdfLandingPageCandidates,
  parseContentDispositionFilename,
} from '../src/pdf-metadata.utils';

/**
 * Builds a minimal but structurally real PDF: header, one Info object, and a trailer
 * that points at it. Enough for the Info-dictionary reader to exercise its actual
 * path (find /Info ref → find the object → read the key) rather than a lucky
 * global regex hit.
 */
function makePdfWithInfoDict(entries: string, options: {infoObjNum?: number} = {}): Uint8Array {
  const objNum = options.infoObjNum ?? 4;
  const text = [
    '%PDF-1.4',
    `${objNum} 0 obj`,
    `<< ${entries} >>`,
    'endobj',
    'trailer',
    `<< /Size 5 /Info ${objNum} 0 R /Root 1 0 R >>`,
    'startxref',
    '0',
    '%%EOF',
  ].join('\n');
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function makePdfWithXmp(xmpBody: string): Uint8Array {
  const text = [
    '%PDF-1.6',
    '5 0 obj',
    '<< /Type /Metadata /Subtype /XML >>',
    'stream',
    '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    xmpBody,
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
    'endstream',
    'endobj',
    '%%EOF',
  ].join('\n');
  const encoded = new TextEncoder().encode(text);
  return encoded;
}

describe('getPdfLandingPageCandidates', () => {
  it('drops the .pdf extension — the IACR ePrint case that has the real title', () => {
    expect(getPdfLandingPageCandidates('https://eprint.iacr.org/2025/1237.pdf')).toEqual([
      'https://eprint.iacr.org/2025/1237',
    ]);
  });

  it('maps arXiv /pdf/<id> to /abs/<id>, with or without a version suffix', () => {
    expect(getPdfLandingPageCandidates('https://arxiv.org/pdf/2401.12345')).toEqual([
      'https://arxiv.org/abs/2401.12345',
    ]);
    expect(getPdfLandingPageCandidates('https://arxiv.org/pdf/2401.12345v3')).toEqual([
      'https://arxiv.org/abs/2401.12345',
    ]);
    expect(getPdfLandingPageCandidates('https://arxiv.org/pdf/2401.12345.pdf')).toContain(
      'https://arxiv.org/abs/2401.12345',
    );
  });

  it('does not apply the arXiv rule to other hosts that use a /pdf/ path', () => {
    expect(getPdfLandingPageCandidates('https://example.com/pdf/report')).toEqual([]);
  });

  it('returns nothing for a URL with no PDF shape, or a non-http scheme', () => {
    expect(getPdfLandingPageCandidates('https://example.com/article')).toEqual([]);
    expect(getPdfLandingPageCandidates('file:///tmp/local.pdf')).toEqual([]);
    expect(getPdfLandingPageCandidates('')).toEqual([]);
    expect(getPdfLandingPageCandidates(null)).toEqual([]);
  });

  it('preserves the query string, which some hosts need to serve the page', () => {
    expect(getPdfLandingPageCandidates('https://example.com/doc.pdf?v=2')).toEqual([
      'https://example.com/doc?v=2',
    ]);
  });
});

describe('cleanPdfTitleCandidate', () => {
  it('keeps a real title', () => {
    expect(cleanPdfTitleCandidate('  Attention Is All You Need ')).toBe('Attention Is All You Need');
  });

  it('strips the "Microsoft Word - " prefix and the source extension', () => {
    expect(cleanPdfTitleCandidate('Microsoft Word - Quantum Factorisation.docx')).toBe(
      'Quantum Factorisation',
    );
    expect(cleanPdfTitleCandidate('final-paper.tex')).toBe('final-paper');
  });

  it('rejects the generator name — the failure mode that made this worth guarding', () => {
    expect(cleanPdfTitleCandidate('Microsoft Word 2016')).toBeNull();
    expect(cleanPdfTitleCandidate('LaTeX with hyperref')).toBeNull();
    expect(cleanPdfTitleCandidate('Skia/PDF m118')).toBeNull();
  });

  it('rejects a title that merely repeats the producer or creator tool', () => {
    expect(cleanPdfTitleCandidate('Acme Publisher 7', {producer: 'Acme Publisher 7'})).toBeNull();
    expect(cleanPdfTitleCandidate('Scrivener', {creatorTool: 'scrivener'})).toBeNull();
  });

  it('rejects placeholders and bare identifiers', () => {
    expect(cleanPdfTitleCandidate('Untitled')).toBeNull();
    expect(cleanPdfTitleCandidate('untitled document')).toBeNull();
    expect(cleanPdfTitleCandidate('2025-1237')).toBeNull();
    expect(cleanPdfTitleCandidate('   ')).toBeNull();
    expect(cleanPdfTitleCandidate(null)).toBeNull();
  });
});

describe('extractPdfEmbeddedMetadata', () => {
  it('reads a literal-string Title from the object the trailer names as /Info', () => {
    const pdf = makePdfWithInfoDict('/Title (A Study of Sleep) /Author (R. Lee)');
    const meta = extractPdfEmbeddedMetadata(pdf);
    expect(meta.title).toBe('A Study of Sleep');
    expect(meta.author).toBe('R. Lee');
  });

  it('handles escaped parentheses and octal escapes inside a literal string', () => {
    const pdf = makePdfWithInfoDict('/Title (Sleep \\(and Dreams\\) caf\\351)');
    expect(extractPdfEmbeddedMetadata(pdf).title).toBe('Sleep (and Dreams) café');
  });

  it('decodes a UTF-16BE hex string with a BOM', () => {
    // FEFF + "Héllo" in UTF-16BE
    const hex = 'FEFF00480000E9006C006C006F'.replace('0000E9', '00E9');
    const pdf = makePdfWithInfoDict(`/Title <${hex}>`);
    expect(extractPdfEmbeddedMetadata(pdf).title).toBe('Héllo');
  });

  it('ignores a /Title that belongs to an outline entry, not the Info object', () => {
    const text = [
      '%PDF-1.4',
      '2 0 obj',
      '<< /Type /Outlines /Title (Chapter One) >>',
      'endobj',
      '4 0 obj',
      '<< /Title (The Real Document Title) >>',
      'endobj',
      'trailer',
      '<< /Info 4 0 R >>',
      '%%EOF',
    ].join('\n');
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
    expect(extractPdfEmbeddedMetadata(bytes).title).toBe('The Real Document Title');
  });

  it('reads dc:title and dc:description out of an XMP packet', () => {
    const pdf = makePdfWithXmp(
      [
        '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">',
        '<dc:title><rdf:Alt><rdf:li xml:lang="x-default">Sleep &amp; Memory</rdf:li></rdf:Alt></dc:title>',
        '<dc:description><rdf:Alt><rdf:li>What naps do.</rdf:li></rdf:Alt></dc:description>',
        '</rdf:Description>',
      ].join('\n'),
    );
    const meta = extractPdfEmbeddedMetadata(pdf);
    expect(meta.title).toBe('Sleep & Memory');
    expect(meta.description).toBe('What naps do.');
  });

  it('decodes UTF-8 in XMP rather than mangling it through the latin1 scan', () => {
    const pdf = makePdfWithXmp(
      [
        '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">',
        '<dc:title><rdf:Alt><rdf:li>Étude sur le café</rdf:li></rdf:Alt></dc:title>',
        '</rdf:Description>',
      ].join('\n'),
    );
    expect(extractPdfEmbeddedMetadata(pdf).title).toBe('Étude sur le café');
  });

  it('returns nulls — not the producer — when XMP declares an empty dc:title', () => {
    // This is exactly the shape of eprint.iacr.org/2025/1237.pdf.
    const pdf = makePdfWithXmp(
      [
        '<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">',
        '<pdf:Producer>Microsoft Word 2016</pdf:Producer></rdf:Description>',
        '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">',
        '</rdf:Description>',
      ].join('\n'),
    );
    expect(extractPdfEmbeddedMetadata(pdf)).toEqual({title: null, description: null, author: null});
  });

  it('returns nulls for empty or non-PDF input instead of throwing', () => {
    expect(extractPdfEmbeddedMetadata(null)).toEqual({title: null, description: null, author: null});
    expect(extractPdfEmbeddedMetadata(new Uint8Array(0))).toEqual({
      title: null,
      description: null,
      author: null,
    });
    expect(extractPdfEmbeddedMetadata(new Uint8Array([1, 2, 3, 4]))).toEqual({
      title: null,
      description: null,
      author: null,
    });
  });
});

describe('filename fallbacks', () => {
  it('parses Content-Disposition, quoted and bare and RFC 5987', () => {
    expect(parseContentDispositionFilename('inline; filename=2025-1237.pdf')).toBe('2025-1237.pdf');
    expect(parseContentDispositionFilename('attachment; filename="chore chart.pdf"')).toBe(
      'chore chart.pdf',
    );
    expect(parseContentDispositionFilename("attachment; filename*=UTF-8''caf%C3%A9.pdf")).toBe(
      'café.pdf',
    );
    expect(parseContentDispositionFilename('inline')).toBeNull();
    expect(parseContentDispositionFilename(null)).toBeNull();
  });

  it('falls back to the URL path when no header is given', () => {
    expect(getFileNameForUrl('https://eprint.iacr.org/2025/1237.pdf')).toBe('1237.pdf');
    expect(getFileNameForUrl('https://x.test/a/b.pdf', 'inline; filename=real.pdf')).toBe('real.pdf');
    expect(getFileNameForUrl('not a url')).toBeNull();
  });

  it('humanizes a meaningful filename and refuses an auto-generated one', () => {
    expect(deriveTitleFromFileName('chore-chart.pdf')).toBe('Chore chart');
    expect(deriveTitleFromFileName('summer.reading.list.v2.pdf')).toBe('Summer reading list v2');
    expect(deriveTitleFromFileName('IMG_20260101.pdf')).toBeNull();
    expect(deriveTitleFromFileName('download.pdf')).toBeNull();
    expect(deriveTitleFromFileName('')).toBeNull();
  });
});
