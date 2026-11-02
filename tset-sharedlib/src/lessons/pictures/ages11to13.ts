// Pictures for the ages 11–13 pack (HAT-580). Drawn with the kit in ./kit.ts. This pack is drawn with
// objects and word cards, not people; "Private photos and fake images" is objects and word cards only.

import {
  GOLD,
  HUE,
  INK,
  QUESTION,
  at,
  bubble,
  floorShadow,
  gem,
  glint,
  heart,
  key,
  magnifier,
  padlock,
  picture,
  tablet,
  text,
  wordCard,
  type Drawing,
  type LessonPictureEntry,
} from "./kit";

const GLASS: [string, string] = ["#ffffff", "#e6ecf4"];
const GREY = "#e9edf3";
const LINE = "#c3cad6";
const ICON = "#7d8698";
const RED = "#d64545";
const PINK: [string, string] = ["#ff8fa3", "#e0566f"];

// ---- Parts drawn for this pack, in the kit's style. ----

/** A phone standing on the origin; `screen` draws in the screen's own coordinates, (w − 16) by (h − 16). */
function phone(d: Drawing, w: number, h: number, screen = "", glass = GLASS): string {
  const sw = w - 16;
  const sh = h - 16;
  const clip = d.clip(`<rect width="${sw}" height="${sh}" rx="11"/>`);
  return (
    floorShadow(w * 0.95) +
    `<g filter="url(#sh)"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="19" fill="${d.lin("#6a7388", "#4b5366")}"/></g>` +
    `<rect x="${-w / 2 + 1}" y="${-h + 1}" width="${w - 2}" height="${h - 2}" rx="18" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"/>` +
    `<g transform="translate(${-w / 2 + 8} ${-h + 8})"><rect width="${sw}" height="${sh}" rx="11" fill="${d.lin(glass[0], glass[1])}"/>` +
    `<g clip-path="${clip}">${screen}</g><rect x="${sw / 2 - 14}" y="5" width="28" height="6" rx="3" fill="#4b5366"/></g>`
  );
}

/** A rounded bar: a line of text on a screen, or a chat bubble. */
function bar(x: number, y: number, w: number, h: number, fill: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;
}

/** A light card or badge with the drop shadow. */
function card(x: number, y: number, w: number, h: number, fill: string, rx = 12): string {
  return `<g filter="url(#sh)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/></g>`;
}

function arrow(x1: number, y1: number, x2: number, y2: number, color: string): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = (da: number) =>
    `${(x2 - Math.cos(a + da) * 13).toFixed(1)} ${(y2 - Math.sin(a + da) * 13).toFixed(1)}`;
  return `<path d="M${x1} ${y1}L${x2} ${y2}M${h(0.6)}L${x2} ${y2}L${h(-0.6)}" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function check(color: string, width = 4): string {
  return `<path d="M-8 0L-2 6L9 -7" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** A red circle with a slash: not this. */
function noSign(r = 30): string {
  const s = (r * 0.7).toFixed(1);
  return `<circle r="${r}" fill="none" stroke="${RED}" stroke-width="6"/><path d="M-${s} -${s}L${s} ${s}" stroke="${RED}" stroke-width="6"/>`;
}

