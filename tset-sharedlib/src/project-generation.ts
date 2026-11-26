// Filling a Project with AI (docs/trackers/projects-tracker.md, PRJ-6). The request and response
// shapes are in api/api-types.ts (`ProjectOutlineRequest` and the rest); these are the limits the
// server holds them to, so the page can keep within them, and the refusal a child gets.

/** The request (the project's name in the person's words) is cut to this many characters. */
export const PROJECT_REQUEST_MAX_CHARS = 500;
/** Each of the three answers is cut to this many characters. */
export const PROJECT_ANSWER_MAX_CHARS = 300;
/** The most library items one request may send; the rest are not read. */
export const PROJECT_MAX_LIBRARY_CANDIDATES = 40;
/** The most titles from the other parts (`otherItems`) one part is told about. */
export const PROJECT_MAX_OTHER_ITEMS = 60;
/** The most parts an outline the page sends back may have. */
export const PROJECT_MAX_PARTS = 8;
/** What an outline the server makes has: at least three parts, at most six. */
export const PROJECT_OUTLINE_PARTS = { min: 3, max: 6 } as const;
/** The most items a filled or changed part has. */
export const PROJECT_PART_MAX_ITEMS = 8;
/** The most Talk items (questions for Kinbot) in one part. */
export const PROJECT_PART_MAX_TALK = 2;
/** The adult's words for changing a part are cut to this many characters. */
export const PROJECT_INSTRUCTION_MAX_CHARS = 500;

/**
 * The server refused because the person is a child: making a Project with AI is for adults
 * (Decision 3). A 428, never a 403: installed clients sign out on an auth status.
 */
export const PROJECT_FILL_FOR_ADULTS = 'PROJECT_FILL_FOR_ADULTS';
