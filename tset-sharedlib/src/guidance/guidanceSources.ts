/**
 * Verified source registry behind Kindredly's screen-time guidance.
 *
 * Rule: no source id → no "the science says". Every number in the guideline
 * table and every observation the guidance engine can show must trace to a
 * row here. Ids are stable — add rows, never renumber.
 *
 * The prose registry lives in docs/research/screen-time-guidance-sources.md;
 * this file is its machine-readable form. Keep both in sync.
 */

export type GuidanceSourceId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10'
  | 'S11' | 'S12' | 'S13' | 'S14' | 'S15' | 'S16' | 'S17' | 'S18' | 'S19' | 'S20'
  | 'S21' | 'S22' | 'S23' | 'S24' | 'S25' | 'S26' | 'S27' | 'S28' | 'S29' | 'S30'
  | 'S31' | 'S32' | 'S33' | 'S34' | 'S35' | 'S36' | 'S37' | 'S38' | 'S39' | 'S40'
  | 'S41' | 'S42' | 'S43' | 'S44' | 'S45' | 'S46' | 'S47' | 'S48' | 'S49' | 'S50'
  | 'S51' | 'S52'

/** `policy` is a law or regulation cited as a fact about the world, never as evidence. */
export type GuidanceSourceKind = 'guideline' | 'advisory' | 'meta-analysis' | 'study' | 'review' | 'survey' | 'policy'

export interface GuidanceSource {
  id: GuidanceSourceId
  /** Human-readable citation key shown on the public pages (org-year). Unique. */
  citeKey: string
  org: string
  title: string
  year: number
  url: string
  kind: GuidanceSourceKind
  /** What Kindredly cites this source for. */
  supports: string[]
  /** True for population averages that are context, never a target. */
  contextOnly?: boolean
}