/** An alarm clock standing on the origin, with the time since the hour shaded. */
function clock(d: Drawing, minutes: number, hue: string): string {
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(Math.sin(a) * r).toFixed(1)} ${(-Math.cos(a) * r).toFixed(1)}`;
  };
  const ticks = Array.from({ length: 12 }, (_, i) => `M${pt(i * 30, 34)}L${pt(i * 30, 39)}`).join("");
  const sweep = minutes * 6;
  const gold = d.lin(GOLD[0], GOLD[1]);
  return (
    floorShadow(100) +
    `<path d="M-28 -24L-38 -2M28 -24L38 -2" stroke="#4b5366" stroke-width="7" stroke-linecap="round"/>` +
    at(
      0,
      -68,
      `<g filter="url(#sh)"><circle cx="-34" cy="-40" r="17" fill="${gold}"/><circle cx="34" cy="-40" r="17" fill="${gold}"/><circle r="52" fill="${d.lin("#ef7a62", "#c0412f")}"/></g>` +
        `<circle r="44" fill="${d.lin(GLASS[0], GLASS[1])}"/>` +
        `<path d="M0 0L0 -40A40 40 0 ${sweep > 180 ? 1 : 0} 1 ${pt(sweep, 40)}Z" fill="${hue}" fill-opacity=".3"/>` +
        `<path d="${ticks}" stroke="#9aa3b2" stroke-width="2.5" stroke-linecap="round"/>` +
        `<path d="M0 0L${pt(sweep, 32)}M0 0L${pt(130, 20)}" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>` +
        `<circle r="4.5" fill="${INK}"/>` +
        `<path d="M-42 -26A50 50 0 0 1 -20 -46" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    )
  );
}

/** A puppy's face, about 34 wide, centred on the origin. */
function puppy(f: { head: string; ear: string }): string {
  return (
    `<ellipse cx="-13" cy="0" rx="6" ry="11" transform="rotate(18 -13 0)" fill="${f.ear}"/>` +
    `<ellipse cx="13" cy="0" rx="6" ry="11" transform="rotate(-18 13 0)" fill="${f.ear}"/>` +
    `<circle r="13" fill="${f.head}"/><ellipse cy="6" rx="7" ry="5" fill="#fff4e6"/>` +
    `<circle cx="-5" cy="-3" r="2" fill="${INK}"/><circle cx="5" cy="-3" r="2" fill="${INK}"/><ellipse cy="3.5" rx="3" ry="2.2" fill="${INK}"/>`
  );
}

/** A photo of a hill and the sun, w by h from its top-left corner. */
function photo(f: { sky: string; hill: string }, w: number, h: number, sun = 0.7): string {
  return (
    `<rect width="${w}" height="${h}" rx="3" fill="${f.sky}"/><circle cx="${(w * sun).toFixed(1)}" cy="${(h * 0.32).toFixed(1)}" r="${(w * 0.12).toFixed(1)}" fill="#ffd066"/>` +
    `<path d="M0 ${h}V${(h * 0.72).toFixed(1)}Q${(w * 0.3).toFixed(1)} ${(h * 0.42).toFixed(1)} ${(w * 0.56).toFixed(1)} ${(h * 0.66).toFixed(1)}T${w} ${(h * 0.6).toFixed(1)}V${h}Z" fill="${f.hill}"/>`
  );
}

function star(fill: string, r = 10): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i * 36 * Math.PI) / 180;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(Math.sin(a) * rr).toFixed(1)},${(-Math.cos(a) * rr).toFixed(1)}`;
  }).join(" ");
  return `<polygon points="${pts}" fill="${fill}"/>`;
}

function toggle(x: number, y: number, on: boolean, hue: string): string {
  return `<rect x="${x}" y="${y}" width="30" height="17" rx="8.5" fill="${on ? hue : LINE}"/><circle cx="${x + (on ? 21.5 : 8.5)}" cy="${y + 8.5}" r="6.5" fill="#fff"/>`;
}

/** A bell about 56 tall, centred on the origin. */
function bell(fill: string): string {
  return (
    `<path d="M0 -26C-14 -26 -18 -14 -18 -2V8L-24 16H24L18 8V-2C18 -14 14 -26 0 -26Z" fill="${fill}"/>` +
    `<circle cy="21" r="5" fill="${fill}"/><circle cy="-28" r="3.5" fill="${fill}"/>`
  );
}

/** A gift box about 28 wide, centred on the origin. */
function gift(d: Drawing): string {
  return (
    `<rect x="-12" y="-4" width="24" height="17" rx="2" fill="${d.lin("#f28b82", "#d64545")}"/>` +
    `<rect x="-14" y="-11" width="28" height="8" rx="2" fill="#e8625a"/><rect x="-2.5" y="-11" width="5" height="24" fill="#ffd066"/>` +
    `<path d="M0 -11C-9 -20 -14 -10 0 -11C14 -10 9 -20 0 -11Z" fill="none" stroke="#ffd066" stroke-width="3"/>`
  );
}

/** A warning triangle on a post, standing on the origin. */
function warningSign(d: Drawing): string {
  return (
    floorShadow(40) +
    `<rect x="-4" y="-78" width="8" height="78" rx="2" fill="${d.lin("#c9d0db", "#8a93a3")}"/>` +
    `<g transform="translate(0 -110)"><g filter="url(#sh)"><path d="M-6 -36Q0 -45 6 -36L41 24Q45 32 36 32H-36Q-45 32 -41 24Z" fill="${d.lin("#ffe08a", "#e0a526")}"/></g>` +
    `<path d="M-4 -33L-30 12" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="-4" y="-16" width="8" height="28" rx="4" fill="${INK}"/><circle cy="21" r="4.5" fill="${INK}"/></g>`
  );
}

