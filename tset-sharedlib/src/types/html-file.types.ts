/**
 * An HTML file opened in Kindredly (HAT-921), checked against the person's own filtering by the
 * background route `/content/htmlFileCheck` before it may show anything beyond its own code.
 */

/** What the page reads out of the file to check. */
export type HtmlFileScan = {
  title: string
  /** The page's words, with the text of its scripts: a React page writes its words from a script. */
  text: string
  /** Remote picture addresses the file names. */
  pictureUrls: string[]
  /** Remote video and sound addresses the file names. */
  mediaUrls: string[]
  /** Pictures written into the file itself, as data: addresses. */
  dataPictures: string[]
  /** More pictures written into the file than are checked. */
  tooManyDataPictures: boolean
}

/** `/content/htmlFileCheck`'s answer (`bg/services/htmlFileGate.ts`). */
export type HtmlFileCheckResult =
  | { filtered: false }
  | { filtered: true; blocked: 'words' | 'unchecked' }
  | { filtered: true; blocked: null; pictureUrls: string[]; dataPictures: boolean }
