import type {ClassifierVersion} from './classifierVersion';

/**
 * The repo's copy of a classifier version and its frozen sets (CLS-8). The admin Versions tab
 * downloads a bundle; `npm run classify:bundle -- <file>` writes its version to
 * `bundledClassifierVersion.ts` and each set to `resources/classification/sets/`, then scores the
 * version on them in Node and records the score. From then on a vitest test scores it again and
 * fails on a drop, so a change to the classifiers' code can't quietly change families' answers.
 */

/** Activation and the repo test refuse a version more than a point less accurate than the one it is compared with… */
export const MAX_ACCURACY_DROP = 0.01;
/** …or that answers Unknown more than two points more often. */
export const MAX_UNKNOWN_RISE = 0.02;

export const CLASSIFIER_BUNDLE_KIND = 'kindredly-classifier-bundle';

/** The characters of a page's text the repo keeps, as each test page stores (CLS-6). */
export const BUNDLE_PAGE_TEXT_CHARS = 2000;

/** One labelled page: what the classifier reads, and the Category a person gave it. */
export type ClassifierSetPage = {
  id: number;
  url: string;
  title: string;
  description: string;
  text: string;
  label: string;
  /** A YouTube page's channel, as the content script read it when the page was captured (CLS-22). */
  channel?: {handle?: string; name?: string};
  /** YouTube's own category for the video, as its page named it (CLS-23). */
  youtubeGenre?: string;
};

/** The score a version got on a set in Node, recorded by `classify:bundle`. */
export type ClassifierSetScore = {versionId: string; accuracy: number; unknownRate: number; labelled: number};

/** A test or pinned set as the repo keeps it. `score` is null until `classify:bundle` records it. */
export type ClassifierSetFile = {
  datasetId: string;
  role: 'test' | 'pinned';
  /** The server's signature of the set's pages and labels when it was downloaded. */
  datasetSignature: string | null;
  score: ClassifierSetScore | null;
  pages: ClassifierSetPage[];
};

export type ClassifierBundle = {
  kind: typeof CLASSIFIER_BUNDLE_KIND;
  version: ClassifierVersion;
  sets: ClassifierSetFile[];
};

/**
 * What is wrong with `measured` against `recorded`: a drop of more than a point, Unknown up by more
 * than two, or any pinned page wrong. Empty when nothing is.
 */
export function bundleScoreProblems(
  set: Pick<ClassifierSetFile, 'datasetId' | 'role'>,
  recorded: ClassifierSetScore,
  measured: ClassifierSetScore & {wrongPageIds: number[]},
): string[] {
  const problems: string[] = [];
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const epsilon = 1e-9;
  if (set.role === 'pinned' && measured.wrongPageIds.length) {
    problems.push(`${set.datasetId}: pinned pages wrong: ${measured.wrongPageIds.join(', ')}`);
  }
  if (measured.accuracy < recorded.accuracy - MAX_ACCURACY_DROP - epsilon) {
    problems.push(`${set.datasetId}: ${pct(measured.accuracy)} right, down from ${pct(recorded.accuracy)}`);
  }
  if (measured.unknownRate > recorded.unknownRate + MAX_UNKNOWN_RISE + epsilon) {
    problems.push(`${set.datasetId}: ${pct(measured.unknownRate)} Unknown, up from ${pct(recorded.unknownRate)}`);
  }
  return problems;
}
