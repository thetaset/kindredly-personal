import type { LessonSchemaV1 } from '../../lesson.utils';
import { lessonPicture } from '../lessonPictures';

// Digital citizenship, ages 14–17 (HAT-534, DCL-11). Adapted from eSafety Commissioner text (CC BY 4.0),
// England's RSHE guidance and UKCIS (OGL v3), Digital Inquiry Group's lateral-reading lessons (CC BY 4.0)
// and FTC advice (public domain); facts from NCMEC, Thorn and Common Sense are cited, not copied. Never
// change a step or question key once shipped: a child's progress and answers are saved against them.

export const IS_IT_TRUE: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Is it true?',
    subtitle: 'Digital citizenship · Part 1 of 5',
    objectives: [
      'I can check who is behind a site or account by leaving it and seeing what other sources say.',
      'I can spot an imitation news site, and check an image, video or voice that might be AI-made.',
      'I can decide when something is solid enough to share, and fix it if I share something false.',
    ],
    estMinutes: 9,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      title: 'True, false or not sure?',
      body: "Your group chat shares three things: a clip of a well-known singer saying something awful, a screenshot of a news story saying school is closed tomorrow, and a link from your cousin to an article about a new sleep study.\n\nSome of it is true. Some isn't. Looking closely won't always tell you which.\n\nIn this lesson you'll learn a quick way to check who is behind a source, how to spot imitation news sites and AI fakes, and how to decide what's worth sharing. The aim isn't to doubt everything. It's to know what to check.",
      media: [lessonPicture('a14-group-chat')],
    },
    {
      key: 'read-sideways',
      order: 20,
      kind: 'content',
      title: 'Leave the page',
      body: "On a site you don't know, the natural move is to read it closely, About page and all. But the About page is written by the people behind the site, so of course it sounds trustworthy.\n\nA better habit is to **leave the page**. Open a new tab, search the name of the site or group, and see what other sources say about it. This is called **lateral reading**. Ask:\n\n- **Who is behind this?** A news outlet, a company, a campaign, one person?\n- **What do others say about them?** Look past their own pages.\n- **What do they gain** if you believe it?\n\nIt works for posts, videos and accounts too.",
      media: [lessonPicture('a14-new-tab-search')],
    },
    {
      key: 'check-sideways',
      order: 30,
      kind: 'quiz',
      title: "Who's behind it?",
      questions: [
        {
          key: 'q-energy-drinks',
          type: 'multiple_choice',
          prompt: "For a school essay, you find a site called Teen Energy Facts saying energy drinks are perfectly safe for teenagers. Its About page says it's an independent research group. What's the best next step?",
          choices: [
            {
              key: 'a',
              text: "Use it. It says it's independent, and research groups know the topic.",
            },
            {
              key: 'b',
              text: 'Read the whole article carefully to see if its arguments hold up.',
            },
            {
              key: 'c',
              text: "Search the group's name in a new tab to see who runs it.",
            },
            {
              key: 'd',
              text: 'Check that the site looks professional and has no spelling mistakes.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "The About page is the site describing itself. Searching the name elsewhere can show who is really behind it, for example a company that sells energy drinks, which careful reading or a polished design can't tell you.",
        },
        {
          key: 'q-polished-site',
          type: 'true_false',
          prompt: 'A site with a professional design, a detailed About page and no spelling mistakes is probably trustworthy.',
          correct: false,
          explanation: 'Anyone can build a polished site. What matters is who is behind it and what independent sources say about them.',
        },
        {
          key: 'q-health-advice',
          type: 'multiple_choice',
          prompt: "You read some advice about sleep on your country's official health department website. You search it and find two well-known news outlets reporting the same advice. What's reasonable?",
          choices: [
            {
              key: 'a',
              text: 'Trust it. The source is known, and others back it up.',
            },
            {
              key: 'b',
              text: 'Keep searching until you find someone who disagrees.',
            },
            {
              key: 'c',
              text: 'Stay doubtful. Official sites get things wrong too.',
            },
            {
              key: 'd',
              text: 'Check how many people have liked or shared it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Checking isn't the same as doubting everything. A known source that other independent sources back up is a good reason to trust what you've read.",
        },
      ],
    },
    {
      key: 'fakes-that-look-real',
      order: 40,
      kind: 'content',
      title: 'Fakes that look real',
      body: "Some fakes are made to look real:\n\n- **Imitation news sites** copy the name and look of a real outlet, with a web address that's close but different.\n- **AI can make images, video and voices** of real people doing or saying things that never happened. It's getting hard to tell just by looking.\n\nSo don't rely on spotting glitches. Check around it instead:\n\n- **Search the claim.** If something big really happened, more than one trusted outlet will report it.\n- **Compare the address** with the real site you already know.\n- **Check the date.** Old stories get shared again as if they're new.\n- **Ask if it fits.** Is the person acting unlike themselves?",
      media: [lessonPicture('a14-lookalike-pages')],
    },
    {
      key: 'check-fakes',
      order: 50,
      kind: 'quiz',
      title: 'Real or made up?',
      questions: [
        {
          key: 'q-shocking-clip',
          type: 'multiple_choice',
          prompt: "A video of a politician saying something shocking is spreading fast. It looks completely real. What's the best way to check it?",
          choices: [
            {
              key: 'a',
              text: 'Look closely for blurry edges or glitches.',
            },
            {
              key: 'b',
              text: 'See how many views and shares it has.',
            },
            {
              key: 'c',
              text: 'Read the comments to see what others think.',
            },
            {
              key: 'd',
              text: 'Search whether trusted news outlets are reporting it.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'AI fakes can look flawless, and lots of shares only means lots of people saw it. If something big really happened, more than one trusted outlet will report it.',
        },
        {
          key: 'q-lookalike-site',
          type: 'multiple_choice',
          prompt: "A story says your favourite band has split. The site looks like a well-known news outlet, but its address has an extra word, and the real outlet has nothing on it. What's going on?",
          choices: [
            {
              key: 'a',
              text: "It's real, because the site looks just like the outlet.",
            },
            {
              key: 'b',
              text: "It's an imitation site copying the real outlet.",
            },
            {
              key: 'c',
              text: "It's true, and the real site just hasn't caught up yet.",
            },
            {
              key: 'd',
              text: 'The outlet has moved to a new address.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Imitation sites copy a real outlet's look and use an address that's close but different. When the real outlet has nothing on it, that's a strong sign it's made up.",
        },
      ],
    },
    {
      key: 'before-you-share',
      order: 60,
      kind: 'content',
      title: 'Before you share',
      body: "Sharing is where you can make things better or worse. A false post you pass on reaches people who trust you.\n\nBefore you share, pause on:\n\n- **How it makes you feel.** Posts built to make you angry, scared or excited are built to spread.\n- **Whether you've checked it.** If you haven't, you can hold off, or say you're not sure it's real.\n- **Who it could hurt.** A fake about a real person can do real damage.\n\nIf you share something that turns out to be false, **delete it and say so**. Everyone gets caught out sometimes.\n\nAnd when something checks out, share it. Good information deserves to spread.",
      media: [lessonPicture('a14-pause-check-share')],
    },
    {
      key: 'check-sharing',
      order: 70,
      kind: 'quiz',
      title: 'Share or not?',
      questions: [
        {
          key: 'q-shared-false',
          type: 'multiple_choice',
          prompt: "You shared a post about a new law banning headphones while walking. A friend replies with a fact-check showing it was made up. What's the best move?",
          choices: [
            {
              key: 'a',
              text: 'Delete it quietly and hope nobody noticed.',
            },
            {
              key: 'b',
              text: 'Leave it up, since people have already seen it.',
            },
            {
              key: 'c',
              text: 'Reply that it could still become law one day.',
            },
            {
              key: 'd',
              text: 'Delete it and post that it was wrong.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Saying it was wrong stops it spreading and lets the people who saw it know. Deleting quietly leaves them still believing it.',
        },
        {
          key: 'q-checked-ok',
          type: 'multiple_choice',
          prompt: "You've checked a story: your town's website and two local news outlets all say the bridge near school shuts on Monday. Should you share it in your class chat?",
          choices: [
            {
              key: 'a',
              text: 'Yes. It checks out, and people will want to know.',
            },
            {
              key: 'b',
              text: "Only if you add that you're not sure it's real.",
            },
            {
              key: 'c',
              text: 'No. Leave sharing news to the news outlets.',
            },
            {
              key: 'd',
              text: "No. It's safer never to pass news on.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Checking isn't about never sharing. Once something holds up, passing it on helps people get good information.",
        },
        {
          key: 'q-angry-share',
          type: 'multiple_choice',
          prompt: "A post claims a well-known charity wastes most of its money. It makes you furious, and it's being shared everywhere. You haven't checked it. What's the best move?",
          choices: [
            {
              key: 'a',
              text: 'Share it. People deserve to know.',
            },
            {
              key: 'b',
              text: 'Share it, since so many others already have.',
            },
            {
              key: 'c',
              text: 'Hold off, and check it before you decide.',
            },
            {
              key: 'd',
              text: "Share it, and delete it later if it's false.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Posts built to make you angry are built to spread. Checking first means you don't pass something false on to people who trust you.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two of these to talk through with a parent or another adult you trust. You'll each know things the other doesn't.\n\n- Each find one post from this week you weren't sure about. Check them together by leaving the page. What did you find?\n- Where do each of you get your news? Which sources do you trust, and why?\n- Have either of you shared something that turned out to be false? What happened, and what would you do now?",
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

export const IMAGES_CONSENT_DEEPFAKES: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Images, consent and deepfakes',
    subtitle: 'Digital citizenship · Part 2 of 5',
    objectives: [
      'I can explain why sharing or making a sexual image of someone without consent is abuse, even when AI made it.',
      'I can say what the law in many countries says about sexual images of anyone under 18.',
      'I can support someone it happens to, and point them to reporting and removal help.',
    ],
    estMinutes: 9,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      title: 'When an image is used to hurt',
      body: 'Someone in your year posts an image in a big group chat: an AI-made nude of a classmate, made from one of her ordinary photos. A few people react with laughing faces. A few forward it.\n\nThe image is fake. The harm is real. This is **image-based abuse**.\n\nIn this lesson you\'ll learn what consent means for images, what the law says, why "it\'s only AI" doesn\'t make it OK, and what to do if it happens to you or a friend. No graphic detail, just what you need to know.',
      media: [lessonPicture('a14-fake-image-real-harm')],
    },
    {
      key: 'consent-and-images',
      order: 20,
      kind: 'content',
      title: 'Consent and images',
      body: "**Consent** means a real yes: clear, informed and not pressured. It can be taken back.\n\nFor images, that means:\n\n- Sending someone a photo, or agreeing to one being taken, **isn't a yes to sharing it** with anyone else.\n- If someone asks you to take down a photo of them, take it down.\n- Sharing, or threatening to share, someone's nude or sexual image without their consent is **image-based abuse**. In many countries it's a crime.\n\nUnder 18, the rule is stricter. In many countries, making, keeping or forwarding a sexual image of anyone under 18 can be a crime, **even if they agreed, and even if you're both under 18**.",
      media: [lessonPicture('a14-photo-no-forward')],
    },
    {
      key: 'check-consent',
      order: 30,
      kind: 'quiz',
      title: 'Whose yes counts?',
      questions: [
        {
          key: 'q-ex-photo',
          type: 'multiple_choice',
          prompt: 'Jamie, 16, still has a topless photo his ex, who is also 16, sent him when they were together. A friend says, "Send it to the group chat, she\'ll never find out." Which is true?',
          choices: [
            {
              key: 'a',
              text: 'He can share it, because she chose to send it to him.',
            },
            {
              key: 'b',
              text: "It's OK if he crops her face out first.",
            },
            {
              key: 'c',
              text: 'Sharing it would be abuse, even though she sent it to him.',
            },
            {
              key: 'd',
              text: "It's fine in a private group chat, just not in a public post.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Sending a photo to one person isn't a yes for anyone else to see it. Sharing it would be abuse, and because she's under 18, in many countries it can be a crime too, so the best move is to delete it.",
        },
        {
          key: 'q-take-down',
          type: 'multiple_choice',
          prompt: 'Priya asks everyone before posting a group photo from a birthday party. The next day, one friend asks her to take it down. What should Priya do?',
          choices: [
            {
              key: 'a',
              text: 'Take it down, or edit that friend out of it.',
            },
            {
              key: 'b',
              text: 'Leave it up, since everyone agreed at the time.',
            },
            {
              key: 'c',
              text: 'Ask the rest of the group to vote on it.',
            },
            {
              key: 'd',
              text: 'Make the post private, but keep it up.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'Asking first was the right move, and a yes can also be taken back. Removing the photo, or the friend from it, respects that.',
        },
        {
          key: 'q-under-18-law',
          type: 'true_false',
          prompt: 'In many countries, forwarding a sexual image of someone under 18 can be a crime, even if they agreed to it being sent.',
          correct: true,
          explanation: "When someone is under 18, their agreement doesn't make sharing legal in many places. The simple rule: don't forward it.",
        },
      ],
    },
    {
      key: 'only-ai',
      order: 40,
      kind: 'content',
      title: '"It\'s only AI"',
      body: 'Apps can now "nudify" a photo, or put someone\'s face into a sexual image. Some people call that a joke.\n\nIt isn\'t. A fake sexual image of a real person is **image-based abuse**. If the person is under 18, it can be a crime in many countries, the same as a real image.\n\nMost young people see the harm. In one US survey of people aged 13 to 20, 84% said deepfake nudes hurt the person shown.\n\n**Never make, ask for or forward** a sexual image of a real person, fake or not. If one reaches you, don\'t pass it on. Report it, and tell an adult.',
      media: [lessonPicture('a14-dont-pass-it-on')],
    },
    {
      key: 'check-only-ai',
      order: 50,
      kind: 'quiz',
      title: 'Joke or abuse?',
      questions: [
        {
          key: 'q-group-chat-fake',
          type: 'multiple_choice',
          prompt: "The AI-made nude of your classmate is still going round the group chat. What's the best thing to do?",
          choices: [
            {
              key: 'a',
              text: 'Forward it to her, so she knows it exists.',
            },
            {
              key: 'b',
              text: "Nothing. It's fake, so it isn't really about her.",
            },
            {
              key: 'c',
              text: "Screenshot the image, so there's proof of who posted it.",
            },
            {
              key: 'd',
              text: "Don't pass it on, report it, and tell an adult.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'A fake sexual image of a real person is abuse, and not passing it on while getting an adult involved helps stop it. Forwarding or screenshotting the image spreads it further, and in many countries can itself be a crime.',
        },
        {
          key: 'q-show-one-friend',
          type: 'multiple_choice',
          prompt: "Your friend shows you a nude that someone sent him privately. He says it's fine, because he's only showing you, not posting it. Is he right?",
          choices: [
            {
              key: 'a',
              text: "Yes. Showing one person isn't the same as sharing it.",
            },
            {
              key: 'b',
              text: 'No. Showing it to anyone else is image-based abuse.',
            },
            {
              key: 'c',
              text: "Yes, as long as he doesn't send you a copy.",
            },
            {
              key: 'd',
              text: 'Only if the person in it never finds out.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Sending a nude to one person isn't a yes for anyone else to see it, even one friend. If the person in it is under 18, in many countries keeping or passing it on can be a crime too.",
        },
        {
          key: 'q-nudify-app',
          type: 'multiple_choice',
          prompt: 'A friend finds an app that makes a fake nude from any photo. He wants to try it on a classmate\'s picture, "just to see". What do you say?',
          choices: [
            {
              key: 'a',
              text: "Don't. A fake nude of a real person is abuse.",
            },
            {
              key: 'b',
              text: 'Fine, as long as he deletes it straight after.',
            },
            {
              key: 'c',
              text: "Fine, if he doesn't show it to anyone.",
            },
            {
              key: 'd',
              text: "Use a celebrity's photo instead. It's not someone he knows.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "A fake sexual image of a real person, famous or not, is image-based abuse, and if they're under 18 it can be a crime in many countries. In one US survey, 84% of young people said deepfake nudes hurt the person shown.",
        },
      ],
    },
    {
      key: 'if-it-happens',
      order: 60,
      kind: 'content',
      title: 'If it happens to you',
      body: "If someone shares, or threatens to share, a sexual image of you, real or fake: **it is not your fault.** They're the one in the wrong.\n\n- **Tell an adult you trust.** You won't be in trouble for asking for help. If the first adult doesn't help, tell another.\n- **Save the evidence**: usernames, links, dates. Don't screenshot the image itself.\n- **Report it** in the app.\n- **[Take It Down](https://takeitdown.ncmec.org)** is a free service for nude or sexual images taken of you before you were 18. It makes a digital fingerprint of the image, which never leaves your device, so apps that take part can find and remove copies.",
      media: [lessonPicture('a14-if-it-happens-steps')],
    },
    {
      key: 'check-if-happens',
      order: 70,
      kind: 'quiz',
      title: 'What helps',
      questions: [
        {
          key: 'q-leo',
          type: 'multiple_choice',
          prompt: 'Leo, 15, finds out that a nude photo he sent someone months ago has been posted online. He feels sick, and wants to delete all his accounts and tell no one. What would help most?',
          choices: [
            {
              key: 'a',
              text: 'Delete his accounts so nobody can find him.',
            },
            {
              key: 'b',
              text: 'Message the person who posted it and threaten them back.',
            },
            {
              key: 'c',
              text: 'Wait, and hope it disappears on its own.',
            },
            {
              key: 'd',
              text: 'Tell an adult he trusts, and use Take It Down.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "It isn't his fault, and he doesn't have to deal with it alone. An adult can help him report it, and Take It Down can help stop copies spreading on apps that take part.",
        },
        {
          key: 'q-save-evidence',
          type: 'multiple_choice',
          prompt: 'A sexual image of Zoe, 16, has been posted online. She is reporting it with help from an adult she trusts. What should she save as evidence?',
          choices: [
            {
              key: 'a',
              text: 'A screenshot of the image, as proof it was posted.',
            },
            {
              key: 'b',
              text: 'Nothing. Deleting every message makes it go away faster.',
            },
            {
              key: 'c',
              text: 'Usernames, links and dates, but not the image itself.',
            },
            {
              key: 'd',
              text: 'The image and the chat, sent to a friend to keep safe.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Usernames, links and dates are the evidence to save. Copying the image, even as proof, could spread it further, and none of this is Zoe's fault.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Pick two of these to talk through with a parent or another adult you trust. You don\'t have to share anything personal.\n\n- If a friend came to you about an image, what would you say first? What would you want an adult to do?\n- Ask them: "If something like this happened to me, how would you react?" Agreeing on that now makes it easier to ask later.\n- Why do some people treat fake images as a joke? What would change that where you are?',
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

export const SEXTORTION: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Sextortion: what to do',
    subtitle: 'Digital citizenship · Part 3 of 5',
    objectives: [
      "I can recognise how sextortion usually starts and the signs it's happening.",
      "I can say what to do: stop replying, don't pay, keep the evidence, report and block, tell an adult.",
      "I can explain that it's never the young person's fault, and where to get images removed.",
    ],
    estMinutes: 9,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      title: 'Blackmail with a photo',
      body: "Aiden, 16, gets a follow from someone who looks his age and seems to know people from his school. The chat turns flirty fast. She asks to move to another app and swap photos. After he sends one, the tone changes: pay, or it goes to everyone he knows.\n\nThis is **sextortion**: blackmail using a sexual image, often for money. It's a crime, and it's never the young person's fault.\n\nIn this lesson you'll learn how it usually goes, exactly what to do if it happens, and how to help a friend.",
      media: [lessonPicture('a14-chat-warning')],
    },
    {
      key: 'how-it-goes',
      order: 20,
      kind: 'content',
      title: 'How it usually goes',
      body: 'Sextortion can come from someone you know, like an ex. But reports of the money kind have risen fast, and it usually follows a pattern:\n\n- A **new contact** who seems your age, often with friends or followers in common.\n- **Fast flirting** and compliments.\n- A push to **move to another app**, often a private or video one.\n- **Asking for images**, sometimes sending one first: "I\'ll show you if you show me."\n- Then **threats**: pay, or the image goes to your friends and family.\n\nThe profile is often fake, with stolen photos. Teenage boys have been the most common targets of the money kind, but it can happen to anyone.',
      media: [lessonPicture('a14-pattern-five-steps')],
    },
    {
      key: 'check-how',
      order: 30,
      kind: 'quiz',
      title: 'Spot the pattern',
      questions: [
        {
          key: 'q-warning-signs',
          type: 'multiple_choice',
          prompt: 'Someone you started chatting to yesterday has been flirting a lot. Now they send a photo of themselves and say, "Your turn." What\'s going on?',
          choices: [
            {
              key: 'a',
              text: "They trust you, so it's fair to send one back.",
            },
            {
              key: 'b',
              text: "It's a common sextortion move. You don't have to send anything.",
            },
            {
              key: 'c',
              text: "It's fine, as long as they really are your age.",
            },
            {
              key: 'd',
              text: "It's fine, as long as your face isn't in it.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: '"I\'ll show you if you show me" is a common sextortion move, and the photo they sent may well be stolen. Whatever they say, you don\'t owe anyone a photo.',
        },
        {
          key: 'q-mutual-followers',
          type: 'multiple_choice',
          prompt: 'An account that followed you yesterday says she goes to a nearby school, and she has 12 followers in common with you. What does that tell you?',
          choices: [
            {
              key: 'a',
              text: "She's definitely real, because your friends already follow her.",
            },
            {
              key: 'b',
              text: 'She must be a scammer, so block her and warn everyone.',
            },
            {
              key: 'c',
              text: 'Not much. Fake accounts often follow people from one school.',
            },
            {
              key: 'd',
              text: 'You can trust her once she sends a photo of herself.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "Mutual followers aren't proof: scammers often follow lots of people from one school to look like a real local. That doesn't make every new follower a scammer, but it's a reason to take things slowly.",
        },
      ],
    },
    {
      key: 'what-to-do',
      order: 40,
      kind: 'content',
      title: 'If someone threatens you',
      body: "If someone threatens to share an image of you, child protection experts advise:\n\n- **Stop replying.** You don't owe them an answer.\n- **Don't pay, and don't send anything more.** Paying rarely stops it. They often ask for more.\n- **Keep the evidence.** Screenshot the messages, the threat and their profile, but not the image itself. Don't delete the chat or your account.\n- **Report and block** the account in the app.\n- **Tell an adult you trust**, today.\n\nYour country's child protection hotline or the police can help too. You don't need to wait until you're sure it's serious enough. It is.",
      media: [lessonPicture('a14-stop-dont-pay-tell')],
    },
    {
      key: 'check-what-to-do',
      order: 50,
      kind: 'quiz',
      title: 'Your next move',
      questions: [
        {
          key: 'q-threat-arrives',
          type: 'multiple_choice',
          prompt: 'Aiden gets the message: "Send money in the next hour or I post your photo." What should he do first?',
          choices: [
            {
              key: 'a',
              text: "Pay, since it's the quickest way to make it stop.",
            },
            {
              key: 'b',
              text: "Delete the app and his account, so they can't reach him again.",
            },
            {
              key: 'c',
              text: 'Send a different photo to buy some time.',
            },
            {
              key: 'd',
              text: 'Stop replying, save the evidence, and tell an adult.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Paying or sending more rarely ends it, and deleting his account would lose the evidence. Saving it and getting an adult involved gives him the best chance of stopping it.',
        },
        {
          key: 'q-pay-once',
          type: 'true_false',
          prompt: 'If you pay once, the blackmailer will usually delete the image and leave you alone.',
          correct: false,
          explanation: "Paying rarely stops it, and they often ask for more. That's why experts say don't pay, and get help instead.",
        },
      ],
    },
    {
      key: 'not-your-fault',
      order: 60,
      kind: 'content',
      title: "It's not your fault",
      body: 'People who are targeted often feel ashamed, panicked, or like there\'s no way out. Those feelings are common, and there is a way through. Here\'s what\'s true:\n\n- **It is not your fault.** Even if you sent an image, the blackmailer is the one committing a crime.\n- **You won\'t be in trouble for asking for help.**\n- **Images can be removed.** [Take It Down](https://takeitdown.ncmec.org) is a free service that helps stop nude or sexual images taken of you before you were 18 being shared on apps that take part.\n- If the first adult doesn\'t help, **tell another**.\n\nWords to start with: "Something\'s happened online. I\'m scared, and I need your help."',
      media: [lessonPicture('a14-not-your-fault')],
    },
    {
      key: 'check-not-fault',
      order: 70,
      kind: 'quiz',
      title: 'Getting help',
      questions: [
        {
          key: 'q-friend-secret',
          type: 'multiple_choice',
          prompt: 'Your friend Sam tells you someone is blackmailing him with a photo. He says, "Promise you won\'t tell anyone." What\'s the best response?',
          choices: [
            {
              key: 'a',
              text: "Tell him it's not his fault, and help him tell an adult.",
            },
            {
              key: 'b',
              text: 'Promise to keep quiet, and help him find the money to pay.',
            },
            {
              key: 'c',
              text: "Tell him he shouldn't have sent it in the first place.",
            },
            {
              key: 'd',
              text: "Tell him to ignore it, and it'll probably go away.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Keeping it secret leaves him alone with it. Telling him it isn't his fault, and helping him get an adult involved, is the most useful thing a friend can do.",
        },
        {
          key: 'q-removal',
          type: 'multiple_choice',
          prompt: "Mia, 17, finds out a nude photo she sent at 15 is being shared. She thinks nothing can be done, because it's already out there. What's true?",
          choices: [
            {
              key: 'a',
              text: "She's right. Once it's online, it's out of her hands.",
            },
            {
              key: 'b',
              text: 'She has to find and report every copy herself.',
            },
            {
              key: 'c',
              text: 'Free help like Take It Down can get copies removed from apps that take part.',
            },
            {
              key: 'd',
              text: 'She could pay whoever posted it to take it down.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "It isn't too late, and it isn't her fault. Take It Down is free help for nude or sexual images taken before 18, and an adult she trusts can help her use it.",
        },
        {
          key: 'q-scared-to-tell',
          type: 'multiple_choice',
          prompt: "Aiden is scared to tell an adult. He thinks he'll be in trouble for sending the photo in the first place. What's true?",
          choices: [
            {
              key: 'a',
              text: "He's right, so he should try to sort it out alone first.",
            },
            {
              key: 'b',
              text: "He won't be in trouble for asking for help. It's not his fault.",
            },
            {
              key: 'c',
              text: 'He should only tell someone if the photo actually gets posted.',
            },
            {
              key: 'd',
              text: 'He should tell a friend instead, so it stays between them.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Even though he sent the photo, the blackmailer is the one to blame. He doesn't need to wait until it gets worse, and if the first adult doesn't help, he can tell another.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: 'Pick two of these to talk through with a parent or another adult you trust.\n\n- Ask them: "If I came to you about something like this, what would you do first?" Agree now that the first step is help, not blame.\n- Together, look up your country\'s child protection hotline and save the number in your phone.\n- Talk about why someone might keep this secret, and what would make it easier to tell.',
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

export const RELATIONSHIPS_CONTROL_AI: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Relationships, control and AI',
    subtitle: 'Digital citizenship · Part 4 of 5',
    objectives: [
      "I can explain that consent can't be assumed and can be taken back at any time.",
      'I can tell healthy trust apart from control through tech, like demanding passwords or tracking someone.',
      "I can explain how AI companions are designed, and why one isn't a relationship.",
    ],
    estMinutes: 9,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      title: 'Close, or too close?',
      body: "Maya's boyfriend says that if she really loved him, she'd share her location all the time, like he does. Her friend Ella talks every night to an AI chatbot that always agrees with her, and says it gets her better than anyone.\n\nNeither situation is clear-cut. Both are worth thinking about.\n\nIn this lesson you'll look at consent, the line between care and control, and what AI companions are actually built to do.",
      media: [lessonPicture('a14-location-and-ai')],
    },
    {
      key: 'consent',
      order: 20,
      kind: 'content',
      title: 'Consent, every time',
      body: '**Consent** means a free, clear yes, whether it\'s to a photo, a message or anything physical. It\'s easy to get wrong in a few ways:\n\n- **It can\'t be assumed.** Being together, saying yes last time, or not saying no isn\'t a yes.\n- **It can be taken back at any time**, even partway through.\n- **Pressure cancels it.** A yes you got through guilt, nagging or "if you loved me" isn\'t free.\n\nConsent is the minimum, not the goal. Respect means caring how the other person actually feels.\n\nSome online content, including porn, shows pressure or disrespect as normal. It gives a distorted picture of real relationships.',
      media: [lessonPicture('a14-free-clear-yes')],
    },
    {
      key: 'check-consent',
      order: 30,
      kind: 'quiz',
      title: 'A real yes',
      questions: [
        {
          key: 'q-pulls-away',
          type: 'multiple_choice',
          prompt: "Ravi and his girlfriend have kissed before. At a party, she pulls away and says she's not in the mood. What's true?",
          choices: [
            {
              key: 'a',
              text: "They've kissed before, so it's fine to carry on.",
            },
            {
              key: 'b',
              text: 'It only counts as a no if she actually says "no".',
            },
            {
              key: 'c',
              text: "She's said not now, and that's the answer.",
            },
            {
              key: 'd',
              text: 'He should ask a few more times in case she changes her mind.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "A yes before isn't a yes now, and pulling away is a clear signal. Asking again and again would be pressure.",
        },
        {
          key: 'q-change-mind',
          type: 'true_false',
          prompt: "Once someone has said yes, they can't change their mind partway through.",
          correct: false,
          explanation: 'Consent can be taken back at any time. If someone changes their mind, you stop.',
        },
      ],
    },
    {
      key: 'care-or-control',
      order: 40,
      kind: 'content',
      title: 'Care or control?',
      body: 'Tech makes it easy to stay close, and easy to control someone. Control can look like love at first. Watch for patterns like:\n\n- **Demanding passwords**, or checking your phone.\n- **Tracking your location**, or getting angry when you turn it off.\n- **Constant messages**: "Where are you? Who with?", and anger if you don\'t reply right away.\n- Telling you what to post, or who you can follow.\n\nHealthy trust looks different. You can say no without a fight, you keep your own friends and privacy, and sharing a location is a choice either of you can change.\n\nIf this sounds familiar, talk to someone you trust. It\'s not your fault.',
      media: [lessonPicture('a14-messages-and-tracking')],
    },
    {
      key: 'check-control',
      order: 50,
      kind: 'quiz',
      title: 'Spot the difference',
      questions: [
        {
          key: 'q-control-signs',
          type: 'multiple_choice',
          prompt: "Your partner sends 30 messages while you're at sports practice, then gets angry that you didn't reply. They say it's only because they care. What's going on?",
          choices: [
            {
              key: 'a',
              text: 'Care. They were worried about you.',
            },
            {
              key: 'b',
              text: "Control. Care doesn't come with anger for not replying.",
            },
            {
              key: 'c',
              text: 'Normal. Everyone panics a bit when someone goes quiet.',
            },
            {
              key: 'd',
              text: "Your fault, for not warning them you'd be busy.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Nonstop messages and anger when you don't reply straight away are signs of control, even when they're called care. It's not your fault, and talking to someone you trust can help.",
        },
        {
          key: 'q-friends-location',
          type: 'multiple_choice',
          prompt: 'Two friends share their locations so they can meet up after school. Either of them can turn it off at any time, and neither minds when the other does. Is this OK?',
          choices: [
            {
              key: 'a',
              text: "Yes. It's a choice they both made and can both change.",
            },
            {
              key: 'b',
              text: 'No. Sharing locations is always a sign of control.',
            },
            {
              key: 'c',
              text: 'Only if their parents can see the locations too.',
            },
            {
              key: 'd',
              text: 'No. It makes it too easy to check up on each other.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: "Sharing a location isn't the problem in itself. Pressure, checking up, and anger when it's turned off are what make it control.",
        },
        {
          key: 'q-friend-phone',
          type: 'multiple_choice',
          prompt: 'Your friend says her boyfriend checks her phone every day "because he cares". She seems anxious about it. What could you do?',
          choices: [
            {
              key: 'a',
              text: "Tell her that's just normal in a serious relationship.",
            },
            {
              key: 'b',
              text: 'Message her boyfriend and tell him to stop.',
            },
            {
              key: 'c',
              text: "Stay out of it, since it's their business.",
            },
            {
              key: 'd',
              text: 'Listen, and suggest she talks to an adult she trusts.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'Listening without judging helps her feel less alone, and an adult she trusts can help her work out what to do. Messaging him yourself takes the choice away from her.',
        },
      ],
    },
    {
      key: 'ai-companions',
      order: 60,
      kind: 'content',
      title: 'AI companions',
      body: "**AI companions** are chatbots built to act like a friend or partner. In a 2025 survey, 72% of US teens aged 13 to 17 had tried one.\n\nThey can feel caring, but they're products. They're designed to keep you talking, and they tend to agree with you rather than challenge you. That can feel good, but it isn't the same as being known. Some have also given harmful advice.\n\nThe closeness is simulated, and it isn't a relationship. One US research group advises that no one under 18 use them.\n\nIf you've used one, notice how you feel afterwards, and whether it's taking time from people.",
      media: [lessonPicture('a14-built-to-keep-you-talking')],
    },
    {
      key: 'check-ai',
      order: 70,
      kind: 'quiz',
      title: "What's it built for?",
      questions: [
        {
          key: 'q-ella',
          type: 'multiple_choice',
          prompt: "Ella says her AI companion understands her better than her friends do, because it never disagrees with her. What's really going on?",
          choices: [
            {
              key: 'a',
              text: 'It really does understand her better than people can.',
            },
            {
              key: 'b',
              text: "It's designed to agree with her. That isn't understanding.",
            },
            {
              key: 'c',
              text: "It's fine, because it's always there when she needs it.",
            },
            {
              key: 'd',
              text: "It does disagree sometimes. She just doesn't notice.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: "Companions tend to agree and keep you talking, because that's how they're designed. Friends who sometimes disagree with you are part of what makes a relationship real.",
        },
        {
          key: 'q-taking-time',
          type: 'multiple_choice',
          prompt: "Owen chats to an AI companion every night, and has started turning down plans with friends. He says it's just easier. What should he notice?",
          choices: [
            {
              key: 'a',
              text: "Nothing. If it's easier, that's a good thing.",
            },
            {
              key: 'b',
              text: 'Whether he chats enough for it to really know him.',
            },
            {
              key: 'c',
              text: 'Whether he has picked the most realistic companion.',
            },
            {
              key: 'd',
              text: "Whether it's taking time he'd spend with people.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Companions are built to keep you talking, and easier isn't the same as good for you. Noticing what it's taking time from, and how he feels afterwards, is a good place to start.",
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two of these to talk about with a parent or another adult you trust. These are opinion questions, so compare views rather than looking for a right answer.\n\n- Where's the line between staying in touch and checking up? Do you both draw it in the same place?\n- Should couples share passwords or locations? What about families?\n- Have you tried an AI chatbot as a companion, or seen friends use one? What did it get right, and what felt off?",
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

export const DATA_MONEY_SCAMS: LessonSchemaV1 = {
  schemaVersion: 1,
  schemaId: 'kindredly.lesson.v1',
  meta: {
    title: 'Data, money and scams',
    subtitle: 'Digital citizenship · Part 5 of 5',
    objectives: [
      'I can explain what apps collect about me, and use permissions, privacy settings and two-step verification.',
      'I can spot investment, marketplace and money mule scams before I lose money.',
      'I can explain how gambling-style features work, and why gambling can lead to debt.',
    ],
    estMinutes: 9,
    gradeBand: 'high',
    subject: 'Digital citizenship',
    tone: 'direct, respectful, practical',
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
      title: 'Lucky break, or a trick?',
      body: 'Noah is selling his old bike online. A buyer offers more than the asking price, as long as Noah sends back the difference once the payment arrives. The same week, a stranger messages Noah\'s sister about an "easy job": money lands in her account, she passes it on, and she keeps a cut.\n\nBoth sound like luck. Both are scams.\n\nIn this lesson you\'ll learn what apps collect about you, how to lock down your accounts, how common money scams work, and how gambling-style features can drain your money.',
      media: [lessonPicture('a14-bike-offer')],
    },
    {
      key: 'your-data',
      order: 20,
      kind: 'content',
      title: 'Your data, your accounts',
      body: "Lots of apps and sites make money from your data. They can track what you search, watch and buy, and where you go, then use it for targeted ads or share it with other companies.\n\nYou have more control than you might think:\n\n- **Check app permissions.** Does a game need your contacts or location? Turn off what an app doesn't need.\n- **Turn off personalised ads** in your phone's privacy settings.\n- **Turn on two-step verification**, starting with email, social and payment apps. Even with your password, nobody gets in without the second step.\n- **Never share a verification code** with someone who contacted you.",
      media: [lessonPicture('a14-app-permissions')],
    },
    {
      key: 'check-data',
      order: 30,
      kind: 'quiz',
      title: 'Lock it down',
      questions: [
        {
          key: 'q-wallpaper-app',
          type: 'multiple_choice',
          prompt: "A free wallpaper app asks for access to your contacts, microphone and location. What's the best choice?",
          choices: [
            {
              key: 'a',
              text: 'Allow it all. Apps need these things to work.',
            },
            {
              key: 'b',
              text: 'Allow it this once, and remove the permissions later on.',
            },
            {
              key: 'c',
              text: "Deny what it doesn't need, or choose a different app.",
            },
            {
              key: 'd',
              text: 'Allow it, since everyone else has.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: "A wallpaper app has no reason to need your contacts, microphone or location. Turning off what an app doesn't need, or skipping apps that ask for too much, keeps your data with you.",
        },
        {
          key: 'q-code-request',
          type: 'multiple_choice',
          prompt: 'Someone messages: "Hi, it\'s the support team. We\'ve just texted you a code. Read it back so we can secure your account." What do you do?',
          choices: [
            {
              key: 'a',
              text: "Read it back. They said they're from support.",
            },
            {
              key: 'b',
              text: 'Send only the first half of the code.',
            },
            {
              key: 'c',
              text: "Ask them to prove they're really from the support team first.",
            },
            {
              key: 'd',
              text: "Don't share it, and check your account in the app itself.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: "Asking for a code they just sent you is a common way to take over an account. Whatever the story, don't share a verification code with someone who contacted you.",
        },
        {
          key: 'q-two-step',
          type: 'multiple_choice',
          prompt: "Your friend says two-step verification is pointless if you already have a strong password. What's true?",
          choices: [
            {
              key: 'a',
              text: "She's right. A strong password is all you need.",
            },
            {
              key: 'b',
              text: 'It stops someone getting in, even if they know your password.',
            },
            {
              key: 'c',
              text: "It's only worth it for bank accounts.",
            },
            {
              key: 'd',
              text: "It only matters once you've already been hacked.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Even with your password, nobody gets in without the second step, like a code from an app or a security key. Start with your email, social and payment apps.',
        },
      ],
    },
    {
      key: 'money-scams',
      order: 40,
      kind: 'content',
      title: 'Money scams',
      body: 'Scams change, but the moves repeat:\n\n- **Guaranteed returns.** "Turn 50 into 500 in a week with crypto." Only scammers guarantee big profits.\n- **Paying in crypto or gift cards.** No real business demands it.\n- **Overpaying.** A buyer pays more than your price and asks for the difference back. The payment turns out to be fake, and you lose the money and the item.\n- **Fake payment messages**, sent in the hope you\'ll hand over the item before you check.\n- **A rush.** "Today only." Pressure is there to stop you thinking.\n\nBefore you pay or invest, search the name with words like "scam" or "review".',
      media: [lessonPicture('a14-only-scammers-guarantee')],
    },
    {
      key: 'check-scams',
      order: 50,
      kind: 'quiz',
      title: 'Spot the scam',
      questions: [
        {
          key: 'q-bike',
          type: 'multiple_choice',
          prompt: "Noah's bike is listed at 200. A buyer offers 300 and asks him to send back the extra 100 once the payment arrives. What's going on?",
          choices: [
            {
              key: 'a',
              text: 'An overpayment scam. Only take the asking price.',
            },
            {
              key: 'b',
              text: 'A generous buyer. He should take the deal.',
            },
            {
              key: 'c',
              text: "It's fine, once the payment shows in his account.",
            },
            {
              key: 'd',
              text: "It's fine, as long as they meet in person to swap the bike.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['a'],
          explanation: 'A payment can appear in your account and still turn out to be fake later. By then, the scammer has the bike and the money Noah sent back.',
        },
        {
          key: 'q-investment-flags',
          type: 'multiple_choice',
          prompt: "Your friend's older brother says he made 500 in a week on a crypto app that guarantees returns. He sends you a link and says to join today. What should you do?",
          choices: [
            {
              key: 'a',
              text: 'Join. You know him, and it worked for him.',
            },
            {
              key: 'b',
              text: 'Put in a small amount first, to test it.',
            },
            {
              key: 'c',
              text: "Don't join. Guaranteed returns and a rush are scam signs.",
            },
            {
              key: 'd',
              text: 'Join, if the reviews inside the app are good.',
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['c'],
          explanation: 'Only scammers guarantee big profits, and "join today" is pressure to stop you thinking. Someone you know can be fooled too, so search the app\'s name with words like "scam" or "review" first.',
        },
      ],
    },
    {
      key: 'mules-and-gambling',
      order: 60,
      kind: 'content',
      title: 'Money mules and gambling',
      body: '**Money mules.** "Easy money: we send cash to your account, you pass most of it on and keep a cut." That money may be stolen, and you could get into legal trouble for moving it. Say no.\n\n**Gambling-style features.** Loot boxes, spins and paid packs give random rewards for real money. Online gambling, and gambling-like features in games, can lead to debt. Gambling can also harm mental health, which is one reason gambling sites are age-restricted.\n\nHabits that help:\n\n- Set a spending limit before you play.\n- Never borrow money to spend in a game.\n- If spending starts to feel out of control, tell someone you trust.',
      media: [lessonPicture('a14-loot-box')],
    },
    {
      key: 'check-mules-gambling',
      order: 70,
      kind: 'quiz',
      title: 'Easy money?',
      questions: [
        {
          key: 'q-easy-job',
          type: 'multiple_choice',
          prompt: 'A stranger offers Noah\'s sister an "easy job": money will arrive in her bank account, she sends it on, and she keeps 10%. What is this?',
          choices: [
            {
              key: 'a',
              text: 'A normal online job, like plenty of students do these days.',
            },
            {
              key: 'b',
              text: 'A money mule scam that could get her into legal trouble.',
            },
            {
              key: 'c',
              text: 'Fine, if she only does it once.',
            },
            {
              key: 'd',
              text: "Fine, as long as she doesn't share her password.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['b'],
          explanation: 'Criminals use people like this to move stolen money. She could get into legal trouble for it, so the answer is no.',
        },
        {
          key: 'q-small-purchases',
          type: 'true_false',
          prompt: "Small in-game purchases can't add up to a real money problem.",
          correct: false,
          explanation: 'Small amounts add up, and gambling-like features in games can lead to debt. Setting a limit before you play helps you keep track.',
        },
        {
          key: 'q-gift-cards',
          type: 'multiple_choice',
          prompt: "You're buying concert tickets from someone online. They'll only take payment in gift cards, because they say it's quicker. What's going on?",
          choices: [
            {
              key: 'a',
              text: 'Fair enough. Gift cards are quick for both of you.',
            },
            {
              key: 'b',
              text: 'Fine, as long as the tickets are a good price.',
            },
            {
              key: 'c',
              text: 'Fine, if they send a photo of the tickets first.',
            },
            {
              key: 'd',
              text: "It's a scam sign. No real seller demands gift cards.",
            },
          ],
          multiSelect: false,
          correctChoiceKeys: ['d'],
          explanation: 'No real business demands payment in gift cards or crypto. Before you pay someone new, search their name with words like "scam" or "review".',
        },
      ],
    },
    {
      key: 'talk-it-over',
      order: 80,
      kind: 'content',
      title: 'Talk it over',
      body: "Pick two of these to try with a parent or another adult you trust.\n\n- Each open the privacy and permission settings on one app you use a lot. Did anything surprise you? Change anything you don't want.\n- Has either of you been targeted by a scam? What gave it away, or what nearly worked?\n- Talk about spending in games and apps. What's a fair limit, and who should decide it?",
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
