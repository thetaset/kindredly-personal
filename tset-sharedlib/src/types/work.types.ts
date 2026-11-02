/**
 * A book, film, TV series, album or song found by name (HAT-794): what Kinbot's addWork saves.
 * `/data/findWork` answers with these. The item's own link is the work's page (its Wikipedia
 * article, or Open Library's for a book with none); stores and streaming services are `links`.
 */

/** The item subTypes a work is saved as. */
export type WorkKind = 'book' | 'film' | 'video_series' | 'music' | 'song';

export type WorkLink = {
  title: string;
  url: string;
  /** What the link is for: about the work, or a place to read, watch, listen to or buy it. */
  use: 'about' | 'read' | 'watch' | 'listen' | 'buy';
};

export type FoundWork = {
  /** A Wikidata id (`Q99434216`) or an Open Library work id (`OL20893680W`); give it back to pick this one. */
  workId: string;
  /** The title, without Wikipedia's "(novel)" or "(2021 film)". */
  title: string;
  kind: WorkKind;
  /** Wikipedia's short description: "2020 fantasy novel by Susanna Clarke". */
  about: string | null;
  /** Author, director or artist, as the description names them. */
  by: string | null;
  year: number | null;
  /** The work's own page: the item's link. */
  url: string;
  source: 'wikipedia' | 'open_library';
  /** One or two sentences from that page. */
  summary: string | null;
  imageUrl: string | null;
  /** Filled for the work that was picked: where to read, watch or listen, never the item's own link. */
  links?: WorkLink[];
};

export type FindWorkRequest = {
  /** The title as the person said it. */
  query?: string;
  kind?: WorkKind;
  by?: string;
  year?: number;
  /** A choice from an earlier answer. */
  workId?: string;
  /** A Wikipedia or Open Library page for the work. */
  url?: string;
};

/**
 * `one`: exactly one work has that title (and kind, author, year when given); it carries `links`.
 * `several`: more than one does, so the person is asked which. `close`: none has that exact title,
 * these are the nearest. `none`: nothing found.
 */
export type FindWorkResponse = {
  match: 'one' | 'several' | 'close' | 'none';
  works: FoundWork[];
  /**
   * With `one`: works of another kind with the same title ("Charlotte's Web", the novel, has two
   * films), so the person can be told and switch.
   */
  others?: FoundWork[];
};
