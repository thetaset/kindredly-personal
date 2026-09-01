/**
 * Database schema for `puzzle_content` — the Thinking Puzzles content store.
 *
 * `data` is intentionally untyped: the payload shape belongs to the client's standalone
 * `thinkingPuzzles` module, which must stay free of Kindredly imports. The server stores and
 * serves it opaquely, so a new puzzle primitive never requires a server change.
 */
export default interface PuzzleContentRecord {
  _id?: string;
  /** 'strand' | 'concept' | 'puzzle' */
  kind?: string;
  /** concept -> strand _id; puzzle -> concept _id; strand -> null. */
  parentId?: string | null;
  /** 'draft' | 'live' | 'retired' */
  status?: string;
  sortOrder?: number;
  data?: Record<string, any> | null;
  version?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  /** An admin label, not a user id — nothing in this table is user data. */
  updatedBy?: string | null;
}
