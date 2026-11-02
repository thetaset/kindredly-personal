import { lessonPicture } from '../lessonPictures';
import { choose, chooseWithPictures, content, lesson4to7, quiz } from './build';

// Digital citizenship, ages 4–7 (HAT-534, DCL-11): five short lessons a grown-up reads aloud with the
// child, each led by pictures (DCL-15). The pack is marked Read together, so no page tells the grown-up
// what to do (HAT-560). Outcomes from UKCIS Education for a Connected World, early
// years to 7 (OGL v3): telling a trusted adult, saying no and please stop, personal information and
// passwords, kindness and asking permission, asking before buying or anything new, real and make
// believe, and talking speakers not being people. Never change a step or question key once shipped:
// a child's progress and answers are saved against them.


export const TELL_A_GROWN_UP = lesson4to7({
  title: 'Tell a grown-up',
  subtitle: 'Digital citizenship · Part 1 of 5',
  objectives: [
    'I can name a grown-up I can tell if something online makes me feel bad.',
    "I know I won't be in trouble for telling.",
    'I can say "no" or "please stop", and then tell.',
  ],
  estMinutes: 5,
  passThreshold: 0.6,
  steps: [
    content(
      'intro',
      10,
      "When it isn't fun",
      `Lots of things online are fun, like games, songs and videos of animals.\n\nBut sometimes you might see something that makes you feel sad, worried or scared. That happens to everyone, and there is something you can do.`,
      [lessonPicture('upsetting-screen')],
    ),
    content(
      'stop-and-tell',
      20,
      'Stop and tell',
      "If something online makes you feel bad:\n\n1. **Stop.** Put the tablet down.\n2. **Tell a grown-up** you trust.\n\nYou won't be in trouble for telling. Grown-ups want to know, so they can help.",
      [lessonPicture('telling-a-grown-up')],
    ),
    quiz('check-stop-and-tell', 30, 'What would you do?', [
      chooseWithPictures(
        'q-scary-video',
        'A video makes you feel scared. What do you do?',
        [
          ['a', 'Keep watching.', 'upsetting-screen'],
          ['b', 'Stop, and tell a grown-up.', 'telling-a-grown-up'],
        ],
        'b',
        "Stop, then tell a grown-up. You can always stop watching something you don't like.",
      ),
      choose(
        'q-in-trouble',
        'You tell a grown-up about a scary video. What happens?',
        [
          ['a', 'They help you.'],
          ['b', 'You get in trouble.'],
        ],
        'a',
        "Telling is the right thing to do. You won't be in trouble: grown-ups want to know, so they can help.",
      ),
    ]),
    content(
      'who-and-no',
      40,
      'Who can you tell?',
      "A grown-up you trust looks after you, like a parent, a grandparent or your teacher. If the first grown-up you tell doesn't help, tell another one.\n\nIf someone online asks you to do something you don't want to do, you can say **no**. If someone is unkind, you can say **please stop**. Then tell a grown-up.",
      [lessonPicture('saying-please-stop')],
    ),
    quiz('check-who-and-no', 50, 'What would you do?', [
      choose(
        'q-secret',
        'Someone in a game says, "Don\'t tell your family about me." What do you do?',
        [
          ['a', 'Keep it a secret, so they stay my friend.'],
          ['b', 'Tell a grown-up straight away.'],
        ],
        'b',
        'Someone who asks you to keep secrets from your family is not being a good friend. Tell a grown-up straight away.',
      ),
      choose(
        'q-please-stop',
        'Someone online says something unkind to you. What can you do?',
        [
          ['a', 'Say "please stop", then tell a grown-up.'],
          ['b', 'Say something unkind back.'],
        ],
        'a',
        'You can say please stop, and a grown-up can help. Being unkind back only makes it worse.',
      ),
      choose(
        'q-funny-cat',
        'A funny video of a cat makes you laugh. Do you have to stop watching?',
        [
          ['a', 'Yes. Tell a grown-up straight away.'],
          ['b', "No. It's fine to enjoy it."],
        ],
        'b',
        'Lots of things online are fun. You only need to stop and tell when something makes you feel sad, worried or scared.',
      ),
    ]),
    content(
      'talk-it-over',
      60,
      'Talk it over',
      'Try these together:\n\n- Name two grown-ups you could tell if something online made you feel bad.\n- Practise saying: "I saw something that made me feel worried."\n- Grown-up: tell your child what you will do when they tell you. Listen first, and they won\'t be in trouble.',
    ),
  ],
});

