// Notes for parents on the child's Digital citizenship page (HAT-534, DCL-13). Reference, not an
// article: each point says one thing a parent can act on, and every point rests on the sources listed
// with it. Research behind them: docs/research/2026-10-16-digital-citizenship-content.md.

export type ParentNote = {
  key: string;
  title: string;
  /** Shown for a child this age or older; absent for every age. */
  minAge?: number;
  /** Markdown, one point each. */
  points: string[];
  sources: Array<{ title: string; url: string }>;
};

export const DIGITAL_CITIZENSHIP_PARENT_NOTES: ParentNote[] = [
  {
    key: 'when-they-tell-you',
    title: 'When your child tells you something happened online',
    points: [
      'Children often doubt that telling an adult helps. After the largest trial of lessons like these, they were no more likely to ask a parent for help.',
      "How you respond is what changes that. Say first that they aren't in trouble for telling you: England's school guidance teaches children they will not be in trouble for asking for help.",
    ],
    sources: [
      {
        title: 'Jones, Mitchell & Beseler 2023 (trial of Be Internet Awesome)',
        url: 'https://www.unh.edu/ccrc/sites/default/files/media/2023-04/jones-impact-bia-23.pdf',
      },
      {
        title: 'Relationships, sex and health education, statutory guidance (England, July 2025)',
        url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      },
    ],
  },
  {
    key: 'image-threats',
    title: 'If someone threatens to share an image of your child',
    minAge: 11,
    points: [
      'The blackmailer is to blame, not your child. What they are doing is a crime.',
      'Get help before paying or doing what they ask: paying rarely stops the blackmail.',
      "Report the account in the app and block it, but don't delete the profile or messages. They help stop the blackmailer.",
      '[Take It Down](https://takeitdown.ncmec.org) helps stop nude or sexual images taken before 18 being shared on platforms that take part. The image stays on your device; only a fingerprint of it is sent.',
      'In the US, report it to NCMEC at [CyberTipline.org](https://report.cybertip.org).',
    ],
    sources: [
      { title: 'NCMEC: Sextortion', url: 'https://www.missingkids.org/theissues/sextortion' },
      { title: 'NCMEC: Take It Down', url: 'https://takeitdown.ncmec.org' },
    ],
  },
  {
    key: 'ai-companions',
    title: 'AI companions',
    minAge: 8,
    points: [
      'AI companions are chatbots made to act as a friend or partner. In a 2025 survey, 72% of US teens had used one, and Common Sense Media advises that no one under 18 use them.',
      "Australia's eSafety Commissioner warns that unrestricted AI chatbots can harm children's development.",
    ],
    sources: [
      {
        title: 'Common Sense Media, Talk, Trust and Trade-offs (2025)',
        url: 'https://www.commonsensemedia.org/sites/default/files/research/report/talk-trust-and-trade-offs_2025_web.pdf',
      },
      {
        title: 'eSafety Commissioner advisory on AI chatbots (2025)',
        url: 'https://www.esafety.gov.au/newsroom/media-releases/new-safety-advisory-warns-unrestricted-chatbots-threaten-child-development',
      },
    ],
  },
  {
    key: 'talk-and-limits',
    title: 'Talking with them, and limits',
    points: [
      'Talking, explaining and using things together goes with children getting more out of being online. Limits lower risk, but at the cost of those opportunities.',
      'Watching together helps only when you talk about what you see.',
      "Most children under 7 or 8 can't yet tell when an ad is trying to persuade them, so at that age settings do more of the work.",
    ],
    sources: [
      { title: 'Livingstone et al. 2017, Journal of Communication', url: 'https://onlinelibrary.wiley.com/doi/abs/10.1111/jcom.12277' },
      { title: 'Collier et al. 2016, meta-analysis of parental mediation', url: 'https://pubmed.ncbi.nlm.nih.gov/26914217/' },
      { title: 'American Psychological Association, Advertising and children', url: 'https://www.apa.org/pubs/reports/advertising-children' },
    ],
  },
];

/** The notes for a child this age; every note when the age isn't known. */
export function parentNotesForAge(age: number | null | undefined): ParentNote[] {
  if (typeof age !== 'number') return DIGITAL_CITIZENSHIP_PARENT_NOTES;
  return DIGITAL_CITIZENSHIP_PARENT_NOTES.filter((note) => !note.minAge || age >= note.minAge);
}