/** A balance scale standing on the origin, `load` drawn in each pan. */
function balance(d: Drawing, load: string): string {
  const metal = d.lin("#c9d0db", "#8a93a3");
  const gold = d.lin(GOLD[0], GOLD[1]);
  const pan = (x: number) =>
    `<path d="M${x} -112L${x - 24} -70M${x} -112L${x + 24} -70" stroke="#8a93a3" stroke-width="2"/>` +
    at(x, -84, load) +
    `<path d="M${x - 30} -70H${x + 30}Q${x + 28} -54 ${x} -54Q${x - 28} -54 ${x - 30} -70Z" fill="${gold}"/>`;
  return (
    floorShadow(80) +
    `<g filter="url(#sh)"><rect x="-28" y="-12" width="56" height="12" rx="5" fill="${metal}"/><rect x="-4" y="-120" width="8" height="110" fill="${metal}"/>` +
    `<rect x="-54" y="-116" width="108" height="7" rx="3.5" fill="${metal}"/></g>` +
    `<circle cy="-122" r="7" fill="${gold}"/>` +
    pan(-50) +
    pan(50)
  );
}

/** A shield with a check on it, standing on its point at the origin. */
function shield(d: Drawing, color: [string, string]): string {
  return (
    floorShadow(56) +
    `<g transform="translate(0 -54)"><g filter="url(#sh)"><path d="M0 -50L42 -36V-4C42 22 24 40 0 52C-24 40 -42 22 -42 -4V-36Z" fill="${d.lin(color[0], color[1])}"/></g>` +
    `<path d="M-34 -32L0 -44" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M-15 0L-4 11L17 -12" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`
  );
}

/** A white round badge holding an icon, crossed out. */
function crossedBadge(fill: string, icon: string): string {
  return `<g filter="url(#sh)"><circle r="40" fill="${fill}"/></g>${icon}${noSign(31)}`;
}

/** A friendly chatbot: a little screen with a face, standing on the origin. Never a person. */
function bot(d: Drawing): string {
  return (
    floorShadow(84) +
    `<path d="M0 -110V-124" stroke="#4b5366" stroke-width="4" stroke-linecap="round"/><circle cy="-128" r="6" fill="${d.lin(GOLD[0], GOLD[1])}"/>` +
    `<rect x="-12" y="-26" width="24" height="24" fill="#4b5366"/><rect x="-30" y="-6" width="60" height="8" rx="4" fill="#4b5366"/>` +
    `<g filter="url(#sh)"><rect x="-48" y="-112" width="96" height="88" rx="24" fill="${d.lin("#7fd6c9", "#2a9d8f")}"/></g>` +
    `<path d="M-30 -110H30" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="-37" y="-101" width="74" height="64" rx="16" fill="#25303f"/>` +
    `<ellipse cx="-15" cy="-75" rx="6.5" ry="8.5" fill="#8ff0e2"/><ellipse cx="15" cy="-75" rx="6.5" ry="8.5" fill="#8ff0e2"/>` +
    `<path d="M-11 -57Q0 -49 11 -57" stroke="#8ff0e2" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
  );
}

/** A gold coin, centred, r 14. */
function coin(gold: string): string {
  return `<circle r="14" fill="${gold}"/><circle r="9.5" fill="none" stroke="#a8740a" stroke-opacity=".45" stroke-width="2"/>`;
}

/** A stack of coins standing on the origin. */
function coinStack(gold: string, count: number): string {
  let out = floorShadow(64);
  for (let i = 0; i < count; i++) {
    const y = -10 - i * 10;
    out += `<path d="M-28 ${y}V${y + 8}A28 9 0 0 0 28 ${y + 8}V${y}Z" fill="#c98a09"/><ellipse cy="${y}" rx="28" ry="9" fill="${gold}"/>`;
  }
  return out;
}

/** A fishing hook hanging on its line from `len` above the origin; the hook's eye is the origin. */
function hook(d: Drawing, len: number): string {
  const steel = d.lin("#dfe4eb", "#5b6478");
  return (
    `<path d="M0 ${-len}V-4" stroke="#9aa3b2" stroke-width="2"/>` +
    `<g filter="url(#sh)"><circle r="4.5" fill="none" stroke="${steel}" stroke-width="3"/>` +
    `<path d="M0 4V30A13 13 0 0 1 -26 30V16" stroke="${steel}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-26 9L-33 21L-22 19Z" fill="#8a93a3"/></g>`
  );
}

/** A mystery box with its lid lifting, standing on the origin. */
function lootBox(d: Drawing): string {
  const gold = d.lin(GOLD[0], GOLD[1]);
  return (
    floorShadow(124) +
    `<g filter="url(#sh)"><rect x="-54" y="-82" width="108" height="82" rx="8" fill="${d.lin("#b48ae6", "#6a37b0")}"/></g>` +
    `<path d="M-46 -80H46" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="-8" y="-82" width="16" height="82" fill="${gold}"/>` +
    `<g transform="rotate(-12 -58 -86)"><g filter="url(#sh)"><rect x="-60" y="-110" width="120" height="26" rx="6" fill="${d.lin("#c9a4f2", "#7b46c4")}"/></g><rect x="-8" y="-110" width="16" height="26" fill="${gold}"/></g>` +
    `<circle cx="-30" cy="-40" r="19" fill="#fff"/>` +
    at(-30, -40, QUESTION(30))
  );
}