export const PRIVATE_THINGS = lesson4to7({
  title: 'Keeping things private',
  subtitle: 'Digital citizenship · Part 2 of 5',
  objectives: [
    'I can name things about me that are private, like where I live and my birthday.',
    'I ask a grown-up before I share anything about me online.',
    'I know a password is like a key, and I keep it secret.',
  ],
  estMinutes: 5,
  passThreshold: 0.6,
  steps: [
    content(
      'intro',
      10,
      'Just for you',
      `Some things about you are **private**. Online, you keep them to yourself, like treasure in a locked box.`,
      [lessonPicture('locked-box')],
    ),
    content(
      'what-is-private',
      20,
      'What is private?',
      'These things are private:\n\n- Where you live\n- Your birthday\n- Your school\n- Your full name\n- Your passwords\n\nOnline, **ask a grown-up first** before you share anything about you or your family.',
      [lessonPicture('private-things')],
    ),
    quiz('check-private', 30, 'Private or fine?', [
      chooseWithPictures(
        'q-where-live',
        'Someone in a game asks, "Where do you live?" What do you do?',
        [
          ['a', 'Tell them my street.', 'private-things'],
          ['b', "Don't say. Tell a grown-up.", 'asking-a-grown-up'],
        ],
        'b',
        "Where you live is private. Don't say it, and tell a grown-up that someone asked.",
      ),
      choose(
        'q-favourite-animal',
        'A friend in a game asks your favourite animal. Can you tell them?',
        [
          ['a', "Yes, that's fine to share."],
          ['b', "No, that's private."],
        ],
        'a',
        "That's fine. Your favourite animal, colour or food can't help anyone find you.",
      ),
      choose(
        'q-which-private',
        'Which one is private?',
        [
          ['a', 'The game you like'],
          ['b', 'Your favourite colour'],
          ['c', 'Your birthday'],
        ],
        'c',
        'Your birthday is private. The game you like and your favourite colour are fine to share.',
      ),
    ]),
    content(
      'passwords',
      40,
      'A password is a key',
      'A **password** is like a key. It opens your games and apps.\n\nKeep your password secret, even from your friends. Your parent can know it.',
      [lessonPicture('lock-and-key')],
    ),
    quiz('check-passwords', 50, 'Your password', [
      choose(
        'q-friend-password',
        'Your best friend asks for your password. What do you say?',
        [
          ['a', "Tell them, because they're my best friend."],
          ['b', '"Sorry, it\'s a secret."'],
        ],
        'b',
        'Passwords stay secret, even from best friends. Only your parent can know it.',
      ),
      choose(
        'q-parent-password',
        'Who can know your password?',
        [
          ['a', 'My parent.'],
          ['b', 'Anyone who asks nicely.'],
        ],
        'a',
        'Only your parent. They help keep your games and apps safe.',
      ),
    ]),
    content(
      'talk-it-over',
      60,
      'Talk it over',
      'Try these together:\n\n- Say together: which things about you are private?\n- Practise: if someone online asks where you live, what will you say?\n- Grown-up: show your child how you keep your own passwords safe.',
    ),
  ],
});

