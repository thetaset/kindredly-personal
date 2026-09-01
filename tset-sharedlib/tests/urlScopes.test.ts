import {
  buildPatternsForUrlScope,
  getDefaultPattern,
  getItemClaimedPatterns,
  getItemDetailPatterns,
  getRegistrableDomain,
  inferLinkScope,
  registrableHost,
} from '../src/url.utils';
import { URLIndexer } from '../src/URLIndexer';

describe('registrableHost', () => {
  it('reads known multi-part suffixes', () => {
    expect(registrableHost('shop.example.co.uk')).toBe('example.co.uk');
    expect(registrableHost('example.co.uk')).toBe('example.co.uk');
    expect(registrableHost('news.com.au')).toBe('news.com.au');
  });

  it('does not treat a short label as a suffix', () => {
    // The old "penultimate label <= 3 chars" heuristic read this as foo.abc.com.
    expect(registrableHost('foo.abc.com')).toBe('abc.com');
    expect(registrableHost('clients.mindbodyonline.com')).toBe('mindbodyonline.com');
  });

  it('strips www and trailing dots', () => {
    expect(registrableHost('www.example.com')).toBe('example.com');
    expect(registrableHost('example.com.')).toBe('example.com');
  });
});

describe('getRegistrableDomain', () => {
  it('keeps returning null for hosts that have no domain', () => {
    expect(getRegistrableDomain('not a url')).toBeNull();
    expect(getRegistrableDomain('https://localhost:3031/x')).toBe('localhost');
  });

  it('uses the suffix list rather than the label-length guess', () => {
    expect(getRegistrableDomain('https://foo.abc.com/x')).toBe('abc.com');
    expect(getRegistrableDomain('https://shop.example.co.uk/x')).toBe('example.co.uk');
  });
});

describe('getDefaultPattern', () => {
  it('is unchanged for the common shapes', () => {
    expect(getDefaultPattern('https://example.com')).toBe('*.example.com/*');
    expect(getDefaultPattern('https://www.example.com')).toBe('*.example.com/*');
    expect(getDefaultPattern('https://example.com/blog')).toBe('*.example.com/blog*');
    expect(getDefaultPattern('https://clients.mindbodyonline.com')).toBe(
      'clients.mindbodyonline.com/*',
    );
  });

  it('reads the wildcard test off the hostname, not the whole string', () => {
    // A dot in the path used to look like a third label and drop the wildcard.
    expect(getDefaultPattern('https://example.com/file.pdf')).toBe('*.example.com/file.pdf*');
    expect(getDefaultPattern('https://example.co.uk')).toBe('*.example.co.uk/*');
  });

  it('leaves an existing pattern alone', () => {
    expect(getDefaultPattern('*.example.com/*')).toBe('*.example.com/*');
  });

  it('does not wildcard a host with no dot', () => {
    expect(getDefaultPattern('http://localhost:3031/app')).toBe('localhost:3031/app*');
  });

  it('only strips a leading www', () => {
    expect(getDefaultPattern('https://example.com/www.foo')).toBe('*.example.com/www.foo*');
  });
});

describe('buildPatternsForUrlScope', () => {
  const portal = 'https://clients.mindbodyonline.com/classic/ws?studioid=12345';

  it('site takes the host', () => {
    expect(buildPatternsForUrlScope('site', portal)).toEqual(['clients.mindbodyonline.com/*']);
  });

  it('domain takes the registrable domain and its subdomains', () => {
    expect(buildPatternsForUrlScope('domain', portal)).toEqual(['*.mindbodyonline.com/*']);
    expect(buildPatternsForUrlScope('domain', 'https://shop.example.co.uk/a')).toEqual([
      '*.example.co.uk/*',
    ]);
  });

  it('specific pins the path and query, as the access-request flow always has', () => {
    expect(buildPatternsForUrlScope('specific', portal)).toEqual([
      'clients.mindbodyonline.com/classic/ws?studioid=12345',
    ]);
  });

  it('specific on a root URL falls back to the default pattern', () => {
    expect(buildPatternsForUrlScope('specific', 'https://example.com')).toEqual(['*.example.com/*']);
  });
});

describe('inferLinkScope', () => {
  const school = { url: 'https://austinmartialarts.com', info: { additionalLinks: [] } };

  it('takes the host for a third-party platform subdomain', () => {
    expect(inferLinkScope('https://clients.mindbodyonline.com/classic/ws?studioid=1', school)).toBe(
      'site',
    );
  });

  it('takes the domain when the link is the item own site', () => {
    expect(inferLinkScope('https://members.austinmartialarts.com/login', school)).toBe('domain');
  });

  it('takes the domain when a bare domain was given', () => {
    expect(inferLinkScope('https://mindbodyonline.com/find', school)).toBe('domain');
  });

  it('upgrades to the domain once a second host on it is claimed', () => {
    const withPortal = {
      url: 'https://austinmartialarts.com',
      info: {
        additionalLinks: [
          { id: 'a', title: 'Book', url: 'https://clients.mindbodyonline.com/classic/ws' },
        ],
      },
    };
    expect(inferLinkScope('https://brandedweb.mindbodyonline.com/launch?id=9', withPortal)).toBe(
      'domain',
    );
  });

  it('stays pinned on a host where the path identifies the tenant', () => {
    expect(inferLinkScope('https://sites.google.com/view/ourdojo/schedule', school)).toBe(
      'specific',
    );
  });

  it('takes the host for a subdomain-tenant platform', () => {
    expect(inferLinkScope('https://ourdojo.wixsite.com/home', school)).toBe('site');
  });
});

