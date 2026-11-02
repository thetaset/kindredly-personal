import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 8–10, lesson 1 of 5 (HAT-534). Adapted from Be Internet Awesome (Google,
// CC BY 4.0) with outcomes from UKCIS Education for a Connected World (OGL v3). Never change a step or
// question key once shipped: a child's progress and answers are saved against them.
export const KEEP_PRIVATE: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'What to keep private',
    subtitle: 'Digital citizenship · Part 1 of 5',
    objectives: [
      'I can name the things about me that are private online.',
      'I can explain why a post can last a long time and reach lots of people.',
      'I can ask first before I share a photo of someone, or something they told me.',
    ],
    estMinutes: 8,
    gradeBand: 'elementary',
    subject: 'Digital citizenship',
    tone: 'warm, calm, practical',
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
      title: 'What should you share?',
      body: 'Maya is setting up a new game on her tablet. She picks a player name, and soon she\'s chatting with other players. Then someone asks, "What school do you go to?"\n\nWhat should Maya share, and what should she keep to herself?\n\nIn this lesson you\'ll learn which things about you are private, why posts can last a long time, and how to be fair to other people when you share.',
      media: [lessonPicture('locked-box')],
    },
    {
      key: 'what-is-private',
      order: 20,
      kind: 'content',
      title: 'What is private?',
      body: "Some things about you are **private information**. They could help someone find you in real life, or get into your accounts. Keep them to yourself online, unless a parent says it's OK.\n\n- Your full name together with your school\n- Your home address or phone number\n- Your birthday\n- Your passwords\n- Where you are right now\n\nLots of things are fine to share, like what you built in a game, a joke, or the animal you like best.\n\nA made-up player name is a smart choice. It lets you play without telling people who you are.",
      media: [lessonPicture('a8-private-info')],
    },
    {
      key: 'check-private',
      order: 30,
      kind: 'quiz',
      title: 'Private or fine to share?',
      questions: [
        {
          key: 'q-game-chat',
          type: 'multiple_choice',
          prompt: "You're chatting with other players in a game. Which of these is fine to type?",
          choices: [
            {
              key: 'a',
              text: '"I go to Hillside School."',
            },
            {
              key: 'b',
              text: '"My birthday is on the 4th of May."',
            },
            {
              key: 'c',
              text: '"Good game! Want to team up next round?"',
            },
            {
              key: 'd',
              text: '"I\'m at the park by my house right now."',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Chatting about the game is great. Your school, your birthday and where you are right now are private, because they can help someone find you.',
        },
        {
          key: 'q-grandma-play',
          type: 'multiple_choice',
          prompt: 'Your grandma writes in your family\'s group chat: "What time is your school play on Friday? I\'d love to come!" What do you do?',
          choices: [
            {
              key: 'a',
              text: "Tell her the time. It's your family's own chat.",
            },
            {
              key: 'b',
              text: "Don't answer. Times and places are private.",
            },
            {
              key: 'c',
              text: "Tell her you can't say, because it's private.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "It's fine to share with family you trust, in your family's own chat. Keeping things private is about people you don't know, and posts lots of people can see.",
        },
        {
          key: 'q-school-question',
          type: 'multiple_choice',
          prompt: 'A friendly player in your game asks, "What school do you go to?" What do you do?',
          choices: [
            {
              key: 'a',
              text: "Tell them. They've been really friendly.",
            },
            {
              key: 'b',
              text: 'Say you keep that private, and keep playing.',
            },
            {
              key: 'c',
              text: 'Tell them, but only in a private message.',
            },
            {
              key: 'd',
              text: 'Ask which school they go to first.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Your school could help someone find you in real life, however friendly they seem. You can keep it to yourself and still enjoy the game.',
        },
      ],
    },
    {
      key: 'posts-last',
      order: 40,
      kind: 'content',
      title: 'Posts can last and spread',
      body: "When you say something out loud, it's over in a moment. A post online can stay around for a long time.\n\n- People can copy it, take a screenshot, or send it to others.\n- It can reach people you'll never meet.\n- Even if you delete it, someone may already have a copy.\n\nSo **think before you post**. Ask yourself: Would I be happy for my teacher, my grandparents, or me in five years to see this?\n\nIf you post something and then feel unsure, delete it and tell a grown-up. It's never too late to ask for help.",
      media: [lessonPicture('a8-posts-spread')],
    },
    {
      key: 'check-posts',
      order: 50,
      kind: 'quiz',
      title: 'Before you post',
      questions: [
        {
          key: 'q-feel-unsure',
          type: 'multiple_choice',
          prompt: "You post a silly video of yourself, then start to feel unsure about it. What's the best thing to do?",
          choices: [
            {
              key: 'a',
              text: "Leave it up. Deleting can't undo copies anyway.",
            },
            {
              key: 'b',
              text: 'Delete it, and tell a grown-up.',
            },
            {
              key: 'c',
              text: 'Delete it fast. Then nobody will ever know.',
            },
            {
              key: 'd',
              text: 'Post more videos, so it moves down the page.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Deleting is a good start, but someone may already have a copy. A grown-up can help with what to do next, and it's never too late to ask.",
        },
        {
          key: 'q-art-post',
          type: 'multiple_choice',
          prompt: "Priya's parent lets her post drawings on a page anyone can see. Which of these is fine for her to post?",
          choices: [
            {
              key: 'a',
              text: 'Her drawing, signed with her full name and school',
            },
            {
              key: 'b',
              text: 'A photo of her new bike by her front door, with the house number showing',
            },
            {
              key: 'c',
              text: "A selfie in her school uniform, with the school's name on it",
            },
            {
              key: 'd',
              text: 'Her drawing of a dragon, signed with her player name',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'A drawing with a made-up name shows off her art without showing who she is. Her full name, her school and her house number are private, and anyone can see that page.',
        },
      ],
    },
    {
      key: 'ask-first',
      order: 60,
      kind: 'content',
      title: 'Ask first, set it up together',
      body: "Other people have privacy too. Before you post a photo of someone, or share something they told you, **ask them first**. If they say no, that's their choice, even if you think it's funny.\n\nApps and games have **privacy settings**. They let you choose who can see what you post and who can send you messages. Go through them **with a parent** when you start something new. Your family can decide together what's right for you.\n\nIt's a good idea to check them again now and then, because apps sometimes change.",
      media: [lessonPicture('a8-ask-first')],
    },
    {
      key: 'check-ask-first',
      order: 70,
      kind: 'quiz',
      title: 'Your turn',
      questions: [
        {
          key: 'q-silly-photo',
          type: 'multiple_choice',
          prompt: 'You took a funny photo of your friend Leo pulling a silly face. Before you send it to the class chat, what do you do?',
          choices: [
            {
              key: 'a',
              text: "Ask Leo if he's OK with you sharing it.",
            },
            {
              key: 'b',
              text: "Send it with a laughing face, so everyone knows it's a joke.",
            },
            {
              key: 'c',
              text: "Send it. Leo is your friend, so he won't mind.",
            },
            {
              key: 'd',
              text: 'Send it, and delete it later if he gets upset.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "It's Leo's face, so it's Leo's choice. Once a photo is in a group chat, people can save it and pass it on, so deleting it later may be too late.",
        },
        {
          key: 'q-settings',
          type: 'multiple_choice',
          prompt: 'A new reading app asks, "Who can see your book reviews? Everyone, Only friends, or Only me?" How should you choose?',
          choices: [
            {
              key: 'a',
              text: 'Pick Everyone, so more people read your reviews.',
            },
            {
              key: 'b',
              text: 'Skip it and let the app choose for you.',
            },
            {
              key: 'c',
              text: 'Choose together with your parent.',
            },
            {
              key: 'd',
              text: 'Ask other kids in the app what they picked.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Settings decide who can see what you share, and every family has its own rules. Choosing together means you both know how it's set up.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Talking about this at home helps it stick. Pick two of these to try with your parent or another grown-up:\n\n- Ask your grown-up: What do you keep private online, and why?\n- Open the settings in an app or game you use, together. Who can see your posts? Who can send you messages?\n- Ask your grown-up: Have you ever posted something and then wished you hadn't?",
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://beinternetawesome.withgoogle.com/en_us/educators',
      title: 'Be Internet Awesome curriculum (Google)',
      licenseNote: 'Adapted from Be Internet Awesome by Google, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};