export const KIND_ONLINE = lesson4to7({
  title: 'Being kind online',
  subtitle: 'Digital citizenship · Part 3 of 5',
  objectives: [
    'I know there is a real person behind every message.',
    'I can say kind things online, and ask before I share a picture of someone.',
    'I tell a grown-up if someone is unkind to me.',
  ],
  estMinutes: 5,
  passThreshold: 0.6,
  steps: [
    content(
      'intro',
      10,
      'Real people, real feelings',
      `When you send a message or play a game with someone, there is a real person there, just like you.\n\nKind words can make them feel happy. Unkind words can make them feel sad.`,
      [lessonPicture('kind-messages')],
    ),
    content(
      'kind-words',
      20,
      'Kind online, kind at home',
      'Be kind online the way you are at home and at school:\n\n- Say nice things, like "Great job!"\n- Take turns.\n- Ask before you send a picture of someone else.',
      [lessonPicture('video-call')],
    ),
    quiz('check-kind-words', 30, 'What would you do?', [
      choose(
        'q-lost-game',
        'Your friend loses a game you are playing together. What could you say?',
        [
          ['a', '"Ha! You lost!"'],
          ['b', '"Good try! Want to play again?"'],
        ],
        'b',
        'Kind words help your friend feel OK, even when they lose.',
      ),
      choose(
        'q-real-person',
        'You send a message to a friend. Who reads it?',
        [
          ['a', 'A real person, with feelings.'],
          ['b', 'Just the tablet.'],
        ],
        'a',
        'A real person reads it, and feels something, just like you would.',
      ),
      choose(
        'q-funny-picture',
        'You took a funny picture of your friend Sam. What do you do before you send it?',
        [
          ['a', 'Send it. It\'s only funny.'],
          ['b', 'Ask Sam if it\'s OK.'],
        ],
        'b',
        'Asking first is kind. Sam gets to choose.',
      ),
    ]),
    content(
      'if-unkind',
      40,
      'If someone is unkind',
      "If someone says something unkind to you online:\n\n- Don't say something unkind back.\n- Stop playing or chatting.\n- Tell a grown-up.\n\nIt is never your fault when someone is unkind to you.",
      [lessonPicture('unkind-message')],
    ),
    quiz('check-if-unkind', 50, 'What would you do?', [
      choose(
        'q-unkind-message',
        'Someone sends you an unkind message. What do you do?',
        [
          ['a', 'Send an unkind message back.'],
          ['b', 'Stop, and tell a grown-up.'],
        ],
        'b',
        'Stop, and tell a grown-up. Sending something unkind back only makes it worse.',
      ),
      choose(
        'q-your-fault',
        'Someone is unkind to you online. Whose fault is it?',
        [
          ['a', 'Mine.'],
          ['b', 'The person being unkind.'],
        ],
        'b',
        "It's never your fault. Tell a grown-up, and they can help.",
      ),
    ]),
    content(
      'talk-it-over',
      60,
      'Talk it over',
      'Try these together:\n\n- Think of something kind to say to a friend in a game or on a video call.\n- Grown-up: ask your child how it feels when someone is kind to them, and when someone is not.\n- Write a kind message together and send it to someone in your family.',
    ),
  ],
});

export const STOP_AND_ASK = lesson4to7({
  title: 'Stop and ask',
  subtitle: 'Digital citizenship · Part 4 of 5',
  objectives: [
    'I stop and ask a grown-up before I buy something or tap something new.',
    'I know some pop-ups want me to spend money.',
    'I ask a grown-up before I get a new game or chat with someone new.',
  ],
  estMinutes: 5,
  passThreshold: 0.6,
  steps: [
    content(
      'intro',
      10,
      'Before you tap',
      `Sometimes a box pops up in a game. It might say **Buy**, **Get more** or **Free gift!**\n\nSome of these boxes want you to spend real money. Some take you somewhere new.`,
      [lessonPicture('buy-pop-up')],
    ),
    content(
      'stop-and-ask',
      20,
      'Stop and ask',
      "When you're not sure, **stop** and **ask a grown-up** before you tap.\n\nAlways ask first about:\n\n- A button that says Buy\n- A pop-up you haven't seen before\n- A new game or app\n- Someone new who wants to chat",
      [lessonPicture('asking-a-grown-up')],
    ),
    quiz('check-stop-and-ask', 30, 'What would you do?', [
      chooseWithPictures(
        'q-buy-gems',
        'A box pops up: "Buy 100 gems!" What do you do?',
        [
          ['a', 'Stop, and ask a grown-up.', 'asking-a-grown-up'],
          ['b', 'Tap Buy.', 'buy-pop-up'],
        ],
        'a',
        'Buying uses real money. Always ask a grown-up first.',
      ),
      choose(
        'q-free-gift',
        'A pop-up says "Free gift!" What do you do?',
        [
          ['a', 'Tap it quickly, before it goes.'],
          ['b', 'Stop, and ask a grown-up.'],
        ],
        'b',
        "Some free gifts aren't really free, and some take you somewhere new. Stop and ask a grown-up.",
      ),
      choose(
        'q-new-game',
        'You see an ad for a new game, and you really want it. What do you do?',
        [
          ['a', 'Get it yourself.'],
          ['b', 'Ask a grown-up if you can have it.'],
        ],
        'b',
        'A grown-up can check the game first, and help you get it if it is OK.',
      ),
    ]),
    content(
      'lots-is-fine',
      40,
      'Lots of tapping is fine',
      "You don't need to ask every time you tap. Playing your game and watching your show are fine.\n\nIt's **buying**, **new things** and **new people** that need a grown-up first.",
      [lessonPicture('playing-is-fine')],
    ),
    quiz('check-lots-is-fine', 50, 'Ask or fine?', [
      choose(
        'q-every-tap',
        'You are playing your favourite game, the way you always do. Do you need to ask first?',
        [
          ['a', "No, that's fine."],
          ['b', 'Yes, every time.'],
        ],
        'a',
        "That's fine. Ask first about buying, new things and new people.",
      ),
      choose(
        'q-new-person',
        'Someone you don\'t know says, "Hi! Want to be friends?" in a game. What do you do?',
        [
          ['a', 'Say hi, and tell them your name.'],
          ['b', 'Ask a grown-up before you answer.'],
        ],
        'b',
        'Someone new is a time to stop and ask. A grown-up can help you decide.',
      ),
    ]),
    content(
      'talk-it-over',
      60,
      'Talk it over',
      'Try these together:\n\n- Grown-up: find a Buy button in a game your child plays, and talk about what it does.\n- Agree on your family\'s rule: what does your child always ask about first?\n- Practise saying: "Can I tap this?"',
    ),
  ],
});