describe('getItemDetailPatterns with link scopes', () => {
  const item = {
    url: 'https://austinmartialarts.com',
    info: {
      additionalLinks: [
        {
          id: 'signin',
          title: 'Member sign-in',
          url: 'https://clients.mindbodyonline.com/classic/ws?studioid=12345',
        },
      ],
    },
  };

  it('infers a scope for a link saved before scopes existed', () => {
    const patterns = getItemDetailPatterns(item);
    expect(patterns).toContain('*.austinmartialarts.com/*');
    expect(patterns).toContain('clients.mindbodyonline.com/*');
  });

  it('honors an explicit scope over the inferred one', () => {
    const narrowed = {
      ...item,
      info: { additionalLinks: [{ ...item.info.additionalLinks[0], scope: 'specific' }] },
    };
    const patterns = getItemDetailPatterns(narrowed);
    expect(patterns).toContain('clients.mindbodyonline.com/classic/ws?studioid=12345');
    expect(patterns).not.toContain('clients.mindbodyonline.com/*');
  });

  it('allows sub-pages of the linked portal', () => {
    const idx = new URLIndexer();
    idx.add('school', getItemDetailPatterns(item));

    for (const url of [
      'https://clients.mindbodyonline.com/classic/ws?studioid=12345',
      'https://clients.mindbodyonline.com/classic/mainclass?studioid=12345',
      'https://clients.mindbodyonline.com/ASP/home.asp?studioid=12345',
    ]) {
      expect(idx.getMatches(url)).toContain('school');
    }

    // Not upgraded to the whole platform on one link.
    expect(idx.getMatches('https://brandedweb.mindbodyonline.com/launch?id=9')).toHaveLength(0);
  });
});

describe('getItemClaimedPatterns', () => {
  it('excludes the item own url, so a sub-page stays saveable on its own', () => {
    const claimed = getItemClaimedPatterns({
      url: 'https://austinmartialarts.com',
      patterns: ['*.austinmartialarts.com/*'],
      info: {
        additionalLinks: [
          { id: 'signin', title: 'Sign in', url: 'https://clients.mindbodyonline.com/classic/ws' },
        ],
      },
    });

    expect(claimed).toEqual(['clients.mindbodyonline.com/*']);
  });

  it('keeps a hand-written pattern that is not a restatement of the url', () => {
    const claimed = getItemClaimedPatterns({
      url: 'https://austinmartialarts.com',
      patterns: ['*.austinmartialarts.com/*', 'partner.example.com/dojo*'],
      info: {},
    });

    expect(claimed).toEqual(['partner.example.com/dojo*']);
  });

  it('is empty for an item that claims nothing beyond its own address', () => {
    expect(
      getItemClaimedPatterns({ url: 'https://example.com', patterns: ['*.example.com/*'] }),
    ).toEqual([]);
  });
});

describe('URLIndexer', () => {
  it('matches a one-character final path segment against a prefix pattern', () => {
    const idx = new URLIndexer();
    idx.add('docs', ['example.com/docs/*']);

    expect(idx.getMatches('https://example.com/docs/x')).toContain('docs');
    expect(idx.getMatches('https://example.com/docs/xy')).toContain('docs');
  });

  it('remove actually removes', () => {
    const idx = new URLIndexer();
    idx.add('a', ['example.com/*']);
    idx.add('b', ['other.com/*']);

    expect(idx.getMatches('https://example.com/x')).toContain('a');

    idx.remove('a');

    expect(idx.getMatches('https://example.com/x')).toHaveLength(0);
    expect(idx.getMatches('https://other.com/x')).toContain('b');
    expect(idx.lookup['*.example.com']).toBeUndefined();
  });

  it('remove then re-add restores matching', () => {
    const idx = new URLIndexer();
    idx.add('a', ['example.com/*']);
    idx.remove('a');
    idx.add('a', ['narrow.example.com/only*']);

    expect(idx.getMatches('https://example.com/x')).toHaveLength(0);
    expect(idx.getMatches('https://narrow.example.com/only/deep')).toContain('a');

    idx.remove('a');
    expect(idx.getMatches('https://narrow.example.com/only/deep')).toHaveLength(0);
  });
});
