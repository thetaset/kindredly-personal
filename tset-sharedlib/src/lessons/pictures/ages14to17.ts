// Pictures for the ages 14–17 pack (HAT-580). Drawn with the kit in ./kit.ts. The oldest pack, so
// objects and word cards rather than people; the lessons on images, sextortion and relationships use
// objects and word cards only. The phone, laptop, shield, coins and other parts below are this file's own.

import {
  FONT,
  GOLD,
  HUE,
  INK,
  QUESTION,
  at,
  bubble,
  floorShadow,
  glint,
  heart,
  picture,
  text,
  wordCard,
  type Drawing,
  type LessonPictureEntry,
} from "./kit";

const TRUE = HUE.real; // Is it true?
const IMAGES = HUE.private; // Images, consent and deepfakes
const THREAT = HUE.tell; // Sextortion: what to do
const CLOSE = HUE.pretend; // Relationships, control and AI
const MONEY = HUE.stop; // Data, money and scams

const GREY = "#c3cad6";
const RED = "#e0566f";
const BLUE: [string, string] = ["#7fb2ec", "#3c62a8"];

// ---- Parts ----

const bar = (x: number, y: number, w: number, h: number, fill: string, rx = h / 2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;

/** A phone standing on the origin; `screen` draws in the screen's own coordinates (w-12 by h-12). */
function phone(d: Drawing, w: number, h: number, screen = ""): string {
  const sw = w - 12;
  const sh = h - 12;
  const clip = d.clip(`<rect width="${sw}" height="${sh}" rx="13"/>`);
  return (
    floorShadow(w * 1.1) +
    `<g filter="url(#sh)"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="19" fill="${d.lin("#5b6478", "#353c4b")}"/></g>` +
    `<path d="M${-w / 2 + 16} ${-h + 1.5}H${w / 2 - 16}" stroke="#fff" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round"/>` +
    `<g transform="translate(${-w / 2 + 6} ${-h + 6})"><rect width="${sw}" height="${sh}" rx="13" fill="${d.lin("#ffffff", "#e9eef5")}"/><g clip-path="${clip}">${screen}</g>` +
    bar(sw / 2 - 13, 5, 26, 7, "#353c4b") +
    `</g>`
  );
}

/** A laptop standing on the origin, its lid w by h; `screen` draws in the screen's coordinates (w-20 by h-18). */
function laptop(d: Drawing, w: number, h: number, screen = ""): string {
  const sw = w - 20;
  const sh = h - 18;
  const clip = d.clip(`<rect width="${sw}" height="${sh}" rx="4"/>`);
  return (
    floorShadow(w * 1.2) +
    `<g filter="url(#sh)"><rect x="${-w / 2}" y="${-h - 10}" width="${w}" height="${h}" rx="10" fill="${d.lin("#5b6478", "#353c4b")}"/>` +
    `<path d="M${-w / 2 - 20} -10H${w / 2 + 20}Q${w / 2 + 22} -1 ${w / 2 + 12} 0H${-w / 2 - 12}Q${-w / 2 - 22} -1 ${-w / 2 - 20} -10Z" fill="${d.lin("#e3e8ef", "#a3abba")}"/></g>` +
    `<path d="M${-w / 2 + 12} ${-h - 8.5}H${w / 2 - 12}" stroke="#fff" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round"/>` +
    bar(-22, -10, 44, 4, "#8a93a3") +
    `<g transform="translate(${-sw / 2} ${-h - 1})"><rect width="${sw}" height="${sh}" rx="4" fill="${d.lin("#ffffff", "#e9eef5")}"/><g clip-path="${clip}">${screen}</g></g>`
  );
}

/** A browser window w by h, its origin the top-left corner; `page` draws below its 24-high bar. */
function browser(w: number, h: number, paper: string, page: string, address: string): string {
  return (
    `<g filter="url(#sh)"><rect width="${w}" height="${h}" rx="10" fill="${paper}"/></g>` +
    `<path d="M0 10Q0 0 10 0H${w - 10}Q${w} 0 ${w} 10V24H0Z" fill="#dfe4ec"/>` +
    [12, 22, 32].map((x) => `<circle cx="${x}" cy="12" r="3" fill="#b4bccb"/>`).join("") +
    bar(44, 5, w - 54, 14, "#fff") +
    address +
    `<g transform="translate(0 24)">${page}</g>`
  );
}

/** A shield centred on the origin, 84 wide and 100 tall, `inner` drawn on its face. */
function shield(d: Drawing, c: [string, string], inner = ""): string {
  return (
    `<g filter="url(#sh)"><path d="M0 -50L42 -36V-2Q42 32 0 50Q-42 32 -42 -2V-36Z" fill="${d.lin(c[0], c[1])}"/></g>` +
    `<path d="M-34 -31L0 -42L34 -31" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    inner
  );
}

const TICK = (color: string, width = 7) =>
  `<path d="M-16 0L-5 11L17 -12" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** A shield standing on the floor at the origin. */
const standingShield = (d: Drawing, inner: string) =>
  floorShadow(80) + at(0, -52, shield(d, BLUE, inner));

/** A stack of gold coins standing on the origin. */
function coins(d: Drawing, count = 4): string {
  const top = d.lin(GOLD[0], GOLD[1]);
  let stack = "";
  for (let i = 0; i < count; i++) {
    const y = -10 - i * 11;
    stack +=
      `<rect x="-26" y="${y - 7}" width="52" height="9" fill="#b8800a"/><ellipse cx="0" cy="${y + 2}" rx="26" ry="8" fill="#b8800a"/>` +
      `<ellipse cx="0" cy="${y - 7}" rx="26" ry="8" fill="${top}"/>`;
  }
  const ty = -10 - (count - 1) * 11 - 7;
  return (
    floorShadow(64) +
    `<g filter="url(#sh)">${stack}</g>` +
    `<ellipse cx="0" cy="${ty}" rx="16" ry="4.5" fill="none" stroke="#b8800a" stroke-opacity=".55" stroke-width="2"/>`
  );
}

/** A bank card, its origin the bottom-left corner. */
function bankCard(d: Drawing): string {
  return (
    `<g filter="url(#sh)"><rect x="0" y="-62" width="98" height="62" rx="8" fill="${d.lin(BLUE[0], BLUE[1])}"/></g>` +
    `<path d="M9 -61H89" stroke="#fff" stroke-opacity=".45" stroke-width="1.5" stroke-linecap="round"/>` +
    bar(12, -46, 20, 15, d.lin(GOLD[0], GOLD[1]), 3) +
    bar(12, -20, 44, 5, "#fff") +
    bar(62, -20, 22, 5, "#fff")
  );
}

/** A map pin whose point is the origin. */
function mapPin(d: Drawing): string {
  return (
    `<g filter="url(#sh)"><path d="M0 0C-6 -14 -20 -24 -20 -38A20 20 0 0 1 20 -38C20 -24 6 -14 0 0Z" fill="${d.lin("#f6877c", "#c0392b")}"/></g>` +
    `<circle cx="0" cy="-38" r="7.5" fill="#fff"/>`
  );
}

/** An amber warning sign centred on the origin, about 80 wide. */
function warning(d: Drawing): string {
  return (
    `<g filter="url(#sh)"><path d="M-6 -32Q0 -42 6 -32L38 24Q42 32 32 32H-32Q-42 32 -38 24Z" fill="${d.lin("#ffd066", "#e8833a")}"/></g>` +
    `<path d="M-4 -30Q0 -36 4 -30" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    bar(-4, -14, 8, 28, INK) +
    `<circle cx="0" cy="23" r="4.5" fill="${INK}"/>`
  );
}

/** A white round sign with a forward arrow, crossed out in red; centred on the origin. */
function noForward(d: Drawing): string {
  return (
    `<g filter="url(#sh)"><circle r="42" fill="${d.lin("#ffffff", "#eef1f5")}"/></g>` +
    `<path d="M-16 16V8Q-16 -6 -2 -6H14M6 -16L16 -6L6 4" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle r="31" fill="none" stroke="${RED}" stroke-width="7"/><path d="M-22 -22L22 22" stroke="${RED}" stroke-width="7" stroke-linecap="round"/>`
  );
}

/** A white round badge centred on the origin. */
const badge = (paper: string, inner: string) =>
  `<g filter="url(#sh)"><circle r="27" fill="${paper}"/></g>` + inner;

/** The round mark an AI chatbot has beside its messages. */
const botMark = (fill: string) => `<circle r="9" fill="${fill}"/>` + glint(12);

/** A bike drawn in lines, its wheels on the origin's line. */
const bike = (stroke: string) =>
  `<g fill="none" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">` +
  `<circle cx="-24" cy="0" r="13"/><circle cx="24" cy="0" r="13"/>` +
  `<path d="M-24 0L-6 -22L0 0H-24M-6 -22H16L0 0M16 -22L24 0M-6 -22L-7 -28M-12 -28H-2M16 -22L13 -30H21"/></g>`;

const toggle = (x: number, y: number, on: boolean) =>
  bar(x, y, 28, 16, on ? "#3f8f4f" : GREY) + `<circle cx="${on ? x + 20 : x + 8}" cy="${y + 8}" r="6" fill="#fff"/>`;

/** Words set from the left, for a list on a light object. */
const leftText = (x: number, y: number, words: string, size: number) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${INK}">${words}</text>`;

/** A purple box of random rewards, a gold question mark on its front, standing on the origin. */
function lootBox(d: Drawing): string {
  const gold = d.lin(GOLD[0], GOLD[1]);
  return (
    floorShadow(140) +
    `<g filter="url(#sh)"><rect x="-58" y="-80" width="116" height="80" rx="8" fill="${d.lin("#b48ae6", "#6a37b0")}"/>` +
    `<rect x="-66" y="-104" width="132" height="30" rx="8" fill="${d.lin("#c9a4f2", "#7b46c4")}"/></g>` +
    `<path d="M-56 -102H56" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="-58" y="-74" width="116" height="6" fill="#5a2d99" fill-opacity=".3"/>` +
    `<circle cx="0" cy="-38" r="24" fill="${gold}"/>` +
    text(0, -26, "?", 34, "#5a2d99", 800)
  );
}

// ---- Screens ----

/** A group chat sharing a video, a news story and a link (120 by 184). */
const groupChat = (d: Drawing) =>
  `<rect width="120" height="34" fill="#e3f1e6"/>` +
  `<circle cx="16" cy="23" r="6" fill="#e8833a"/><circle cx="26" cy="23" r="6" fill="#4f78c4"/><circle cx="36" cy="23" r="6" fill="#8a5bd1"/>` +
  bar(48, 20, 44, 6, "#9aa3b2") +
  bar(8, 42, 84, 46, "#e9edf3", 10) +
  bar(14, 48, 72, 34, d.lin("#6a7388", "#3f4757"), 6) +
  `<path d="M45 57L57 65L45 73Z" fill="#fff"/>` +
  bar(28, 96, 84, 46, "#cfe8d5", 10) +
  bar(34, 102, 72, 34, "#fff", 4) +
  bar(39, 107, 48, 6, INK, 2) +
  bar(39, 118, 60, 4, GREY) +
  bar(39, 126, 40, 4, GREY) +
  bar(8, 150, 90, 28, "#e9edf3", 10) +
  bar(13, 155, 18, 18, "#3f8f4f", 4) +
  bar(36, 158, 52, 4, "#9aa3b2") +
  bar(36, 166, 34, 4, "#4f78c4");

/** A news page below a browser bar, `w` wide. */
const newsPage = (w: number, photo: string) =>
  bar(12, 12, w - 24, 12, INK, 3) +
  bar(12, 32, 64, 48, photo, 4) +
  `<path d="M12 80L30 60L42 70L56 56L76 80Z" fill="#3f8f4f" fill-opacity=".85"/>` +
  [34, 46, 58, 70].map((y, i) => bar(84, y, i % 2 ? w - 112 : w - 96, 5, GREY)).join("") +
  [92, 104, 116].map((y, i) => bar(12, y, i === 2 ? w - 60 : w - 24, 5, GREY)).join("");

/** A chat with an AI chatbot, its messages marked with a glint (`w` wide). */
const botChat = (d: Drawing, w: number, rows: number) => {
  const teal = d.lin("#5fc2b5", "#1f7a6f");
  let s = `<rect width="${w}" height="30" fill="#dff2ef"/>` + at(17, 19, botMark(teal), 1.15) + bar(30, 17, w / 2 - 6, 6, "#7fa9a3");
  for (let i = 0; i < rows; i++) {
    const y = 40 + i * 30;
    s +=
      i % 2
        ? bar(w - 8 - w * 0.45, y, w * 0.45, 20, "#e9edf3", 10)
        : bar(8, y, w * 0.68, 22, "#cfece7", 11) + at(19, y + 11, glint(11)) + bar(28, y + 8.5, w * 0.36, 5, "#7fa9a3");
  }
  return s;
};

// ---- Pictures ----

export const PICTURES_14_TO_17 = {
  // Is it true?
  "a14-group-chat": picture(
    "A group chat on a phone sharing a video, a news story and a link, beside a tick, a cross and a question mark",
    TRUE,
    (d) => {
      const paper = d.lin("#ffffff", "#eef1f5");
      return (
        at(142, 214, phone(d, 132, 196, groupChat(d)), 1, -3) +
        at(268, 70, badge(paper, `<g transform="translate(0 1) scale(.8)">${TICK("#3f8f4f", 8)}</g>`)) +
        at(338, 112, badge(paper, `<path d="M-10 -10L10 10M10 -10L-10 10" stroke="${RED}" stroke-width="6.5" stroke-linecap="round"/>`)) +
        at(274, 160, badge(paper, QUESTION(32)))
      );
    },
  ),
  "a14-new-tab-search": picture(
    "A laptop with a new tab open, searching what other sources say about a site",
    TRUE,
    (d) =>
      `<path d="M138 46Q176 14 214 46" stroke="${TRUE}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M203 44L215 47L216 35" stroke="${TRUE}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      at(
        200,
        212,
        laptop(
          d,
          236,
          150,
          `<rect width="216" height="24" fill="#dfe4ec"/>` +
            bar(8, 6, 72, 22, "#eef1f5", 5) +
            bar(16, 12, 40, 5, "#b4bccb") +
            bar(84, 4, 76, 26, "#fff", 6) +
            `<circle cx="96" cy="15" r="4" fill="none" stroke="${TRUE}" stroke-width="2"/>` +
            bar(106, 12, 42, 5, "#9aa3b2") +
            `<rect x="26" y="38" width="164" height="26" rx="13" fill="#fff" stroke="#b4bccb" stroke-width="2"/>` +
            `<circle cx="42" cy="50" r="6" fill="none" stroke="${TRUE}" stroke-width="2.5"/><path d="M46.5 54.5L51 59" stroke="${TRUE}" stroke-width="2.5" stroke-linecap="round"/>` +
            bar(58, 48, 84, 6, "#5b6478") +
            ["#3f8f4f", "#4f78c4", "#e8833a"]
              .map((c, i) => bar(26, 76 + i * 18, 12, 12, c, 3) + bar(46, 77 + i * 18, 100, 5, "#4f78c4") + bar(46, 84 + i * 18, 140, 4, GREY))
              .join(""),
        ),
      ) +
      at(338, 44, glint(12)),
  ),
  "a14-lookalike-pages": picture(
    "Two news pages that look alike, with a magnifying glass on the web address of one",
    TRUE,
    (d) => {
      const paper = d.lin("#ffffff", "#eef1f5");
      const photo = d.lin("#9cc3f0", "#4f78c4");
      const address = (odd: boolean) =>
        `<circle cx="53" cy="12" r="2.5" fill="#8a93a3"/>` +
        bar(60, 10, 50, 4, "#b4bccb") +
        (odd ? bar(112, 9, 18, 6, RED) : "");
      const lens = d.clip(`<circle cx="319" cy="56" r="27"/>`);
      return (
        `<g transform="translate(22 54) rotate(-4)">${browser(160, 156, paper, newsPage(160, photo), address(false))}</g>` +
        at(198, 44, browser(160, 156, paper, newsPage(160, photo), address(true))) +
        `<g clip-path="${lens}"><circle cx="319" cy="56" r="27" fill="#fff"/>` +
        at(319, 56, bar(-44, -4, 38, 8, "#b4bccb") + bar(-2, -7, 34, 14, RED)) +
        `</g>` +
        `<g transform="translate(319 56)"><g filter="url(#sh)"><rect x="24" y="-6" width="14" height="52" rx="6" transform="rotate(-45 31 -6)" fill="${d.lin("#c88a4a", "#8a5a2b")}"/>` +
        `<circle r="30" fill="none" stroke="${d.lin("#8a93a3", "#4b5366")}" stroke-width="8"/></g>` +
        `<path d="M-18 -10A20 20 0 0 1 -6 -20" stroke="#fff" stroke-opacity=".9" stroke-width="4" fill="none" stroke-linecap="round"/></g>`
      );
    },
  ),
  "a14-pause-check-share": picture("A card that says Pause, check, then share", TRUE, (d) =>
    wordCard(d, TRUE, ["Pause.", "Check.", "Then share."]),
  ),
  "a14-leave-the-page": picture("A card that says Leave the page to check it", TRUE, (d) =>
    wordCard(d, TRUE, ["Leave the page", "to check it."]),
  ),

  // Images, consent and deepfakes
  "a14-fake-image-real-harm": picture("A card that says Fake image, real harm", IMAGES, (d) =>
    wordCard(d, IMAGES, ["Fake image.", "Real harm."]),
  ),
  "a14-photo-no-forward": picture(
    "A phone with a photo on it, and a forward arrow crossed out",
    IMAGES,
    (d) =>
      at(
        150,
        214,
        phone(
          d,
          128,
          196,
          `<rect width="116" height="30" fill="#efe7fb"/>` +
            `<circle cx="16" cy="20" r="6" fill="${IMAGES}"/>` +
            bar(28, 17, 44, 6, "#9aa3b2") +
            bar(8, 40, 100, 104, d.lin("#d9ecfb", "#8fbfef"), 8) +
            `<circle cx="80" cy="66" r="11" fill="${d.lin(GOLD[0], GOLD[1])}"/>` +
            `<path d="M8 136V114Q30 96 52 110Q74 94 108 112V136Q108 144 100 144H16Q8 144 8 136Z" fill="${d.lin("#a7d98f", "#3f8f4f")}"/>` +
            bar(8, 156, 72, 6, "#9aa3b2") +
            bar(8, 168, 48, 5, GREY),
        ),
        1,
        -3,
      ) +
      at(294, 108, noForward(d), 1.1),
  ),
  "a14-dont-pass-it-on": picture("A card that says Fake or not, don't pass it on", IMAGES, (d) =>
    wordCard(d, IMAGES, ["Fake or not,", "don't pass it on."]),
  ),
  "a14-if-it-happens-steps": picture(
    "A checklist: tell an adult, save the evidence, report it",
    IMAGES,
    (d) => {
      const tick = d.lin("#b48ae6", "#7b46c4");
      return (
        `<g filter="url(#sh)"><rect x="46" y="16" width="308" height="208" rx="16" fill="${d.lin("#6a7388", "#4b5366")}"/></g>` +
        `<path d="M62 17.5H338" stroke="#fff" stroke-opacity=".25" stroke-width="1.5" stroke-linecap="round"/>` +
        bar(60, 36, 280, 176, d.lin("#ffffff", "#eef1f5"), 8) +
        `<g filter="url(#sh)">${bar(160, 6, 80, 30, d.lin(GOLD[0], GOLD[1]), 8)}</g>` +
        bar(186, 14, 28, 8, "#7a5410", 4) +
        ["Tell an adult", "Save evidence", "Report it"]
          .map(
            (words, i) =>
              `<circle cx="92" cy="${78 + i * 46}" r="15" fill="${tick}"/>` +
              at(92, 78 + i * 46, TICK("#fff", 4.5), 0.5) +
              leftText(118, 88 + i * 46, words, 28),
          )
          .join("")
      );
    },
  ),
  "a14-consent-clear-yes": picture("A card that says Consent is a clear yes", IMAGES, (d) =>
    wordCard(d, IMAGES, ["Consent is", "a clear yes."]),
  ),

  // Sextortion: what to do
  "a14-chat-warning": picture("A phone showing a chat, beside a warning sign", THREAT, (d) => {
    const mine = "#cfdcf3";
    const theirs = "#e9edf3";
    return (
      at(
        150,
        214,
        phone(
          d,
          132,
          196,
          `<rect width="120" height="32" fill="#e3eaf7"/>` +
            `<circle cx="18" cy="21" r="7" fill="#9aa3b2"/>` +
            bar(32, 18, 46, 6, "#9aa3b2") +
            [
              [8, 70, theirs],
              [42, 70, mine],
              [8, 84, theirs],
              [50, 62, mine],
              [8, 56, theirs],
            ]
              .map(([x, w, c], i) => bar(x as number, 42 + i * 28, w as number, 22, c as string, 11))
              .join(""),
        ),
        1,
        -3,
      ) + at(292, 116, warning(d), 1.3)
    );
  }),
  "a14-pattern-five-steps": picture(
    "Five steps in a row: a new contact, a heart, a move to another app, a camera, and a warning sign",
    THREAT,
    (d) => {
      const disc = d.lin("#eef3fb", "#cbd8ef");
      const c = THREAT;
      const icons = [
        `<circle cx="-4" cy="-7" r="7" fill="${c}"/><path d="M-17 13Q-17 1 -4 1Q9 1 9 13Z" fill="${c}"/><path d="M15 -11V-1M10 -6H20" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`,
        at(0, 1, heart(d, ["#ff8fa3", RED]), 0.95),
        `<rect x="-16" y="-6" width="20" height="20" rx="5" fill="none" stroke="${c}" stroke-width="3.5"/><path d="M-4 2L14 -14M4 -14H14V-4" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<rect x="-15" y="-9" width="30" height="21" rx="5" fill="${c}"/>` + bar(-6, -14, 12, 7, c, 2) + `<circle cx="0" cy="1.5" r="6.5" fill="#fff"/><circle cx="0" cy="1.5" r="3" fill="${c}"/>`,
        at(0, -1, warning(d), 0.42),
      ];
      return (
        `<g filter="url(#sh)">${bar(14, 56, 372, 128, d.lin("#ffffff", "#eef1f5"), 20)}</g>` +
        `<path d="M60 120H340" stroke="${GREY}" stroke-width="3" stroke-dasharray="5 6"/>` +
        icons
          .map((icon, i) => {
            const x = 60 + i * 70;
            const arrow = i ? `<path d="M${x - 38} 115L${x - 33} 120L${x - 38} 125" stroke="#8a93a3" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : "";
            return arrow + `<circle cx="${x}" cy="120" r="29" fill="${i === 4 ? "#fdecd9" : disc}"/>` + at(x, 120, icon, 1.15);
          })
          .join("")
      );
    },
  ),
  "a14-stop-dont-pay-tell": picture("A card that says Stop replying, don't pay, tell an adult", THREAT, (d) =>
    wordCard(d, THREAT, ["Stop replying.", "Don't pay.", "Tell an adult."]),
  ),
  "a14-not-your-fault": picture("A card that says It is not your fault, beside a shield with a heart", THREAT, (d) =>
    wordCard(d, THREAT, ["It is", "not your", "fault."], standingShield(d, at(0, 2, heart(d, ["#ffffff", "#dbe5f6"]), 1.4))),
  ),
  "a14-no-trouble-for-help": picture("A card that says You won't be in trouble for asking for help", THREAT, (d) =>
    wordCard(d, THREAT, ["You won't be", "in trouble for", "asking for help."]),
  ),

  // Relationships, control and AI
  "a14-location-and-ai": picture(
    "Two phones: one sharing its location on a map, one chatting with an AI chatbot",
    CLOSE,
    (d) =>
      at(
        128,
        212,
        phone(
          d,
          116,
          178,
          `<rect width="104" height="166" fill="#e6efe2"/>` +
            bar(58, 100, 40, 44, "#c4e3b5", 6) +
            `<path d="M-10 62L120 40M30 -10L52 180M-10 130L120 150M82 -10L70 180" stroke="#fff" stroke-width="9"/>` +
            `<ellipse cx="50" cy="94" rx="20" ry="7" fill="${RED}" fill-opacity=".22"/>` +
            at(50, 94, mapPin(d), 0.9),
        ),
        1,
        -5,
      ) + at(272, 212, phone(d, 116, 178, botChat(d, 104, 4)), 1, 5),
  ),
  "a14-free-clear-yes": picture("A card that says A free, clear yes, every time", CLOSE, (d) =>
    wordCard(d, CLOSE, ["A free,", "clear yes,", "every time."]),
  ),
  "a14-messages-and-tracking": picture(
    "A phone full of message alerts, with a location pin and a password box beside it",
    CLOSE,
    (d) => {
      const avatar = d.lin("#5fc2b5", "#1f7a6f");
      return (
        at(
          198,
          214,
          phone(
            d,
            128,
            196,
            `<rect width="116" height="184" fill="${d.lin("#dff2ef", "#a9ddd5")}"/>` +
              [0, 1, 2, 3, 4]
                .map((i) => {
                  const y = 24 + i * 31;
                  return bar(7, y, 102, 26, "#fff", 8) + `<circle cx="20" cy="${y + 13}" r="7" fill="${avatar}"/>` + bar(32, y + 7, 56, 5, "#5b6478") + bar(32, y + 15, 40, 4, GREY);
                })
                .join(""),
          ),
        ) +
        `<g filter="url(#sh)"><circle cx="256" cy="24" r="16" fill="${d.lin("#f6877c", "#c0392b")}"/></g>` +
        text(256, 29.5, "9+", 14, "#fff", 800) +
        `<ellipse cx="80" cy="148" rx="22" ry="7" fill="${RED}" fill-opacity=".22"/>` +
        at(80, 148, mapPin(d), 1.25) +
        `<g filter="url(#sh)">${bar(278, 146, 96, 40, d.lin("#ffffff", "#eef1f5"), 12)}</g>` +
        [0, 1, 2, 3].map((i) => `<circle cx="${298 + i * 18}" cy="166" r="5.5" fill="${INK}"/>`).join("")
      );
    },
  ),
  "a14-built-to-keep-you-talking": picture(
    "A card that says Built to keep you talking, beside a phone chatting with an AI chatbot",
    CLOSE,
    (d) => wordCard(d, CLOSE, ["Built to", "keep you", "talking."], phone(d, 84, 140, botChat(d, 72, 3))),
  ),
  "a14-care-accepts-a-no": picture("A card that says Care accepts a no", CLOSE, (d) =>
    wordCard(d, CLOSE, ["Care accepts", "a no."]),
  ),

  // Data, money and scams
  "a14-bike-offer": picture(
    "A phone showing a bike for sale and a buyer's offer, beside a stack of coins and a question mark",
    MONEY,
    (d) =>
      at(
        146,
        214,
        phone(
          d,
          132,
          196,
          `<rect width="120" height="30" fill="#fdeedd"/>` +
            bar(10, 17, 52, 6, "#9aa3b2") +
            bar(8, 38, 104, 72, d.lin("#fff6ec", "#fbe1c4"), 8) +
            at(60, 94, bike(INK)) +
            bar(8, 118, 58, 6, "#5b6478") +
            bar(76, 114, 36, 14, MONEY, 7) +
            bar(84, 119, 20, 4, "#fff") +
            bar(8, 140, 92, 36, "#e9edf3", 10) +
            `<circle cx="24" cy="158" r="9" fill="${d.lin(GOLD[0], GOLD[1])}"/>` +
            `<path d="M42 164V151M36 156L42 150L48 156" stroke="#3f8f4f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
            bar(56, 155, 34, 6, "#9aa3b2"),
        ),
        1,
        -3,
      ) +
      at(316, 208, coins(d, 4), 1.1) +
      at(250, 104, bubble(50, 46, "left", QUESTION(30))),
  ),
  "a14-app-permissions": picture(
    "A phone's settings with location, contacts and ads turned off and two-step verification on, beside a shield",
    MONEY,
    (d) => {
      const c = MONEY;
      const icons = [
        `<path d="M0 6C-2 2 -6 -1 -6 -4A6 6 0 0 1 6 -4C6 -1 2 2 0 6Z" fill="${c}"/>`,
        `<circle cx="0" cy="-3" r="3.5" fill="${c}"/><path d="M-6 6Q-6 1 0 1Q6 1 6 6Z" fill="${c}"/>`,
        `<path d="M-6 -2H-2L4 -6V6L-2 2H-6Z" fill="${c}"/>`,
        `<rect x="-5" y="-1" width="10" height="8" rx="2" fill="${c}"/><path d="M-3 -1V-3A3 3 0 0 1 3 -3V-1" stroke="${c}" stroke-width="2" fill="none"/>`,
      ];
      return (
        at(
          156,
          214,
          phone(
            d,
            132,
            196,
            `<rect width="120" height="184" fill="#f1f3f7"/>` +
              `<rect width="120" height="30" fill="#fdeedd"/>` +
              bar(10, 17, 48, 6, "#9aa3b2") +
              icons
                .map((icon, i) => {
                  const y = 40 + i * 34;
                  return bar(6, y, 108, 28, "#fff", 8) + `<circle cx="20" cy="${y + 14}" r="9" fill="#fde3cc"/>` + at(20, y + 14, icon) + bar(34, y + 11, 40, 6, "#9aa3b2") + toggle(80, y + 6, i === 3);
                })
                .join(""),
          ),
          1,
          -3,
        ) + at(306, 206, standingShield(d, TICK("#fff")))
      );
    },
  ),
  "a14-only-scammers-guarantee": picture("A card that says Only scammers guarantee big profits", MONEY, (d) =>
    wordCard(d, MONEY, ["Only scammers", "guarantee", "big profits."]),
  ),
  "a14-loot-box": picture("A loot box with a question mark, a stack of coins and a bank card", MONEY, (d) =>
    at(126, 206, lootBox(d), 1.15) +
    at(270, 208, floorShadow(110)) +
    at(218, 208, bankCard(d), 1.05) +
    at(336, 210, coins(d, 3), 1.1) +
    at(54, 58, glint(14)) +
    at(206, 46, glint(10)),
  ),
  "a14-keep-codes": picture("A card that says Keep your verification codes to yourself", MONEY, (d) =>
    wordCard(d, MONEY, ["Keep your", "verification codes", "to yourself."]),
  ),
} satisfies Record<string, LessonPictureEntry>;
