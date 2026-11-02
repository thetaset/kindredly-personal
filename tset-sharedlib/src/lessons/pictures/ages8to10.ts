// Pictures for the ages 8–10 pack (HAT-580). Drawn with the kit in ./kit.ts; each is drawn the first
// time it is shown. The parts this pack needs that the kit has not got (a phone, a photo, a coin, a
// tick, round faces, a robot, a number badge, a tablet held in two hands) are drawn below in the
// kit's style, and could move into the kit if another pack wants them.

import {
  ADULT_A,
  ADULT_B,
  CHILD_A,
  CHILD_B,
  CHILD_C,
  FONT,
  GOLD,
  HUE,
  INK,
  SKIN,
  at,
  bubble,
  cake,
  creature,
  floorShadow,
  gem,
  glint,
  heart,
  house,
  magnifier,
  padlock,
  person,
  picture,
  stopSign,
  stormCloud,
  tablet,
  text,
  wordCard,
} from "./kit";
import type { Drawing, LessonPictureEntry, Person } from "./kit";

const PINK: [string, string] = ["#ff8fa3", "#e0566f"];
const BLUE: [string, string] = ["#7fb2ec", "#4f78c4"];
const GREEN: [string, string] = ["#6fcf7f", "#2f8f45"];
const RED: [string, string] = ["#f06b5f", "#c0392b"];
const SKY: [string, string] = ["#d6ecfb", "#7fb2ec"];

const GRANDPARENT: Person = {
  skin: SKIN.tan,
  hair: "#d5d9e0",
  shirt: ["#f6ad78", "#d47436"],
  style: "curly",
};

// ---- Parts ----

/** A phone standing on the origin; `screen` draws in the screen's own coordinates, w − 12 by h − 26. */
function phone(d: Drawing, w: number, h: number, screen = ""): string {
  const sw = w - 12;
  const sh = h - 26;
  const clip = d.clip(`<rect width="${sw}" height="${sh}" rx="6"/>`);
  return (
    floorShadow(w * 1.1) +
    `<g filter="url(#sh)"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="13" fill="${d.lin("#6a7388", "#4b5366")}"/></g>` +
    `<rect x="${-w / 2 + 1}" y="${-h + 1}" width="${w - 2}" height="${h - 2}" rx="12" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"/>` +
    `<rect x="-7" y="${-h + 5}" width="14" height="3" rx="1.5" fill="#fff" fill-opacity=".3"/>` +
    `<g transform="translate(${-sw / 2} ${-h + 13})"><rect width="${sw}" height="${sh}" rx="6" fill="${d.lin("#ffffff", "#e6ecf4")}"/><g clip-path="${clip}">${screen}</g></g>`
  );
}

/** A printed photo of hills under a sun, centred on the origin; pass one `sky` gradient to every copy. */
function photo(sky: string, w: number, h: number): string {
  const iw = w - 10;
  const ih = h - 10;
  return (
    `<g filter="url(#sh)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" fill="#fff"/></g>` +
    `<g transform="translate(${-iw / 2} ${-ih / 2})"><rect width="${iw}" height="${ih}" rx="2" fill="${sky}"/>` +
    `<circle cx="${iw * 0.74}" cy="${ih * 0.3}" r="${ih * 0.14}" fill="#ffd066"/>` +
    `<path d="M0 ${ih}V${ih * 0.72}Q${iw * 0.25} ${ih * 0.42} ${iw * 0.5} ${ih * 0.7}Q${iw * 0.75} ${ih * 0.52} ${iw} ${ih * 0.66}V${ih}Z" fill="#5cb66c"/></g>`
  );
}

/** A gold coin, r 15, centred on the origin; pass one gold gradient to every coin. */
function coin(gold: string): string {
  return (
    `<circle r="15" fill="${gold}" stroke="#b07a08" stroke-opacity=".45" stroke-width="1.5"/>` +
    `<circle r="9.5" fill="none" stroke="#b07a08" stroke-opacity=".45" stroke-width="2"/>` +
    `<path d="M-9 -7A11 11 0 0 1 1 -12" stroke="#fff" stroke-opacity=".75" stroke-width="2" fill="none" stroke-linecap="round"/>`
  );
}

