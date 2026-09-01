import { TopicCategory } from "./shared.types";

// TODO: Rectify with ResourceType
export enum ItemResourceType {
  SITE_ROOT = "SITE_ROOT",
  SITE_ITEM = "SITE_ITEM",
  SITE_ITEM_FEED = "SITE_ITEM_FEED",
  YT_CHANNEL = "YOUTUBE_CHANNEL",
  YT_PAGE = "YOUTUBE_PAGE",
  YT_VIDEO = "YOUTUBE_VIDEO",
  UNKNOWN = "UNKNOWN",
}

export const BASE64_DELIM = "\r\n--TSB_$$\r\n";

// Chunked full sync (/sync/update): max item ids the server will hydrate per
// page request, and the size the client pages at. Shared so the two can never
// drift — if the client paged larger than the server accepts, every chunked
// full sync would 413 on the first page. Keep client page size <= this.
export const SYNC_FETCH_MAX_IDS_PER_PAGE = 500;

// Partial sync (/sync/update with lastUpdate): above this many changed item
// ids, the server answers with a full reset instead of materializing every
// changed item in one response. 2x the chunk page size — beyond that a giant
// partial is no cheaper than a chunked full sync, and one response holding
// thousands of full items is the exact shape that OOM-crashed prod (2026-07-05).
export const SYNC_PARTIAL_MAX_CHANGED_IDS = SYNC_FETCH_MAX_IDS_PER_PAGE * 2;

// Legacy single-response full sync (_syncAll, clients that don't send
// chunked:true): refuse to serialize libraries larger than this in one
// payload. Such clients get a 413 telling them to upgrade; previously the
// attempt could OOM the server process.
export const SYNC_SINGLE_RESPONSE_MAX_ITEMS = 5000;

// Item visit history (/activity/updateItemVisitHistory). Two DIFFERENT numbers on
// purpose — making them equal is what wedges a client.
//
// The client flushes at this many queued entries, and sends at most this many per
// request. The queue was previously unbounded, and the endpoint does work per entry,
// so one long browsing session could produce a single very large request.
export const ITEM_VISIT_MAX_BATCH = 500;

// The server rejects a request above this. Deliberately far above the client cap:
// extension and mobile builds update on their own schedule, so a deployed server
// meets clients that predate the cap and can hold more than 500 queued. If the two
// limits matched, such a client would flush, be rejected, keep the batch, and retry
// the same oversized request forever — with no way out but an app update.
//
// The ceiling is about bounding request size, not protecting the database; the write
// is a single upsert, and Postgres does not care about 5,000 rows in one statement.
export const ITEM_VISIT_SERVER_MAX_BATCH = 5000;

export const OFFICIAL_PUBLISHER_PUBLIC_ID = 'kindredly-official';
export const OFFICIAL_PUBLISHER_USERNAME = 'Kindredly';
export const OFFICIAL_PUBLISHER_FULL_NAME = 'Kindredly Official';
export const OFFICIAL_PUBLISHER_ABOUT = 'Official published content from Kindredly.';

export function isOfficialPublisherId(value: string | null | undefined): boolean {
  return value === OFFICIAL_PUBLISHER_PUBLIC_ID;
}

// Models the admin classification labeling UI may pick from. Single source of
// truth shared by the server allowlist (admin.service.ts) and the client model
// picker (AdminClassificationEvalData.vue). The first entry is the default used
// whenever no (valid) model is requested.
export const GROUND_TRUTH_MODELS = ['gpt-5.4-nano', 'gpt-4o-mini'] as const;
export const DEFAULT_GROUND_TRUTH_MODEL = GROUND_TRUTH_MODELS[0];

const YOUTUBE_CATEGORIES = {
  "01": "Film & Animation",
  "02": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "18": "Short Movies",
  "19": "Travel & Events",
  "20": "Gaming",
  "21": "Videoblogging",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "How‑to & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism",
  "30": "Movies",
  "31": "Anime/Animation",
  "32": "Action/Adventure",
  "33": "Classics",
  "34": "Comedy (legacy)",
  "35": "Documentary",
  "36": "Drama",
  "37": "Family",
  "38": "Foreign",
  "39": "Horror",
  "40": "Sci‑Fi/Fantasy",
  "41": "Thriller",
  "42": "Shorts",
  "43": "Shows",
  "44": "Trailers",
};

const InternalCategories = {
  "00": "Unknown",
  "01": "Educational",
};
const educationalYTCategoryIds = ["26", "27", "28"];

export const DefaultCategories: TopicCategory[] = [
  { name: "Art", id: "cat_art" },
  { name: "DIY", id: "cat_diy" },
  { name: "Entertainment", id: "cat_entertainment" },
  { name: "Education", id: "cat_education" },
  { name: "Exercise", id: "cat_exercise" },
  { name: "Finance", id: "cat_finance" },
  { name: "Food and Diet", id: "cat_food" },
  { name: "Language and Literature", id: "cat_language" },
  { name: "Health", id: "cat_health" },
  { name: "History and Culture", id: "cat_history" },
  { name: "Kids and Family", id: "cat_kids" },
  { name: "Math", id: "cat_math" },
  { name: "Music", id: "cat_music" },
  { name: "Miscellaneous", id: "cat_misc" },
  { name: "News", id: "cat_news" },
  { name: "Politics", id: "cat_politics" },
  { name: "Productivity", id: "cat_productivity" },
  { name: "Reference", id: "cat_reference" },
  { name: "Science and Nature", id: "cat_science" },
  { name: "Shopping", id: "cat_shopping" },
  { name: "Sports", id: "cat_sports" },
  { name: "Technology", id: "cat_technology" },
  { name: "Other", id: "cat_other" },
];

export const STOP_WORDS = [
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "aren't",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can't",
  "cannot",
  "could",
  "couldn't",
  "did",
  "didn't",
  "do",
  "does",
  "doesn't",
  "doing",
  "don't",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "hadn't",
  "has",
  "hasn't",
  "have",
  "haven't",
  "having",
  "he",
  "he'd",
  "he'll",
  "he's",
  "her",
  "here",
  "here's",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "how's",
  "i",
  "i'd",
  "i'll",
  "i'm",
  "i've",
  "if",
  "in",
  "into",
  "is",
  "isn't",
  "it",
  "it's",
  "its",
  "itself",
  "let's",
  "me",
  "more",
  "most",
  "mustn't",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "ought",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "shan't",
  "she",
  "she'd",
  "she'll",
  "she's",
  "should",
  "shouldn't",
  "so",
  "some",
  "such",
  "than",
  "that",
  "that's",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "there's",
  "these",
  "they",
  "they'd",
  "they'll",
  "they're",
  "they've",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "wasn't",
  "we",
  "we'd",
  "we'll",
  "we're",
  "we've",
  "were",
  "weren't",
  "what",
  "what's",
  "when",
  "when's",
  "where",
  "where's",
  "which",
  "while",
  "who",
  "who's",
  "whom",
  "why",
  "why's",
  "with",
  "won't",
  "would",
  "wouldn't",
  "you",
  "you'd",
  "you'll",
  "you're",
  "you've",
  "your",
  "yours",
  "yourself",
  "yourselves",
];

let STOP_WORDS_SET: Set<string> | null = null;

export function getStopWordSet() {
  if (!STOP_WORDS_SET) {
    STOP_WORDS_SET = new Set(STOP_WORDS);
  }

  return STOP_WORDS_SET;
}
