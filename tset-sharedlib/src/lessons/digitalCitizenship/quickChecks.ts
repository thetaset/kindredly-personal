import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Quick checks for the 8–10 pack (DCL-14): three new questions each, offered about three weeks after
// the lesson is finished, because gains fade by three months and spaced practice testing works.
// Two of three passes. Never change a step or question key once shipped.

export const KEEP_PRIVATE_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: What to keep private',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can name the things about me that are private online.',
      'I can explain why a post can last a long time and reach lots of people.',
      'I can ask first before I share a photo of someone, or something they told me.',
    ],
    estMinutes: 3,
    gradeBand: 'elementary',
    subject: 'Digital citizenship',
    tone: 'warm, calm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.6,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Quick check',
      body: 'A few weeks ago you did *What to keep private*. Here are three new questions to see what stuck.',
      media: [lessonPicture('locked-box')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-dive-location',
          type: 'multiple_choice',
          prompt: 'Your parent says you can post a video of your best dive. The app asks: "Add location: Riverside Pool?" What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Add it, so people can see which pool you go to.',
            },
            {
              key: 'b',
              text: 'Post the video, and leave the location off.',
            },
            {
              key: 'c',
              text: "Don't post the video. Videos of you are always private.",
            },
            {
              key: 'd',
              text: "Add it. You'll be home by the time anyone sees it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Your dive is fine to share, and your parent said yes. Where you are, and the places you often go, are private, so leave the location off.',
        },
        {
          key: 'q-vanishing-chat',
          type: 'true_false',
          prompt: 'Your class chat has messages that disappear after one day. That means nobody can keep a copy of what you post there.',
          correct: false,
          explanation: 'Someone can take a screenshot, or a photo of the screen, before a message disappears. So think before you post, even in a chat that clears itself.',
        },
        {
          key: 'q-beach-photo',
          type: 'multiple_choice',
          prompt: 'You ask your cousin Nadia, "Can I send our handstand photo to Aunt Rosa?" She says, "Yes, send it!" What do you do?',
          choices: [
            {
              key: 'a',
              text: "Don't send it. Photos with other people in them should stay private.",
            },
            {
              key: 'b',
              text: 'Send it to Aunt Rosa, and to your class chat too.',
            },
            {
              key: 'c',
              text: 'Send it to Aunt Rosa.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'You asked first and Nadia said yes, so go ahead. She said yes to Aunt Rosa, not to everyone, so ask again before you share it anywhere else.',
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- **Keep these private:** your address, phone number, birthday, passwords, where you are right now, and your full name with your school.\n- Posts can be copied, saved and passed on, even ones that get deleted or disappear. **Think before you post.**\n- **Ask first** before you share a photo of someone, or something they told you. Their yes is only for what you asked.\n- Choose who can see your posts together with your parent, in the app's settings.",
      media: [lessonPicture('a8-think-before-you-post')],
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

export const REAL_OR_FAKE_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Real or fake?',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can spot the signs of a trick, like a prize I never entered for.',
      'I can check another way when a message from someone I know seems odd.',
      'I can explain that AI can make pictures and voices, and that AI helpers can be wrong.',
    ],
    estMinutes: 3,
    gradeBand: 'elementary',
    subject: 'Digital citizenship',
    tone: 'warm, calm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.6,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Quick check',
      body: 'A few weeks ago you did *Real or fake?* Here are three new questions to see what stuck.',
      media: [lessonPicture('checking-the-news')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-library-prize',
          type: 'multiple_choice',
          prompt: 'You did your library\'s reading challenge. Now it messages your family: "Well done! Your prize is at the front desk." What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Go and pick it up with your parent.',
            },
            {
              key: 'b',
              text: 'Ignore it. Messages about prizes are always tricks.',
            },
            {
              key: 'c',
              text: "Block the library's messages, just in case.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'This one is real: you did enter, nobody is rushing you, and it asks for nothing. Watch out for prizes you never entered for.',
        },
        {
          key: 'q-aunt-card',
          type: 'multiple_choice',
          prompt: "Your aunt's account writes: \"Send me a photo of Dad's bank card. It's a surprise, so don't tell him!\" What do you do?",
          choices: [
            {
              key: 'a',
              text: "Send it. It's for a nice surprise.",
            },
            {
              key: 'b',
              text: 'Ask "Is this really you?" in the chat, and send it if she says yes.',
            },
            {
              key: 'c',
              text: 'Send a photo of just the front of the card.',
            },
            {
              key: 'd',
              text: "Don't send it. Show your dad, and call your aunt together.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Asking for a bank card and asking you to keep a secret are signs someone else might be using her account. Whoever it is can answer in that chat too, so check another way, like a call.',
        },
        {
          key: 'q-ai-answers',
          type: 'multiple_choice',
          prompt: "You're using an AI helper. Which of its answers should you check somewhere else before you use it?",
          choices: [
            {
              key: 'a',
              text: 'Five funny names for your new hamster',
            },
            {
              key: 'b',
              text: 'A short poem about rain',
            },
            {
              key: 'c',
              text: 'What hamsters can safely eat',
            },
            {
              key: 'd',
              text: 'A silly joke about cats',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "An AI helper can get facts wrong, even when it sounds sure, so check answers that matter, like what's safe for a pet. Fun ideas, like names, a poem or a joke, are yours to enjoy.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- Signs of a trick: a prize you never entered for, a rush, or a link that asks you to sign in. **Don't tap. Tell a grown-up.**\n- If a message from someone you know seems odd, or asks for a password, a code or money, **check another way**, like in person or on a call.\n- AI can make pictures and voices that seem real, and AI helpers can be wrong. **Check answers that matter.**\n- Most messages are just what they look like. Save your checking for the odd ones.",
      media: [lessonPicture('a8-dont-tap-tell')],
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

export const STRONG_PASSWORDS_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Strong passwords',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      "I can make a long password that's easy for me to remember and hard for others to guess.",
      'I can keep my passwords private and share them only with my parent.',
      'I can sign out on shared devices, and ask before I buy anything in a game or app.',
    ],
    estMinutes: 3,
    gradeBand: 'elementary',
    subject: 'Digital citizenship',
    tone: 'warm, calm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.6,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Quick check',
      body: 'A few weeks ago you did *Strong passwords*. Here are three new questions to see what stuck.',
      media: [lessonPicture('lock-and-key')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-how-you-made-it',
          type: 'multiple_choice',
          prompt: 'Your friend Freya says, "Your password must be really good. How did you make it?" What can you tell her?',
          choices: [
            {
              key: 'a',
              text: 'Your password, so she can use the same one.',
            },
            {
              key: 'b',
              text: "Nothing. You can't talk about passwords at all.",
            },
            {
              key: 'c',
              text: 'The idea: join a few random words and add a number.',
            },
            {
              key: 'd',
              text: 'Your password, if she promises to keep it secret.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Sharing how you made it helps your friend, and it keeps your password safe. The password itself is only for you and your parent.',
        },
        {
          key: 'q-sleepover-tablet',
          type: 'multiple_choice',
          prompt: "At a sleepover, you play your game on your friend Isla's tablet. Before you give it back, what do you do?",
          choices: [
            {
              key: 'a',
              text: 'Close the game, and stay signed in for next time.',
            },
            {
              key: 'b',
              text: 'Sign out of your game account.',
            },
            {
              key: 'c',
              text: 'Nothing. Isla is your friend, so staying signed in is fine.',
            },
            {
              key: 'd',
              text: "Ask Isla to sign you out after you've gone.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "While you're signed in, anyone using the tablet can play, chat or post as you. Signing out yourself means your account goes home with you.",
        },
        {
          key: 'q-golden-dragon',
          type: 'multiple_choice',
          prompt: 'Your game says: "Everyone on your team has the golden dragon! Get yours now." One tap would buy it. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Tap it, so you match the rest of your team.',
            },
            {
              key: 'b',
              text: 'Ask a teammate to buy it for you instead.',
            },
            {
              key: 'c',
              text: 'Tap it. It probably only costs a few coins.',
            },
            {
              key: 'd',
              text: 'Close it. If you want it, ask your parent.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: '"Everyone has it!" is there to hurry you. Things you buy in games often use real money, even if the price says coins, so ask a parent first.',
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- A strong password is **long and hard to guess**: a few random words and a number, made up by you.\n- **Your passwords are for you and your parent only.** You can tell a friend how you made one, but never the password itself.\n- **Sign out** when you finish on someone else's device or a shared computer.\n- **Check with a parent before buying anything** in a game or app, even when it tries to rush you.",
      media: [lessonPicture('a8-long-hard-to-guess')],
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

export const BE_KIND_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Being kind online',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can explain why a message might sound meaner than someone meant it.',
      'I can tell the difference between joking with someone and hurting them.',
      'I can help when I see someone being unkind to another person online.',
    ],
    estMinutes: 3,
    gradeBand: 'elementary',
    subject: 'Digital citizenship',
    tone: 'warm, calm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.6,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Quick check',
      body: 'A few weeks ago you did *Being kind online*. Here are three new questions to see what stuck.',
      media: [lessonPicture('kind-messages')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-magic-trick',
          type: 'multiple_choice',
          prompt: 'Theo sends a video of his magic trick, and he drops the card. You type "lol you messed it up". Before sending, what\'s best?',
          choices: [
            {
              key: 'a',
              text: "Send it. It's true, and Theo will know you're joking.",
            },
            {
              key: 'b',
              text: 'Change it to "So close! Can I see it again?"',
            },
            {
              key: 'c',
              text: "Add a laughing face, so he knows it's a joke.",
            },
            {
              key: 'd',
              text: "Don't reply at all, in case he's upset.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Theo can\'t see your smile, so "lol you messed it up" could sound mean, even with a laughing face. A few friendly words show you\'re on his side.',
        },
        {
          key: 'q-pizza-joke',
          type: 'multiple_choice',
          prompt: 'You and Ezra always joke about pineapple pizza. He sends "PINEAPPLE PARTY!!" You reply "NOOO", and he sends back laughing faces. Joking or hurting?',
          choices: [
            {
              key: 'a',
              text: "Joking. You're both laughing, and it goes both ways.",
            },
            {
              key: 'b',
              text: 'Hurting. You said "NOOO" to his favourite food.',
            },
            {
              key: 'c',
              text: "Hurting. Capital letters mean you're angry.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "This is friendly joking about a pizza topping, not about who Ezra is, and you both join in. If he ever went quiet or said stop, that's when to stop.",
        },
        {
          key: 'q-new-glasses',
          type: 'multiple_choice',
          prompt: 'In your class chat, a few people keep joking about Hana\'s new glasses. She sent one "haha", then went quiet. What would help most?',
          choices: [
            {
              key: 'a',
              text: "Send a laughing face too, so you don't stand out.",
            },
            {
              key: 'b',
              text: 'Screenshot it and send it to your other friends.',
            },
            {
              key: 'c',
              text: 'Make a joke about one of the people teasing her.',
            },
            {
              key: 'd',
              text: "Message Hana on her own to check she's OK.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Jokes about how someone looks, with lots of people joining in, can hurt, and going quiet is a sign they have. A kind message helps, and you can show a grown-up you trust too.',
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- In a chat, people only see your words. **Read your message as they would** before you send it, and ask if you're not sure what someone meant.\n- It's only a joke if **the person it's about is laughing too.** If they go quiet or say stop, stop.\n- When someone is unkind, you can **send a kind message, not pass it on, block and report, and tell a grown-up you trust.**\n- If someone is picked on, it's never their fault.",
      media: [lessonPicture('a8-same-kind-person')],
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

export const ASK_FOR_HELP_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Asking for help',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can tell when something online is a reason to get help.',
      "I can name grown-ups I trust, and say what I'd tell them.",
      "I can ask for help, knowing I won't be in trouble for asking.",
    ],
    estMinutes: 3,
    gradeBand: 'elementary',
    subject: 'Digital citizenship',
    tone: 'warm, calm, practical',
  },
  scoring: {
    maxAttempts: null,
    keepBestScore: true,
    showScoreEachAttempt: true,
    passThreshold: 0.6,
    revealAnswersAfter: 'each_question',
  },
  steps: [
    {
      key: 'intro',
      order: 10,
      kind: 'content',
      title: 'Quick check',
      body: 'A few weeks ago you did *Asking for help*. Here are three new questions to see what stuck.',
      media: [lessonPicture('telling-a-grown-up')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-puppy-video',
          type: 'multiple_choice',
          prompt: 'Your cousin sends a video of her puppy falling asleep in its food bowl. It makes you laugh. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Report the video, just to be safe.',
            },
            {
              key: 'b',
              text: 'Enjoy it, and send a laughing face back.',
            },
            {
              key: 'c',
              text: "Stop watching. Videos online aren't safe.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Lots of things online are just fun, like this. Get help when something makes you upset, scared, confused or uncomfortable.',
        },
        {
          key: 'q-club-leader',
          type: 'multiple_choice',
          prompt: 'At after-school club, a game message upsets Felix. His dad is at work until six. The club leader is nearby. What should Felix do?',
          choices: [
            {
              key: 'a',
              text: 'Keep it to himself until his dad gets home.',
            },
            {
              key: 'b',
              text: 'Reply to the sender: "Why would you say that to me?"',
            },
            {
              key: 'c',
              text: 'Ask the other players what he should do.',
            },
            {
              key: 'd',
              text: 'Tell the club leader: "Something in a game upset me."',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "A club leader is a trusted grown-up too, and telling them now means Felix gets help sooner. That's why it helps to have more than one grown-up in mind.",
        },
        {
          key: 'q-photo-mistake',
          type: 'multiple_choice',
          prompt: "Lucas posted Arlo's photo without asking. Now kids are teasing Arlo, and Lucas is scared he'll be in trouble. What should he do?",
          choices: [
            {
              key: 'a',
              text: 'Tell a grown-up, so they can help put it right.',
            },
            {
              key: 'b',
              text: 'Delete it and say nothing, so nobody knows it was him.',
            },
            {
              key: 'c',
              text: 'Wait, and hope everyone forgets about it soon.',
            },
            {
              key: 'd',
              text: 'Say someone else must have posted it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Everyone makes mistakes, and asking for help won't get Lucas in trouble. A grown-up can help with the teasing, and with saying sorry to Arlo.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: '- If something online makes you **upset, scared, confused or uncomfortable**, get help. It doesn\'t have to be a big deal.\n- Have **at least two trusted grown-ups** in mind. If one isn\'t around or doesn\'t help, go to another.\n- **Asking for help won\'t get you in trouble**, even when you made a mistake.\n- To start, you can say: "Something happened online. Can you help me?"',
      media: [lessonPicture('a8-can-you-help')],
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