/** A white tick in a green circle, centred on the origin. */
function tick(d: Drawing, r: number): string {
  return (
    `<circle r="${r}" fill="${d.lin(GREEN[0], GREEN[1])}"/>` +
    `<path d="M${-r * 0.42} ${r * 0.02}L${-r * 0.1} ${r * 0.34}L${r * 0.46} ${-r * 0.3}" stroke="#fff" stroke-width="${(r * 0.2).toFixed(1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** A round yellow face, r 22, centred on the origin; pass one `fill` to every face in a picture. */
function face(fill: string, mood: "laugh" | "happy" | "flat" | "cross"): string {
  const eyes =
    mood === "laugh"
      ? `<path d="M-11 -3Q-7.5 -9 -4 -3M4 -3Q7.5 -9 11 -3" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="-7.5" cy="-4" rx="2.8" ry="3.4" fill="${INK}"/><ellipse cx="7.5" cy="-4" rx="2.8" ry="3.4" fill="${INK}"/>`;
  const brows =
    mood === "cross"
      ? `<path d="M-13 -13L-4 -9M13 -13L4 -9" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : "";
  const mouth =
    mood === "laugh"
      ? `<path d="M-10 4H10Q9 15 0 15Q-9 15 -10 4Z" fill="#7a2e2e"/>`
      : mood === "happy"
        ? `<path d="M-9 5Q0 14 9 5" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
        : mood === "flat"
          ? `<path d="M-8 9H8" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
          : `<path d="M-8 12Q0 5 8 12" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return `<g filter="url(#sh)"><circle r="22" fill="${fill}"/></g>` + eyes + brows + mouth;
}

/** A friendly robot helper standing on the origin, about 126 tall. */
function robot(d: Drawing): string {
  const metal = d.lin("#f1f4f8", "#a9b4c6");
  return (
    floorShadow(72) +
    `<path d="M0 -106V-118" stroke="#8a93a3" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="-121" r="6" fill="#5ec8f2"/>` +
    `<rect x="-43" y="-56" width="12" height="34" rx="6" fill="${metal}"/><rect x="31" y="-56" width="12" height="34" rx="6" fill="${metal}"/>` +
    `<rect x="-20" y="-14" width="14" height="14" rx="4" fill="#8a93a3"/><rect x="6" y="-14" width="14" height="14" rx="4" fill="#8a93a3"/>` +
    `<g filter="url(#sh)"><rect x="-31" y="-62" width="62" height="52" rx="14" fill="${metal}"/>` +
    `<rect x="-38" y="-108" width="76" height="54" rx="18" fill="${metal}"/></g>` +
    `<path d="M-24 -106H24M-18 -60H18" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="-28" y="-99" width="56" height="36" rx="12" fill="#2b3445"/>` +
    `<circle cx="-11" cy="-84" r="5" fill="#5ec8f2"/><circle cx="11" cy="-84" r="5" fill="#5ec8f2"/>` +
    `<path d="M-8 -73Q0 -68 8 -73" stroke="#5ec8f2" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="0" cy="-36" r="7" fill="#5ec8f2" fill-opacity=".85"/>`
  );
}

/** A white round badge with a number on it, centred on the origin. */
function badge(n: string, color: string): string {
  return `<g filter="url(#sh)"><circle r="17" fill="#fff"/></g>` + text(0, 8, n, 22, color, 800);
}

/** A small tablet held up in two hands, centred on the origin, with no floor shadow. */
function heldTablet(d: Drawing, hand: string, screen: string): string {
  return (
    `<g filter="url(#sh)"><rect x="-36" y="-27" width="72" height="54" rx="9" fill="${d.lin("#6a7388", "#4b5366")}"/></g>` +
    `<rect x="-29" y="-20" width="58" height="40" rx="4" fill="#eef3f9"/>` +
    screen +
    `<circle cx="-35" cy="14" r="7.5" fill="${hand}"/><circle cx="35" cy="14" r="7.5" fill="${hand}"/>`
  );
}

/** Two short lines of words in a speech bubble's middle. */
function twoLines(a: string, b: string, size = 20, fill = INK): string {
  return text(0, -3, a, size, fill) + text(0, size - 1, b, size, fill);
}

