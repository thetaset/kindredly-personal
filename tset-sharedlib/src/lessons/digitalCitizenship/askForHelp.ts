import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 8–10, lesson 5 of 5 (HAT-534). Adapted from Be Internet Awesome (Google,
// CC BY 4.0) with outcomes from UKCIS Education for a Connected World (OGL v3). Never change a step or
// question key once shipped: a child's progress and answers are saved against them.
export const ASK_FOR_HELP: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Asking for help',
    subtitle: 'Digital citizenship · Part 5 of 5',
    objectives: [
      'I can tell when something online is a reason to get help.',
      "I can name grown-ups I trust, and say what I'd tell them.",
      "I can ask for help, knowing I won't be in trouble for asking.",
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
      title: "You're not on your own",
      body: "Sometimes something online doesn't feel right. A video that's scary. A message that's confusing. A chat that gives you a funny feeling inside.\n\nThat happens to everyone, grown-ups too. It isn't your fault, and you don't have to handle it on your own.\n\nIn this lesson you'll learn when to get help, who to go to, and exactly what to say.",
      media: [lessonPicture('telling-a-grown-up')],
    },
    {
      key: 'when-to-ask',
      order: 20,
      kind: 'content',
      title: 'When to get help',
      body: "Ask a grown-up for help whenever something online makes you feel:\n\n- **upset or sad**\n- **scared or worried**\n- **confused**, like you don't know what to do\n- **uncomfortable**, or like something isn't right\n\nThat includes things that happen to you, things you see happening to someone else, and mistakes you made, like tapping a trick link or sharing something you wish you hadn't.\n\nYou don't need to be sure it's serious. **If you're wondering whether to tell, that means it's a good time to tell.**",
      media: [lessonPicture('a8-wondering-tell')],
    },
    {
      key: 'check-when',
      order: 30,
      kind: 'quiz',
      title: 'Time to ask?',
      questions: [
        {
          key: 'q-someone-else',
          type: 'multiple_choice',
          prompt: "Kids in your class chat keep sending mean messages about Mina. It isn't about you. Should you tell a grown-up?",
          choices: [
            {
              key: 'a',
              text: 'No. Mina can tell a grown-up herself.',
            },
            {
              key: 'b',
              text: 'Only if Mina asks you to.',
            },
            {
              key: 'c',
              text: 'Yes. Seeing it happen to someone else counts too.',
            },
            {
              key: 'd',
              text: "No. It isn't happening to you.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Things you see happening to someone else are a good reason to get help too. A grown-up can help Mina, even if she hasn't told anyone yet.",
        },
        {
          key: 'q-only-serious',
          type: 'true_false',
          prompt: 'You should only tell a grown-up if something really serious happens online.',
          correct: false,
          explanation: 'Small worries count too. Grown-ups would much rather hear about something early, and talking about it often helps you feel better.',
        },
      ],
    },
    {
      key: 'trusted-grown-ups',
      order: 40,
      kind: 'content',
      title: 'Your trusted grown-ups',
      body: "A trusted grown-up is an adult who listens, cares about you, and helps you stay safe. It could be:\n\n- a parent, or the person who looks after you\n- a grandparent, aunt or uncle\n- a teacher or someone else at school\n\n**Think of at least two**, in case one isn't around. If the first person doesn't help, tell another one. Keep telling until someone helps.\n\n**You won't be in trouble for asking for help.** Even if you tapped something you shouldn't have, telling is the right thing to do. Your grown-ups would much rather know.",
      media: [lessonPicture('a8-two-grown-ups')],
    },
    {
      key: 'check-who-to-tell',
      order: 50,
      kind: 'quiz',
      title: 'Who to tell',
      questions: [
        {
          key: 'q-busy-parent',
          type: 'multiple_choice',
          prompt: 'You try to tell your parent about a mean message, but they\'re busy cooking and say "mm-hmm" without really listening. What could you do?',
          choices: [
            {
              key: 'a',
              text: 'Say "This is important", or tell another grown-up.',
            },
            {
              key: 'b',
              text: "Leave it. They're busy, so it can wait.",
            },
            {
              key: 'c',
              text: 'Reply to the mean message yourself, to sort it out.',
            },
            {
              key: 'd',
              text: 'Tell a friend in your game instead.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Grown-ups are sometimes busy. Telling them it's important, or going to another trusted grown-up, means you still get help.",
        },
        {
          key: 'q-tapped-link',
          type: 'multiple_choice',
          prompt: 'Amir tapped a "free coins" link and typed in his password. Now he\'s worried he\'ll be in trouble. What should he do?',
          choices: [
            {
              key: 'a',
              text: 'Change his password himself and not tell anyone.',
            },
            {
              key: 'b',
              text: 'Keep quiet and hope nothing happens.',
            },
            {
              key: 'c',
              text: 'Delete the game so nobody finds out.',
            },
            {
              key: 'd',
              text: 'Tell a parent now, so they can help him fix it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Lots of people fall for tricks, even grown-ups. Telling a parent quickly means they can help change the password and keep his account safe.',
        },
      ],
    },
    {
      key: 'what-to-say',
      order: 60,
      kind: 'content',
      title: 'What to say',
      body: 'It can be hard to start, so here are some words you can use:\n\n- "Can I show you something? It made me feel weird."\n- "I got a message and I don\'t know what to do."\n- "I think I made a mistake online. Can you help me fix it?"\n- "Someone is being mean to my friend in a chat."\n\nWhen something online upsets you, remember three steps: **don\'t reply, leave, tell.** Don\'t answer. Close the app or step away from the screen. Then tell a grown-up you trust.\n\nDon\'t send it on to anyone else. Just show the grown-up.',
      media: [lessonPicture('a8-dont-reply-leave-tell')],
    },
    {
      key: 'check-what-to-say',
      order: 70,
      kind: 'quiz',
      title: 'Your turn to ask',
      questions: [
        {
          key: 'q-scary-clip',
          type: 'multiple_choice',
          prompt: "You're watching cartoons in a video app when a clip comes on that's really scary. What's the best thing to do?",
          choices: [
            {
              key: 'a',
              text: 'Turn it off and try to forget about it.',
            },
            {
              key: 'b',
              text: 'Close it, and tell a grown-up what you saw.',
            },
            {
              key: 'c',
              text: 'Keep watching to see how it ends.',
            },
            {
              key: 'd',
              text: "Send it to a friend to see if they think it's scary.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Turning it off is a great start. Telling a grown-up helps too: they can help you feel better and make it less likely to show up again.',
        },
        {
          key: 'q-good-words',
          type: 'multiple_choice',
          prompt: "Zara got a message in a game that made her feel uncomfortable. She goes to find her grandma. What's the best way to start?",
          choices: [
            {
              key: 'a',
              text: '"Never mind, it\'s nothing."',
            },
            {
              key: 'b',
              text: '"Everyone gets messages like this, so it\'s fine."',
            },
            {
              key: 'c',
              text: '"Can I show you a message I got? It made me feel uncomfortable."',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Saying what happened, and showing her, lets Grandma help. Brushing it off means she can't, even though she'd want to.",
        },
        {
          key: 'q-rude-message',
          type: 'multiple_choice',
          prompt: 'A player in a game chat sends you something rude that upsets you. What do you do?',
          choices: [
            {
              key: 'a',
              text: "Don't reply, leave the game, and tell a grown-up.",
            },
            {
              key: 'b',
              text: 'Reply and tell them to stop being rude.',
            },
            {
              key: 'c',
              text: 'Send it to a friend to ask what they think.',
            },
            {
              key: 'd',
              text: 'Keep playing and try to ignore it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'Not replying keeps you out of it, leaving gets it off your screen, and telling means you get help. Sending it on spreads it, so just show a grown-up.',
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Talking about this before anything happens makes it easier later. Pick two to try with your parent or another grown-up at home:\n\n- Ask your grown-up: "If I tell you about something online, will you promise I won\'t be in trouble for telling?"\n- Together, name your trusted grown-ups: at least two at home and one at school.\n- Try it out: pretend something online upset you, and say one of the sentences from this lesson out loud.',
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
