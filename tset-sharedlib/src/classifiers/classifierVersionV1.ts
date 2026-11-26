import type {ClassifierVersion} from './classifierVersion';

/**
 * Version 1: the anchors, rules and thresholds the app used before versions existed, written on
 * 2026-11-10 with the same answers. It never changes. The server answers 'v1' from this file (it
 * has no row), so an app whose decisions name v1, or an admin going back to it, always finds it,
 * whichever version the app ships (`bundledClassifierVersion.ts`).
 */
export const classifierVersionV1: ClassifierVersion = {
  "schema": 1,
  "id": "v1",
  "parent": null,
  "textModel": "potion-32m",
  "createdAt": "2026-11-10T00:00:00.000Z",
  "notes": "The anchors, keyword rules, entity rules, site defaults and thresholds the app shipped with before versions existed.",
  "anchors": {
    "task": [
      "email app – inbox",
      "online document editor – new document",
      "notes and workspace app – home",
      "task manager – today's to-do list",
      "calendar app – weekly schedule view",
      "project management board – tasks",
      "team messaging app – channels",
      "email and calendar – inbox",
      "how to set up two-factor authentication",
      "reset your password – account settings",
      "install and configure a code editor on Windows"
    ],
    "educational": [
      "how does photosynthesis work? – online learning",
      "introduction to calculus – free university course",
      "the history of the Roman Empire – encyclopedia article",
      "how to draw anime characters – step-by-step tutorial",
      "what is machine learning? – explained for beginners",
      "DIY watercolor painting techniques for kids",
      "understanding the constitution – civics lesson plan",
      "the solar system – space science reference",
      "learn a new language in 30 days – language learning app",
      "biology study guide – cell division and genetics",
      "poetry analysis: a classic poem explained",
      "how to write a research paper – academic writing guide",
      "kids TV show – counting and letters for toddlers",
      "educational games for kids – science and math",
      "learn to read app – kindergarten level",
      "story time for kids – read aloud picture books",
      "how do rainbows form? – science for kids",
      "learn to count to 100 – fun educational video for children",
      "phonics song – letters and sounds for preschoolers",
      "amazing animal facts – kids nature magazine",
      "kids cooking class – how to make pancakes",
      "why is the sky blue? – science explained for kids",
      "puberty: how your body changes – health for kids and teens",
      "sexual health and contraception – clinic information",
      "the human reproductive system – biology reference",
      "sex education lesson plan – consent and healthy relationships",
      "penis and testicle health – men's health guide",
      "vaginal infections: symptoms and treatment – medical encyclopedia"
    ],
    "entertainment": [
      "official trailer – new superhero blockbuster movie",
      "popular singer – new music video (official)",
      "try not to laugh – funniest animal moments",
      "survival sandbox game – let's play episode 12",
      "popular sci-fi drama – season 5 full episode recap",
      "pro basketball highlights – best dunks of the week",
      "cute puppies and kittens compilation 2024",
      "stand-up comedy special – full show",
      "top 10 video games of the year",
      "watch free movies online – streaming tonight",
      "kids animated rescue adventure – full episode",
      "kids family animated show – camping trip full episode",
      "classic kids cartoon – season 4 full episodes",
      "kids toddler cartoon – muddy puddles episode",
      "animated adventure movie for kids – full film",
      "kids online gaming platform – funny moments with friends",
      "multiplayer party game – family gameplay video",
      "kids animated friendship show – new episode",
      "kids nursery rhymes and songs – toddler music video",
      "kids sandbox building game – building a giant castle"
    ],
    "news": [
      "senate passes spending bill amid budget standoff – wire report",
      "live updates: earthquake strikes coastal region",
      "investigation: how tech companies harvest your data – news report",
      "global climate summit ends with landmark agreement – international news",
      "op-ed: why the economy needs structural reform",
      "fact check: viral claim about vaccine safety",
      "city council votes on new housing policy – local news",
      "press release: health agency approves new diabetes treatment",
      "analysis: what the election results mean for foreign policy",
      "breaking: prime minister announces surprise resignation",
      "court blocks state age-verification law for adult websites – news report",
      "subscription platform for adult creators reports record revenue – business news"
    ],
    "shopping": [
      "online retailer – today's deals and discounts",
      "branded sneakers – buy online, free shipping",
      "latest smartphone – price, specs, and reviews",
      "popular building toy set – in stock, add to cart",
      "50% off sitewide – limited time sale",
      "your shopping cart – 3 items – checkout",
      "handmade marketplace – unique gifts and crafts",
      "grocery store – order online for pickup",
      "promo code – use at checkout for discount",
      "compare prices on laptops – price comparison site"
    ],
    "junk": [
      "50 memes that broke the internet this week",
      "you won't believe what happened next",
      "10 shocking secrets celebrities don't want you to know",
      "which celebrity just had a major meltdown",
      "I tried the viral challenge and here's what happened",
      "wait for the end 😱 viral dance compilation",
      "this one weird hack is blowing up right now",
      "trending fails and cringe moments of the week",
      "celebrity drama nobody saw coming",
      "mindless scrolling funny videos compilation",
      "spend $10,000 on mystery toy boxes – kids unboxing",
      "kids try a candy challenge – gone wrong",
      "kid opens 100 surprise eggs in 24 hours!!",
      "this slime recipe will blow your mind (gone wrong)",
      "I bought every toy in the store and gave them away",
      "kids overnight in a trampoline park – not allowed!"
    ]
  },
  "keywordRules": [
    {
      "label": "task",
      "rules": [
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "email",
            "document",
            "write",
            "docs",
            "notes",
            "calendar",
            "todo",
            "task",
            "reminder",
            "schedule",
            "plan",
            "organize",
            "organizer",
            "productivity",
            "inbox",
            "outlook",
            "gmail",
            "yahoo mail",
            "hotmail",
            "to-do list",
            "task manager",
            "calendar app",
            "email client",
            "productivity tool",
            "protonmail"
          ],
          "fields": [
            "title",
            "text",
            "url"
          ],
          "caseSensitive": false,
          "weight": 1
        },
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "add to cart",
            "buy now",
            "deal of the day"
          ],
          "fields": [
            "title",
            "text",
            "url"
          ],
          "negate": true,
          "caseSensitive": false
        }
      ]
    },
    {
      "label": "educational",
      "rules": [
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "edu",
            "learn",
            "course",
            "school",
            "wiki",
            "library",
            "research",
            "academic",
            "wikipedia",
            "how-to",
            "DIY",
            "study",
            "university",
            "college",
            "class",
            "lesson",
            "reading",
            "tutorial",
            "instruct",
            "teach",
            "training",
            "workshop",
            "seminar",
            "webinar",
            "curriculum",
            "syllabus",
            "academic",
            "scholarship",
            "degree",
            "diploma",
            "certificate",
            "khanacademy",
            "coursera",
            "tips",
            "tricks",
            "guide",
            "explain",
            "explanation",
            "define",
            "definition",
            "online course",
            "study guide",
            "lesson plan",
            "academic journal",
            "open university"
          ],
          "fields": [
            "title",
            "text",
            "url"
          ],
          "caseSensitive": false,
          "weight": 2
        },
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "trailer",
            "episode",
            "playlist"
          ],
          "fields": [
            "title"
          ],
          "negate": true,
          "caseSensitive": false
        }
      ]
    },
    {
      "label": "entertainment",
      "rules": [
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "game",
            "fun",
            "movie",
            "music",
            "video",
            "tv",
            "show",
            "series",
            "film",
            "entertainment",
            "streaming",
            "netflix",
            "hulu",
            "spotify",
            "youtube",
            "twitch",
            "vimeo",
            "dailymotion",
            "video game",
            "music video",
            "tv show",
            "film series",
            "streaming service",
            "minecraft",
            "fortnite",
            "call of duty",
            "league of legends",
            "among us",
            "roblox",
            "sports",
            "game",
            "team",
            "score",
            "match",
            "tournament",
            "league",
            "player",
            "coach",
            "athlete",
            "football",
            "soccer",
            "basketball",
            "baseball",
            "hockey",
            "tennis",
            "golf",
            "cricket",
            "rugby",
            "olympics",
            "nba",
            "nfl",
            "mlb",
            "nhl",
            "fifa",
            "espn",
            "bleacher report",
            "sky sports",
            "sportscenter",
            "sports news",
            "live score"
          ],
          "fields": [
            "title",
            "text",
            "url"
          ],
          "caseSensitive": false,
          "weight": 3
        },
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "trailer",
            "review",
            "episode",
            "season",
            "playlist",
            "let's play"
          ],
          "fields": [
            "title",
            "text"
          ],
          "caseSensitive": false,
          "weight": 2
        }
      ]
    },
    {
      "label": "news",
      "rules": [
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "news",
            "report",
            "journal",
            "media",
            "press",
            "headline",
            "breaking",
            "cnn",
            "bbc",
            "reuters",
            "apnews",
            "nytimes",
            "guardian",
            "washingtonpost",
            "npr",
            "breaking news",
            "news report",
            "press release",
            "news media",
            "opinion piece"
          ],
          "fields": [
            "title",
            "text",
            "url"
          ],
          "caseSensitive": false,
          "weight": 1
        },
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "live updates",
            "op-ed",
            "editorial",
            "investigation",
            "newsroom",
            "fact check"
          ],
          "fields": [
            "title",
            "text"
          ],
          "caseSensitive": false,
          "weight": 1
        },
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "one weird trick",
            "miracle cure",
            "you won't believe"
          ],
          "fields": [
            "title",
            "text"
          ],
          "negate": true,
          "caseSensitive": false,
          "weight": 1
        }
      ]
    },
    {
      "label": "shopping",
      "rules": [
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "shop",
            "buy",
            "sale",
            "store",
            "amazon",
            "ebay",
            "etsy",
            "walmart",
            "target",
            "online shopping",
            "shopping cart",
            "discount code",
            "price match"
          ],
          "fields": [
            "title",
            "text",
            "url"
          ],
          "caseSensitive": false,
          "weight": 1
        },
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "add to cart",
            "free shipping",
            "in stock",
            "buy now",
            "deal of the day",
            "promo code",
            "checkout",
            "returns policy",
            "price drop"
          ],
          "fields": [
            "title",
            "text"
          ],
          "caseSensitive": false,
          "weight": 1
        }
      ]
    },
    {
      "label": "junk",
      "rules": [
        {
          "type": "contains",
          "operator": "or",
          "values": [
            "foxnews",
            "breitbart",
            "youtube.com/shorts",
            "buzzfeed",
            "infowars",
            "dailymail",
            "nationalenquirer",
            "fox news"
          ],
          "fields": [
            "url",
            "title",
            "text"
          ],
          "caseSensitive": false,
          "weight": 6
        }
      ]
    }
  ],
  "entityRules": [
    {
      "label": "task",
      "domains": [
        "kindredly.ai"
      ],
      "note": "Kindredly"
    },
    {
      "label": "social",
      "domains": [
        "news.ycombinator.com"
      ],
      "titleContains": [
        "hacker news"
      ],
      "note": "Hacker News"
    },
    {
      "label": "educational",
      "domains": [
        "developer.mozilla.org"
      ],
      "note": "MDN"
    },
    {
      "label": "educational",
      "domains": [
        "3blue1brown.com"
      ],
      "urlContains": [
        "youtube.com/@3blue1brown"
      ],
      "titleContains": [
        "3blue1brown"
      ],
      "note": "3Blue1Brown"
    },
    {
      "label": "educational",
      "domains": [
        "veritasium.com"
      ],
      "urlContains": [
        "youtube.com/@veritasium"
      ],
      "titleContains": [
        "veritasium"
      ],
      "note": "Veritasium"
    },
    {
      "label": "entertainment",
      "urlContains": [
        "youtube.com/@mrbeast",
        "youtube.com/mrbeast"
      ],
      "titleContains": [
        "mrbeast"
      ],
      "textContains": [
        "mrbeast"
      ],
      "note": "MrBeast"
    },
    {
      "label": "satire",
      "domains": [
        "theonion.com",
        "babylonbee.com",
        "thebeaverton.com",
        "waterfordwhispersnews.com"
      ],
      "titleContains": [
        "the onion",
        "babylon bee",
        "the beaverton",
        "waterford whispers"
      ],
      "note": "Satire site"
    }
  ],
  "siteDefaults": [
    {
      "label": "YouTube Shorts",
      "domains": [
        "youtube.com"
      ],
      "pathPrefixes": [
        "/shorts"
      ],
      "eduValue": "eduval_junk",
      "intent": "intent_play",
      "sourceNote": "YouTube Shorts pages default to Junk unless a stronger category already exists.",
      "alwaysApply": true
    },
    {
      "label": "Netflix",
      "domains": [
        "netflix.com"
      ],
      "eduValue": "eduval_fun",
      "intent": "intent_play",
      "sourceNote": "Netflix pages default to Entertainment unless a stronger category already exists."
    },
    {
      "label": "Prime Video",
      "domains": [
        "primevideo.com",
        "amazonvideo.com"
      ],
      "eduValue": "eduval_fun",
      "intent": "intent_play",
      "sourceNote": "Prime Video pages default to Entertainment unless a stronger category already exists."
    },
    {
      "label": "Prime Video",
      "domains": [
        "amazon.com"
      ],
      "pathPrefixes": [
        "/gp/video"
      ],
      "eduValue": "eduval_fun",
      "intent": "intent_play",
      "sourceNote": "Prime Video pages default to Entertainment unless a stronger category already exists."
    },
    {
      "label": "Amazon",
      "domains": [
        "amazon.com"
      ],
      "eduValue": "eduval_task",
      "intent": "intent_task",
      "sourceNote": "Amazon pages default to Task unless a stronger category already exists."
    },
    {
      "label": "Video in Kindredly",
      "domains": [
        "kindredly.ai",
        "thetaset.com"
      ],
      "pathPrefixes": [
        "/media/"
      ],
      "eduValue": "eduval_fun",
      "intent": "intent_play",
      "sourceNote": "Video played in Kindredly defaults to Entertainment unless a stronger category already exists."
    },
    {
      "label": "Kindredly",
      "domains": [
        "kindredly.ai",
        "thetaset.com"
      ],
      "eduValue": "eduval_task",
      "intent": "intent_task",
      "sourceNote": "Kindredly app usage defaults to Task-related unless a stronger category already exists."
    }
  ],
  "thresholds": {
    "embeddingMinScore": 0.2,
    "ruleMinScore": 0.2,
    "ruleUnknownDominant": 0.5,
    "ruleEntertainmentLow": 0.2,
    "ruleEntertainmentHigh": 0.3,
    "ruleTaskOrEduCeiling": 0.5,
    "ruleTaskMin": 0.3,
    "ruleEducationalMin": 0.3,
    "ruleUnknownFallbackScore": 0.5
  }
};
