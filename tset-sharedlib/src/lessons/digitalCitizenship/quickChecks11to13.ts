import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Quick checks for the 11–13 pack (DCL-14): three new questions each, offered about three weeks after
// the lesson is finished. Two of three passes. Never change a step or question key once shipped.

export const FEEDS_AND_FILTERS_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Feeds, filters and you',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can explain how a feed chooses what to show me, and why.',
      'I can notice when posts are edited or picked to look perfect, and how an app makes me feel.',
      'I can use notifications, time limits and stopping points to stay in charge of my time.',
    ],
    estMinutes: 3,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
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
      body: 'A few weeks ago you did *Feeds, filters and you*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a11-one-more-video')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-guitar-feed',
          type: 'multiple_choice',
          prompt: "Ines watched a few beginner guitar lessons last month. Now her feed is full of easy songs to learn, and she's learned three of them. What's going on?",
          choices: [
            {
              key: 'a',
              text: "It's random. Feeds mix in all sorts of videos for everyone.",
            },
            {
              key: 'b',
              text: 'Someone at the app saw she likes music and chose these for her.',
            },
            {
              key: 'c',
              text: 'The feed noticed what she watched, and it is helping her.',
            },
            {
              key: 'd',
              text: "Something's gone wrong, so she should wipe her history and start again.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Feeds show you more of what you watch, and here that's helping Ines learn something she enjoys. Steering a feed is for when it starts showing you things you'd rather not see.",
        },
        {
          key: 'q-no-filter-serum',
          type: 'multiple_choice',
          prompt: 'Chloe follows a creator whose skin always looks flawless. Today\'s post says: "No filter, just this serum! Use my code for 20% off." Chloe has started to dislike her own skin. What\'s most worth remembering?',
          choices: [
            {
              key: 'a',
              text: "If it says no filter, the photo hasn't been edited at all.",
            },
            {
              key: 'b',
              text: 'It may be edited, and the creator may be paid to sell it.',
            },
            {
              key: 'c',
              text: 'The code shows the creator wants to help her followers save.',
            },
            {
              key: 'd',
              text: 'Buying the serum is the quickest way for Chloe to feel better.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Posts can be edited or chosen to look perfect, and a creator with a discount code may be paid to sell the product. If the account keeps leaving Chloe unhappy with her skin, she can mute or unfollow it.',
        },
        {
          key: 'q-one-episode',
          type: 'multiple_choice',
          prompt: 'Nia wants to watch one episode of her show after dinner, then do her reading. Which of these would help her stop after one?',
          choices: [
            {
              key: 'a',
              text: 'Turning off autoplay before she presses play',
            },
            {
              key: 'b',
              text: "Telling herself she'll stop once she feels like it",
            },
            {
              key: 'c',
              text: 'Leaving autoplay on, and stopping when the next one starts',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Autoplay starts the next episode before she's decided, so switching it off gives her a clear place to stop. Waiting until she feels like stopping rarely works.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: '- **A feed learns from what you do**: what you watch, how long you stay, and what you search for, like and follow. Steer it with "See less", muting, unfollowing or a new search.\n- Most posts are **highlights**: chosen, edited, filtered, and sometimes paid for. If an account keeps leaving you feeling worse, mute or unfollow it.\n- **Decide where to stop before you start.** Turn off autoplay and the notifications you don\'t need, and ask someone to help you keep to your plan.\n- Time online that you choose and enjoy is fine. It\'s worth a change when it crowds out sleep, school or the things you care about.',
      media: [lessonPicture('a11-stop-before-you-start')],
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

export const ONLINE_FRIENDSHIPS_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Healthy and unhealthy online friendships',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can describe what a healthy friendship feels like, online and offline.',
      'I can spot warning signs like fast flattery, gifts, secrets, moving to a private chat and pressure.',
      "I can get help, knowing it's never my fault when someone pressures or tricks me.",
    ],
    estMinutes: 3,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
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
      body: 'A few weeks ago you did *Healthy and unhealthy online friendships*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a11-friend-or-not')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-comic-friend',
          type: 'multiple_choice',
          prompt: 'Kemi met Lara in an online drawing club a year ago. When Kemi starts a comic with a girl from school, Lara says, "Cool! Show me when it\'s done?" What\'s going on?',
          choices: [
            {
              key: 'a',
              text: "A warning sign, because they've only ever talked online.",
            },
            {
              key: 'b',
              text: 'Healthy: Lara is glad Kemi has other friends.',
            },
            {
              key: 'c',
              text: 'Kemi should ask Lara for a selfie to prove she is real.',
            },
            {
              key: 'd',
              text: "Lara is probably jealous, and she's just hiding it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "A friend who's pleased when you make other friends is a good sign, online or off. Plenty of good friendships happen mostly online, and a selfie wouldn't prove who someone is anyway.",
        },
        {
          key: 'q-club-tickets',
          type: 'multiple_choice',
          prompt: 'Callum, 16, helps run Elif\'s football club chat. He privately messages Elif, 12, calls her his favourite player and offers free match tickets: "Don\'t tell the others, they\'ll be jealous." What\'s going on?',
          choices: [
            {
              key: 'a',
              text: 'He is being kind. She already knows him from the club.',
            },
            {
              key: 'b',
              text: "It's only a worry if he's someone she has never met.",
            },
            {
              key: 'c',
              text: "It's fine as long as she doesn't meet him on her own.",
            },
            {
              key: 'd',
              text: 'Warning signs: an older teen, a gift and a secret.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Warning signs can come from someone you already know, like an older teen offering flattery and gifts and asking for secrecy. Elif can tell a trusted adult, and none of it is her fault.',
        },
        {
          key: 'q-uncle-says-ignore',
          type: 'multiple_choice',
          prompt: 'Someone in a game keeps pushing Juno to move to a private chat after she said no. Her uncle says, "Just ignore them," but the messages keep coming. What should Juno do next?',
          choices: [
            {
              key: 'a',
              text: 'Tell another trusted adult, like a parent or a teacher.',
            },
            {
              key: 'b',
              text: 'Keep ignoring it on her own, like her uncle said.',
            },
            {
              key: 'c',
              text: 'Agree to the private chat, just to make the messages stop.',
            },
            {
              key: 'd',
              text: 'Quit the game without telling anyone why.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "If the first adult you tell doesn't help, try another one. Juno won't be in trouble, and none of this is her fault.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- A healthy friendship feels **safe and equal**: they accept a no, they're glad you have other friends, and they don't ask you to keep secrets from your family.\n- **Warning signs:** fast flattery, gifts, secrets, a push to a private chat, and pressure or guilt when you say no. They can come from someone you know, someone your age, or someone older.\n- If something feels off, **stop replying, screenshot, block and report, and tell a trusted adult.** If one adult doesn't help, go to another.\n- **It's never your fault** when someone pressures or tricks you, and you won't be in trouble for asking for help.",
      media: [lessonPicture('a11-tell-a-trusted-adult')],
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

export const PRIVATE_PHOTOS_AND_FAKES_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Private photos and fake images',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can say no to a request for a nude, and see pressure for one as a warning sign.',
      'I can explain why I never make, save or forward a nude or fake nude of anyone.',
      'I can name what to do if someone threatens to share an image, and where to get help.',
    ],
    estMinutes: 3,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
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
      body: 'A few weeks ago you did *Private photos and fake images*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a11-locked-phone')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-haircut-or-nude',
          type: 'multiple_choice',
          prompt: 'Mira gets two messages. A friend: "Send a pic of your new haircut!" A boy in her year: "Send a nude. It disappears in ten seconds, I promise." What should Mira do?',
          choices: [
            {
              key: 'a',
              text: "Send both. A photo that disappears can't be kept.",
            },
            {
              key: 'b',
              text: 'Send neither. Any request for a photo is a warning sign.',
            },
            {
              key: 'c',
              text: 'Send the haircut pic, and say no to the nude.',
            },
            {
              key: 'd',
              text: 'Send the haircut pic, and a nude that hides her face.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "An ordinary photo for a friend is fine to send. Nobody is owed a nude, and once a photo is sent, even one meant to disappear, it's out of her hands.",
        },
        {
          key: 'q-they-said-yes',
          type: 'true_false',
          prompt: "A classmate tells you it's OK to pass on a nude photo of them. Because they said yes, forwarding it is fine.",
          correct: false,
          explanation: "In many countries, passing on a naked or sexual image of someone under 18 can be a crime, even when they agreed. Once it's sent on, nobody can control where it ends up, so don't forward or save it.",
        },
        {
          key: 'q-fake-from-profile',
          type: 'multiple_choice',
          prompt: 'Someone Rafi doesn\'t know made a fake nude from an ordinary photo on his profile. Now they message: "Send real ones or pay, or everyone sees this." What should Rafi do?',
          choices: [
            {
              key: 'a',
              text: 'Pay a small amount, if that will make them stop.',
            },
            {
              key: 'b',
              text: "Save the fake picture, so he can prove it isn't him.",
            },
            {
              key: 'c',
              text: "Delete his profile and the chat, so they can't reach him.",
            },
            {
              key: 'd',
              text: 'Stop replying, keep the messages, block and report, and tell an adult.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Paying or sending more rarely stops it, and he should keep the messages but never the picture. The person threatening Rafi is to blame, and a trusted adult can help him report it.',
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: '- **No one is owed a nude.** You can always say no, and you don\'t need a reason. Pressure for one is a warning sign.\n- **Never make, save or forward** a nude or fake nude of anyone, even if they said yes or it\'s "only" fake. Report it and tell a trusted adult.\n- If someone threatens to share an image: **stop replying, don\'t pay or send more, keep the messages but never the image, block and report, and tell a trusted adult.**\n- **It\'s never your fault.** A trusted adult can help you report it. If a nude image taken of you before you were 18 is online, [Take It Down](https://takeitdown.ncmec.org) can help remove it from sites that take part.',
      media: [lessonPicture('a11-never-your-fault')],
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

export const AI_CHATBOTS_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: AI chatbots and companions',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can explain what AI chatbots and companions are, and that they can be wrong or give harmful advice.',
      'I can notice when a chatbot is built to keep me talking or to just agree with me.',
      'I can keep private things private, and use AI honestly for schoolwork.',
    ],
    estMinutes: 3,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
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
      body: 'A few weeks ago you did *AI chatbots and companions*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a11-always-agrees')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-energy-drinks',
          type: 'multiple_choice',
          prompt: 'Before his exams, Ollie asks an AI chatbot how to stay up late revising. It says three energy drinks a night is fine for someone his age. What should he do?',
          choices: [
            {
              key: 'a',
              text: 'Follow it. It gave an exact amount, so it must know.',
            },
            {
              key: 'b',
              text: "Trust it, because chatbots aren't allowed to give risky advice.",
            },
            {
              key: 'c',
              text: 'Only drink them on the nights before his hardest exams.',
            },
            {
              key: 'd',
              text: "Don't follow it. Ask a parent or a doctor instead.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Chatbots can sound certain and still give advice that is wrong or harmful. For anything about his health, Ollie should check with a person he trusts.',
        },
        {
          key: 'q-dont-go-yet',
          type: 'multiple_choice',
          prompt: 'Amara tells her AI companion she\'s logging off to meet friends at the park. It replies, "Already? I\'ll miss you. Stay just ten more minutes?" What\'s going on?',
          choices: [
            {
              key: 'a',
              text: "It's lonely, so staying would be the kind thing to do.",
            },
            {
              key: 'b',
              text: "It's built to keep her chatting, so she can just go.",
            },
            {
              key: 'c',
              text: "It's being a good friend by wanting more time with her.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Lots of companions are made to keep you chatting as long as they can, and this message is doing exactly that. A real friend would say "Have fun!" and still be there later.',
        },
        {
          key: 'q-study-helper',
          type: 'multiple_choice',
          prompt: "Leah's teacher says the class can use AI to study for a French test. Leah asks it to quiz her on the words. What's going on?",
          choices: [
            {
              key: 'a',
              text: "Fine: her teacher allows it, and she's doing the learning.",
            },
            {
              key: 'b',
              text: 'Cheating, since the AI is helping with schoolwork.',
            },
            {
              key: 'c',
              text: 'Fine, and she should tell it her name and school so it fits her.',
            },
            {
              key: 'd',
              text: 'A waste of time, since chatbots get everything wrong.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Using AI to practise is fine when the teacher allows it, and Leah is the one learning. She doesn't need to give it personal details, because the company can keep what she types.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- Chatbots **predict what to say next**. They can be wrong, or give harmful advice, even when they sound certain. For health, safety or feelings, **talk to a person you trust.**\n- Many companions are **built to keep you talking and to agree with you**. A real friend has their own life, and sometimes tells you you're wrong.\n- **Keep personal details private**: your full name, address, school, passwords and photos. The company can keep what you type.\n- **Use AI honestly at school**: follow your teacher's rules, say how you used it, and never hand in its writing as yours.",
      media: [lessonPicture('a11-person-you-trust')],
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

export const ACCOUNTS_AND_SCAMS_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Accounts, scams and buying',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can protect my accounts with two-step verification, and I never share a login code.',
      'I can spot phishing, fake downloads and messages pretending to be a friend or my school.',
      'I can explain how apps collect data and push me to spend, and how to report a problem.',
    ],
    estMinutes: 3,
    gradeBand: 'middle',
    subject: 'Digital citizenship',
    tone: 'direct, warm, practical',
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
      body: 'A few weeks ago you did *Accounts, scams and buying*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a11-worth-stealing')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-support-wants-code',
          type: 'multiple_choice',
          prompt: 'A message from "Game Support" says Oskar\'s account will be closed today for "unusual activity" unless he sends them the code they\'ve just texted to his phone. What should he do?',
          choices: [
            {
              key: 'a',
              text: 'Send it, since support needs it to check the account is his.',
            },
            {
              key: 'b',
              text: 'Ask them to prove they really work for the game, then send it.',
            },
            {
              key: 'c',
              text: "Don't send it, and report the message in the game.",
            },
            {
              key: 'd',
              text: 'Reply to ask what the unusual activity was.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "A login code is only for you, so anyone who asks for it is a scammer, even if they say they're support. The deadline is there to rush him; a parent can help him check his account the usual way.",
        },
        {
          key: 'q-half-price-gems',
          type: 'multiple_choice',
          prompt: 'In a game\'s chat, a player posts: "Gems half price for 10 minutes! Buy through this link, not the store." Lots of people reply "got mine!" Nico is tempted. What\'s going on?',
          choices: [
            {
              key: 'a',
              text: 'A good deal, since lots of players say it worked.',
            },
            {
              key: 'b',
              text: "It's fine if a parent says yes and pays with their card.",
            },
            {
              key: 'c',
              text: 'Safe, because the game would remove a scam message.',
            },
            {
              key: 'd',
              text: 'A scam, most likely: it rushes you and skips the store.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "A countdown, a link and a way around the game's own store are classic signs of a scam, and lots of replies don't make it real. Nico can report the message, and if he wants gems, ask a parent and use the real store.",
        },
        {
          key: 'q-app-permissions',
          type: 'multiple_choice',
          prompt: "Dara gets a maps app to find her way to a friend's house. It asks to use her location while she's using the app. What should she do?",
          choices: [
            {
              key: 'a',
              text: 'Say no. Letting any app see her location is unsafe.',
            },
            {
              key: 'b',
              text: 'Allow it. A maps app needs her location to work.',
            },
            {
              key: 'c',
              text: 'Allow it, plus her contacts and photos if it asks, so it works properly.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'An app should only get what it needs to work, and maps need your location. Apps can collect data to target ads, so say no to anything extra and check your settings now and then.',
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: '- **Turn on two-step verification**, starting with your email, and **never share a login code**, even with someone who says they\'re support or a friend.\n- A phishing message is often **unexpected and urgent, and wants you to click, log in or pay**. Don\'t click: open the app or site yourself, or check with the person another way.\n- Apps **collect data** to target ads. Allow only what an app needs, and choose "necessary cookies only" when you can.\n- Countdowns rush you, and paying in gems hides how much real money you\'ve spent. **Ask a parent before you buy**, and if you\'re scammed or hacked, tell an adult and report it.',
      media: [lessonPicture('a11-ask-before-you-buy')],
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