export const REAL_OR_PRETEND = lesson4to7({
  title: 'Real or pretend?',
  subtitle: 'Digital citizenship · Part 5 of 5',
  objectives: [
    'I know some things online are pretend, like cartoons.',
    'I know not everything online is true, and I can ask a grown-up.',
    'I know a talking speaker is a computer, not a person.',
  ],
  estMinutes: 5,
  passThreshold: 0.6,
  steps: [
    content(
      'intro',
      10,
      'Real or pretend?',
      `Online you can see all kinds of things. Some are **real**, like a video of a real dog. Some are **pretend**, like a cartoon monster.\n\nPretend things can be lots of fun. It helps to know which is which.`,
      [lessonPicture('pretend-creature')],
    ),
    quiz('check-real-or-pretend', 20, 'Real or pretend?', [
      choose(
        'q-monster',
        'A cartoon shows a green monster with one big eye. Is it real or pretend?',
        [
          ['a', 'Real'],
          ['b', 'Pretend'],
        ],
        'b',
        "It's pretend. Someone drew it to tell a story.",
      ),
      choose(
        'q-giant-cat',
        'You see a picture of a cat as big as a house. What do you think?',
        [
          ['a', "It's pretend, or made with a computer."],
          ['b', "It must be real, because it's a picture."],
        ],
        'a',
        'Pictures can be made or changed with computers. A cat as big as a house is pretend.',
      ),
    ]),
    content(
      'not-all-true',
      30,
      'Not everything is true',
      "Anyone can put things online, and not all of it is true. Some pictures and videos are made with computers, so they look real when they aren't.\n\nIf something seems strange, or you're not sure, **ask a grown-up**.",
      [lessonPicture('flying-pig')],
    ),
    content(
      'talking-computers',
      40,
      'Talking computers',
      "Some speakers, toys and apps can talk to you and answer questions.\n\nThey sound friendly, but they are **computers, not people**. They don't have feelings, and they can get things wrong.\n\nDon't tell them private things, like where you live. Check their answers with a grown-up.",
      [lessonPicture('talking-speaker')],
    ),
    quiz('check-talking-computers', 50, 'Talking computers', [
      chooseWithPictures(
        'q-speaker-person',
        'A speaker talks to you and answers questions. What is it?',
        [
          ['a', 'A person.', 'asking-a-grown-up'],
          ['b', 'A computer.', 'talking-speaker'],
        ],
        'b',
        "It's a computer. It can talk, but it isn't a person and doesn't have feelings.",
      ),
      choose(
        'q-speaker-wrong',
        'A talking computer tells you something. Can it be wrong?',
        [
          ['a', 'No. Computers are always right.'],
          ['b', 'Yes. It can make mistakes.'],
        ],
        'b',
        'Computers make mistakes, so check with a grown-up.',
      ),
      choose(
        'q-dinosaur',
        'A video says a dinosaur lives in your town. What do you do?',
        [
          ['a', "Believe it, because it's a video."],
          ['b', 'Ask a grown-up if it is true.'],
        ],
        'b',
        'Videos can be made up. A grown-up can help you find out what is true.',
      ),
    ]),
    content(
      'talk-it-over',
      60,
      'Talk it over',
      'Try these together:\n\n- Watch a cartoon and a real animal video. Which is which, and how can you tell?\n- If you have a talking speaker or app, ask it a question together, then talk about whether the answer was right.\n- Grown-up: tell your child about something you saw online that wasn\'t true.',
    ),
  ],
});