export const PICTURES_8_TO_10 = {
  // ---- What to keep private ----

  /** A made-up player name is fine; your home and birthday stay locked away. */
  "a8-private-info": picture(
    "A tablet showing a made-up player name, SkyFox, beside a padlock in front of a house and a birthday cake",
    HUE.private,
    (d) =>
      at(
        26,
        208,
        tablet(
          d,
          186,
          150,
          `<rect width="166" height="130" fill="${d.lin("#f1e9fc", "#dccbf5")}"/>` +
            at(83, 76, creature(d), 0.8) +
            `<rect x="25" y="86" width="116" height="34" rx="17" fill="#fff"/>` +
            text(83, 110, "SkyFox", 22, INK, 800),
        ),
      ) +
      at(270, 194, house(d), 0.9) +
      at(348, 196, cake(d), 0.76) +
      at(312, 212, padlock(d), 1.05) +
      at(246, 58, glint(12)),
  ),

  /** A post copied and passed on. */
  "a8-posts-spread": picture(
    "A photo posted on a tablet, with copies of it flying away",
    HUE.private,
    (d) => {
      const sky = d.lin(SKY[0], SKY[1]);
      const trail = (p: string) =>
        `<path d="${p}" stroke="${HUE.private}" stroke-opacity=".55" stroke-width="3.5" stroke-dasharray="1 9" stroke-linecap="round" fill="none"/>`;
      return (
        at(24, 210, tablet(d, 180, 140, at(80, 60, photo(sky, 124, 88)))) +
        trail("M212 106Q230 80 246 72") +
        trail("M214 140Q262 130 300 124") +
        trail("M212 172Q232 182 248 180") +
        at(286, 62, photo(sky, 80, 58), 1, -10) +
        at(342, 122, photo(sky, 80, 58), 1, 8) +
        at(288, 180, photo(sky, 80, 58), 1, -4)
      );
    },
  ),

  /** Asking a friend before posting their photo. */
  "a8-ask-first": picture(
    "A child asking a friend, Can I post this?, about a photo, and the friend answering with a tick",
    HUE.private,
    (d) =>
      at(112, 212, person(d, { ...CHILD_A, mood: "open" })) +
      at(292, 212, person(d, CHILD_C)) +
      at(202, 152, photo(d.lin(SKY[0], SKY[1]), 66, 50), 1, -8) +
      at(118, 98, bubble(136, 58, "left", twoLines("Can I post", "this?"))) +
      at(302, 98, bubble(56, 50, "left", tick(d, 15))),
  ),

  "a8-think-before-you-post": picture(
    "A card that says Think before you post",
    HUE.private,
    (d) => wordCard(d, HUE.private, ["Think before", "you post."]),
  ),

  // ---- Real or fake? ----

  /** A trick pop-up under a magnifying glass. */
  "a8-spot-a-trick": picture(
    "A tablet with a pop-up offering free coins in a hurry, under a magnifying glass",
    HUE.real,
    (d) => {
      const gold = d.lin(GOLD[0], GOLD[1]);
      const pop =
        `<rect width="190" height="130" fill="#000" fill-opacity=".18"/>` +
        `<g filter="url(#sh)"><rect x="18" y="10" width="154" height="112" rx="12" fill="#fff"/></g>` +
        text(95, 38, "Free coins!", 20, INK, 800) +
        at(46, 72, coin(gold)) +
        at(70, 72, coin(gold)) +
        at(58, 56, coin(gold)) +
        `<rect x="94" y="52" width="66" height="26" rx="13" fill="${d.lin(RED[0], RED[1])}"/>` +
        text(127, 70, "Hurry!", 15, "#fff", 800) +
        `<rect x="40" y="90" width="110" height="24" rx="12" fill="${d.lin("#5cb66c", "#2f7d3f")}"/>` +
        text(95, 107, "Sign in", 15, "#fff", 800);
      return (
        at(24, 210, tablet(d, 210, 150, pop), 1, -3) +
        at(282, 104, magnifier(d), 1.25) +
        at(352, 196, glint(12)) +
        at(366, 52, glint(14))
      );
    },
  ),

  /** Check another way: call your friend. */
  "a8-check-another-way": picture(
    "A card that says Check another way, beside a phone calling a friend",
    HUE.real,
    (d) =>
      wordCard(
        d,
        HUE.real,
        ["Check", "another", "way."],
        phone(
          d,
          84,
          150,
          `<rect width="72" height="124" fill="${d.lin("#e3f1e6", "#bfe3c6")}"/>` +
            at(36, 80, person(d, CHILD_B), 0.56) +
            `<circle cx="36" cy="102" r="13" fill="${d.lin(GREEN[0], GREEN[1])}"/>` +
            `<path d="M29 104Q36 96 43 104" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
            `<circle cx="29" cy="104" r="2.6" fill="#fff"/><circle cx="43" cy="104" r="2.6" fill="#fff"/>`,
        ),
      ),
  ),

  /** An ad marked Ad, and an AI helper that can be wrong. */
  "a8-ads-and-ai": picture(
    "A tablet showing a game with a banner marked Ad, and a robot helper saying 2 + 2 = 5",
    HUE.real,
    (d) =>
      at(
        20,
        212,
        tablet(
          d,
          204,
          156,
          `<rect width="184" height="136" fill="${d.lin("#e3f5f2", "#bfe6df")}"/>` +
            `<path d="M0 136V112Q46 96 92 110Q138 124 184 104V136Z" fill="#7cc58a"/>` +
            at(124, 128, creature(d), 0.5) +
            `<g filter="url(#sh)"><rect x="10" y="10" width="164" height="54" rx="10" fill="#fff"/></g>` +
            at(36, 37, gem(d), 1.2) +
            `<rect x="58" y="26" width="58" height="7" rx="3.5" fill="#c3cad6"/><rect x="58" y="41" width="40" height="7" rx="3.5" fill="#c3cad6"/>` +
            `<rect x="124" y="22" width="40" height="26" rx="7" fill="${d.lin("#ffe08a", "#e0a526")}"/>` +
            text(144, 41, "Ad", 17, INK, 800),
        ),
      ) +
      at(324, 212, robot(d)) +
      at(312, 82, bubble(98, 44, "right", text(0, 8, "2 + 2 = 5", 21, INK, 800))),
  ),

  "a8-dont-tap-tell": picture(
    "A card that says Don't tap. Tell a grown-up, beside a stop sign",
    HUE.real,
    (d) => wordCard(d, HUE.real, ["Don't tap.", "Tell a", "grown-up."], stopSign(d)),
  ),

  // ---- Strong passwords ----

  /** A long password hidden as dots, with a full strength bar. */
  "a8-strong-password": picture(
    "A password box filled with a long hidden password, and a full green bar that says Strong",
    HUE.private,
    (d) => {
      const green = d.lin(GREEN[0], GREEN[1]);
      const dots = Array.from(
        { length: 12 },
        (_, i) => `<circle cx="${80 + i * 14}" cy="112" r="4.5" fill="${INK}"/>`,
      ).join("");
      const bars = [0, 1, 2, 3]
        .map((i) => `<rect x="${64 + i * 46}" y="142" width="40" height="9" rx="4.5" fill="${green}"/>`)
        .join("");
      return (
        `<g filter="url(#sh)"><rect x="40" y="40" width="226" height="154" rx="16" fill="${d.lin("#ffffff", "#eef1f5")}"/></g>` +
        `<path d="M56 41H250" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` +
        `<text x="64" y="78" font-family="${FONT}" font-size="17" font-weight="700" fill="#5b6478">Password</text>` +
        `<rect x="62" y="92" width="182" height="40" rx="10" fill="#f4f6fa" stroke="#c3cad6" stroke-width="2"/>` +
        dots +
        bars +
        text(153, 180, "Strong", 19, "#2f8f45", 800) +
        at(332, 206, padlock(d), 1.2) +
        at(352, 64, glint(14))
      );
    },
  ),

  "a8-share-with-parent": picture(
    "A card that says Share passwords only with your parent",
    HUE.private,
    (d) => wordCard(d, HUE.private, ["Share passwords", "only with", "your parent."]),
  ),

  /** A child asking a parent before buying in a game. */
  "a8-ask-to-buy": picture(
    "A tablet selling a gem for today only, and a child asking a parent, Can I buy it?",
    HUE.private,
    (d) =>
      at(
        18,
        210,
        tablet(
          d,
          160,
          118,
          `<rect width="140" height="98" fill="${d.lin("#f1e9fc", "#dccbf5")}"/>` +
            `<rect x="14" y="8" width="112" height="24" rx="12" fill="${d.lin(RED[0], RED[1])}"/>` +
            text(70, 25, "Today only!", 15, "#fff", 800) +
            at(70, 53, gem(d), 1.3) +
            `<rect x="40" y="70" width="60" height="22" rx="11" fill="${d.lin("#5cb66c", "#2f7d3f")}"/>` +
            text(70, 86, "Buy", 14, "#fff"),
        ),
        1,
        -3,
      ) +
      at(246, 212, person(d, { ...CHILD_B, mood: "open" })) +
      at(340, 212, person(d, ADULT_A), 1.2) +
      at(232, 92, bubble(106, 58, "right", twoLines("Can I", "buy it?"))),
  ),

  "a8-long-hard-to-guess": picture(
    "A card that says Long and hard to guess, beside a padlock",
    HUE.private,
    (d) => wordCard(d, HUE.private, ["Long and", "hard to", "guess."], padlock(d)),
  ),

  // ---- Being kind online ----

  /** One message, three ways it can sound. */
  "a8-ok-fine": picture(
    "A message that says ok fine, and three faces showing it could sound happy, flat or cross",
    HUE.kind,
    (d) => {
      const fill = d.rad("#ffe08a", "#e0a526");
      const line = (p: string) =>
        `<path d="${p}" stroke="${HUE.kind}" stroke-opacity=".5" stroke-width="3.5" stroke-dasharray="1 9" stroke-linecap="round" fill="none"/>`;
      return (
        at(
          20,
          208,
          tablet(
            d,
            200,
            140,
            `<rect x="12" y="14" width="90" height="30" rx="15" fill="#e9edf3"/><rect x="26" y="26" width="60" height="6" rx="3" fill="#b4bccb"/>` +
              `<rect x="40" y="56" width="128" height="50" rx="25" fill="${d.lin(BLUE[0], BLUE[1])}"/>` +
              text(104, 89, "ok fine", 25, "#fff", 800),
          ),
        ) +
        line("M232 110Q260 80 286 70") +
        line("M232 130Q280 128 318 126") +
        line("M232 150Q260 178 286 184") +
        at(314, 64, face(fill, "happy"), 1.1) +
        at(350, 126, face(fill, "flat"), 1.1) +
        at(314, 188, face(fill, "cross"), 1.1)
      );
    },
  ),

  "a8-everyone-laughing": picture(
    "A card that says Is everyone laughing?, beside two laughing faces and one face that isn't",
    HUE.kind,
    (d) => {
      const fill = d.rad("#ffe08a", "#e0a526");
      return wordCard(
        d,
        HUE.kind,
        ["Is everyone", "laughing?"],
        at(-25, -114, face(fill, "laugh")) + at(25, -114, face(fill, "laugh")) + at(0, -68, face(fill, "flat")),
      );
    },
  ),

  /** A kind private message to someone who was picked on. */
  "a8-kind-message": picture(
    "A child sending a kind message that says Are you all right?",
    HUE.kind,
    (d) =>
      at(
        22,
        210,
        tablet(
          d,
          210,
          160,
          `<rect x="12" y="14" width="96" height="30" rx="15" fill="#e9edf3"/><rect x="26" y="26" width="66" height="6" rx="3" fill="#b4bccb"/>` +
            `<rect x="40" y="56" width="138" height="62" rx="22" fill="${d.lin(BLUE[0], BLUE[1])}"/>` +
            at(109, 85, twoLines("Are you", "all right?", 20, "#fff")),
        ),
      ) +
      at(318, 212, person(d, CHILD_B)) +
      at(334, 98, bubble(46, 38, "left", heart(d, PINK))),
  ),

  "a8-same-kind-person": picture(
    "A card that says Be the same kind person online, beside a heart",
    HUE.kind,
    (d) =>
      wordCard(
        d,
        HUE.kind,
        ["Be the same", "kind person", "online."],
        at(0, -86, heart(d, PINK), 2.8) + at(40, -132, glint(12)),
      ),
  ),

  // ---- Asking for help ----

  "a8-wondering-tell": picture(
    "A card that says Wondering whether to tell? Then tell",
    HUE.tell,
    (d) => wordCard(d, HUE.tell, ["Wondering", "whether to tell?", "Then tell."]),
  ),

  /** At least two trusted grown-ups. */
  "a8-two-grown-ups": picture(
    "A child between two trusted grown-ups, a parent and a grandparent, marked 1 and 2",
    HUE.tell,
    (d) =>
      at(90, 212, person(d, ADULT_A), 1.25) +
      at(310, 212, person(d, GRANDPARENT), 1.25) +
      at(200, 212, person(d, CHILD_C)) +
      at(90, 46, badge("1", HUE.tell)) +
      at(310, 46, badge("2", HUE.tell)),
  ),

  "a8-dont-reply-leave-tell": picture(
    "A card that says Don't reply. Leave. Tell",
    HUE.tell,
    (d) => wordCard(d, HUE.tell, ["Don't reply.", "Leave.", "Tell."]),
  ),

  /** Showing a grown-up and asking for help. */
  "a8-can-you-help": picture(
    "A child showing a tablet to a grown-up and asking, Can you help me?",
    HUE.tell,
    (d) =>
      at(290, 212, person(d, ADULT_B), 1.3) +
      at(150, 212, person(d, { ...CHILD_A, mood: "open" })) +
      at(166, 186, heldTablet(d, CHILD_A.skin[1], at(0, -4, stormCloud(d), 0.38)), 1, 8) +
      at(138, 98, bubble(112, 58, "right", twoLines("Can you", "help me?"))),
  ),
} satisfies Record<string, LessonPictureEntry>;
