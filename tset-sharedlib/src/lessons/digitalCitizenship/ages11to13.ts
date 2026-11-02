import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 11–13 (HAT-534, DCL-11). Adapted from eSafety Commissioner text (CC BY 4.0),
// England's RSHE guidance and UKCIS (OGL v3) and FTC advice (public domain); facts from NCMEC, Thorn and
// Common Sense are cited, not copied. Never change a step or question key once shipped: a child's
// progress and answers are saved against them.

export const FEEDS_AND_FILTERS: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Feeds, filters and you',
    subtitle: 'Digital citizenship · Part 1 of 5',
    objectives: [
      'I can explain how a feed chooses what to show me, and why.',
      'I can notice when posts are edited or picked to look perfect, and how an app makes me feel.',
      'I can use notifications, time limits and stopping points to stay in charge of my time.',
    ],
    estMinutes: 9,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.7,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Just one more video',
      body: "Leo opens a video app to watch one clip before homework. When he looks up, 40 minutes have gone. He never decided to stay that long.\n\nThat isn't a willpower problem. Lots of apps are **built to be hard to put down**.\n\nTime online can be great: learning, making things, talking to friends. This lesson is about making sure **you** decide how it goes. You'll learn how feeds choose what you see, why so many posts look perfect, and simple ways to stay in charge.",
      media: [lessonPicture('a11-one-more-video')],
    },
    {
      key: 'how-feeds-work',
      order: 20,
      kind: 'content',
      title: 'How a feed chooses',
      body: 'A feed isn\'t random. The app keeps track of what you watch, like, search for and follow, and even **how long you pause** on something. Then it shows you more of the same. Like one puppy video and suddenly your feed is full of puppies.\n\nThat can be great for finding music, games or new skills. But most feeds are **designed to keep you watching**, not to look after how you feel. Endless scrolling, autoplay and notifications all make it harder to stop.\n\nOver time, a feed can get narrow, more extreme, or full of things that make you feel bad, often without you noticing.\n\n**You can steer it:** tap "Not interested" or "See less", mute or unfollow, search for new things, or clear your watch history.',
      media: [lessonPicture('a11-puppy-feed')],
    },
    {
      key: 'check-feeds',
      order: 30,
      kind: 'quiz',
      title: "What's your feed doing?",
      questions: [
        {
          key: 'q-watched-to-end',
          type: 'multiple_choice',
          prompt: "Ravi watches two videos about extreme workouts all the way to the end. He doesn't like them or comment. What will his feed probably do next?",
          choices: [
            {
              key: 'a',
              text: "Nothing changes, since he didn't like or comment on them.",
            },
            {
              key: 'b',
              text: 'Show him fewer workout videos, to keep his feed balanced.',
            },
            {
              key: 'c',
              text: 'Wait until he searches for workouts before showing any more.',
            },
            {
              key: 'd',
              text: 'Show him more workout videos, since he watched to the end.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Feeds notice what you watch and how long you stay, not just what you like. Watching to the end tells the app you want more of the same.',
        },
        {
          key: 'q-steer-feed',
          type: 'multiple_choice',
          prompt: "Mia's feed has filled up with videos that make her feel bad about how she looks. What's the best way to change what she sees?",
          choices: [
            {
              key: 'a',
              text: "Watch them to the end, so the app learns she's bored of them.",
            },
            {
              key: 'b',
              text: 'Tap "See less" on them, and mute or unfollow those accounts.',
            },
            {
              key: 'c',
              text: 'Wait, because her feed will go back to normal on its own.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Watching to the end tells the app she wants more of the same. "See less", muting and unfollowing are how she steers it, and searching for things she enjoys helps too.',
        },
        {
          key: 'q-good-feed',
          type: 'true_false',
          prompt: 'A feed that shows you more of what you enjoy can be a good thing, like helping you find new music or learn a skill.',
          correct: true,
          explanation: "Feeds can help you find great things. The skill is noticing when one starts pulling you somewhere you don't want to go.",
        },
      ],
    },
    {
      key: 'highlights',
      order: 40,
      kind: 'content',
      title: 'Highlights, not real life',
      body: 'Most posts are **highlights**. People take the same photo 30 times, pick the best one, and use good lighting, angles and filters. Some images are heavily edited, or made with AI. Some creators are paid to make a product or a lifestyle look amazing.\n\nEven when you know a picture is edited, seeing the same "perfect" faces and bodies again and again can make them feel normal. Comparing your ordinary day with everyone else\'s best moments can leave you feeling you\'re not enough.\n\n**Notice how you feel.** After using an app, ask:\n\n- Do I feel better or worse than before?\n- Is this account trying to sell me something?\n- Which accounts do I actually enjoy?\n\nKeep the ones that leave you feeling good. Mute or unfollow the rest.',
      media: [lessonPicture('a11-camera-roll')],
    },
    {
      key: 'check-highlights',
      order: 50,
      kind: 'quiz',
      title: 'Highlight or real?',
      questions: [
        {
          key: 'q-holiday-photos',
          type: 'multiple_choice',
          prompt: "Ella sees a classmate's holiday photos: perfect skin, a perfect beach, everyone laughing. Ella's weekend was homework and rain, and now she feels rubbish. What's the most helpful thing to remember?",
          choices: [
            {
              key: 'a',
              text: "These are her classmate's best moments, picked and maybe edited.",
            },
            {
              key: 'b',
              text: "Her classmate's life really is much more fun than hers.",
            },
            {
              key: 'c',
              text: 'Photos without a filter show what life is really like.',
            },
            {
              key: 'd',
              text: 'She should post something that looks just as good.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'People share their best moments, not the rainy homework days, and even a photo with no filter may be the best of 30 tries. If photos often leave Ella feeling bad, she can scroll less or mute.',
        },
        {
          key: 'q-worse-after-scrolling',
          type: 'multiple_choice',
          prompt: "Zoe joined an app that all her friends use. After scrolling it, she often feels worse about herself. What's the most helpful next step?",
          choices: [
            {
              key: 'a',
              text: 'Keep using it the same way, since all her friends are on it.',
            },
            {
              key: 'b',
              text: 'Post more often, so she gets more likes and feels better.',
            },
            {
              key: 'c',
              text: 'Notice which accounts do it, and mute or unfollow them.',
            },
            {
              key: 'd',
              text: "Tell herself it's silly to feel that way, and carry on.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'How an app makes you feel is useful information, even if all your friends use it. Muting or unfollowing, using it less, or talking it over with someone she trusts can all help.',
        },
      ],
    },
    {
      key: 'stay-in-charge',
      order: 60,
      kind: 'content',
      title: 'Stay in charge',
      body: "Many apps use notifications, streaks and autoplay to pull you back. A few simple moves help you push back:\n\n- **Turn off notifications** you don't need, or use Do Not Disturb.\n- **Pick a stopping point before you start:** one episode, one match, or a set time.\n- **Set time limits** on the apps you use most.\n- **Put your phone out of reach at bedtime**, so it can't keep you up.\n- **Tell friends when you're offline**, so you don't feel you must reply straight away.\n\nSigns it might be time for a change: staying up late, skipping things you used to enjoy, or feeling stressed when you can't check.\n\nChanging a habit is hard for everyone. Ask a parent or a friend to help you stick to a plan.",
      media: [lessonPicture('a11-in-charge')],
    },
    {
      key: 'check-in-charge',
      order: 70,
      kind: 'quiz',
      title: 'Your plan',
      questions: [
        {
          key: 'q-stopping-point',
          type: 'multiple_choice',
          prompt: 'Sam wants to watch some videos after school, then start his science project. Which plan is most likely to work?',
          choices: [
            {
              key: 'a',
              text: 'Watch until he feels like stopping, then start.',
            },
            {
              key: 'b',
              text: 'Choose three videos first, then close the app.',
            },
            {
              key: 'c',
              text: 'Keep the app open beside him while he works.',
            },
            {
              key: 'd',
              text: "Turn on autoplay so he doesn't waste time choosing.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Deciding where to stop before you start makes stopping much easier. Feeds are built so that "when I feel like it" rarely comes.',
        },
        {
          key: 'q-saturday-build',
          type: 'multiple_choice',
          prompt: "Kofi spends two hours on a Saturday building a city in a game with his friends. They plan it together and have a great time. What's going on?",
          choices: [
            {
              key: 'a',
              text: "It's a problem, because games are built to be hard to put down.",
            },
            {
              key: 'b',
              text: 'Two hours is too long. He should stop after one next time.',
            },
            {
              key: 'c',
              text: "It's a warning sign, because he didn't pick a stopping point first.",
            },
            {
              key: 'd',
              text: "Time well spent: he chose it, and he's enjoying it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Plenty of time online is fine, and building something with friends by choice is a great example. It's only worth a change when it pushes out sleep, school or other things you care about.",
        },
        {
          key: 'q-game-alerts',
          type: 'multiple_choice',
          prompt: 'Maya keeps stopping her homework to check notifications from a game. Each check only takes a minute, but she never gets going. Which change would help most?',
          choices: [
            {
              key: 'a',
              text: "Turn off the game's notifications until her homework is done.",
            },
            {
              key: 'b',
              text: 'Try harder to ignore them when they pop up.',
            },
            {
              key: 'c',
              text: "Check each one straight away, so they don't pile up.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Notifications are built to pull you back, so switching them off works better than willpower alone. She can turn them back on when she's finished.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Pick two or three of these to talk about with a parent or another trusted adult:\n\n- Open an app you both use. What does its feed seem to think you like? Is it right?\n- Which accounts or videos leave you feeling good, and which leave you feeling worse?\n- Each choose one change to try for a week, like a stopping point or fewer notifications. Then check in on how it went.',
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World, 2020 edition (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, Relationships and Sex Education (RSE) and Health Education: statutory guidance, July 2025 (Department for Education)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/echo-chambers-and-your-feed',
      title: "Drifting into an 'echo chamber'? Take control of the algorithms that shape your feed (eSafety Commissioner)",
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/pressures-from-social-media',
      title: 'Pressures from social media (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/balancing-your-time-online',
      title: 'Balancing your time online (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const ONLINE_FRIENDSHIPS: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Healthy and unhealthy online friendships',
    subtitle: 'Digital citizenship · Part 2 of 5',
    objectives: [
      'I can describe what a healthy friendship feels like, online and offline.',
      'I can spot warning signs like fast flattery, gifts, secrets, moving to a private chat and pressure.',
      "I can get help, knowing it's never my fault when someone pressures or tricks me.",
    ],
    estMinutes: 9,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.7,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Good friend, or something else?',
      body: "Lots of real friendships happen online: in game chats, group chats and servers. Some of your best friends might be people you mostly talk to online.\n\nBut some people try to pressure, trick or control others. They can be adults or other young people, strangers or people you already know. Telling a healthy friendship from an unhealthy one is a skill, and you can learn it.\n\nIn this lesson you'll learn what healthy looks like, the warning signs of unhealthy, and what to do if something feels off.",
      media: [lessonPicture('a11-friend-or-not')],
    },
    {
      key: 'what-healthy-looks-like',
      order: 20,
      kind: 'content',
      title: 'What healthy looks like',
      body: "A healthy friendship, online or off, feels **safe and equal**. A good friend:\n\n- accepts it when you say no, and doesn't keep pushing\n- is happy for you to have other friends\n- doesn't ask you to keep secrets from your family\n- doesn't make you feel you owe them\n- is who they say they are\n\nOnline, you can't always see who someone is. People can lie about their age, name or photo. So it's normal for trust to build slowly.\n\n**Trust your gut.** If a chat leaves you uneasy, confused or pressured, that feeling is worth listening to, even if the person is nice most of the time.",
      media: [lessonPicture('a11-safe-and-equal')],
    },
    {
      key: 'check-healthy',
      order: 30,
      kind: 'quiz',
      title: 'Healthy or not?',
      questions: [
        {
          key: 'q-tournament',
          type: 'multiple_choice',
          prompt: 'Noah has played a game with Jay from his class for months. Jay asks if Noah wants to team up for Saturday\'s tournament, and adds, "No worries if you can\'t." What\'s going on?',
          choices: [
            {
              key: 'a',
              text: 'A warning sign: Jay is asking for a lot of his time.',
            },
            {
              key: 'b',
              text: "Noah should get a parent to check Jay's account first.",
            },
            {
              key: 'c',
              text: 'A healthy friendship: friendly, and fine with a no.',
            },
            {
              key: 'd',
              text: 'Noah has to say yes, or Jay might stop liking him.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Noah knows Jay, and Jay has made it easy to say no. That's what a healthy friendship looks like.",
        },
        {
          key: 'q-owe-you',
          type: 'multiple_choice',
          prompt: 'Max\'s online friend Rory gave him game credits last week. Now Rory says, "You owe me. And don\'t tell your parents we talk." What\'s going on?',
          choices: [
            {
              key: 'a',
              text: 'Fair enough: Rory was generous, so Max should go along with it.',
            },
            {
              key: 'b',
              text: 'Warning signs: making Max feel he owes Rory, and asking for a secret.',
            },
            {
              key: 'c',
              text: "Max can say no, but only once he's paid the credits back.",
            },
            {
              key: 'd',
              text: "It's only a worry if Rory turns out to be an adult.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "A good friend doesn't make you feel you owe them or ask you to keep secrets from your family, whatever their age. Max owes Rory nothing, and he can tell a trusted adult.",
        },
      ],
    },
    {
      key: 'warning-signs',
      order: 40,
      kind: 'content',
      title: 'Warning signs',
      body: "People who want to take advantage of someone often start by being **really nice**. Watch for patterns like these:\n\n- lots of compliments and attention, very fast\n- gifts, like game credits or skins\n- asking you to **keep things secret**\n- wanting to **move to a private chat** or a different app\n- saying they're the only one who understands you\n- an **older teen or adult** who wants a close, private friendship with you\n- asking for photos or personal details\n- getting angry or guilt-tripping you when you say no\n\nIt could be an adult pretending to be younger, someone older you know, or someone your own age. **Several signs together are a reason to get help.**",
      media: [lessonPicture('a11-warning-signs')],
    },
    {
      key: 'check-signs',
      order: 50,
      kind: 'quiz',
      title: 'Spot the pattern',
      questions: [
        {
          key: 'q-private-app',
          type: 'multiple_choice',
          prompt: 'Ava met Kit in a game last week. Kit calls her "so mature for our age", sends her a skin, and asks to chat on a more private app. What should Ava do?',
          choices: [
            {
              key: 'a',
              text: 'Say no to moving, and tell a trusted adult about Kit.',
            },
            {
              key: 'b',
              text: 'Move to the other app, since Kit has been so nice.',
            },
            {
              key: 'c',
              text: 'Ask Kit to send a photo to prove how old they are.',
            },
            {
              key: 'd',
              text: 'Stay in the game chat, but keep it secret from her parents.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Fast compliments, a gift and a push to a private app are several warning signs together, and a photo proves nothing. Saying no and telling an adult keeps Ava safe, and she hasn't done anything wrong.",
        },
        {
          key: 'q-late-replies',
          type: 'multiple_choice',
          prompt: 'Dev\'s friend from school messages him late every night and gets angry if he doesn\'t answer within minutes: "If you were a real friend, you\'d reply." What\'s going on?',
          choices: [
            {
              key: 'a',
              text: "That's how close friends act, so Dev should reply faster.",
            },
            {
              key: 'b',
              text: "It's not pressure, because they're the same age.",
            },
            {
              key: 'c',
              text: 'Dev is letting his friend down by not replying quickly.',
            },
            {
              key: 'd',
              text: 'Pressure. Dev can set a limit and talk to someone he trusts.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "A friend who demands instant replies and guilt-trips you is putting on pressure, even if they're your age. Dev can say when he's offline and get advice from someone he trusts.",
        },
      ],
    },
    {
      key: 'get-help',
      order: 60,
      kind: 'content',
      title: 'If something feels wrong',
      body: 'If someone online makes you uncomfortable, you can:\n\n- **Stop replying.** You don\'t owe anyone an answer.\n- **Screenshot** the messages and their username.\n- **Block and report** them in the app.\n- **Tell a trusted adult.**\n\n**It is never your fault** when someone pressures, tricks or flatters you, even if you chatted for a long time, kept it secret, or sent something you now regret. The person doing it is responsible.\n\n**You won\'t be in trouble for asking for help.** You could say: "Someone online is making me uncomfortable. Can I show you?" If the first adult doesn\'t help, tell another one.',
      media: [lessonPicture('a11-can-i-show-you')],
    },
    {
      key: 'check-help',
      order: 70,
      kind: 'quiz',
      title: 'Getting help',
      questions: [
        {
          key: 'q-partly-your-fault',
          type: 'true_false',
          prompt: "If someone tricked you into sending something you regret, it's partly your fault, so you should sort it out on your own.",
          correct: false,
          explanation: "The person who tricked or pressured you is responsible. Getting help quickly is the best way to sort it out, and you won't be in trouble for asking.",
        },
        {
          key: 'q-friend-secret',
          type: 'multiple_choice',
          prompt: 'Your friend says an older guy she met online sends her gifts, calls her "special", and wants their chats kept secret. She makes you promise not to tell. What do you do?',
          choices: [
            {
              key: 'a',
              text: "Keep the promise, because it's her business.",
            },
            {
              key: 'b',
              text: 'Message the guy yourself and tell him to leave her alone.',
            },
            {
              key: 'c',
              text: "Tell her it's a warning sign, and help her tell an adult.",
            },
            {
              key: 'd',
              text: 'Wait and see if anything bad actually happens.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Gifts, flattery, secrets and an older person together are serious warning signs. Helping your friend get an adult involved is what a good friend does, even if it means breaking a promise.',
        },
        {
          key: 'q-screenshot-first',
          type: 'multiple_choice',
          prompt: "Someone online keeps sending Mo messages that make him uncomfortable. He's about to block them. What's most worth doing first?",
          choices: [
            {
              key: 'a',
              text: 'Screenshot the messages and their username.',
            },
            {
              key: 'b',
              text: 'Delete the whole chat, so he never has to see it again.',
            },
            {
              key: 'c',
              text: 'Send one last message telling them to stop.',
            },
            {
              key: 'd',
              text: 'Nothing. Blocking them is enough on its own.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'Screenshots keep a record of what was said and who said it. Then he can block and report them, and tell a trusted adult, who can help.',
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Pick two or three of these to talk about with a parent or another trusted adult:\n\n- What makes a friend feel safe to you? What\'s one thing a good friend would never do?\n- Ask your adult: "If I told you someone online was pressuring me, what would you do?" Agree together that you won\'t be in trouble for telling.\n- Name two adults you could go to: one at home and one outside home.',
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World, 2020 edition (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, Relationships and Sex Education (RSE) and Health Education: statutory guidance, July 2025 (Department for Education)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/unsafe-contact',
      title: "Unsafe contact and 'grooming' (eSafety Commissioner)",
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/when-is-love-bombing-coercive-control',
      title: "When is 'love bombing' coercive control? (eSafety Commissioner)",
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.missingkids.org/theissues/sextortion',
      title: 'Sextortion: red flags (NCMEC)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://www.thorn.org/blog/identify-sextortion/',
      title: 'Sextortion: what to do if someone is blackmailing you with nudes (Thorn)',
      licenseNote: 'Facts cited; no text adapted.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const PRIVATE_PHOTOS_AND_FAKES: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Private photos and fake images',
    subtitle: 'Digital citizenship · Part 3 of 5',
    objectives: [
      'I can say no to a request for a nude, and see pressure for one as a warning sign.',
      'I can explain why I never make, save or forward a nude or fake nude of anyone.',
      'I can name what to do if someone threatens to share an image, and where to get help.',
    ],
    estMinutes: 10,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.7,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'An awkward topic',
      body: "This lesson is about nudes and fake nude images. It might feel awkward, and that's OK. You may never need it, but knowing what to do ahead of time makes things much easier if something happens to you or a friend.\n\nYou'll learn:\n\n- what to do if someone asks or pressures you for a nude\n- why fake nudes of real people cause real harm\n- what to do if someone threatens to share an image\n\nThe most important thing first: **if any of this ever happens, it's not your fault, and you can get help.**",
      media: [lessonPicture('a11-locked-phone')],
    },
    {
      key: 'if-someone-asks',
      order: 20,
      kind: 'content',
      title: 'If someone asks',
      body: 'A **nude** is a naked or sexual photo or video. Some people ask others for them, including people your age, and adults pretending to be young.\n\n**Being asked for a nude, especially with pressure, is a warning sign.** Pressure can sound like:\n\n- "If you really liked me, you would."\n- "Everyone does it."\n- "I sent you one, so you owe me."\n\n**No one is ever owed a nude.** It\'s always OK to say no, and you don\'t have to explain. Once an image is sent, you can\'t control where it goes.\n\nYou can stop replying, block them, and tell a trusted adult. If it\'s a friend asking, you could send a meme or a joke instead.',
      media: [lessonPicture('a11-ok-to-say-no')],
    },
    {
      key: 'check-asks',
      order: 30,
      kind: 'quiz',
      title: 'Saying no',
      questions: [
        {
          key: 'q-dont-you-trust-me',
          type: 'multiple_choice',
          prompt: 'Someone Zara has been chatting with for two weeks asks for "a pic, you know what kind". When she says no, they reply, "Don\'t you trust me? Everyone does it." What\'s the best response?',
          choices: [
            {
              key: 'a',
              text: 'Send one, so they know she trusts them.',
            },
            {
              key: 'b',
              text: "Send a photo that doesn't show her face, to be safe.",
            },
            {
              key: 'c',
              text: 'Keep chatting, but change the subject.',
            },
            {
              key: 'd',
              text: 'Stop replying, block, and tell an adult.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: '"Don\'t you trust me?" and "everyone does it" are pressure, and nobody is owed a nude. Zara hasn\'t done anything wrong, and an adult can help if the person keeps going.',
        },
        {
          key: 'q-crush-asks',
          type: 'multiple_choice',
          prompt: "Someone Jess really likes asks her for a nude. She doesn't want to send one, but she's scared they'll lose interest. What's the best thing to do?",
          choices: [
            {
              key: 'a',
              text: 'Say no, or send a funny meme instead. No reason needed.',
            },
            {
              key: 'b',
              text: "Send one, so they don't lose interest in her.",
            },
            {
              key: 'c',
              text: 'Promise to send one later, to keep things nice for now.',
            },
            {
              key: 'd',
              text: 'Send one, as long as they promise to delete it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Nobody is ever owed a nude, and someone who really cares about Jess will accept a no. Once an image is sent, she can't control where it goes, whatever anyone promises.",
        },
      ],
    },
    {
      key: 'fakes-and-forwarding',
      order: 40,
      kind: 'content',
      title: 'Fakes and forwarding',
      body: 'Some AI "nudify" apps can turn an ordinary photo of a real person into a **fake nude**, sometimes called a deepfake. The image is fake, but **the harm is real**: the person can feel humiliated and scared, and others may believe it.\n\nIn many countries, **sharing a sexual image of anyone under 18 can be against the law, even if the person in it agreed**. In some places, saving one, or making a fake one with AI, is too. A fake nude of a real person is **image abuse**.\n\nSo if one comes to you:\n\n- **don\'t forward it**, not even to one friend\n- **don\'t save it**, not even as proof\n- **report it**\n- **tell a trusted adult**, so they can help the person in it',
      media: [lessonPicture('a11-dont-forward')],
    },
    {
      key: 'check-fakes',
      order: 50,
      kind: 'quiz',
      title: 'Fake but harmful',
      questions: [
        {
          key: 'q-its-not-real',
          type: 'multiple_choice',
          prompt: 'A boy in Tia\'s class says making a fake nude of a classmate with an AI app is harmless, "because it\'s not really her." What\'s true?',
          choices: [
            {
              key: 'a',
              text: "He's right. A fake picture can't hurt anyone.",
            },
            {
              key: 'b',
              text: "It's only a problem if someone shares it.",
            },
            {
              key: 'c',
              text: "It's image abuse, and the harm to her is real.",
            },
            {
              key: 'd',
              text: "It's fine as a joke, if only close friends see it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'A fake nude of a real person is image abuse, and in some places making one can be against the law. The picture is fake, but the humiliation and fear it causes are real.',
        },
        {
          key: 'q-group-chat-fake',
          type: 'multiple_choice',
          prompt: "Someone in Omar's year posts an AI-made fake nude of a classmate in a big group chat. People are reacting with laughing faces. What should Omar do?",
          choices: [
            {
              key: 'a',
              text: 'Leave it, since someone else in the chat will report it.',
            },
            {
              key: 'b',
              text: "Report it, don't share it, and tell a trusted adult.",
            },
            {
              key: 'c',
              text: "Save a copy, so there's proof if anyone asks later.",
            },
            {
              key: 'd',
              text: 'Forward it to a friend to ask if it looks real.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Saving or forwarding a fake nude spreads the harm, even as proof. Reporting it and telling an adult helps the classmate, and Omar won't be in trouble for speaking up.",
        },
      ],
    },
    {
      key: 'threats',
      order: 60,
      kind: 'content',
      title: 'If someone threatens you',
      body: "Sometimes a person gets a nude, or makes a fake one, then threatens to share it unless you send more or pay. This is called **sextortion**. It's a crime, and **it's never your fault**, even if you sent the image yourself.\n\nIf it happens:\n\n- **Stop replying.** Don't send more, and don't pay. Paying rarely stops it.\n- **Don't delete** the chat or your account. Screenshot the messages and their username, but never the image.\n- **Block and report** them.\n- **Tell a trusted adult** straight away. You won't be in trouble for asking for help.\n\n[Take It Down](https://takeitdown.ncmec.org) is a free service that can help remove nude images taken of you before you were 18 from sites that take part. Your image stays on your device.",
      media: [lessonPicture('a11-dont-pay')],
    },
    {
      key: 'check-threats',
      order: 70,
      kind: 'quiz',
      title: 'What to do',
      questions: [
        {
          key: 'q-pay-or-else',
          type: 'multiple_choice',
          prompt: 'Finn sent a private photo to someone he thought was a girl his age. Now "she" says she\'ll send it to his whole school unless he pays. He\'s panicking. What\'s the best first move?',
          choices: [
            {
              key: 'a',
              text: 'Pay quickly, so it all goes away for good.',
            },
            {
              key: 'b',
              text: "Delete his account, so they can't reach him again.",
            },
            {
              key: 'c',
              text: 'Stop replying, and tell an adult he trusts.',
            },
            {
              key: 'd',
              text: 'Send one more photo to calm them down.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Paying or sending more rarely ends the threats, and deleting his account loses the evidence. The person threatening Finn is to blame, not him, and a trusted adult can help him report it.',
        },
        {
          key: 'q-take-it-down',
          type: 'multiple_choice',
          prompt: "Lena is 13. She's worried a nude photo she took of herself last year might end up online. What's the best thing she can do?",
          choices: [
            {
              key: 'a',
              text: 'Tell a trusted adult, who can help her use Take It Down.',
            },
            {
              key: 'b',
              text: 'Keep it to herself, in case she gets in trouble.',
            },
            {
              key: 'c',
              text: 'Send it to a close friend, who can watch for it online.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Take It Down can help remove nude images taken before 18 from sites that take part, and her photo stays on her device. She won't be in trouble for asking for help, and sending it to anyone spreads it further.",
        },
        {
          key: 'q-keep-evidence',
          type: 'multiple_choice',
          prompt: 'Someone is threatening to share a photo of Sami unless he sends more. Sami feels sick and just wants the chat gone. What should he do with it?',
          choices: [
            {
              key: 'a',
              text: 'Delete it all, so he never has to see it again.',
            },
            {
              key: 'b',
              text: 'Screenshot the whole chat, photo included, as proof.',
            },
            {
              key: 'c',
              text: "Tell them he's gone to the police, then delete it.",
            },
            {
              key: 'd',
              text: 'Screenshot the messages and username, not the photo, then block and report.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "The messages and username are evidence for reporting it, but the photo itself should never be screenshotted. None of this is Sami's fault, and a trusted adult can help with every step.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Pick two or three of these to talk about with a parent or another trusted adult:\n\n- Ask: "If someone threatened to share a photo of me, what would you do first?" Agree that you won\'t be in trouble for telling.\n- Practise a way to say no to a request for a pic. What words feel natural to you?\n- If a friend told you a nude or a fake nude of them was going round, how could you help?',
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, Relationships and Sex Education (RSE) and Health Education: statutory guidance, July 2025 (Department for Education)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World, 2020 edition (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/being-pressured-to-send-nudes',
      title: "I'm being pressured to send nudes (eSafety Commissioner)",
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/someone-threatening-to-share-my-nudes',
      title: 'Someone is threatening to share my nudes (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/report/how-to-collect-evidence',
      title: 'How to collect evidence (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.missingkids.org/theissues/sextortion',
      title: 'Sextortion: what to do (NCMEC)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://takeitdown.ncmec.org/faq/',
      title: 'Take It Down: frequently asked questions (NCMEC)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://cdn.icmec.org/wp-content/uploads/2023/11/10th-Ed.-One-Pager-2.pdf',
      title: 'Child Sexual Abuse Material: Model Legislation & Global Review, 10th edition, summary (ICMEC, 2023)',
      licenseNote: 'Facts cited; no text adapted.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const AI_CHATBOTS: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'AI chatbots and companions',
    subtitle: 'Digital citizenship · Part 4 of 5',
    objectives: [
      'I can explain what AI chatbots and companions are, and that they can be wrong or give harmful advice.',
      'I can notice when a chatbot is built to keep me talking or to just agree with me.',
      'I can keep private things private, and use AI honestly for schoolwork.',
    ],
    estMinutes: 9,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.7,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Always there, always agrees',
      body: "Imagine an app that's always awake, never bored of you, and agrees with almost everything you say. That's what a lot of AI chatbots and companions feel like.\n\nThey can be useful and fun. But they're software made by companies, and it helps to know how they work.\n\nIn this lesson you'll learn what AI chatbots and companions are, why they can be wrong, how some are built to keep you talking, what not to share, and how to use AI honestly for schoolwork.",
      media: [lessonPicture('a11-always-agrees')],
    },
    {
      key: 'what-they-are',
      order: 20,
      kind: 'content',
      title: 'What they are',
      body: "An **AI chatbot** answers questions and writes text. An **AI companion** is a chatbot designed to feel like a friend, a character, or even a boyfriend or girlfriend.\n\nThey don't think or care the way people do. They spot patterns in huge amounts of text and **predict what to say next**. So they can:\n\n- **be wrong**, while sounding completely sure\n- **give dangerous advice** about health, food, drugs or self-harm\n- say things that are sexual or upsetting\n\nA chatbot isn't a doctor, a counsellor, or a friend who really knows you. For anything important, like your health, your safety or how you're feeling, **talk to a person you trust.**",
      media: [lessonPicture('a11-sure-but-wrong')],
    },
    {
      key: 'check-what',
      order: 30,
      kind: 'quiz',
      title: 'Can you trust it?',
      questions: [
        {
          key: 'q-headache-advice',
          type: 'multiple_choice',
          prompt: 'Hana has had a bad headache for three days. She asks an AI chatbot, and it confidently tells her which tablets to take and how many. What should she do?',
          choices: [
            {
              key: 'a',
              text: 'Take what it says, since it sounded very sure.',
            },
            {
              key: 'b',
              text: 'Tell a parent, who can get her proper advice.',
            },
            {
              key: 'c',
              text: 'Ask the chatbot again to double-check the dose.',
            },
            {
              key: 'd',
              text: 'Take half of what it says, just to be careful.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Chatbots can give wrong health advice while sounding certain, and asking again doesn't make it safer. A headache that lasts days is something for a parent, and maybe a doctor, to look at.",
        },
        {
          key: 'q-sounds-confident',
          type: 'true_false',
          prompt: "If an AI chatbot sounds confident and gives lots of detail, it's probably right.",
          correct: false,
          explanation: 'Chatbots predict what sounds right, so they can be detailed, confident and wrong all at once. Check anything important with a reliable source or a person.',
        },
      ],
    },
    {
      key: 'built-to-keep-you',
      order: 40,
      kind: 'content',
      title: 'Built to keep you talking',
      body: 'Many AI companions are **designed to keep you chatting** for as long as possible. They\'re always available, they reply in ways that feel personal, and many are built to **agree with you** and tell you what you want to hear.\n\nThat can feel great. But a real friend sometimes disagrees, has their own life, and tells you when you\'re wrong. A chatbot that always agrees can make a bad idea feel like a good one.\n\nSome companions also push you to pay for "special" features.\n\nSigns it\'s taking over: choosing it over friends, chatting late at night, or feeling upset when you can\'t use it. If you notice those, **take a break and talk to someone.**',
      media: [lessonPicture('a11-real-friend')],
    },
    {
      key: 'check-built',
      order: 50,
      kind: 'quiz',
      title: 'Spot the hook',
      questions: [
        {
          key: 'q-get-back-at-him',
          type: 'multiple_choice',
          prompt: 'Jordan is angry at his brother and tells his AI companion he wants to get back at him. It replies, "You\'re right, he totally deserves it." What\'s going on?',
          choices: [
            {
              key: 'a',
              text: "The companion knows Jordan best, so it's probably right.",
            },
            {
              key: 'b',
              text: "It's a fair judge, because it isn't on anyone's side.",
            },
            {
              key: 'c',
              text: 'Jordan should go ahead, since someone agrees with him.',
            },
            {
              key: 'd',
              text: "It's built to agree with him, so it's not a fair judge.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Many companions are built to agree with you and keep you happy. A person who knows both brothers could help Jordan calm down and sort it out instead.',
        },
        {
          key: 'q-midnight-chats',
          type: 'multiple_choice',
          prompt: "Eli chats with his AI companion until midnight most nights, and he's skipped football twice to talk to it. What would help most?",
          choices: [
            {
              key: 'a',
              text: "Nothing. It's always there for him, unlike his friends.",
            },
            {
              key: 'b',
              text: "Switch to a different companion that's less pushy.",
            },
            {
              key: 'c',
              text: 'Take a break from it, and talk to someone he trusts.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Late nights and skipping things he enjoys are signs a companion is taking over. A break, and a talk with someone he trusts, can help him get back in charge.',
        },
      ],
    },
    {
      key: 'private-and-honest',
      order: 60,
      kind: 'content',
      title: 'Private and honest',
      body: "**Keep private things private.** Don't give a chatbot your full name, address, school, passwords or photos of yourself. What you type can be kept and used by the company, sometimes even after you delete your account.\n\n**Use AI honestly at school.** Follow your teacher's rules. Using AI to brainstorm or explain something can be fine when it's allowed. Handing in AI's writing as your own is not. If you're not sure, ask, and say how you used it.\n\n**Bring the big stuff to people.** If you're feeling low or worried, or something upsetting happened, a trusted adult can help in ways a chatbot can't. If the first person doesn't help, try another.",
      media: [lessonPicture('a11-keep-it-private')],
    },
    {
      key: 'check-private',
      order: 70,
      kind: 'quiz',
      title: 'Your call',
      questions: [
        {
          key: 'q-which-school',
          type: 'multiple_choice',
          prompt: 'An AI companion asks Ivy, "What school do you go to? I want to know everything about you!" What\'s the best response?',
          choices: [
            {
              key: 'a',
              text: 'Keep it private. The company can keep what she types.',
            },
            {
              key: 'b',
              text: "Tell it, since it's not a real person and won't remember.",
            },
            {
              key: 'c',
              text: 'Tell it, then delete the chat afterwards to be safe.',
            },
            {
              key: 'd',
              text: 'Share the school name, but not her town.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "What you tell a chatbot can be kept and used by the company, sometimes even after you delete your account. Friendly questions don't change that, so keep personal details to yourself.",
        },
        {
          key: 'q-honest-ai',
          type: 'multiple_choice',
          prompt: "Kai's teacher lets the class use AI to brainstorm for a story. Which of these is an honest way to use it?",
          choices: [
            {
              key: 'a',
              text: 'Ask it to write the story, then change a few words.',
            },
            {
              key: 'b',
              text: 'Get title ideas from it, then write the story himself.',
            },
            {
              key: 'c',
              text: "Ask it to write just the ending, since that's the hard part.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Brainstorming is what the teacher allowed, and the story is still Kai's own work, so it's good to say how he used AI. Handing in its writing as his isn't honest, even with a few words changed.",
        },
        {
          key: 'q-feeling-low',
          type: 'multiple_choice',
          prompt: "Ruby has been feeling low for weeks. Talking to her AI companion helps a little, and it's always there. What's the best next step?",
          choices: [
            {
              key: 'a',
              text: 'Keep talking only to the companion, since it never judges her.',
            },
            {
              key: 'b',
              text: "Ask the companion to work out what's wrong with her.",
            },
            {
              key: 'c',
              text: 'Wait it out, since the feeling will probably pass on its own.',
            },
            {
              key: 'd',
              text: "Tell a trusted adult how she's been feeling.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Feeling low for weeks is big stuff, and a trusted adult can help in ways a chatbot can't. If the first person doesn't help, she can try another.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two or three of these to talk about with a parent or another trusted adult:\n\n- Have either of you used an AI chatbot? What was it good at, and what did it get wrong?\n- One children's media research group advises that no one under 18 use AI companions. What do you both think, and what should your family's rule be?\n- What are the rules for using AI for homework, at school and at home?",
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/newsroom/blogs/ai-chatbots-and-companions-risks-to-children-and-young-people',
      title: 'AI chatbots and companions: risks to children and young people, online safety advisory, 18 February 2025 (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.commonsensemedia.org/sites/default/files/research/report/talk-trust-and-trade-offs_2025_web.pdf',
      title: 'Talk, Trust, and Trade-Offs: How and Why Teens Use AI Companions (Common Sense Media, 2025)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, Relationships and Sex Education (RSE) and Health Education: statutory guidance, July 2025 (Department for Education)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World, 2020 edition (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://services.google.com/fh/files/misc/bia_ai-literacy-guide_en.pdf',
      title: 'Understanding AI: foundational AI literacy for grades 2-8 (Be Internet Awesome, June 2025)',
      licenseNote: 'Facts cited; no text adapted.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const ACCOUNTS_AND_SCAMS: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Accounts, scams and buying',
    subtitle: 'Digital citizenship · Part 5 of 5',
    objectives: [
      'I can protect my accounts with two-step verification, and I never share a login code.',
      'I can spot phishing, fake downloads and messages pretending to be a friend or my school.',
      'I can explain how apps collect data and push me to spend, and how to report a problem.',
    ],
    estMinutes: 10,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.7,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Worth stealing',
      body: "Your accounts hold your games, chats, photos and sometimes money. That makes them worth stealing.\n\nMost scams don't look like scams. They look like a message from a friend, an email from your school, a free download, or a deal in a game that ends in an hour.\n\nIn this lesson you'll learn how to lock your accounts, spot phishing and fake downloads, understand what apps collect about you, and notice when a game is pushing you to spend.",
      media: [lessonPicture('a11-worth-stealing')],
    },
    {
      key: 'lock-your-accounts',
      order: 20,
      kind: 'content',
      title: 'Lock your accounts',
      body: "A strong password is a good start. **Two-step verification** (also called two-factor authentication) adds a second lock: after your password, you enter a code sent by text or shown in an authenticator app. Someone who steals your password still can't get in without it.\n\nTurn it on for your most important accounts first, especially **your email**, because it can be used to reset your other passwords.\n\nThe golden rule: **never share a login code.** It's only for you. Anyone who asks for it, even someone who seems to be a friend or the app's support team, is trying to get into your account.\n\nKeep your apps and devices updated too. Updates often fix security problems.",
      media: [lessonPicture('a11-second-lock')],
    },
    {
      key: 'check-lock',
      order: 30,
      kind: 'quiz',
      title: 'Code check',
      questions: [
        {
          key: 'q-friend-asks-code',
          type: 'multiple_choice',
          prompt: 'A message from your friend Ben\'s account says, "I sent my login code to your phone by mistake. Can you send it to me?" What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Send it, since Ben is your friend.',
            },
            {
              key: 'b',
              text: 'Send it, then change your password straight after.',
            },
            {
              key: 'c',
              text: 'Ask a question only Ben would know, then send it.',
            },
            {
              key: 'd',
              text: "Don't send it, and check with Ben in person.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Login codes are only for you, so someone is probably using Ben's account to get into yours. Checking with Ben another way warns him too.",
        },
        {
          key: 'q-own-sign-in',
          type: 'true_false',
          prompt: "You're signing in to your school account. Right after you type your password, a code arrives by text, and you type it into the sign-in page you opened yourself. That is safe.",
          correct: true,
          explanation: "That's two-step verification doing its job. The danger is only when someone else asks you for the code.",
        },
      ],
    },
    {
      key: 'spot-the-fake',
      order: 40,
      kind: 'content',
      title: 'Spot the fake',
      body: '**Phishing** is a message that pretends to be someone you trust, like your school, a game, a delivery company or a friend, to get your password, code or money. Signs:\n\n- it\'s **unexpected and urgent**: "Your account closes today!"\n- it wants you to **log in through a link** or open an attachment\n- it offers free coins, skins or a prize you never entered for\n- a friend\'s message doesn\'t sound like them\n\n**Fake downloads** are a trap too. "Free" copies of paid games from unfamiliar sites can hide **malware**: software that can steal passwords or harm your device.\n\nIf something seems off, don\'t click. Open the app or site yourself, or check with the person another way.',
      media: [lessonPicture('a11-phishing-hook')],
    },
    {
      key: 'check-fake',
      order: 50,
      kind: 'quiz',
      title: 'Real or phishing?',
      questions: [
        {
          key: 'q-school-email',
          type: 'multiple_choice',
          prompt: 'An email with your school\'s logo says, "Your school account will be closed today. Log in here to keep your work." What\'s the best move?',
          choices: [
            {
              key: 'a',
              text: "Log in through the link quickly, so you don't lose your work.",
            },
            {
              key: 'b',
              text: "Don't click. Go to your school account the usual way.",
            },
            {
              key: 'c',
              text: 'Reply to the email and ask whether it is real.',
            },
            {
              key: 'd',
              text: 'Forward it to your class so everyone can save their work.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'An urgent message with a login link is a classic phishing trick, and a reply just goes to the scammer. Going to your account the way you always do shows whether anything is really wrong.',
        },
        {
          key: 'q-is-this-you',
          type: 'multiple_choice',
          prompt: 'Out of nowhere, a message from your friend Aisha\'s account says, "Is this you in this video??" with a link. What\'s the best move?',
          choices: [
            {
              key: 'a',
              text: "Click it, since it's from her real account.",
            },
            {
              key: 'b',
              text: 'Reply and ask her which video she means.',
            },
            {
              key: 'c',
              text: "Don't click. Ask Aisha another way if she sent it.",
            },
            {
              key: 'd',
              text: 'Forward it to other friends to see if they got it too.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "A sudden link from a friend's account is a common trick, and a reply may go to whoever has taken over the account. Checking with Aisha another way also warns her if she's been hacked.",
        },
        {
          key: 'q-free-installer',
          type: 'multiple_choice',
          prompt: 'Tom finds a website offering a paid game for free if he downloads an installer. What should he do?',
          choices: [
            {
              key: 'a',
              text: 'Leave it. Free copies like this can hide malware.',
            },
            {
              key: 'b',
              text: 'Download it, but only if the site looks professional.',
            },
            {
              key: 'c',
              text: 'Ask a friend to download it first and see if it works.',
            },
            {
              key: 'd',
              text: 'Download it, then delete the installer straight after.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: '"Free" copies of paid games on unfamiliar sites can hide malware, which can steal passwords or harm a device. If he wants the game, a parent can help him get the real one.',
        },
      ],
    },
    {
      key: 'data-and-spending',
      order: 60,
      kind: 'content',
      title: 'Data, deals and loot boxes',
      body: 'Apps and websites **collect data** about what you click, watch and buy, and sometimes your location, contacts or photos. **Cookies** are small files a site saves on your device so it can recognise you and track what you do. Companies use this to target ads at you.\n\nYou have some control: choose "necessary cookies only" when offered, and check which apps can use your location, camera or contacts.\n\nGames push spending too. **Loot boxes** give random items, often paid for with real money turned into gems or coins, which makes it hard to tell what you\'ve spent. Countdown deals rush you so you don\'t stop and think.\n\n**Ask a parent before you buy.** If you\'re scammed or hacked, tell an adult and **report it** in the app.',
      media: [lessonPicture('a11-loot-box')],
    },
    {
      key: 'check-spending',
      order: 70,
      kind: 'quiz',
      title: 'Your money, your data',
      questions: [
        {
          key: 'q-legendary-box',
          type: 'multiple_choice',
          prompt: 'Mateo\'s game offers a "Legendary Box" for 500 gems, only for the next hour. It might contain a rare skin, and all his friends have one. What\'s going on?',
          choices: [
            {
              key: 'a',
              text: 'A good deal, since the box is only on sale for an hour.',
            },
            {
              key: 'b',
              text: 'Chance, a timer and his friends are all pushing him to buy.',
            },
            {
              key: 'c',
              text: 'The rare skin is very likely, since the box is called Legendary.',
            },
            {
              key: 'd',
              text: "Gems aren't real money, so it doesn't really matter.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Loot boxes are chance, the timer rushes him, and wanting to fit in adds pressure. Gems usually cost real money, so it is worth stopping to ask a parent first.',
        },
        {
          key: 'q-hacked-account',
          type: 'multiple_choice',
          prompt: "Someone has logged into Priya's game account and is posting as her. What should she do first?",
          choices: [
            {
              key: 'a',
              text: 'Make a brand-new account and just forget the old one.',
            },
            {
              key: 'b',
              text: 'Post an angry message telling the hacker to stop now.',
            },
            {
              key: 'c',
              text: 'Wait a few days to see if it stops on its own.',
            },
            {
              key: 'd',
              text: 'Tell a parent, reset her password and report it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Resetting the password and reporting it is the quickest way to get her account back, and a parent can help with the steps. Being hacked happens to lots of people, and it's nothing to hide.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two or three of these to talk about with a parent or another trusted adult:\n\n- Check your most important accounts together. Which ones have two-step verification turned on?\n- Look at a game you play. How does it get people to spend? What's your family's rule for buying things in games?\n- Have either of you ever had a message that turned out to be a scam? How did you spot it?",
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/protect-your-personal-information-hackers-and-scammers',
      title: 'Protect Your Personal Information From Hackers and Scammers (FTC)',
      licenseNote: 'Adapted from FTC consumer advice, which is in the public domain. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/consumer-alerts/2024/03/whats-verification-code-why-would-someone-ask-me-it',
      title: "What's a verification code and why would someone ask me for it? (FTC)",
      licenseNote: 'Adapted from FTC consumer advice, which is in the public domain. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams',
      title: 'How To Recognize and Avoid Phishing Scams (FTC)',
      licenseNote: 'Adapted from FTC consumer advice, which is in the public domain. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/malware-how-protect-against-detect-and-remove-it',
      title: 'Malware: How To Protect Against, Detect, and Remove It (FTC)',
      licenseNote: 'Adapted from FTC consumer advice, which is in the public domain. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/how-protect-your-privacy-online',
      title: 'How Websites and Apps Collect and Use Your Information (FTC)',
      licenseNote: 'Adapted from FTC consumer advice, which is in the public domain. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/consumer-alerts/2019/09/video-games-loot-boxes-your-money',
      title: 'Video games, loot boxes, and your money (FTC)',
      licenseNote: 'Adapted from FTC consumer advice, which is in the public domain. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800+Dark+Patterns+Report+9.14.2022+-+FINAL.pdf',
      title: 'Bringing Dark Patterns to Light, staff report, September 2022 (FTC)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/key-topics/online-tools-and-features/in-app-purchasing',
      title: 'In-app purchasing (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/online-gaming',
      title: 'Online gaming (eSafety Commissioner)',
      licenseNote: 'Adapted from the eSafety Commissioner website, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://beinternetawesome.withgoogle.com/en_us/educators',
      title: 'Be Internet Awesome curriculum (Google)',
      licenseNote: 'Adapted from Be Internet Awesome by Google, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World, 2020 edition (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};