export const GUIDANCE_SOURCES: Record<GuidanceSourceId, GuidanceSource> = {
  S1: {
    id: 'S1',
    citeKey: 'AAP 2016a',
    org: 'American Academy of Pediatrics, Council on Communications and Media',
    title: 'Media and Young Minds',
    year: 2016,
    url: 'https://publications.aap.org/pediatrics/article/138/5/e20162591/60503/Media-and-Young-Minds',
    kind: 'guideline',
    supports: [
      'Under 18 months: video chat only',
      '18–24 months: high-quality programming, co-viewed',
      'Ages 2–5: ≤1 hour/day of high-quality programming, co-viewed',
      'Screens not used as the only way to calm a child; bedrooms and mealtimes screen-free',
    ],
  },
  S2: {
    id: 'S2',
    citeKey: 'AAP 2016b',
    org: 'American Academy of Pediatrics, Council on Communications and Media',
    title: 'Media Use in School-Aged Children and Adolescents',
    year: 2016,
    url: 'https://publications.aap.org/pediatrics/article/138/5/e20162592/60321/Media-Use-in-School-Aged-Children-and-Adolescents',
    kind: 'guideline',
    supports: [
      'No single hourly cap for ages 5–18 — a Family Media Plan with consistent limits instead',
      'One hour/day of physical activity; 8–12 hours of sleep',
      'No devices in the bedroom overnight or in the hour before bed',
    ],
  },
  S3: {
    id: 'S3',
    citeKey: 'AAP 2026',
    org: 'American Academy of Pediatrics',
    title: 'Digital Ecosystems, Children, and Adolescents: Policy Statement',
    year: 2026,
    url: 'https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129/Digital-Ecosystems-Children-and-Adolescents-Policy',
    kind: 'guideline',
    supports: [
      'Current AAP position: systems view rather than screen time alone',
      'Family Media Plan; parents model their own habits',
      'Turn off notifications and attention-grabbing features; media-free spaces and times',
      'Names endless scroll, autoplay and push notifications as harmful design (the 5 Cs)',
    ],
  },
  S4: {
    id: 'S4',
    citeKey: 'WHO 2019',
    org: 'World Health Organization',
    title: 'Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age',
    year: 2019,
    url: 'https://www.who.int/publications/i/item/9789241550536',
    kind: 'guideline',
    supports: [
      'Under 2: no sedentary screen time; ages 2–4: ≤1 hour, less is better',
      '≥180 min/day physical activity at ages 1–4 (≥60 min moderate-to-vigorous at 3–4)',
      'Sleep bands for 0–4 years',
      'WHO graded its own screen-time evidence "very low quality" — issued as precaution, to protect activity time',
    ],
  },
  S5: {
    id: 'S5',
    citeKey: 'WHO 2020',
    org: 'World Health Organization',
    title: 'Guidelines on physical activity and sedentary behaviour (5–17)',
    year: 2020,
    url: 'https://www.who.int/publications/i/item/9789240015128',
    kind: 'guideline',
    supports: [
      '≥60 min/day moderate-to-vigorous physical activity on average',
      'Vigorous and muscle/bone-strengthening activity ≥3 days/week',
    ],
  },
  S6: {
    id: 'S6',
    citeKey: 'CSEP 2016',
    org: 'CSEP (Canada) · Australian Government Department of Health — 24-Hour Movement Guidelines',
    title: 'Canadian 24-Hour Movement Guidelines for Children and Youth (5–17); Australian 24-Hour Movement Guidelines',
    year: 2016,
    url: 'https://csepguidelines.ca/guidelines/children-youth/',
    kind: 'guideline',
    supports: [
      'The only quantitative citation for "≤2 hours/day of recreational screen time" at ages 5–17',
      'School work is explicitly excluded from that figure',
      'Sleep 9–11h (5–13) / 8–10h (14–17)',
    ],
  },
  S7: {
    id: 'S7',
    citeKey: 'AASM 2016',
    org: 'American Academy of Sleep Medicine (Paruthi S. et al.)',
    title: 'Recommended Amount of Sleep for Pediatric Populations: A Consensus Statement',
    year: 2016,
    url: 'https://jcsm.aasm.org/doi/10.5664/jcsm.5866',
    kind: 'guideline',
    supports: ['Sleep bands: 3–5y 10–13h; 6–12y 9–12h; 13–18y 8–10h per 24h'],
  },
  S8: {
    id: 'S8',
    citeKey: 'Carter 2016',
    org: 'Carter B., Rees P., Hale L., Bhattacharjee D., Paradkar M.S.',
    title: 'Association Between Portable Screen-Based Media Device Access or Use and Sleep Outcomes (JAMA Pediatrics)',
    year: 2016,
    url: 'https://jamanetwork.com/journals/jamapediatrics/fullarticle/2571467',
    kind: 'meta-analysis',
    supports: [
      'Bedtime device use → inadequate sleep OR 2.17 across 20 studies, n=125,198',
      'Mere access to a device at night (not used) → inadequate sleep OR 1.79',
      'Basis for "device out of the bedroom", not just "off"',
    ],
  },
  S9: {
    id: 'S9',
    citeKey: 'HHS 2023',
    org: 'U.S. Surgeon General',
    title: 'Social Media and Youth Mental Health',
    year: 2023,
    url: 'https://www.hhs.gov/sites/default/files/sg-youth-mental-health-social-media-advisory.pdf',
    kind: 'advisory',
    supports: [
      'Adolescents 12–15 using social media >3 hours/day faced double the risk of depression and anxiety symptoms',
      'Up to 95% of 13–17-year-olds use a platform; a third "almost constantly"',
    ],
  },
  S10: {
    id: 'S10',
    citeKey: 'APA 2023',
    org: 'American Psychological Association',
    title: 'Health Advisory on Social Media Use in Adolescence',
    year: 2023,
    url: 'https://www.apa.org/topics/social-media-internet/health-advisory-adolescent-social-media-use',
    kind: 'advisory',
    supports: [
      'Readiness is about maturity, not just age',
      'Adult monitoring advised for most 10–14-year-olds',
      'Features designed for adults are not appropriate for children',
    ],
  },
  S11: {
    id: 'S11',
    citeKey: 'Lillard 2011',
    org: 'Lillard A.S., Peterson J.',
    title: 'The Immediate Impact of Different Types of Television on Young Children\u2019s Executive Function (Pediatrics)',
    year: 2011,
    url: 'https://publications.aap.org/pediatrics/article/128/4/644/30711/The-Immediate-Impact-of-Different-Types-of',
    kind: 'study',
    supports: [
      'Nine minutes of a fast-paced cartoon immediately impaired executive function in 4-year-olds vs educational cartoon or drawing',
      'Basis for weighting slow, narrative content over rapid-cut content for preschoolers',
    ],
  },
  S12: {
    id: 'S12',
    citeKey: 'Madigan 2020',
    org: 'Madigan S., McArthur B.A., Anhorn C., Eirich R., Christakis D.A.',
    title: 'Associations Between Screen Use and Child Language Skills (JAMA Pediatrics)',
    year: 2020,
    url: 'https://jamanetwork.com/journals/jamapediatrics/fullarticle/2762864',
    kind: 'meta-analysis',
    supports: [
      'Quantity of screen use ↔ lower language skills (r≈−0.14; background TV r≈−0.19)',
      'Educational programming and co-viewing ↔ better language',
    ],
  },
  S13: {
    id: 'S13',
    citeKey: 'Jing 2022',
    org: 'Jing M., Kirkorian H.L.; Frontiers in Psychology review',
    title: 'Video Deficit in Children\u2019s Early Learning; Effects of screen exposure on young children\u2019s cognitive development',
    year: 2022,
    url: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.923370/full',
    kind: 'review',
    supports: [
      'Children under ~30 months learn markedly less from video than from a live person',
      'Co-viewing, naming and scaffolding close much of the gap — basis for the co-viewing rule under 5',
    ],
  },
  S14: {
    id: 'S14',
    citeKey: 'Coyne 2018',
    org: 'Coyne S.M. et al.',
    title: 'A Meta-Analysis of Prosocial Media on Prosocial Behavior, Aggression, and Empathic Concern (Developmental Psychology)',
    year: 2018,
    url: 'https://eric.ed.gov/?id=EJ1167972',
    kind: 'meta-analysis',
    supports: [
      'Exposure to prosocial media ↔ more prosocial behaviour and empathic concern, less aggression (72 studies)',
      'Evidence behind the values layer — content that models kindness is weighted above content that merely exercises cognition',
    ],
  },
  S15: {
    id: 'S15',
    citeKey: 'Przybylski 2017',
    org: 'Przybylski A.K., Weinstein N.',
    title: 'A Large-Scale Test of the Goldilocks Hypothesis (Psychological Science)',
    year: 2017,
    url: 'https://journals.sagepub.com/doi/10.1177/0956797616678438',
    kind: 'study',
    supports: [
      'Moderate digital use is not intrinsically harmful and may be mildly beneficial (n=120,115, preregistered)',
      'Well-being falls off at high use — why guidance flags high totals rather than all use',
    ],
  },
  S16: {
    id: 'S16',
    citeKey: 'Sun 2023',
    org: 'Sun Y.-J. et al. (incl. Sahakian B.J.)',
    title: 'Early-initiated childhood reading for pleasure: associations with better cognitive performance, mental well-being and brain structure (Psychological Medicine)',
    year: 2023,
    url: 'https://www.cambridge.org/core/journals/psychological-medicine/article/earlyinitiated-childhood-reading-for-pleasure-associations-with-better-cognitive-performance-mental-wellbeing-and-brain-structure-in-young-adolescence/03FB342223A3896DB8C39F171659AE33',
    kind: 'study',
    supports: [
      'Early reading for pleasure (optimum ≈12 hours/week) ↔ better cognition, well-being and brain structure in adolescence (ABCD cohort, n=10,243)',
    ],
  },
  S17: {
    id: 'S17',
    citeKey: 'Ra 2018',
    org: 'Ra C.K. et al.',
    title: 'Association of Digital Media Use With Subsequent Symptoms of ADHD Among Adolescents (JAMA)',
    year: 2018,
    url: 'https://jamanetwork.com/journals/jama/fullarticle/2687861',
    kind: 'study',
    supports: [
      'Each additional high-frequency digital activity → OR 1.11 for later ADHD symptoms over 24 months',
      'Cite cautiously — association, self-report, not causation',
    ],
  },
  S18: {
    id: 'S18',
    citeKey: 'Nagata 2025',
    org: 'Nagata J.M. et al.',
    title: 'Screen time and mental health: ABCD Study analyses and review',
    year: 2025,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12259366/',
    kind: 'review',
    supports: [
      'Higher screen and social-media use at 9–15 ↔ depression, anxiety and other symptoms prospectively',
      'Effect sizes small to modest; brain-imaging differences are not proven harm',
    ],
  },
  S19: {
    id: 'S19',
    citeKey: 'CPS 2023',
    org: 'Canadian Paediatric Society',
    title: 'Digital media: Promoting healthy screen use in school-aged children and adolescents; Screen time and preschool children',
    year: 2023,
    url: 'https://cps.ca/en/documents/position/digital-media',
    kind: 'guideline',
    supports: [
      'Four principles for 5–19: healthy management, meaningful screen use, positive modelling, balanced and informed monitoring',
      'No one-size-fits-all number for school age and adolescents',
    ],
  },
  S20: {
    id: 'S20',
    citeKey: 'AACAP 2020',
    org: 'American Academy of Child & Adolescent Psychiatry',
    title: 'Screen Time and Children (Facts for Families #54)',
    year: 2020,
    url: 'https://www.aacap.org/AACAP/Families_and_Youth/Facts_for_Families/FFF-Guide/Children-And-Watching-TV-054.aspx',
    kind: 'guideline',
    supports: [
      'Ages 2–5: ≤1 hour on weekdays, ≤3 hours on weekend days',
      'Screens off and out of bedrooms 30–60 minutes before bed',
      'No hourly figure for 13–17',
    ],
  },
  S21: {
    id: 'S21',
    citeKey: 'CSM 2021',
    org: 'Common Sense Media',
    title: 'The Common Sense Census: Media Use by Tweens and Teens',
    year: 2021,
    url: 'https://www.commonsensemedia.org/sites/default/files/research/report/8-18-census-integrated-report-final-web_0.pdf',
    kind: 'survey',
    contextOnly: true,
    supports: [
      'US average recreational screen use 5h33 (ages 8–12) and 8h39 (ages 13–18) — context only, never a target',
    ],
  },
  S22: {
    id: 'S22',
    citeKey: 'BMC 2025',
    org: 'Parental-modelling literature (BMC Psychology 2025; PMC5807771)',
    title: 'Parents\u2019 screen time and parenting practices in relation to young children\u2019s screen time',
    year: 2025,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5807771/',
    kind: 'study',
    supports: [
      'Parents\u2019 own screen time predicts children\u2019s, largely through the home environment',
      'Strength mixed across studies — stated as guidance, never as a strong finding',
    ],
  },
  S23: {
    id: 'S23',
    citeKey: 'Orben 2019',
    org: 'Orben A., Przybylski A.K.',
    title: 'The association between adolescent well-being and digital technology use (Nature Human Behaviour)',
    year: 2019,
    url: 'https://www.nature.com/articles/s41562-018-0506-1',
    kind: 'study',
    supports: [
      'Digital technology use explains at most 0.4% of the variation in adolescent well-being (n=355,358)',
      'Analytic choices swing the estimate — reason observation copy never says "causes"',
    ],
  },
  S24: {
    id: 'S24',
    citeKey: 'Parry 2021',
    org: 'Parry D.A. et al.',
    title: 'A systematic review and meta-analysis of discrepancies between logged and self-reported digital media use (Nature Human Behaviour)',
    year: 2021,
    url: 'https://www.nature.com/articles/s41562-021-01117-5',
    kind: 'meta-analysis',
    supports: [
      'Self-reported media use correlates only moderately with logged use (106 effect sizes)',
      'Most of the literature rests on self-report; logged minutes are better data than most studies cite',
    ],
  },
  S25: {
    id: 'S25',
    citeKey: 'Orben 2022',
    org: 'Orben A., Przybylski A.K., Blakemore S.-J., Kievit R.A.',
    title: 'Windows of developmental sensitivity to social media (Nature Communications)',
    year: 2022,
    url: 'https://www.nature.com/articles/s41467-022-29296-3',
    kind: 'study',
    supports: [
      'Social-media ↔ life-satisfaction link most negative in early adolescence (girls ~11–13, boys ~14–15)',
      'Supports monitoring through the early teens; "every child is different" is a finding',
    ],
  },
  S26: {
    id: 'S26',
    citeKey: 'Odgers 2020',
    org: 'Odgers C.L., Jensen M.R.',
    title: 'Adolescent mental health in the digital age: facts, fears, and future directions (Journal of Child Psychology and Psychiatry)',
    year: 2020,
    url: 'https://acamh.onlinelibrary.wiley.com/doi/abs/10.1111/jcpp.13190',
    kind: 'review',
    supports: [
      'Rigorous large preregistered studies find small associations between daily digital use and well-being',
      'Cannot separate cause from effect; unlikely to be of clinical significance as estimated',
    ],
  },
  S27: {
    id: 'S27',
    citeKey: 'APA 2020',
    org: 'American Psychological Association',
    title: 'Resolution on Violent Video Games (2020 update)',
    year: 2020,
    url: 'https://www.apa.org/about/policy/resolution-violent-video-games.pdf',
    kind: 'advisory',
    supports: [
      'Insufficient scientific evidence for a causal link between violent video games and violent behaviour',
      'The case against "gaming all day" is displacement, not harm from the games themselves',
    ],
  },
  S28: {
    id: 'S28',
    citeKey: 'Ferguson 2020',
    org: 'Ferguson C.J., Copenhaver A., Markey P.',
    title: 'Reexamining the Findings of the APA\u2019s 2015 Task Force on Violent Media: A Meta-Analysis (Perspectives on Psychological Science)',
    year: 2020,
    url: 'https://journals.sagepub.com/doi/abs/10.1177/1745691620927666',
    kind: 'meta-analysis',
    supports: [
      'Negligible relationships between violent games and aggressive or prosocial behaviour',
      'Well-designed studies with validated measures almost never find violent effects',
    ],
  },
  S29: {
    id: 'S29',
    citeKey: 'Mumper 2017',
    org: 'Mumper M.L., Gerrig R.J.',
    title: 'Leisure Reading and Social Cognition: A Meta-Analysis (Psychology of Aesthetics, Creativity, and the Arts)',
    year: 2017,
    url: 'https://www.semanticscholar.org/paper/Leisure-reading-and-social-cognition:-A-Mumper-Gerrig/f264635d6b4dce8c5ed69c6f002d7ef9ba97cdd2',
    kind: 'meta-analysis',
    supports: [
      'Lifetime fiction reading correlates with empathy and theory of mind — small but consistent, larger for fiction',
      'Supports weighting reading for who a child becomes, not only for cognition',
    ],
  },
  S30: {
    id: 'S30',
    citeKey: 'Uhls 2014',
    org: 'Uhls Y.T. et al.',
    title: 'Five days at outdoor education camp without screens improves preteen skills with nonverbal emotion cues (Computers in Human Behavior)',
    year: 2014,
    url: 'https://www.sciencedirect.com/science/article/pii/S0747563214003227',
    kind: 'study',
    supports: [
      'Preteens after five screen-free days at nature camp gained more in reading facial and nonverbal emotion (n=51 vs 54)',
      'Small, short, one study — suggestive: face-to-face time is where reading people is learned',
    ],
  },
  S31: {
    id: 'S31',
    citeKey: 'Eisenberg 2015',
    org: 'Eisenberg N., Spinrad T.L., Knafo-Noam A.',
    title: 'Prosocial Development (Handbook of Child Psychology and Developmental Science)',
    year: 2015,
    url: 'https://onlinelibrary.wiley.com/doi/abs/10.1002/9781118963418.childpsy315',
    kind: 'review',
    supports: [
      'The strongest predictors of prosocial development are parenting: warmth, inductive discipline, modelling',
      'Basis for conversation prompts alongside limits — the strongest lever for character is not media',
    ],
  },
  S32: {
    id: 'S32',
    citeKey: 'Seery 2010',
    org: 'Seery M.D., Holman E.A., Silver R.C.',
    title: 'Whatever Does Not Kill Us: Cumulative Lifetime Adversity, Vulnerability, and Resilience (JPSP)',
    year: 2010,
    url: 'https://www.semanticscholar.org/paper/Whatever-does-not-kill-us%3A-cumulative-lifetime-and-Seery-Holman/b7e064a631041f4dec65b975d986257e576383dc',
    kind: 'study',
    supports: [
      'U-shaped curve: some lifetime adversity → lower distress and higher life satisfaction than none or a lot',
      'Adult, self-reported, about life events — cited as the shape of the curve, not a prescription',
    ],
  },
  S33: {
    id: 'S33',
    citeKey: 'NSCD 2015',
    org: 'National Scientific Council on the Developing Child, Harvard Center on the Developing Child',
    title: 'Supportive Relationships and Active Skill-Building Strengthen the Foundations of Resilience (Working Paper 13)',
    year: 2015,
    url: 'https://developingchild.harvard.edu/resources/working-paper/supportive-relationships-and-active-skill-building-strengthen-the-foundations-of-resilience/',
    kind: 'review',
    supports: [
      'Stress comes in positive, tolerable and toxic kinds; a supportive adult is what makes serious stress tolerable',
      'The same difficult content is tolerable with a parent alongside and can be toxic alone',
    ],
  },
  S34: {
    id: 'S34',
    citeKey: 'Livingstone 2010',
    org: 'Livingstone S., Helsper E.J.; EU Kids Online',
    title: 'Balancing opportunities and risks in teenagers\u2019 use of the internet (New Media & Society)',
    year: 2010,
    url: 'https://eprints.lse.ac.uk/48952/1/Children_internet.pdf',
    kind: 'study',
    supports: [
      'Take-up of online opportunities is positively correlated with exposure to online risk; skills raise both',
      'Zero exposure means zero opportunity — the evidence against a bubble',
    ],
  },
  S35: {
    id: 'S35',
    citeKey: 'Brussoni 2015',
    org: 'Brussoni M. et al.',
    title: 'What is the Relationship between Risky Outdoor Play and Health in Children? A Systematic Review',
    year: 2015,
    url: 'https://www.mdpi.com/1660-4601/12/6/6423',
    kind: 'review',
    supports: [
      'Risky outdoor play → more physical activity, better social health, more creativity and resilience; lower aggression (21 studies, GRADE-rated)',
      'Kindredly cannot see it — but screens can crowd it out, which is the honest link',
    ],
  },
  S36: {
    id: 'S36',
    citeKey: 'Felitti 1998',
    org: 'Felitti V.J. et al.',
    title: 'Relationship of Childhood Abuse and Household Dysfunction to Many of the Leading Causes of Death in Adults: The ACE Study',
    year: 1998,
    url: 'https://link.springer.com/rwe/10.1007/978-3-319-89999-2_305',
    kind: 'study',
    supports: [
      'Abuse, neglect and household dysfunction harm in a dose-response way across health and behaviour (n=17,337)',
      'There is exposure that strengthens nobody at any dose — the line between hard and harmful is real',
    ],
  },
  S37: {
    id: 'S37',
    citeKey: 'CSEP 2020',
    org: 'CSEP (Canada) — Canadian 24-Hour Movement Guidelines for Adults 18–64',
    title: 'Canadian 24-Hour Movement Guidelines for Adults aged 18–64 years: an integration of physical activity, sedentary behaviour, and sleep',
    year: 2020,
    url: 'https://csepguidelines.ca/guidelines/adults-18-64/',
    kind: 'guideline',
    supports: [
      'At least 150 minutes/week moderate-to-vigorous aerobic activity, plus muscle-strengthening twice a week',
      'Sleep 7–9 hours, with consistent bed and wake times; healthy sleep hygiene',
      'Sedentary time ≤8 hours, including no more than 3 hours of recreational screen time — the only published adult screen figure',
      'Break up long periods of sitting; several hours of light activity including standing',
    ],
  },
  // S38–S52 were added 2026-09-11 for the Open questions page. Each was verified
  // against the primary source, its publisher's abstract, or the open-access full
  // text on Europe PMC where the publisher blocks automated access.
  S38: {
    id: 'S38',
    citeKey: 'NASEM 2023',
    org: 'National Academies of Sciences, Engineering, and Medicine',
    title: 'Social Media and Adolescent Health (consensus study report)',
    year: 2023,
    url: 'https://www.nationalacademies.org/read/27396',
    kind: 'review',
    supports: [
      'The committee’s review of the literature did not support the conclusion that social media causes changes in adolescent health at the population level',
      'Effects are small and weak; use may influence health as often as health influences use, and benefits and harms accrue differently to different users',
    ],
  },
  S39: {
    id: 'S39',
    citeKey: 'Sanders 2024',
    org: 'Sanders T., Noetel M., Parker P. et al.',
    title: 'An umbrella review of the benefits and risks associated with youths’ interactions with electronic screens (Nature Human Behaviour)',
    year: 2024,
    url: 'https://www.nature.com/articles/s41562-023-01712-8',
    kind: 'meta-analysis',
    supports: [
      '102 meta-analyses, 2,451 studies, 1.9 million participants: small effects in both directions (r from −0.14 to 0.33); social media ↔ depression r = 0.12',
      'Screen use ↔ literacy is negative overall (r = −0.14) but positive when a parent watches with the child (r = 0.15) — content and company change the sign',
      '95 of 102 meta-analyses at medium-to-high risk of bias; the authors ask families to weigh specific types of screen use, not screen time as a whole',
    ],
  },
  S40: {
    id: 'S40',
    citeKey: 'Beyens 2020',
    org: 'Beyens I., Pouwels J.L., van Driel I.I., Keijsers L., Valkenburg P.M.',
    title: 'The effect of social media on well-being differs from adolescent to adolescent (Scientific Reports)',
    year: 2020,
    url: 'https://www.nature.com/articles/s41598-020-67727-7',
    kind: 'study',
    supports: [
      '63 adolescents (about 15 years old) reported how they felt six times a day for a week, 2,155 assessments in all',
      'After passive social media use 44% felt no different, 46% felt better and 10% felt worse — effects are person-specific',
    ],
  },
  S41: {
    id: 'S41',
    citeKey: 'Valkenburg 2022',
    org: 'Valkenburg P.M., van Driel I.I., Beyens I.',
    title: 'The associations of active and passive social media use with well-being: A critical scoping review (New Media & Society)',
    year: 2022,
    url: 'https://journals.sagepub.com/doi/10.1177/14614448211065425',
    kind: 'review',
    supports: [
      '40 survey studies using 36 different definitions of active and passive use, 172 associations; most did not support the claim that passive use harms and active use helps',
      'Time spent on either is too coarse a measure; content, sender and receiver matter — why passive-vs-active stays a hypothesis here',
    ],
  },
  S42: {
    id: 'S42',
    citeKey: 'Vuorre 2022',
    org: 'Vuorre M., Johannes N., Magnusson K., Przybylski A.K.',
    title: 'Time spent playing video games is unlikely to impact well-being (Royal Society Open Science)',
    year: 2022,
    url: 'https://royalsocietypublishing.org/doi/10.1098/rsos.220411',
    kind: 'study',
    supports: [
      'Six weeks of logged play from 38,935 adult players, provided by seven publishers and matched to three waves of well-being surveys',
      'Little to no evidence of a causal link between time played and well-being; the average player would need about ten more hours a day to notice a change. Motivation for playing did matter',
      'Adults (median age 34) — cited for logged-versus-remembered use and for games, not as a finding about children',
    ],
  },
  S43: {
    id: 'S43',
    citeKey: 'Goodyear 2025',
    org: 'Goodyear V.A., Randhawa A., Adab P. et al.',
    title: 'School phone policies and their association with mental wellbeing, phone use, and social media use (SMART Schools) (The Lancet Regional Health – Europe)',
    year: 2025,
    url: 'https://www.thelancet.com/journals/lanepe/article/PIIS2666-7762(25)00003-1/fulltext',
    kind: 'study',
    supports: [
      '1,227 pupils aged 12–15 in 30 English schools, 20 with restrictive phone policies and 10 permissive: no difference in mental well-being, sleep, activity or attainment',
      'Restrictive policies cut phone use in school hours by about 40 minutes and social media by about 32, but not use across the whole day',
      'More overall phone and social media time went with worse well-being, anxiety, depression, sleep, activity and attainment in both kinds of school — cross-sectional, so association only',
    ],
  },
  S44: {
    id: 'S44',
    citeKey: 'Allcott 2020',
    org: 'Allcott H., Braghieri L., Eichmeyer S., Gentzkow M.',
    title: 'The Welfare Effects of Social Media (American Economic Review)',
    year: 2020,
    url: 'https://www.aeaweb.org/articles?id=10.1257/aer.20190658',
    kind: 'study',
    supports: [
      'Randomised experiment: 2,743 adult Facebook users, some paid to deactivate for the four weeks before the 2018 US midterm election',
      'Deactivation improved a subjective well-being index by 0.09 standard deviations and increased offline socialising — small, on adults, on one platform',
    ],
  },
  S45: {
    id: 'S45',
    citeKey: 'Braghieri 2022',
    org: 'Braghieri L., Levy R., Makarin A.',
    title: 'Social Media and Mental Health (American Economic Review)',
    year: 2022,
    url: 'https://www.aeaweb.org/articles?id=10.1257/aer.20211218',
    kind: 'study',
    supports: [
      'Natural experiment: Facebook’s staggered arrival at US colleges in the mid-2000s, matched to student health surveys',
      'The index of poor mental health rose by 0.085 standard deviations, about 22% of the effect of losing a job; equivalent to two more students in a hundred meeting a depression threshold over a baseline of 25%',
      'The strongest causal evidence of harm in the literature, and it is small, on college students, and about the Facebook of the mid-2000s',
    ],
  },
  S46: {
    id: 'S46',
    citeKey: 'Ferguson 2024',
    org: 'Ferguson C.J.',
    title: 'Do social media experiments prove a link with mental health? A methodological and meta-analytic review (Psychology of Popular Media)',
    year: 2024,
    url: 'https://psycnet.apa.org/doi/10.1037/ppm0000541',
    kind: 'meta-analysis',
    supports: [
      'Pooled 27 experiments that reduced social media use or exposed people to it: no average effect on mental health',
      'Disputed — the pooling mixes minutes-long lab exposures with month-long reductions; see the reanalysis (Thrul 2025)',
    ],
  },
  S47: {
    id: 'S47',
    citeKey: 'Thrul 2025',
    org: 'Thrul J., Devkota J., AlJuboori D., Regan T., Alomairah S., Vidal C.',
    title: 'Social media reduction or abstinence interventions are providing mental health benefits — reanalysis of a published meta-analysis (Psychology of Popular Media)',
    year: 2025,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12125955/',
    kind: 'meta-analysis',
    supports: [
      'Reanalysis of the 20 reduction and abstinence studies in Ferguson 2024, split by length',
      'Breaks shorter than a week went with slightly worse mental health (d = −0.18); breaks of a week or longer with slightly better (d = 0.16). Small either way, and the experts still disagree',
    ],
  },
  S48: {
    id: 'S48',
    citeKey: 'Twenge 2022',
    org: 'Twenge J.M., Haidt J., Lozano J., Cummins K.M.',
    title: 'Specification curve analysis shows that social media use is linked to poor mental health, especially among girls (Acta Psychologica)',
    year: 2022,
    url: 'https://www.sciencedirect.com/science/article/pii/S0001691822000270',
    kind: 'study',
    supports: [
      'Reanalysis of three large surveys, separating social media from other screen use and girls from boys',
      'Among girls the association with poor mental health is consistent and larger (median betas −0.11 to −0.24) than for binge drinking or hard drug use in the same data',
      'Cited for the disagreement: the same kind of data reads as "tiny" (Orben 2019) or "substantial" (here) depending on analytic choices',
    ],
  },
  S49: {
    id: 'S49',
    citeKey: 'Odgers 2024',
    org: 'Odgers C.L.',
    title: 'The great rewiring: is social media really behind an epidemic of teenage mental illness? (Nature)',
    year: 2024,
    url: 'https://www.nature.com/articles/d41586-024-00902-2',
    kind: 'review',
    supports: [
      'Review of the case made in The Anxious Generation: the evidence does not show that platforms are rewiring children’s brains or driving an epidemic of mental illness',
      'Platform reforms are still warranted; age-based restrictions and device bans are judged unlikely to be effective and could backfire',
    ],
  },
  S50: {
    id: 'S50',
    citeKey: 'Kaye 2020',
    org: 'Kaye L.K., Orben A., Ellis D.A., Hunter S.C., Houghton S.',
    title: 'The Conceptual and Methodological Mayhem of “Screen Time” (International Journal of Environmental Research and Public Health)',
    year: 2020,
    url: 'https://www.mdpi.com/1660-4601/17/10/3661',
    kind: 'review',
    supports: [
      '"Screen time" has no standard definition and is measured mostly by non-standardised self-report; findings are mixed and longitudinal evidence for causal or long-term effects is lacking',
      'Recommends studying what screens are used for rather than how long — why time is sorted by usage type here',
    ],
  },
  S51: {
    id: 'S51',
    citeKey: 'Pew 2025',
    org: 'Pew Research Center',
    title: 'Teens, Social Media and Mental Health',
    year: 2025,
    url: 'https://www.pewresearch.org/internet/2025/04/22/teens-social-media-and-mental-health/',
    kind: 'survey',
    contextOnly: true,
    supports: [
      'Survey of 1,391 US teens aged 13–17 and their parents, autumn 2024: 48% say social media is mostly bad for people their age, 14% say it is bad for them (32% and 9% in 2022)',
      '45% say it hurts their sleep and 19% their mental health; 74% say it makes them feel more connected to friends, 63% that it gives them a place to show their creative side',
      'Context only — what teenagers report, never a target',
    ],
  },
  S52: {
    id: 'S52',
    citeKey: 'Australia 2024',
    org: 'Parliament of Australia',
    title: 'Online Safety Amendment (Social Media Minimum Age) Act 2024',
    year: 2024,
    url: 'https://www.legislation.gov.au/C2024A00127/asmade',
    kind: 'policy',
    supports: [
      'Platforms must take reasonable steps to keep Australians under 16 from holding social media accounts; in force from 10 December 2025 — the first country-scale minimum-age law',
      'Cited as a policy fact, not as evidence: no evaluation of its effects exists yet',
    ],
  },
}

const ALL_SOURCE_IDS = Object.keys(GUIDANCE_SOURCES) as GuidanceSourceId[]

/** Resolve a source id, or undefined when it points nowhere (the pin test fails on that). */
export function getGuidanceSource(id: GuidanceSourceId): GuidanceSource {
  return GUIDANCE_SOURCES[id]
}

export function guidanceSourceIds(): GuidanceSourceId[] {
  return ALL_SOURCE_IDS
}
