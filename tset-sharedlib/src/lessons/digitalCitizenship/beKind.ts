import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 8–10, lesson 4 of 5 (HAT-534). Adapted from Be Internet Awesome (Google,
// CC BY 4.0) with outcomes from UKCIS Education for a Connected World (OGL v3). Never change a step or
// question key once shipped: a child's progress and answers are saved against them.
export const BE_KIND: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Being kind online',
    subtitle: 'Digital citizenship · Part 4 of 5',
    objectives: [
      'I can explain why a message might sound meaner than someone meant it.',
      'I can tell the difference between joking with someone and hurting them.',
      'I can help when I see someone being unkind to another person online.',
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
      title: 'Same you, online and off',
      body: 'Noah\'s friends pick a different game, and he types "ok fine" in the group chat. He meant "Sure, that\'s fine!" His friends think he\'s annoyed.\n\nOnline, people can\'t see your face or hear your voice. That makes it easy to be misunderstood, and easy to forget there\'s a real person reading.\n\nIn this lesson you\'ll learn how to say what you mean, how to tell joking from hurting, and what to do when someone is being unkind.',
      media: [lessonPicture('kind-messages')],
    },
    {
      key: 'words-without-voice',
      order: 20,
      kind: 'content',
      title: 'Words without a voice',
      body: 'When you talk in person, your face and voice help show what you mean. In a chat, people only see the words. The same message can sound friendly, grumpy or mean.\n\nBefore you send something, read it as if you were the other person. Ask: **Could this be taken the wrong way?**\n\nYou can make it clearer:\n\n- Add a few words: "ok fine, that game sounds fun!"\n- If you\'re not sure what someone meant, ask them.\n- If things get tricky, talk in person or on a call.\n\n**Be the same kind person online as you are face to face.**',
      media: [lessonPicture('a8-ok-fine')],
    },
    {
      key: 'check-tone',
      order: 30,
      kind: 'quiz',
      title: 'What did they mean?',
      questions: [
        {
          key: 'q-whatever',
          type: 'multiple_choice',
          prompt: 'You suggest a plan for Saturday in the group chat. Lily replies "whatever". You\'re not sure what she means. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Reply "fine, whatever" so she knows how it feels.',
            },
            {
              key: 'b',
              text: 'Ask her: "Do you want to do something else?"',
            },
            {
              key: 'c',
              text: 'Leave her out of the plan.',
            },
            {
              key: 'd',
              text: "Tell the group she's being rude.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Lily's \"whatever\" could mean she's tired, busy, or doesn't like the plan. Asking is the quickest way to find out, and it keeps things friendly.",
        },
        {
          key: 'q-all-caps',
          type: 'true_false',
          prompt: 'A message in all capital letters, like "CALL ME NOW", can sound like shouting, even when the person isn\'t angry.',
          correct: true,
          explanation: "Capital letters often read as shouting, so the same words can feel very different. If a message sounds harsh, it's worth asking what they meant.",
        },
      ],
    },
    {
      key: 'joking-or-hurting',
      order: 40,
      kind: 'content',
      title: 'Joking or hurting?',
      body: "Joking around with friends can be fun. But a joke only works **if everyone is laughing, including the person it's about**.\n\nIt has gone too far when:\n\n- the person says stop, or goes quiet\n- it's about how someone looks, or something they can't change\n- lots of people join in against one person\n- it keeps happening\n\nWhen someone is mean on purpose, again and again, that's **bullying**. Online, that can be mean messages, leaving someone out, or sharing photos to laugh at them.\n\n**Nobody who is bullied is to blame.** If your joke hurt someone, stop and say sorry.",
      media: [lessonPicture('a8-everyone-laughing')],
    },
    {
      key: 'check-joking',
      order: 50,
      kind: 'quiz',
      title: 'Is it still a joke?',
      questions: [
        {
          key: 'q-nickname',
          type: 'multiple_choice',
          prompt: 'Your friends have started calling Jay "Snail" in the group chat. He laughed at first, but now he\'s gone quiet. What do you do?',
          choices: [
            {
              key: 'a',
              text: 'Stop using the nickname, and check in with Jay.',
            },
            {
              key: 'b',
              text: "Keep going. He laughed at first, so he's fine with it.",
            },
            {
              key: 'c',
              text: 'Wait and see if he says something.',
            },
            {
              key: 'd',
              text: "Give everyone a silly nickname, so it's fair.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Going quiet can mean the joke stopped being fun for Jay. Stopping, and asking him if he's OK, shows you care how he feels.",
        },
        {
          key: 'q-racing-joke',
          type: 'multiple_choice',
          prompt: 'You and Mia always tease each other about who\'s worse at racing games. She sends: "Last place AGAIN, slowpoke!" You laugh. Joking or hurting?',
          choices: [
            {
              key: 'a',
              text: 'Hurting. Any teasing online is bullying.',
            },
            {
              key: 'b',
              text: 'Hurting. "Slowpoke" is a mean word.',
            },
            {
              key: 'c',
              text: 'Joking. You both laugh, and it goes both ways.',
            },
            {
              key: 'd',
              text: "Hurting. Capital letters mean she's angry.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'This is friendly joking. You both find it funny, it goes both ways, and either of you can say stop.',
        },
        {
          key: 'q-who-to-blame',
          type: 'multiple_choice',
          prompt: "With her parent's OK, Ella posted a dance video. Kids keep leaving mean comments. Someone says, \"She shouldn't have posted it.\" Who's to blame?",
          choices: [
            {
              key: 'a',
              text: 'Ella, a little. She chose to post it.',
            },
            {
              key: 'b',
              text: "Nobody. They're only comments.",
            },
            {
              key: 'c',
              text: "Ella's parent, for saying yes.",
            },
            {
              key: 'd',
              text: 'The kids who choose to leave mean comments.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Nobody who is bullied is to blame. The people being mean are the ones choosing to be mean.',
        },
      ],
    },
    {
      key: 'help-someone',
      order: 60,
      kind: 'content',
      title: 'When someone is unkind',
      body: 'If you see someone being mean to someone else, you can help. Pick what feels safe for you:\n\n- **Support them.** Send a kind private message: "That wasn\'t OK. Are you all right?"\n- **Don\'t pass it on.** Don\'t share it, like it or laugh along.\n- **Block and report.** Most apps and games have buttons for this.\n- **Tell a grown-up you trust**, especially if it keeps happening.\n\nA screenshot of mean messages can help a grown-up see what happened.\n\nIf it\'s happening to you, you can do the same: don\'t reply, block, report, and tell. You don\'t have to deal with it alone.',
      media: [lessonPicture('a8-kind-message')],
    },
    {
      key: 'check-help',
      order: 70,
      kind: 'quiz',
      title: 'Be a helper',
      questions: [
        {
          key: 'q-edited-photo',
          type: 'multiple_choice',
          prompt: 'Someone posts an edited photo of Ruby in the class chat to make fun of her. Others send laughing faces. What would help most?',
          choices: [
            {
              key: 'a',
              text: "Say nothing. It isn't about you.",
            },
            {
              key: 'b',
              text: 'Forward it to a friend to ask what they think.',
            },
            {
              key: 'c',
              text: 'Tell a grown-up you trust, and show them.',
            },
            {
              key: 'd',
              text: 'Post a funny photo of whoever started it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'A grown-up can help, and seeing it shows them what happened. Forwarding spreads it further, and getting back at someone usually makes things worse.',
        },
        {
          key: 'q-game-names',
          type: 'multiple_choice',
          prompt: "In an online game, one player keeps calling another names, even after being asked to stop. What's the best thing to do?",
          choices: [
            {
              key: 'a',
              text: "Use the game's report and block buttons.",
            },
            {
              key: 'b',
              text: "Leave it. Players you don't know aren't your problem.",
            },
            {
              key: 'c',
              text: "Join in, so they don't pick on you next.",
            },
            {
              key: 'd',
              text: 'Call them worse names until they stop.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'Reporting tells the game someone is breaking its rules, and blocking stops them reaching you. You can also tell a grown-up.',
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two of these to talk about with your parent or another grown-up at home:\n\n- Ask your grown-up: Has a message of yours ever been taken the wrong way? What happened?\n- Talk about it: What would you do if you saw someone being left out or teased in a group chat?\n- Ask your grown-up: What's a kind thing someone has done for you online?",
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
