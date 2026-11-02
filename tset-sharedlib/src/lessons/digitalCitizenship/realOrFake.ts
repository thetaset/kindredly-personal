import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 8–10, lesson 2 of 5 (HAT-534). Adapted from Be Internet Awesome (Google,
// CC BY 4.0) with outcomes from UKCIS Education for a Connected World (OGL v3). Never change a step or
// question key once shipped: a child's progress and answers are saved against them.
export const REAL_OR_FAKE: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Real or fake?',
    subtitle: 'Digital citizenship · Part 2 of 5',
    objectives: [
      'I can spot the signs of a trick, like a prize I never entered for.',
      'I can check another way when a message from someone I know seems odd.',
      'I can explain that AI can make pictures and voices, and that AI helpers can be wrong.',
    ],
    estMinutes: 9,
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
      title: 'Real or a trick?',
      body: 'Two messages arrive on your tablet.\n\nOne pops up in your game: **"You won 10,000 free coins! Tap here in the next 2 minutes!"**\n\nThe other is from your grandma in your family chat: "Lovely drawing! See you on Sunday."\n\nOne of these is a trick. The other is just Grandma.\n\nIn this lesson you\'ll learn how to spot tricks, how to check who you\'re really talking to, and what to know about ads and AI. You\'ll also see that most messages are perfectly fine.',
      media: [lessonPicture('checking-the-news')],
    },
    {
      key: 'spot-a-trick',
      order: 20,
      kind: 'content',
      title: 'Spot a trick',
      body: 'Some people online try to trick you into giving them your password, your account or money. This is called a **scam**. Signs to look for:\n\n- **Too good to be true:** free coins, free skins, or a prize you never entered for.\n- **Hurry!** "Only 2 minutes left!" Tricks rush you so you don\'t stop and think.\n- **A link that asks you to sign in.** A fake sign-in page can look just like the real one.\n\n**The safe move:** don\'t tap. Close it and tell a grown-up. If you want to check your account, open the app or game yourself, the way you always do.',
      media: [lessonPicture('a8-spot-a-trick')],
    },
    {
      key: 'check-tricks',
      order: 30,
      kind: 'quiz',
      title: 'Trick or not?',
      questions: [
        {
          key: 'q-prize',
          type: 'multiple_choice',
          prompt: 'A pop-up says: "You won a new tablet! Type your address to get it." You never entered a contest. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Type just your street, not your house number.',
            },
            {
              key: 'b',
              text: 'Close it and tell a grown-up.',
            },
            {
              key: 'c',
              text: "Reply and ask if it's really true.",
            },
            {
              key: 'd',
              text: 'Type your address fast, before someone else wins it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'A prize you never entered for is a sign of a trick, and your address is private. Replying tells the sender someone is there, so closing it is the safest move.',
        },
        {
          key: 'q-sign-in-link',
          type: 'multiple_choice',
          prompt: 'A message says your school account is locked. Its link opens a sign-in page that looks real. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Sign in there. It looks exactly like the real page.',
            },
            {
              key: 'b',
              text: "Reply to the message and ask if it's real.",
            },
            {
              key: 'c',
              text: 'Sign in fast, before your account stays locked.',
            },
            {
              key: 'd',
              text: 'Close it. Check your account the way you always do.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'A fake sign-in page can look just like the real one, and "locked" is there to rush you. Opening your account the usual way, or asking a grown-up, shows if anything is really wrong.',
        },
        {
          key: 'q-game-update',
          type: 'multiple_choice',
          prompt: 'Your parent says game updates are OK. In your game\'s own settings, you see "Update available: 3 new levels." What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Tap Update. You found it yourself, inside the real game.',
            },
            {
              key: 'b',
              text: "Don't update. Messages about new things are always tricks.",
            },
            {
              key: 'c',
              text: 'Search online for a free download of the new levels.',
            },
            {
              key: 'd',
              text: 'Wait for a message with a link to the update.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'This one is fine. You opened the game yourself and found the update in its own settings, so nobody is rushing you or tricking you.',
        },
      ],
    },
    {
      key: 'who-is-there',
      order: 40,
      kind: 'content',
      title: 'Who is really there?',
      body: "Online, you can't see faces or hear voices, so people can **pretend to be someone else**. It could be another kid, a famous player, or even someone using your friend's account.\n\nClues that something is off:\n\n- A friend suddenly writes in a way that doesn't sound like them.\n- They ask for your password, a code, or money.\n- They ask you to keep it a secret.\n\nWhen something feels odd, **check another way**. Ask your friend at school, or call them with a parent.\n\nMost messages from people you know are normal. You only need to check the odd ones.",
      media: [lessonPicture('a8-check-another-way')],
    },
    {
      key: 'check-who',
      order: 50,
      kind: 'quiz',
      title: 'Who sent it?',
      questions: [
        {
          key: 'q-friend-password',
          type: 'multiple_choice',
          prompt: 'Your friend Kai\'s account sends: "hey send me ur password quick". Kai never writes like that. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Send it. Kai is your friend.',
            },
            {
              key: 'b',
              text: 'Ask a question only Kai would know, then send it.',
            },
            {
              key: 'c',
              text: "Don't send it, and ask Kai at school.",
            },
            {
              key: 'd',
              text: 'Send it, then change your password later.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "It doesn't sound like Kai, and it asks for your password, so someone else might be using his account. Asking him at school is the best way to find out.",
        },
        {
          key: 'q-grandma-chat',
          type: 'multiple_choice',
          prompt: 'In your family chat, Grandma posts a photo of her cat and asks, "How was swimming today?" What do you do?',
          choices: [
            {
              key: 'a',
              text: "Wait until a parent checks it's really her.",
            },
            {
              key: 'b',
              text: 'Reply and tell her about swimming.',
            },
            {
              key: 'c',
              text: 'Ask her to prove who she is.',
            },
            {
              key: 'd',
              text: 'Block her account, just in case.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "This is a normal message in a chat you know, and it sounds like Grandma. She isn't asking for passwords, money or secrets, so go ahead and reply.",
        },
      ],
    },
    {
      key: 'ads-and-ai',
      order: 60,
      kind: 'content',
      title: 'Ads and AI',
      body: "**Ads** are made to get you to buy something or tap on it. In a game or video app, an ad can look like part of the game. Look for words like **Ad** or **Sponsored**. You don't have to tap.\n\n**AI** is computer software that can write, make pictures and copy voices. It can make a picture of something that never happened, or a voice that sounds like a real person.\n\n**AI helpers** that answer questions can be useful, but they can be wrong. They guess what sounds right. When an answer matters, check it in a book or with a grown-up.",
      media: [lessonPicture('a8-ads-and-ai')],
    },
    {
      key: 'check-ads-ai',
      order: 70,
      kind: 'quiz',
      title: 'Spot the ad, check the AI',
      questions: [
        {
          key: 'q-free-gems-ad',
          type: 'multiple_choice',
          prompt: 'In your game, a shiny "Free gems!" button pops up. It has a tiny "Ad" label in the corner. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Tap it. Free gems are a reward for playing well.',
            },
            {
              key: 'b',
              text: 'Tap it fast, before the offer disappears.',
            },
            {
              key: 'c',
              text: "Keep playing. You don't have to tap an ad.",
            },
            {
              key: 'd',
              text: "Tap it. It's inside your game, so it's part of the game.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "The Ad label means it's there to get you to tap or buy, even though it looks like part of the game. You can just keep playing.",
        },
        {
          key: 'q-ai-owls',
          type: 'multiple_choice',
          prompt: 'For a school project, an AI helper tells you owls can turn their heads all the way around. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Check it in a book or with your teacher.',
            },
            {
              key: 'b',
              text: 'Write it down. It sounded very sure.',
            },
            {
              key: 'c',
              text: "Ask the AI helper again. If it says it twice, it's true.",
            },
            {
              key: 'd',
              text: 'Leave owls out of your project.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "AI helpers can sound sure and still be wrong, and asking again doesn't prove anything. Owls can turn their heads a long way, but not all the way around.",
        },
        {
          key: 'q-video-ai',
          type: 'multiple_choice',
          prompt: 'A video shows a famous singer saying, "Share this and get free coins!" It looks and sounds just like her. What do you think?',
          choices: [
            {
              key: 'a',
              text: "It's real. You can see and hear her say it.",
            },
            {
              key: 'b',
              text: 'It could be made with AI. Check before you believe or share it.',
            },
            {
              key: 'c',
              text: "Share it, just in case it's real.",
            },
            {
              key: 'd',
              text: "It's real if lots of people have shared it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'AI can make a video look and sound like a real person. An offer of free coins is a sign of a trick too, so check with a grown-up before you believe it or share it.',
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Pick two of these to talk about with your parent or another grown-up at home:\n\n- Ask your grown-up: Have you ever had a message that was a trick? How did you know?\n- Next time you see an ad together, point it out. What does it want you to do?\n- Ask your grown-up: When you want to know if something online is true, how do you check?',
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
