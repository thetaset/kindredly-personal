import type {ReputationBias, ReputationCredibility} from 'tset-sharedlib/types/articleTrust.types';

/**
 * Curated seed for the owned source-reputation database.
 *
 * These are starting values — editable/extendable over time (admin rows
 * override seed rows). Bias is a coarse, widely-cited lean, not an endorsement;
 * credibility reflects factual-reporting reputation, not agreement. Domains not
 * listed here fall back to the static source_priority_domain_policy at runtime,
 * and beyond that return "unknown" (never auto-flagged as untrustworthy).
 */
export interface ReputationSeedEntry {
  domain: string;
  credibility: ReputationCredibility;
  bias: ReputationBias;
  category: string;
  confidence: number;
  notes?: string;
}

export const SOURCE_REPUTATION_SEED: ReputationSeedEntry[] = [
  // Wire services / public broadcasters — high factual reputation, low lean.
  {
    domain: 'reuters.com',
    credibility: 'high',
    bias: 'center',
    category: 'news',
    confidence: 0.9,
    notes: 'International wire service.',
  },
  {
    domain: 'apnews.com',
    credibility: 'high',
    bias: 'center',
    category: 'news',
    confidence: 0.9,
    notes: 'Associated Press wire service.',
  },
  {
    domain: 'bbc.com',
    credibility: 'high',
    bias: 'center',
    category: 'news',
    confidence: 0.85,
    notes: 'UK public broadcaster.',
  },
  {
    domain: 'bbc.co.uk',
    credibility: 'high',
    bias: 'center',
    category: 'news',
    confidence: 0.85,
    notes: 'UK public broadcaster.',
  },
  {
    domain: 'npr.org',
    credibility: 'high',
    bias: 'center-left',
    category: 'news',
    confidence: 0.82,
    notes: 'US public radio.',
  },
  {domain: 'pbs.org', credibility: 'high', bias: 'center', category: 'news', confidence: 0.82},
  {domain: 'cbc.ca', credibility: 'high', bias: 'center', category: 'news', confidence: 0.8},

  // Mainstream outlets with a documented lean — generally reliable reporting.
  {domain: 'nytimes.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.82},
  {domain: 'washingtonpost.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.82},
  {domain: 'theguardian.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.8},
  {
    domain: 'wsj.com',
    credibility: 'high',
    bias: 'center-right',
    category: 'news',
    confidence: 0.82,
    notes: 'News reporting; opinion section leans right.',
  },
  {domain: 'economist.com', credibility: 'high', bias: 'center', category: 'news', confidence: 0.82},
  {domain: 'bloomberg.com', credibility: 'high', bias: 'center', category: 'business', confidence: 0.82},
  {domain: 'cnn.com', credibility: 'mostly', bias: 'left', category: 'news', confidence: 0.74},
  {
    domain: 'foxnews.com',
    credibility: 'mixed',
    bias: 'right',
    category: 'news',
    confidence: 0.74,
    notes: 'News vs. opinion quality varies.',
  },
  {domain: 'nbcnews.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.76},
  {domain: 'cbsnews.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.76},
  {domain: 'abcnews.go.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.76},
  {domain: 'politico.com', credibility: 'mostly', bias: 'center', category: 'news', confidence: 0.76},
  {domain: 'thehill.com', credibility: 'mostly', bias: 'center', category: 'news', confidence: 0.74},
  {domain: 'aljazeera.com', credibility: 'mostly', bias: 'center-left', category: 'news', confidence: 0.74},

  // Reference / science — high credibility, no political lean.
  {
    domain: 'wikipedia.org',
    credibility: 'mostly',
    bias: 'none',
    category: 'reference',
    confidence: 0.78,
    notes: 'Crowd-sourced; verify with primary sources.',
  },
  {domain: 'britannica.com', credibility: 'high', bias: 'none', category: 'reference', confidence: 0.85},
  {domain: 'nature.com', credibility: 'high', bias: 'none', category: 'science', confidence: 0.9},
  {domain: 'science.org', credibility: 'high', bias: 'none', category: 'science', confidence: 0.9},
  {domain: 'scientificamerican.com', credibility: 'high', bias: 'center-left', category: 'science', confidence: 0.82},
  {domain: 'nationalgeographic.com', credibility: 'high', bias: 'center', category: 'science', confidence: 0.84},
  {domain: 'nasa.gov', credibility: 'high', bias: 'none', category: 'science', confidence: 0.92},
  {domain: 'nih.gov', credibility: 'high', bias: 'none', category: 'health', confidence: 0.9},
  {domain: 'cdc.gov', credibility: 'high', bias: 'none', category: 'health', confidence: 0.88},
  {domain: 'who.int', credibility: 'high', bias: 'none', category: 'health', confidence: 0.86},
  {domain: 'mayoclinic.org', credibility: 'high', bias: 'none', category: 'health', confidence: 0.86},

  // Low-credibility / satire examples — so the pipeline has clear negative anchors.
  {
    domain: 'theonion.com',
    credibility: 'satire',
    bias: 'na',
    category: 'satire',
    confidence: 0.95,
    notes: 'Satire — not factual reporting.',
  },
  {
    domain: 'babylonbee.com',
    credibility: 'satire',
    bias: 'right',
    category: 'satire',
    confidence: 0.95,
    notes: 'Satire — not factual reporting.',
  },
  {
    domain: 'infowars.com',
    credibility: 'low',
    bias: 'right',
    category: 'news',
    confidence: 0.9,
    notes: 'Repeatedly published debunked claims.',
  },
  {
    domain: 'naturalnews.com',
    credibility: 'low',
    bias: 'right',
    category: 'health',
    confidence: 0.88,
    notes: 'Pseudoscience / health misinformation.',
  },
];
