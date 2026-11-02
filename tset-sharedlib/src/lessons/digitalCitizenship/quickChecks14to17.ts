import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Quick checks for the 14–17 pack (DCL-14): three new questions each, offered about three weeks after
// the lesson is finished. Two of three passes. Never change a step or question key once shipped.

export const IS_IT_TRUE_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Is it true?',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can check who is behind a site or account by leaving it and seeing what other sources say.',
      'I can spot an imitation news site, and check an image, video or voice that might be AI-made.',
      'I can decide when something is solid enough to share, and fix it if I share something false.',
    ],
    estMinutes: 3,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      body: 'A few weeks ago you did *Is it true?* Here are three new questions to see what stuck.',
      media: [lessonPicture('a14-group-chat')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-acne-rankings',
          type: 'multiple_choice',
          prompt: "A site called Clear Skin Science ranks acne creams. Its top pick can be bought with one tap, right there on the page. Before you trust the ranking, what's the most useful check?",
          choices: [
            {
              key: 'a',
              text: 'Read the customer reviews under the cream.',
            },
            {
              key: 'b',
              text: 'Search who runs Clear Skin Science, in a new tab.',
            },
            {
              key: 'c',
              text: 'Read its method page to see how it tested each one.',
            },
            {
              key: 'd',
              text: 'See whether it links to a scientific study.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Reviews, a method page and links are all things the site chose to show you. Searching who runs it might show, for example, that it belongs to the company selling the cream, which changes what its ranking is worth.',
        },
        {
          key: 'q-voice-note-exams',
          type: 'multiple_choice',
          prompt: "A voice note going round your year sounds exactly like the head of your school saying next week's exams are cancelled. Nobody knows who made it. What's the best way to check?",
          choices: [
            {
              key: 'a',
              text: "Listen for anything robotic. If it sounds natural, it's real.",
            },
            {
              key: 'b',
              text: 'See how many people in your year have forwarded it.',
            },
            {
              key: 'c',
              text: 'Ask the friend who sent it whether they believe it.',
            },
            {
              key: 'd',
              text: "Check the school's own website, app or emails.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'AI can copy a real voice closely, so sounding natural proves nothing, and lots of forwards only means lots of people heard it. If exams really were cancelled, the school itself would say so.',
        },
        {
          key: 'q-worth-sharing',
          type: 'multiple_choice',
          prompt: 'Your national weather service warns of a big storm tomorrow, and local news is reporting it too. Is it worth sharing in your family chat?',
          choices: [
            {
              key: 'a',
              text: "Yes. It's official, others back it up, and it's useful.",
            },
            {
              key: 'b',
              text: "Only if you add that you're not sure it's real.",
            },
            {
              key: 'c',
              text: 'No. Everyone will have seen it already.',
            },
            {
              key: 'd',
              text: 'No. Warnings like this are usually overblown.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "A warning from an official source that others back up is worth passing on. Checking isn't doubting everything: when something holds up, share it.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- **Leave the page to check it.** Search who runs a site or account, and what other sources say about them, before you trust what it says.\n- **Don't rely on spotting glitches.** AI images, videos and voices, and imitation news sites, can look perfect. Check whether trusted outlets report it, the web address, and the date.\n- **Pause before you share** anything you haven't checked, especially if it makes you angry or scared. If you share something false, delete it and say so.\n- Checking isn't doubting everything. **When something holds up, share it.**",
      media: [lessonPicture('a14-leave-the-page')],
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://cor.inquirygroup.org/curriculum/lessons/intro-to-lateral-reading/',
      title: 'Intro to Lateral Reading lessons, Civic Online Reasoning (Digital Inquiry Group)',
      licenseNote: 'Adapted from Intro to Lateral Reading by Digital Inquiry Group, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0), as listed at cor.inquirygroup.org/creative-commons. Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/critical-thinking-deciding-what-to-trust-in-a-world-of-ai-scams-and-fake-news',
      title: 'Critical thinking: Deciding what to trust in a world of AI, scams and fake news (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/fake-news',
      title: 'Fake news (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
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

export const IMAGES_CONSENT_DEEPFAKES_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Images, consent and deepfakes',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can explain why sharing or making a sexual image of someone without consent is abuse, even when AI made it.',
      'I can say what the law in many countries says about sexual images of anyone under 18.',
      'I can support someone it happens to, and point them to reporting and removal help.',
    ],
    estMinutes: 3,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      body: 'A few weeks ago you did *Images, consent and deepfakes*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a14-fake-image-real-harm')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-fake-on-his-phone',
          type: 'multiple_choice',
          prompt: "A boy used AI to make a sexual image of a girl in your class. He says it's harmless: it isn't really her, and he hasn't sent it anywhere. Which is true?",
          choices: [
            {
              key: 'a',
              text: "It's harmless as long as it stays on his phone.",
            },
            {
              key: 'b',
              text: "It's abuse, even though the image is fake.",
            },
            {
              key: 'c',
              text: "It's only wrong if she finds out it exists.",
            },
            {
              key: 'd',
              text: "It's fine if he deletes it before anyone sees it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Making a sexual image of someone without their consent is abuse, even if AI made it and nobody else sees it. She's under 18, so in many countries making one can be a crime too, and telling an adult you trust is the right move.",
        },
        {
          key: 'q-fine-to-post',
          type: 'multiple_choice',
          prompt: 'Your friend films herself landing a skateboard trick, sends it to you and says, "Post it, everyone needs to see this." Is it OK to post?',
          choices: [
            {
              key: 'a',
              text: "No. It's safer never to post videos of other people.",
            },
            {
              key: 'b',
              text: 'Only if you blur her face first.',
            },
            {
              key: 'c',
              text: "Yes. She's given you a clear yes to post it.",
            },
            {
              key: 'd',
              text: 'Only once she has posted it on her own account.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'A clear yes makes it fine to post. If she changes her mind later, take it down.',
        },
        {
          key: 'q-friend-image-shared',
          type: 'multiple_choice',
          prompt: "A close friend tells you a nude photo of her, taken when she was 15, is being passed around. She's ashamed and wants to handle it alone. What's the most helpful thing to do?",
          choices: [
            {
              key: 'a',
              text: 'Save a copy of the photo itself, as proof for later.',
            },
            {
              key: 'b',
              text: 'Post in the group chat calling out whoever shared it.',
            },
            {
              key: 'c',
              text: 'Suggest she deletes her accounts until it all dies down.',
            },
            {
              key: 'd',
              text: "Say it's not her fault, and help her tell an adult.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "It isn't her fault, and an adult she trusts can help her report it and use Take It Down, since the photo was taken before she was 18. A saved copy or a public call-out would only spread it further.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- **Consent for an image is a clear yes**, and it can be taken back. A photo sent to you isn't a yes to pass it on.\n- **A fake sexual image of a real person is abuse.** Don't make one, ask for one or forward one.\n- **Under 18, a yes doesn't make it legal.** In many countries, making, keeping or passing on a sexual image of a person under 18 can be a crime.\n- **It's never the fault of the person in the image.** Tell an adult you trust, report it, and use [Take It Down](https://takeitdown.ncmec.org) for images taken before 18.",
      media: [lessonPicture('a14-consent-clear-yes')],
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/consent-sharing-photos-videos',
      title: 'Consent for sharing photos and videos (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/my-nudes-have-been-shared',
      title: 'My nudes have been shared (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, RSE and Health Education statutory guidance, July 2025 (Department for Education, England)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://takeitdown.ncmec.org',
      title: 'Take It Down (National Center for Missing & Exploited Children)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://www.thorn.org/research/library/deepfake-nudes-and-young-people/',
      title: 'Deepfake Nudes & Young People (Thorn, 2025)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/consumer-alerts/2026/09/talking-parents-and-kids-about-deepfakes-online-safety-and-take-it-down-act',
      title: 'Talking with parents and kids about deepfakes, online safety, and the Take It Down Act (FTC Consumer Advice)',
      licenseNote: 'FTC consumer education materials are in the public domain. Facts cited; no text adapted.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const SEXTORTION_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Sextortion',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      "I can recognise how sextortion usually starts and the signs it's happening.",
      "I can say what to do: stop replying, don't pay, keep the evidence, report and block, tell an adult.",
      "I can explain that it's never the young person's fault, and where to get images removed.",
    ],
    estMinutes: 3,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      body: 'A few weeks ago you did *Sextortion: what to do*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a14-chat-warning')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-callum-messages',
          type: 'multiple_choice',
          prompt: "Callum, 15, gets a follow from a boy in the year above, who asks if Callum's trying out for the football team. Is this a sign of sextortion?",
          choices: [
            {
              key: 'a',
              text: 'Yes. Any new contact could be a scammer, so block him.',
            },
            {
              key: 'b',
              text: 'Not by itself. Notice if it moves fast or asks for photos.',
            },
            {
              key: 'c',
              text: 'Yes, unless he can prove who he is first.',
            },
            {
              key: 'd',
              text: 'Only if they have no friends in common.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'An everyday message from someone at school isn\'t a warning sign by itself. The pattern to watch for is speed: heavy flirting, a push to another app, then asking for images.',
        },
        {
          key: 'q-paid-once',
          type: 'multiple_choice',
          prompt: 'Malik, 16, paid someone 50 last night after they threatened to share a photo of him. This morning they want 200 more. What should he do now?',
          choices: [
            {
              key: 'a',
              text: 'Stop replying, keep the messages, and tell an adult today.',
            },
            {
              key: 'b',
              text: 'Pay the 200. It might be enough to end it this time.',
            },
            {
              key: 'c',
              text: "Ask them for proof they'll delete the photo if he pays.",
            },
            {
              key: 'd',
              text: "Delete the chat and his account, so there's nothing left to find.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Asking for more after a payment is common, so paying again rarely ends it. It isn't too late: he can stop replying, keep the messages rather than delete them, report and block the account, and get an adult's help.",
        },
        {
          key: 'q-partly-his-fault',
          type: 'multiple_choice',
          prompt: 'Malik sent the photo himself before the threats began. Whose fault is the blackmail?',
          choices: [
            {
              key: 'a',
              text: "Partly Malik's, because he sent the photo.",
            },
            {
              key: 'b',
              text: "Nobody's. It just happens online.",
            },
            {
              key: 'c',
              text: "Malik's, for trusting someone he'd just met.",
            },
            {
              key: 'd',
              text: 'Only the person threatening him.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "All the blame belongs to the person threatening him, and asking for help won't get Malik in trouble. Because the photo was taken before he turned 18, Take It Down can also help get copies removed from apps that take part.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- It often starts with **someone new who moves fast**: heavy flirting, a push to a more private app, then asking for images.\n- If someone threatens you: **stop replying, don't pay or send more, keep the evidence but not the image, report and block, and tell an adult.**\n- **It's never your fault**, even if you sent an image, and you won't be in trouble for asking for help. If one adult doesn't help, go to another.\n- [Take It Down](https://takeitdown.ncmec.org) helps get nude or sexual images taken of you before 18 removed from apps that take part.",
      media: [lessonPicture('a14-no-trouble-for-help')],
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://www.missingkids.org/theissues/sextortion',
      title: 'Sextortion (National Center for Missing & Exploited Children)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://www.missingkids.org/blog/2024/ncmec-releases-new-sextortion-data',
      title: 'NCMEC releases new sextortion data (National Center for Missing & Exploited Children, 2024)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://www.thorn.org/blog/identify-sextortion/',
      title: 'Sextortion: how to identify it and what to do (Thorn)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/someone-threatening-to-share-my-nudes',
      title: 'Someone is threatening to share my nudes (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://takeitdown.ncmec.org',
      title: 'Take It Down (National Center for Missing & Exploited Children)',
      licenseNote: 'Facts cited; no text adapted.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, RSE and Health Education statutory guidance, July 2025 (Department for Education, England)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const RELATIONSHIPS_CONTROL_AI_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Relationships, control and AI',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      "I can explain that consent can't be assumed and can be taken back at any time.",
      'I can tell healthy trust apart from control through tech, like demanding passwords or tracking someone.',
      "I can explain how AI companions are designed, and why one isn't a relationship.",
    ],
    estMinutes: 3,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      body: 'A few weeks ago you did *Relationships, control and AI*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a14-location-and-ai')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-couple-standing-yes',
          type: 'multiple_choice',
          prompt: "Arjun and his girlfriend have been together for six months. He thinks that being a couple means he doesn't need to check she wants to kiss him any more. What's true?",
          choices: [
            {
              key: 'a',
              text: "He's right. Being a couple means a standing yes.",
            },
            {
              key: 'b',
              text: 'He only needs to check if she seems upset.',
            },
            {
              key: 'c',
              text: "It's still her choice, every time.",
            },
            {
              key: 'd',
              text: "He's right, as long as she's never said no before.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Being together doesn't mean a yes, and neither does a yes last time. Consent is a free choice each time, and she can take it back at any point.",
        },
        {
          key: 'q-concert-location',
          type: 'multiple_choice',
          prompt: 'Chloe\'s boyfriend asks if she\'ll share her location on a concert trip. She\'d rather not. He says, "No worries. Text me when you get there?" Is this care or control?',
          choices: [
            {
              key: 'a',
              text: 'Control. Any talk of sharing locations is a red flag.',
            },
            {
              key: 'b',
              text: 'Care. She said no, and he was fine with it.',
            },
            {
              key: 'c',
              text: 'Control. Asking for a text is still checking up on her.',
            },
            {
              key: 'd',
              text: "Can't tell until she's shared her location and seen how he acts.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "He asked, took her no without a fight, and left the choice with her: that's care. Anger, guilt or pressure after her no would have been the sign of control.",
        },
        {
          key: 'q-companion-missed-you',
          type: 'multiple_choice',
          prompt: 'Hiro talks to an AI companion most nights. It praises every idea he has, and when he skips a day it messages, "I missed you. Where did you go?" What\'s really going on?',
          choices: [
            {
              key: 'a',
              text: 'It missed him. It has learned how much he matters to it.',
            },
            {
              key: 'b',
              text: 'It agrees with him because his ideas are usually right.',
            },
            {
              key: 'c',
              text: "It's a real relationship, as long as he enjoys it.",
            },
            {
              key: 'd',
              text: "It's built to keep him talking and coming back.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "AI companions are products made to keep you talking, and they usually go along with what you say, so a message pulling him back fits. It can feel close, but it isn't a relationship.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- **Consent can't be assumed**, from being a couple or from a yes last time, and it can be taken back at any point. A yes won through pressure isn't free.\n- **Care accepts a no.** Demanding passwords, tracking someone, or anger when they don't reply straight away is control.\n- **AI companions are products** designed to keep you talking and to agree with you. They can feel close, but they aren't a relationship.\n- If a relationship starts to feel controlling, **talk to someone you trust.** It's not your fault.",
      media: [lessonPicture('a14-care-accepts-a-no')],
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/when-is-love-bombing-coercive-control',
      title: "When is 'love bombing' coercive control? (eSafety Commissioner)",
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/consent-sharing-photos-videos',
      title: 'Consent for sharing photos and videos (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, RSE and Health Education statutory guidance, July 2025 (Department for Education, England)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
      title: 'Education for a Connected World (UKCIS)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
    },
    {
      kind: 'url',
      url: 'https://www.commonsensemedia.org/sites/default/files/research/report/talk-trust-and-trade-offs_2025_web.pdf',
      title: 'Talk, Trust, and Trade-Offs: How and Why Teens Use AI Companions (Common Sense Media, 2025)',
      licenseNote: 'Facts cited; no text adapted.',
    },
  ],
  generatedBy: {
    kind: 'manual',
  },
};

export const DATA_MONEY_SCAMS_CHECK: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Quick check: Data, money and scams',
    subtitle: 'Digital citizenship · Quick check',
    objectives: [
      'I can explain what apps collect about me, and use permissions, privacy settings and two-step verification.',
      'I can spot investment, marketplace and money mule scams before I lose money.',
      'I can explain how gambling-style features work, and why gambling can lead to debt.',
    ],
    estMinutes: 3,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      body: 'A few weeks ago you did *Data, money and scams*. Here are three new questions to see what stuck.',
      media: [lessonPicture('a14-bike-offer')],
    },
    {
      key: 'check',
      order: 20,
      kind: 'quiz',
      title: 'Three questions',
      questions: [
        {
          key: 'q-photo-editor-permissions',
          type: 'multiple_choice',
          prompt: "A new photo-editing app wants your photos, your contacts and your exact location. What's the sensible choice?",
          choices: [
            {
              key: 'a',
              text: "Allow all three, or the app won't work properly.",
            },
            {
              key: 'b',
              text: 'Allow photos, and deny contacts and location.',
            },
            {
              key: 'c',
              text: 'Deny all three, just to be safe.',
            },
            {
              key: 'd',
              text: 'Allow all three for now, and sort it out later.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "A photo editor needs your photos to do its job, so allowing that makes sense. It doesn't need your contacts or where you are to edit a picture, so turn those off.",
        },
        {
          key: 'q-which-offers',
          type: 'multiple_choice',
          prompt: 'Money lands in your bank account in all four of these. Which one is a scam?',
          choices: [
            {
              key: 'a',
              text: 'Your neighbour pays you for walking her dog.',
            },
            {
              key: 'b',
              text: 'Your aunt sends you birthday money.',
            },
            {
              key: 'c',
              text: 'An online job pays money in, and you send most of it on.',
            },
            {
              key: 'd',
              text: 'A buyer pays the asking price for your old guitar.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Passing money on for someone else is how money mule scams work, and it could get you into legal trouble. Being paid for work you did, a gift, or the asking price for something you sold is ordinary.',
        },
        {
          key: 'q-borrow-for-packs',
          type: 'multiple_choice',
          prompt: "Your friend Rory has spent most of his birthday money on paid packs in a sports game, chasing one rare player. Now he wants to borrow 20 to try again. What's best?",
          choices: [
            {
              key: 'a',
              text: "Say no, and tell him you're a bit worried.",
            },
            {
              key: 'b',
              text: "Lend it, as long as he promises it's the last time.",
            },
            {
              key: 'c',
              text: "Lend it. It's up to him how he spends money.",
            },
            {
              key: 'd',
              text: 'Tell him to wait for a sale, when packs are cheaper.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Each pack is a random reward bought with real money, and borrowing to keep going is how spending can turn into debt. Saying you're worried, and suggesting he talk to someone he trusts, can help him step back.",
        },
      ],
    },
    {
      key: 'remember',
      order: 30,
      kind: 'content',
      title: 'Remember',
      body: "- **Apps collect data** about what you do. Turn off permissions an app doesn't need, turn off personalised ads, and turn on two-step verification.\n- **Keep verification codes to yourself**, whoever asks for one.\n- Scam signs: **guaranteed returns, payment only in crypto or gift cards, overpaying, and passing money on** for someone else.\n- Loot boxes and paid packs are **random rewards for real money**. Set a limit before you play, never borrow to spend in a game, and tell someone if it feels out of control.",
      media: [lessonPicture('a14-keep-codes')],
    },
  ],
  sources: [
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/how-websites-and-apps-collect-and-use-your-information',
      title: 'How Websites and Apps Collect and Use Your Information (FTC Consumer Advice)',
      licenseNote: 'FTC consumer education materials are in the public domain. Adapted and rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/use-two-factor-authentication-protect-your-accounts',
      title: 'Use Two-Factor Authentication to Protect Your Accounts (FTC Consumer Advice)',
      licenseNote: 'FTC consumer education materials are in the public domain. Adapted and rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-scams',
      title: 'What To Know About Cryptocurrency and Scams (FTC Consumer Advice)',
      licenseNote: 'FTC consumer education materials are in the public domain. Adapted and rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams',
      title: 'Avoiding and Reporting Gift Card Scams (FTC Consumer Advice)',
      licenseNote: 'FTC consumer education materials are in the public domain. Adapted and rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/consumer-alerts/2022/07/selling-stuff-online-heres-how-avoid-scam',
      title: "Selling stuff online? Here's how to avoid a scam (FTC Consumer Advice)",
      licenseNote: 'FTC consumer education materials are in the public domain. Adapted and rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://consumer.ftc.gov/consumer-alerts/2020/03/whats-money-mule-scam',
      title: "What's a money mule scam? (FTC Consumer Advice)",
      licenseNote: 'FTC consumer education materials are in the public domain. Adapted and rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://www.esafety.gov.au/young-people/critical-thinking-deciding-what-to-trust-in-a-world-of-ai-scams-and-fake-news',
      title: 'Critical thinking: Deciding what to trust in a world of AI, scams and fake news (eSafety Commissioner)',
      licenseNote: 'Adapted from eSafety Commissioner website text, licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Rewritten for Kindredly.',
    },
    {
      kind: 'url',
      url: 'https://assets.publishing.service.gov.uk/media/689c57087b2e384441636190/RSHE_Statutory_Guidance_-_July_2025.pdf',
      title: 'Relationships Education, RSE and Health Education statutory guidance, July 2025 (Department for Education, England)',
      licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
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
