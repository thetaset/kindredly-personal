import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 8–10, lesson 3 of 5 (HAT-534). Adapted from Be Internet Awesome (Google,
// CC BY 4.0) with outcomes from UKCIS Education for a Connected World (OGL v3). Never change a step or
// question key once shipped: a child's progress and answers are saved against them.
export const STRONG_PASSWORDS: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Strong passwords',
    subtitle: 'Digital citizenship · Part 3 of 5',
    objectives: [
      "I can make a long password that's easy for me to remember and hard for others to guess.",
      'I can keep my passwords private and share them only with my parent.',
      'I can sign out on shared devices, and ask before I buy anything in a game or app.',
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
      title: 'Your secret key',
      body: 'Ben\'s big sister knew his game password. As a joke, she changed his character\'s name to "Sir Stinky". Ben thought it was funny, sort of.\n\nA password is like the key to your front door. Anyone who has it can get in, and can act as if they\'re you.\n\nIn this lesson you\'ll learn how to make a strong password, who to share it with, and how to keep your accounts safe, including before you buy anything.',
      media: [lessonPicture('lock-and-key')],
    },
    {
      key: 'make-it-strong',
      order: 20,
      kind: 'content',
      title: 'Make it strong',
      body: "A strong password is **long and hard to guess**, but easy for you to remember.\n\nA great way is a **passphrase**: three or four random words joined together, plus a number or a symbol. For example: **cloud-pickle-trumpet-7**. (Make up your own. Don't use this one!)\n\nWeak passwords are short or easy to guess:\n\n- your name, or your pet's name\n- your birthday\n- 123456, or the word password\n\nPeople who know you could guess these quickly. Random words are much harder to guess.",
      media: [lessonPicture('a8-strong-password')],
    },
    {
      key: 'check-strong',
      order: 30,
      kind: 'quiz',
      title: 'Strong or weak?',
      questions: [
        {
          key: 'q-strongest',
          type: 'multiple_choice',
          prompt: 'Which of these passwords is the strongest?',
          choices: [
            {
              key: 'a',
              text: 'Buddy2016',
            },
            {
              key: 'b',
              text: 'MaxJonesHillsideSchool',
            },
            {
              key: 'c',
              text: 'lamp-river-giraffe-58',
            },
            {
              key: 'd',
              text: 'Password123!',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Random words with a number are long and hard to guess. The others use a pet's name, a real name and school, or the word password, which people can guess.",
        },
        {
          key: 'q-pet-birthday',
          type: 'multiple_choice',
          prompt: 'Your friend says: "Just use your dog\'s name and your birthday as your password. Then you\'ll never forget it!" What do you think?',
          choices: [
            {
              key: 'a',
              text: 'Not great. People who know you could guess it.',
            },
            {
              key: 'b',
              text: 'Good idea. Being easy to remember is what matters.',
            },
            {
              key: 'c',
              text: 'Fine, as long as you add a capital letter.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "People who know you might know your dog's name and your birthday too, and a capital letter doesn't change that. Random words are easy to remember and much harder to guess.",
        },
      ],
    },
    {
      key: 'keep-it-secret',
      order: 40,
      kind: 'content',
      title: 'Keep it to yourself',
      body: '**Share your passwords only with your parent**, or the grown-up who looks after you. Not with friends, not even your best friend. Anyone with your password can post, chat or buy things as you.\n\nMore ways to keep your accounts safe:\n\n- **Use a different password** for each important account. If one gets out, the others stay safe.\n- **Sign out** when you finish on a shared or school computer.\n- **Lock your screen** with a code, so nobody can use your tablet or phone without you.\n\nIf you think someone knows your password, tell your parent and change it together.',
      media: [lessonPicture('a8-share-with-parent')],
    },
    {
      key: 'check-secret',
      order: 50,
      kind: 'quiz',
      title: 'Keep it safe',
      questions: [
        {
          key: 'q-best-friend',
          type: 'multiple_choice',
          prompt: "Your best friend Ava wants to play on your game account while you're at swimming. She asks for your password. What do you do?",
          choices: [
            {
              key: 'a',
              text: 'Give it to her, but make her promise to keep it secret.',
            },
            {
              key: 'b',
              text: 'Say no kindly, and play together when you get back.',
            },
            {
              key: 'c',
              text: "Give it to her. She's your best friend and you trust her.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Even good friends can make mistakes or fall out. Keeping your password to yourself keeps your account yours, and you can still have fun together.',
        },
        {
          key: 'q-parent-asks',
          type: 'multiple_choice',
          prompt: 'Your parent helps you set up a new game, and asks for the password you picked, to keep it safe. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Tell your parent. Sharing with them is fine.',
            },
            {
              key: 'b',
              text: 'Say no. Passwords should never be shared with anyone.',
            },
            {
              key: 'c',
              text: 'Tell them a made-up password instead.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Your parent is the one person it's fine to share passwords with. They can help if you forget it, or if something goes wrong.",
        },
        {
          key: 'q-school-computer',
          type: 'multiple_choice',
          prompt: "You've finished using a computer in the school library, and someone else is waiting for it. What should you do before you go?",
          choices: [
            {
              key: 'a',
              text: 'Close the window. That signs you out.',
            },
            {
              key: 'b',
              text: 'Turn off the screen with its button.',
            },
            {
              key: 'c',
              text: "Leave it on so they don't have to wait.",
            },
            {
              key: 'd',
              text: 'Sign out of your account.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Closing a window or turning off the screen often leaves you signed in. Signing out means the next person can't use your account.",
        },
        {
          key: 'q-same-password',
          type: 'multiple_choice',
          prompt: 'Sam uses one password for his game, his email and his school account. Someone finds out his game password. What could they get into?',
          choices: [
            {
              key: 'a',
              text: "Only his game. That's the password they found.",
            },
            {
              key: 'b',
              text: 'Nothing, if he changes his game password quickly.',
            },
            {
              key: 'c',
              text: 'All three of his accounts.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'With one password for everything, finding it opens every account. A different password for each important account keeps the others safe.',
        },
      ],
    },
    {
      key: 'ask-before-buying',
      order: 60,
      kind: 'content',
      title: 'Ask before you buy',
      body: 'Lots of games and apps sell things: coins, gems, skins, extra levels or surprise boxes. These usually cost **real money**, even when the price is shown in gems or coins.\n\n**Always ask a parent before you buy anything**, even something small, and even if a card is already saved on the device.\n\nGames sometimes push you to buy fast: "Today only!" or "Your friends already have it!" That\'s your sign to slow down and ask.\n\nIf you buy something by mistake, tell a parent right away. Telling quickly is always the right thing to do.',
      media: [lessonPicture('a8-ask-to-buy')],
    },
    {
      key: 'check-buying',
      order: 70,
      kind: 'quiz',
      title: 'Before you buy',
      questions: [
        {
          key: 'q-gem-pack',
          type: 'multiple_choice',
          prompt: 'Your game shows: "Mega Gem Pack, today only!" A card is saved on the tablet, so one tap buys it. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Buy it now, and tell your parent at dinner.',
            },
            {
              key: 'b',
              text: "Tap it. It's only a small amount, and the card is saved.",
            },
            {
              key: 'c',
              text: 'Buy a small pack instead of the big one.',
            },
            {
              key: 'd',
              text: 'Ask your parent before you tap anything.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: '"Today only" is there to rush you. A saved card still spends real money, so asking first is the way to go.',
        },
        {
          key: 'q-gems-real-money',
          type: 'true_false',
          prompt: 'If a price is shown in gems or coins, it never costs real money.',
          correct: false,
          explanation: "Gems and coins are often bought with real money, so spending them can still cost your family. If you're not sure, ask.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two of these to try with your parent or another grown-up at home:\n\n- Make up a practice passphrase together, just for fun. Don't use it for real.\n- Ask your grown-up: What's our family's rule about buying things in games and apps?\n- Check together: Does your tablet or phone lock with a code?",
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
