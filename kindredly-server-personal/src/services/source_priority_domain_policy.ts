type SourcePriorityDomainRule = {
  id: string;
  domains: string[];
  eduValue: string;
  categories?: string[];
  contentTypes?: string[];
  flags?: string[];
  topics?: string[];
  shortReason: string;
  confidence?: number;
  includeSubdomains?: boolean;
  pathPrefixes?: string[];
  urlContains?: string[];
};

const SOURCE_PRIORITY_DOMAIN_RULES: SourcePriorityDomainRule[] = [
  {
    id: 'wikipedia-educational',
    domains: ['wikipedia.org'],
    eduValue: 'eduval_educational',
    categories: ['cat_educational', 'cat_science'],
    contentTypes: ['type_text'],
    shortReason: 'Reference encyclopedia content is generally educational.',
    confidence: 0.9,
  },
  {
    id: 'khanacademy-educational',
    domains: ['khanacademy.org'],
    eduValue: 'eduval_educational',
    categories: ['cat_educational'],
    contentTypes: ['type_video', 'type_text'],
    shortReason: 'Khan Academy is educational curriculum content.',
    confidence: 0.94,
  },
  {
    id: 'coursera-educational',
    domains: [
      'coursera.org',
      'edx.org',
      'udemy.com',
      'udacity.com',
      'brilliant.org',
      'futurelearn.com',
      'skillshare.com',
    ],
    eduValue: 'eduval_educational',
    categories: ['cat_educational', 'cat_technology'],
    contentTypes: ['type_video', 'type_text'],
    shortReason: 'Learning platforms are primarily educational.',
    confidence: 0.86,
  },
  {
    id: 'mdn-educational',
    domains: ['developer.mozilla.org'],
    eduValue: 'eduval_educational',
    categories: ['cat_educational', 'cat_technology'],
    contentTypes: ['type_text'],
    shortReason: 'Developer documentation is educational reference material.',
    confidence: 0.9,
  },
  {
    id: 'github-task',
    domains: ['github.com', 'gitlab.com', 'bitbucket.org'],
    eduValue: 'eduval_task',
    categories: ['cat_technology'],
    contentTypes: ['type_text'],
    shortReason: 'Code hosting and issue tracking are task-oriented.',
    confidence: 0.84,
  },
  {
    id: 'stackexchange-educational',
    domains: [
      'stackoverflow.com',
      'stackexchange.com',
      'superuser.com',
      'serverfault.com',
      'askubuntu.com',
      'math.stackexchange.com',
    ],
    eduValue: 'eduval_educational',
    categories: ['cat_educational', 'cat_technology'],
    contentTypes: ['type_text'],
    shortReason: 'Q&A knowledge sites are educational in intent.',
    confidence: 0.84,
  },
  {
    id: 'science-sites-educational',
    domains: [
      'nasa.gov',
      'nationalgeographic.com',
      'smithsonianmag.com',
      'nature.com',
      'scientificamerican.com',
      'livescience.com',
      'newscientist.com',
    ],
    eduValue: 'eduval_educational',
    categories: ['cat_science', 'cat_educational'],
    contentTypes: ['type_text', 'type_video'],
    shortReason: 'Science-focused publications are mostly educational.',
    confidence: 0.82,
  },
  {
    id: 'news-general',
    domains: [
      'nytimes.com',
      'bbc.com',
      'bbc.co.uk',
      'reuters.com',
      'apnews.com',
      'npr.org',
      'cnn.com',
      'washingtonpost.com',
      'theguardian.com',
      'wsj.com',
      'economist.com',
      'cbsnews.com',
      'abcnews.go.com',
      'nbcnews.com',
      'bloomberg.com',
    ],
    eduValue: 'eduval_educational',
    categories: ['cat_political', 'cat_educational'],
    contentTypes: ['type_text', 'type_video'],
    shortReason: 'General news is informational content.',
    confidence: 0.76,
  },
  {
    id: 'short-form-video-pages',
    domains: ['youtube.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'snapchat.com'],
    eduValue: 'eduval_junk',
    categories: ['cat_social', 'cat_entertainment'],
    contentTypes: ['type_video', 'type_social_media'],
    flags: ['content_social', 'content_context_dependent'],
    topics: ['topic_short_video_infinite_scroll'],
    pathPrefixes: ['/shorts', '/reels'],
    urlContains: ['/shorts/', '/reel/'],
    shortReason: 'Short-form infinite-scroll video is treated as junk content.',
    confidence: 0.94,
  },
  {
    id: 'tiktok-junk-social',
    domains: ['tiktok.com'],
    eduValue: 'eduval_junk',
    categories: ['cat_social', 'cat_entertainment'],
    contentTypes: ['type_video', 'type_social_media'],
    flags: ['content_social', 'content_context_dependent'],
    topics: ['topic_short_video_infinite_scroll'],
    shortReason: 'TikTok is predominantly short-form social feed content; continue dynamic checks for context.',
    confidence: 0.9,
  },
  {
    id: 'shopping-task',
    domains: [
      'amazon.com',
      'ebay.com',
      'walmart.com',
      'target.com',
      'etsy.com',
      'bestbuy.com',
      'costco.com',
      'aliexpress.com',
      'shopify.com',
      'homedepot.com',
    ],
    eduValue: 'eduval_task',
    categories: ['cat_technology'],
    contentTypes: ['type_text'],
    shortReason: 'Shopping and product research are task-oriented.',
    confidence: 0.78,
  },
  {
    id: 'productivity-task',
    domains: [
      'docs.google.com',
      'drive.google.com',
      'notion.so',
      'trello.com',
      'asana.com',
      'airtable.com',
      'monday.com',
      'clickup.com',
      'todoist.com',
      'calendar.google.com',
    ],
    eduValue: 'eduval_task',
    categories: ['cat_technology'],
    contentTypes: ['type_text'],
    shortReason: 'Productivity workspace content is task-oriented.',
    confidence: 0.9,
  },
  {
    id: 'health-information',
    domains: ['mayoclinic.org', 'webmd.com', 'nih.gov', 'healthline.com', 'cdc.gov', 'who.int', 'hopkinsmedicine.org'],
    eduValue: 'eduval_educational',
    categories: ['cat_health', 'cat_educational'],
    contentTypes: ['type_text'],
    shortReason: 'Health information resources are educational/informational.',
    confidence: 0.8,
  },
];

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function domainMatches(hostname: string, domain: string, includeSubdomains = true): boolean {
  const normalizedDomain = domain.toLowerCase();
  if (hostname === normalizedDomain) return true;
  if (!includeSubdomains) return false;
  return hostname.endsWith(`.${normalizedDomain}`);
}

function pathMatches(urlObj: URL, rule: SourcePriorityDomainRule): boolean {
  const normalizedPath = urlObj.pathname.toLowerCase();
  const prefixes = rule.pathPrefixes || [];
  const contains = rule.urlContains || [];

  const prefixMatch = prefixes.some((prefix) => {
    const normalizedPrefix = prefix.toLowerCase();
    return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
  });

  if (prefixMatch) return true;

  const fullUrl = `${urlObj.origin}${urlObj.pathname}${urlObj.search}`.toLowerCase();
  return contains.some((needle) => fullUrl.includes(needle.toLowerCase()));
}

export function findSourcePriorityDomainRule(
  url: string,
): {rule: SourcePriorityDomainRule; matchedDomain: string} | null {
  if (!url) return null;

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return null;
  }

  const hostname = getHostname(url);
  if (!hostname) return null;

  const matches: Array<{rule: SourcePriorityDomainRule; matchedDomain: string}> = [];

  for (const rule of SOURCE_PRIORITY_DOMAIN_RULES) {
    const matchedDomain = rule.domains.find((domain) =>
      domainMatches(hostname, domain, rule.includeSubdomains !== false),
    );
    if (!matchedDomain) continue;

    if ((rule.pathPrefixes && rule.pathPrefixes.length > 0) || (rule.urlContains && rule.urlContains.length > 0)) {
      if (!pathMatches(urlObj, rule)) continue;
    }

    matches.push({rule, matchedDomain});
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const byDomainLength = b.matchedDomain.length - a.matchedDomain.length;
    if (byDomainLength !== 0) return byDomainLength;

    const aHasPathConstraints = (a.rule.pathPrefixes?.length || 0) > 0 || (a.rule.urlContains?.length || 0) > 0;
    const bHasPathConstraints = (b.rule.pathPrefixes?.length || 0) > 0 || (b.rule.urlContains?.length || 0) > 0;
    if (aHasPathConstraints !== bHasPathConstraints) return Number(bHasPathConstraints) - Number(aHasPathConstraints);

    return 0;
  });
  return matches[0] || null;
}
