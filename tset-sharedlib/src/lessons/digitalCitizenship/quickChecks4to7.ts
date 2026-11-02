import type { LessonQuestion, LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture, type LessonPictureKey } from '../lessonPictures';
import { choose, content, lesson4to7, quiz } from './build';

// Quick checks for the 4–7 pack (DCL-14): three new questions each, at least one where the answer is
// "that's fine", offered about three weeks after the lesson is finished. Two of three passes. Never
// change a step or question key once shipped.

/** `picture` is the lesson's own, so the check opens on something the child has seen. */
function quickCheck(lessonTitle: string, picture: LessonPictureKey, objectives: string[], questions: LessonQuestion[]): LessonSchemaV1 {
  return lesson4to7({
    title: `Quick check: ${lessonTitle}`,
    subtitle: 'Digital citizenship · Quick check',
    objectives,
    estMinutes: 2,
    passThreshold: 0.6,
    steps: [
      content(
        'intro',
        10,
        'Quick check',
        `A few weeks ago you did *${lessonTitle}*. Here are three new questions to see what you remember.`,
        [lessonPicture(picture)],
      ),
      quiz('check', 20, 'Three questions', questions),
    ],
  });
}

export const TELL_A_GROWN_UP_CHECK = quickCheck(
  'Tell a grown-up',
  'telling-a-grown-up',
  ['I can name a grown-up I can tell if something online makes me feel bad.', "I know I won't be in trouble for telling."],
  [
    choose(
      'q-worried-picture',
      'You see a picture online that makes you feel worried. What do you do?',
      [
        ['a', 'Stop, and tell a grown-up.'],
        ['b', 'Look at it again and again.'],
      ],
      'a',
      'Stop, and tell a grown-up you trust. They want to know, so they can help.',
    ),
    choose(
      'q-teacher',
      'Who could you tell if something online upsets you?',
      [
        ['a', 'Nobody. I keep it to myself.'],
        ['b', 'A grown-up I trust, like my teacher.'],
      ],
      'b',
      'A parent, a grandparent or a teacher can all help.',
    ),
    choose(
      'q-happy-song',
      'A song online makes you want to dance. Do you need to tell a grown-up?',
      [
        ['a', 'Yes, straight away.'],
        ['b', 'No. Enjoy it!'],
      ],
      'b',
      'Fun things are fine. You tell a grown-up when something makes you feel sad, worried or scared.',
    ),
  ],
);

export const PRIVATE_THINGS_CHECK = quickCheck(
  'Keeping things private',
  'locked-box',
  ['I can name things about me that are private.', 'I keep my password secret.'],
  [
    choose(
      'q-school-name',
      'Someone in a game asks, "What school do you go to?" What do you do?',
      [
        ['a', 'Tell them.'],
        ['b', "Don't say, and tell a grown-up."],
      ],
      'b',
      "Your school is private. Don't say it, and tell a grown-up that someone asked.",
    ),
    choose(
      'q-share-drawing',
      "Can you share a drawing of your favourite animal, with a grown-up's help?",
      [
        ['a', "Yes, that's fine."],
        ['b', 'No, never.'],
      ],
      'a',
      "That's fine. A drawing of an animal doesn't tell anyone where you live or who you are.",
    ),
    choose(
      'q-password-note',
      'Your password is written on a card. Where should it go?',
      [
        ['a', 'Somewhere safe, with your parent.'],
        ['b', 'Stuck on the tablet for everyone to see.'],
      ],
      'a',
      'A password is a key. Keep it somewhere safe, with your parent.',
    ),
  ],
);

export const KIND_ONLINE_CHECK = quickCheck(
  'Being kind online',
  'kind-messages',
  ['I can say kind things online.', 'I tell a grown-up if someone is unkind to me.'],
  [
    choose(
      'q-friend-drawing',
      'Your friend shows you a drawing on a video call. What could you say?',
      [
        ['a', '"I like the colours you used!"'],
        ['b', '"That\'s silly."'],
      ],
      'a',
      'Kind words make your friend feel good about what they made.',
    ),
    choose(
      'q-ask-picture',
      'You want to send a picture of your friend to someone. What do you do first?',
      [
        ['a', 'Just send it.'],
        ['b', 'Ask my friend.'],
      ],
      'b',
      'Asking first lets your friend choose.',
    ),
    choose(
      'q-unkind-again',
      'Someone in a game keeps saying unkind things to you. What do you do?',
      [
        ['a', 'Say unkind things back.'],
        ['b', 'Stop playing, and tell a grown-up.'],
      ],
      'b',
      "Stop, and tell a grown-up. It's never your fault when someone is unkind.",
    ),
  ],
);

export const STOP_AND_ASK_CHECK = quickCheck(
  'Stop and ask',
  'buy-pop-up',
  ['I stop and ask a grown-up before I buy something or tap something new.'],
  [
    choose(
      'q-get-more',
      'A button in a game says "Get more coins!" What do you do?',
      [
        ['a', 'Tap it lots.'],
        ['b', 'Stop, and ask a grown-up.'],
      ],
      'b',
      'Buttons like this can spend real money. Ask a grown-up first.',
    ),
    choose(
      'q-keep-playing',
      'You are playing the game you always play. Do you need to ask each time?',
      [
        ['a', 'Yes, every time.'],
        ['b', "No, that's fine."],
      ],
      'b',
      'That\'s fine. You ask first about buying, new things and new people.',
    ),
    choose(
      'q-chat-invite',
      'Someone you have never met asks you to chat. What do you do?',
      [
        ['a', 'Ask a grown-up first.'],
        ['b', 'Chat with them.'],
      ],
      'a',
      'Someone new is a time to stop and ask. A grown-up can help you decide.',
    ),
  ],
);

export const REAL_OR_PRETEND_CHECK = quickCheck(
  'Real or pretend?',
  'pretend-creature',
  ['I know some things online are pretend.', 'I know a talking speaker is a computer, not a person.'],
  [
    choose(
      'q-flying-pig',
      'A video shows a pig flying over a house. Is it real or pretend?',
      [
        ['a', 'Pretend'],
        ['b', 'Real'],
      ],
      'a',
      "Pigs can't fly. It was made with a computer, or drawn, to be funny.",
    ),
    choose(
      'q-speaker-feelings',
      'Does a talking speaker have feelings, like a person?',
      [
        ['a', "No. It's a computer."],
        ['b', "Yes. It's a friend."],
      ],
      'a',
      "It's a computer. It can talk, but it doesn't have feelings.",
    ),
    choose(
      'q-not-sure',
      "You see something online and you aren't sure if it's true. What do you do?",
      [
        ['a', 'Ask a grown-up.'],
        ['b', 'Believe it.'],
      ],
      'a',
      'A grown-up can help you find out what is true.',
    ),
  ],
);