/** A stopwatch standing on the origin, `digits` on its face. */
function stopwatch(d: Drawing, digits: string): string {
  return (
    floorShadow(84) +
    at(
      0,
      -56,
      `<rect x="-9" y="-66" width="18" height="12" rx="3" fill="#4b5366"/><rect x="-14" y="-72" width="28" height="9" rx="4" fill="${d.lin("#ef7a62", "#c0412f")}"/>` +
        `<g filter="url(#sh)"><circle r="54" fill="${d.lin("#f6a35f", "#d0601f")}"/></g>` +
        `<circle r="44" fill="${d.lin(GLASS[0], GLASS[1])}"/>` +
        `<path d="M-46 -20A50 50 0 0 1 -22 -46" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        text(0, 11, digits, 32, RED, 800),
    )
  );
}

// Small icons for screens, centred on the origin.
const ICONS = {
  play: (c: string) => `<path d="M-5 -7L8 0L-5 7Z" fill="${c}"/>`,
  hourglass: (c: string) => `<path d="M-6 -8H6L0 0L6 8H-6L0 0Z" fill="${c}"/>`,
  moon: (c: string) => `<path d="M2 -9A9 9 0 1 0 9 5A7 7 0 1 1 2 -9Z" fill="${c}"/>`,
  house: `<path d="M-13 -1L0 -13L13 -1Z" fill="#e8625a"/><rect x="-10" y="-2" width="20" height="14" rx="2" fill="#f2c48d"/><rect x="-3" y="4" width="6" height="8" rx="1" fill="#4f78c4"/>`,
  eyeSlash: (c: string) =>
    `<path d="M-18 0Q0 -15 18 0Q0 15 -18 0Z" fill="none" stroke="${c}" stroke-width="3"/><circle r="5" fill="${c}"/><path d="M-15 -13L15 13" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  forward: `<path d="M-15 13V4Q-15 -6 -3 -6H12M4 -14L12 -6L4 2" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  save: `<path d="M0 -16V4M-9 -5L0 4L9 -5M-15 8V14H15V8" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  controller: (c: string, tile: string) =>
    `<path d="M-10 -8H10Q18 -8 20 2L22 10Q23 15 18 15Q15 15 12 10L10 7H-10L-12 10Q-15 15 -18 15Q-23 15 -22 10L-20 2Q-18 -8 -10 -8Z" fill="${c}"/>` +
    `<path d="M-13 0H-5M-9 -4V4" stroke="${tile}" stroke-width="2.5" stroke-linecap="round"/><circle cx="8" cy="-1" r="2.2" fill="${tile}"/><circle cx="13" cy="3" r="2.2" fill="${tile}"/>`,
  chat: (c: string, tile: string) =>
    `<rect x="-15" y="-12" width="30" height="21" rx="8" fill="${c}"/><path d="M-7 7L-10 15L1 8Z" fill="${c}"/>` +
    `<circle cx="-6" cy="-1.5" r="2.2" fill="${tile}"/><circle cy="-1.5" r="2.2" fill="${tile}"/><circle cx="6" cy="-1.5" r="2.2" fill="${tile}"/>`,
  link: (c: string) =>
    `<g transform="rotate(-45)" fill="none" stroke="${c}" stroke-width="3"><rect x="-13" y="-5" width="15" height="10" rx="5"/><rect x="-2" y="-5" width="15" height="10" rx="5"/></g>`,
};

// ---- The pictures, one hue per lesson. ----

const FEEDS = HUE.tell;
const FRIENDS = HUE.kind;
const PHOTOS = HUE.private;
const BOTS = HUE.pretend;
const SCAMS = HUE.stop;

export const PICTURES_11_TO_13 = {
  // Feeds, filters and you

  /** Intro: one more video, and 40 minutes gone. */
  "a11-one-more-video": picture(
    "A phone playing a video beside a clock where 40 minutes have gone by",
    FEEDS,
    (d) => {
      const thumb = d.lin("#9cc3f0", "#4f78c4");
      const rows = [0, 1, 2]
        .map((i) => `<rect x="8" y="${98 + i * 22}" width="28" height="16" rx="3" fill="${thumb}"/>` + bar(42, 101 + i * 22, 50, 5, LINE) + bar(42, 109 + i * 22, 32, 5, LINE))
        .join("");
      return (
        at(
          140,
          210,
          phone(
            d,
            120,
            188,
            `<rect y="18" width="104" height="62" fill="${d.lin("#5f87d1", "#2b3445")}"/>` +
              `<circle cx="52" cy="49" r="17" fill="#fff" fill-opacity=".92"/><path d="M47 40L60 49L47 58Z" fill="${FEEDS}"/>` +
              bar(8, 86, 88, 5, LINE) +
              bar(8, 86, 70, 5, "#e0566f") +
              rows,
          ),
        ) +
        at(286, 206, clock(d, 40, FEEDS), 1.05) +
        at(58, 60, glint(12))
      );
    },
  ),
  /** How a feed chooses: like one puppy video, get a feed of puppies. */
  "a11-puppy-feed": picture(
    "One liked puppy video, and a phone feed full of puppies",
    FEEDS,
    (d) => {
      const f = { head: d.rad("#f6d3a8", "#d39b6c"), ear: "#9a6440" };
      const tiles = [0, 1, 2, 3, 4, 5]
        .map((i) => {
          const x = 6 + (i % 2) * 50;
          const y = 18 + Math.floor(i / 2) * 52;
          return `<rect x="${x}" y="${y}" width="46" height="46" rx="8" fill="#dbe6f7"/>` + at(x + 23, y + 24, puppy(f), 1.05);
        })
        .join("");
      return (
        at(268, 210, phone(d, 124, 190, tiles)) +
        at(92, 130, card(-50, -50, 100, 100, d.lin(GLASS[0], GLASS[1]), 14) + `<rect x="-40" y="-40" width="80" height="80" rx="9" fill="#dbe6f7"/>` + at(0, 2, puppy(f), 1.9), 1, -6) +
        at(138, 74, heart(d, PINK), 1.3) +
        arrow(150, 140, 190, 140, "#9db8ea")
      );
    },
  ),
  /** Highlights: the same photo taken again and again, one picked to post. */
  "a11-camera-roll": picture(
    "A camera roll of the same photo taken again and again, and the one picked to post",
    FEEDS,
    (d) => {
      const f = { sky: d.lin("#bfe0f5", "#7fb2ec"), hill: "#3f8f4f" };
      const thumbs = Array.from({ length: 12 }, (_, i) => {
        const x = 4 + (i % 3) * 36;
        const y = 20 + Math.floor(i / 3) * 36;
        return at(x, y, photo(f, 33, 33, 0.55 + ((i * 7) % 5) * 0.06));
      }).join("");
      return (
        at(
          130,
          212,
          phone(
            d,
            128,
            194,
            thumbs + `<rect x="75" y="55" width="35" height="35" rx="4" fill="none" stroke="${FEEDS}" stroke-width="4"/>`,
          ),
        ) +
        at(184, 82, `<circle r="13" fill="#fff"/>` + star("#f0b429", 9)) +
        at(
          296,
          206,
          floorShadow(110) +
            `<g transform="rotate(5)">${card(-56, -136, 112, 128, d.lin(GLASS[0], GLASS[1]), 6)}${at(-46, -126, photo(f, 92, 92, 0.7))}</g>`,
        ) +
        at(232, 62, glint(14)) +
        at(352, 54, glint(10))
      );
    },
  ),
  /** Stay in charge: notifications and autoplay off, a time limit and Do Not Disturb on. */
  "a11-in-charge": picture(
    "A phone's settings with notifications and autoplay off, and a time limit and Do Not Disturb on, beside a muted bell",
    FEEDS,
    (d) => {
      const rows = [
        [bell(ICON), false],
        [ICONS.play(ICON), false],
        [ICONS.hourglass(ICON), true],
        [ICONS.moon(ICON), true],
      ] as const;
      const screen = rows
        .map(([icon, on], i) => {
          const y = 24 + i * 38;
          return `<rect x="6" y="${y}" width="104" height="32" rx="8" fill="#fff"/>` + at(22, y + 16, icon, i === 0 ? 0.4 : 1) + bar(34, y + 13, 30, 6, LINE) + toggle(72, y + 7.5, on, FEEDS);
        })
        .join("");
      return (
        at(140, 210, phone(d, 132, 192, screen, ["#f1f5fb", "#dfe7f2"])) +
        at(
          300,
          118,
          `<g filter="url(#sh)">${bell(d.lin(GOLD[0], GOLD[1]))}</g><path d="M-14 -24C-8 -22 -6 -16 -6 -10" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>` +
            `<path d="M-30 -30L30 30" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M-30 -30L30 30" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>`,
          1.6,
        )
      );
    },
  ),
  /** Quick check: decide where to stop. */
  "a11-stop-before-you-start": picture(
    "A card that says Decide where to stop before you start",
    FEEDS,
    (d) => wordCard(d, FEEDS, ["Decide where", "to stop before", "you start."]),
  ),

  // Healthy and unhealthy online friendships

  /** Intro: friendly chat, and a question. */
  "a11-friend-or-not": picture(
    "A phone chat with friendly messages, and a question mark beside it",
    FRIENDS,
    (d) => {
      const pink = d.lin(PINK[0], PINK[1]);
      return (
        at(
          150,
          212,
          phone(
            d,
            124,
            192,
            bar(6, 22, 78, 32, GREY) +
              at(24, 38, ICONS.controller("#8a5bd1", GREY), 0.8) +
              bar(42, 35, 32, 6, LINE) +
              bar(30, 64, 72, 32, pink) +
              at(86, 80, heart(d, ["#ffffff", "#ffe3ea"]), 0.6) +
              bar(40, 77, 34, 6, "#fff") +
              bar(6, 106, 64, 32, GREY) +
              at(24, 122, `<circle r="10" fill="#ffd066"/><circle cx="-3.5" cy="-2" r="1.6" fill="${INK}"/><circle cx="3.5" cy="-2" r="1.6" fill="${INK}"/><path d="M-5 3Q0 7 5 3" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`) +
              bar(40, 119, 22, 6, LINE) +
              bar(44, 148, 58, 18, pink),
          ),
        ) + at(268, 128, bubble(70, 64, "left", QUESTION(44)))
      );
    },
  ),
  /** What healthy looks like: safe and equal. */
  "a11-safe-and-equal": picture(
    "A card that says Safe and equal, beside a balanced scale",
    FRIENDS,
    (d) => {
      const h = heart(d, PINK);
      return wordCard(d, FRIENDS, ["Safe", "and equal."], at(0, 0, balance(d, h), 0.74));
    },
  ),
  /** Warning signs: flattery, gifts and secrets. */
  "a11-warning-signs": picture(
    "A chat full of hearts, a gift and a secret, with a warning sign beside it",
    FRIENDS,
    (d) => {
      const h = heart(d, PINK);
      return (
        at(
          150,
          212,
          phone(
            d,
            124,
            192,
            bar(6, 22, 84, 34, GREY) +
              at(24, 39, h, 0.6) +
              at(46, 39, h, 0.6) +
              at(68, 39, h, 0.6) +
              bar(6, 64, 66, 34, GREY) +
              at(26, 83, gift(d), 0.85) +
              bar(44, 78, 20, 6, LINE) +
              bar(6, 106, 66, 34, GREY) +
              at(26, 134, padlock(d), 0.34) +
              bar(44, 120, 20, 6, LINE) +
              bar(50, 148, 52, 18, d.lin(PINK[0], PINK[1])),
          ),
        ) + at(296, 208, warningSign(d), 1.05)
      );
    },
  ),
  /** If something feels wrong: show a trusted adult. */
  "a11-can-i-show-you": picture(
    "A card that says Can I show you?, beside a phone",
    FRIENDS,
    (d) =>
      wordCard(
        d,
        FRIENDS,
        ["Can I", "show you?"],
        phone(d, 84, 138, bar(6, 22, 50, 20, GREY) + bar(16, 50, 50, 20, d.lin(PINK[0], PINK[1])) + bar(6, 78, 40, 20, GREY)),
      ),
  ),
  /** Quick check: if something feels off, tell a trusted adult. */
  "a11-tell-a-trusted-adult": picture(
    "A card that says If something feels off, tell a trusted adult",
    FRIENDS,
    (d) => wordCard(d, FRIENDS, ["If something", "feels off, tell", "a trusted adult."]),
  ),

  // Private photos and fake images: objects and word cards only.

  /** Intro: a phone locked, and a shield. */
  "a11-locked-phone": picture(
    "A phone with a padlock on its screen, and a shield",
    PHOTOS,
    (d) =>
      at(160, 212, phone(d, 124, 192, at(54, 134, padlock(d), 1.15), ["#f4eefc", "#dccbf5"])) +
      at(292, 210, shield(d, ["#b48ae6", "#7b46c4"]), 1.1) +
      at(82, 58, glint(14)) +
      at(352, 64, glint(10)),
  ),
  /** If someone asks: it's always OK to say no. */
  "a11-ok-to-say-no": picture(
    "A card that says It’s always OK to say no",
    PHOTOS,
    (d) => wordCard(d, PHOTOS, ["It’s always OK", "to say no."]),
  ),
  /** Fakes and forwarding: don't forward it, don't save it. */
  "a11-dont-forward": picture(
    "A phone with a hidden picture, and the forward and save buttons crossed out",
    PHOTOS,
    (d) => {
      const white = d.lin(GLASS[0], GLASS[1]);
      return (
        at(
          124,
          212,
          phone(
            d,
            120,
            190,
            `<rect x="8" y="22" width="88" height="96" rx="10" fill="#d5dbe5"/>` +
              at(52, 70, ICONS.eyeSlash(ICON)) +
              bar(8, 130, 70, 6, LINE) +
              bar(8, 142, 46, 6, LINE),
          ),
        ) +
        at(256, 86, crossedBadge(white, ICONS.forward)) +
        at(330, 156, crossedBadge(white, ICONS.save))
      );
    },
  ),
  /** If someone threatens you: stop replying, don't pay, get help. */
  "a11-dont-pay": picture(
    "A card that says Stop replying. Don’t pay. Get help.",
    PHOTOS,
    (d) => wordCard(d, PHOTOS, ["Stop replying.", "Don’t pay.", "Get help."]),
  ),
  /** Quick check: it's never your fault. */
  "a11-never-your-fault": picture(
    "A card that says It’s never your fault",
    PHOTOS,
    (d) => wordCard(d, PHOTOS, ["It’s never", "your fault."]),
  ),

  // AI chatbots and companions: the chatbot is a device or a chat window, never a person.

  /** Intro: always there, always agrees. */
  "a11-always-agrees": picture(
    "A friendly chatbot beside a phone chat where every reply agrees",
    BOTS,
    (d) => {
      const teal = d.lin("#7fd6c9", "#2a9d8f");
      const yes = (y: number) => bar(6, y, 58, 32, GREY) + at(26, y + 16, `<circle r="10" fill="${BOTS}"/>` + check("#fff", 3), 1) + bar(40, y + 13, 16, 6, LINE);
      return (
        at(
          132,
          212,
          phone(d, 120, 190, bar(36, 22, 66, 26, teal) + yes(54) + bar(44, 94, 58, 26, teal) + yes(126)),
        ) +
        at(296, 208, bot(d), 1.05) +
        at(270, 70, bubble(44, 40, "right", heart(d, PINK))) +
        at(356, 40, ICONS.moon("#ffd066"), 1.6) +
        at(222, 34, glint(10))
      );
    },
  ),
  /** What they are: sure of itself, and wrong. */
  "a11-sure-but-wrong": picture(
    "A chatbot saying, sure of itself, that 2 plus 2 is 5",
    BOTS,
    (d) =>
      at(96, 208, bot(d), 1.15) +
      at(168, 112, bubble(200, 76, "left", text(0, 12, "2 + 2 = 5", 36, INK, 800))) +
      at(352, 40, `<circle r="14" fill="${BOTS}"/>` + check("#fff", 3.5)) +
      at(176, 30, glint(12)),
  ),
  /** Built to keep you talking: a real friend sometimes disagrees. */
  "a11-real-friend": picture(
    "A card that says A real friend sometimes disagrees",
    BOTS,
    (d) => wordCard(d, BOTS, ["A real friend", "sometimes", "disagrees."]),
  ),
  /** Private and honest: the chatbot asks, the answer stays locked. */
  "a11-keep-it-private": picture(
    "A chatbot asking for an address and a password, with padlocks as the replies",
    BOTS,
    (d) => {
      const teal = d.lin("#7fd6c9", "#2a9d8f");
      const lock = padlock(d);
      const ask = (y: number, icon: string) => bar(8, y, 92, 36, GREY) + at(34, y + 18, icon) + at(72, y + 18, QUESTION(26));
      const reply = (y: number) => bar(120, y, 72, 36, teal) + at(156, y + 34, lock, 0.4);
      return (
        at(
          26,
          212,
          tablet(d, 226, 184, ask(6, ICONS.house) + reply(46) + ask(86, at(-14, 0, key(d), 0.44)) + reply(126)),
        ) +
        at(318, 208, bot(d), 0.95)
      );
    },
  ),
  /** Quick check: for health, safety or feelings, talk to a person you trust. */
  "a11-person-you-trust": picture(
    "A card that says Talk to a person you trust",
    BOTS,
    (d) => wordCard(d, BOTS, ["Talk to", "a person", "you trust."], at(0, -70, bubble(64, 56, "right", heart(d, PINK), "#ffffff"), 1.1)),
  ),

  // Accounts, scams and buying

  /** Intro: your accounts are worth stealing. */
  "a11-worth-stealing": picture(
    "A phone holding games, chats, photos and coins, beside a stack of coins",
    SCAMS,
    (d) => {
      const gold = d.lin(GOLD[0], GOLD[1]);
      const tile = (x: number, y: number, fill: string, icon: string) => `<rect x="${x}" y="${y}" width="48" height="48" rx="11" fill="${fill}"/>` + at(x + 24, y + 24, icon);
      const f = { sky: d.lin("#bfe0f5", "#7fb2ec"), hill: "#3f8f4f" };
      return (
        at(
          150,
          212,
          phone(
            d,
            128,
            194,
            tile(6, 22, "#8a5bd1", ICONS.controller("#fff", "#8a5bd1")) +
              tile(58, 22, "#4f78c4", ICONS.chat("#fff", "#4f78c4")) +
              `<g transform="translate(6 78)"><rect width="48" height="48" rx="11" fill="#fff"/>${at(5, 5, photo(f, 38, 38))}</g>` +
              tile(58, 78, "#fff2cc", coin(gold)) +
              bar(6, 140, 100, 6, LINE) +
              bar(6, 152, 70, 6, LINE),
          ),
        ) +
        at(300, 208, coinStack(gold, 5), 1.1) +
        at(326, 94, gem(d), 1.3) +
        at(260, 70, glint(14)) +
        at(70, 64, glint(10))
      );
    },
  ),
  /** Lock your accounts: a password, then a code, is a second lock. */
  "a11-second-lock": picture(
    "A phone asking for a password and then a code, and two padlocks",
    SCAMS,
    (d) => {
      const dots = [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${20 + i * 11}" cy="80" r="3.5" fill="${INK}"/>`).join("");
      const code = "482916"
        .split("")
        .map((n, i) => `<rect x="${7 + i * 17}" y="104" width="14" height="22" rx="3" fill="#fff" stroke="${LINE}" stroke-width="1.5"/>` + text(14 + i * 17, 120, n, 14, INK, 700))
        .join("");
      return (
        at(
          140,
          212,
          phone(
            d,
            124,
            192,
            at(54, 56, padlock(d), 0.5) +
              `<rect x="8" y="66" width="92" height="28" rx="8" fill="${GREY}"/>` +
              dots +
              at(88, 80, `<circle r="8" fill="#3f8f4f"/>` + check("#fff", 2.5), 0.9) +
              code +
              bar(18, 142, 72, 22, d.lin("#f6a35f", "#d0601f")),
          ),
        ) +
        at(266, 206, padlock(d), 1.1) +
        at(344, 206, padlock(d), 1.1) +
        at(306, 64, glint(12))
      );
    },
  ),
  /** Spot the fake: a hook in an urgent message's link. */
  "a11-phishing-hook": picture(
    "A fishing hook caught in the link of an urgent message, and a magnifying glass",
    SCAMS,
    (d) =>
      at(
        160,
        212,
        phone(
          d,
          128,
          194,
          `<rect x="6" y="22" width="100" height="120" rx="10" fill="#fff" stroke="${GREY}" stroke-width="2"/>` +
            `<circle cx="26" cy="44" r="12" fill="${RED}"/>` +
            `<rect x="24" y="36" width="4" height="10" rx="2" fill="#fff"/><circle cx="26" cy="50" r="2.2" fill="#fff"/>` +
            bar(44, 38, 52, 6, LINE) +
            bar(44, 48, 36, 6, LINE) +
            bar(16, 66, 80, 6, LINE) +
            bar(16, 78, 64, 6, LINE) +
            bar(16, 104, 80, 26, d.lin("#7fb2ec", "#4f78c4")) +
            at(56, 117, ICONS.link("#fff")),
        ),
      ) +
      at(198, 84, hook(d, 56), 1.5) +
      at(318, 118, magnifier(d), 1.15),
  ),
  /** Data, deals and loot boxes: a mystery box and a countdown. */
  "a11-loot-box": picture(
    "A mystery loot box spilling gems, and a countdown timer",
    SCAMS,
    (d) =>
      at(140, 206, lootBox(d), 1.05) +
      at(108, 74, gem(d), 1.2) +
      at(152, 54, gem(d), 0.9) +
      at(190, 82, glint(14)) +
      at(304, 206, stopwatch(d, "0:59")),
  ),
  /** Quick check: ask a parent before you buy. */
  "a11-ask-before-you-buy": picture(
    "A card that says Ask a parent before you buy",
    SCAMS,
    (d) => wordCard(d, SCAMS, ["Ask a parent", "before you buy."]),
  ),
} satisfies Record<string, LessonPictureEntry>;
