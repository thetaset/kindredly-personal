// Pictures for the ages 4–7 pack, and the first pictures of the 8–10 pack (DCL-15). Drawn with the kit
// in ./kit.ts; each is drawn the first time it is shown.

import {
  ADULT_A,
  ADULT_B,
  at,
  backpack,
  bubble,
  buyPopUp,
  cake,
  chest,
  CHILD_A,
  CHILD_B,
  CHILD_C,
  creature,
  Drawing,
  glint,
  heart,
  house,
  HUE,
  INK,
  key,
  magnifier,
  newspaper,
  padlock,
  person,
  picture,
  QUESTION,
  smiley,
  sofa,
  soundWaves,
  speaker,
  stopSign,
  stormCloud,
  tablet,
  text,
} from "./kit";

// ---- Parts only these pictures use. ----

/** A cross face, for an unkind message: a red circle with a frown, centred on the origin. */
function crossFace(d: Drawing): string {
  return (
    `<circle cx="0" cy="0" r="15" fill="${d.rad("#ff9a8a", "#d9483b")}"/>` +
    `<path d="M-8 -7L-3 -4M8 -7L3 -4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="-5" cy="-1" r="1.8" fill="${INK}"/><circle cx="5" cy="-1" r="1.8" fill="${INK}"/>` +
    `<path d="M-6 8Q0 3 6 8" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`
  );
}

/** A round green badge with a tick, centred on the origin. */
function tick(d: Drawing): string {
  return (
    `<g filter="url(#sh)"><circle cx="0" cy="0" r="20" fill="${d.lin("#6fcf7f", "#2f8f45")}"/></g>` +
    `<path d="M-9 0L-3 7L10 -7" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** A game on a tablet screen 150 wide: sky, hills, a star to catch and a little runner. */
function gameScreen(d: Drawing): string {
  return (
    `<rect width="150" height="100" fill="${d.lin("#bfe3ff", "#e8f5ff")}"/>` +
    `<ellipse cx="40" cy="104" rx="70" ry="34" fill="#7cc77f"/><ellipse cx="120" cy="108" rx="60" ry="30" fill="#5fb064"/>` +
    at(
      104,
      34,
      `<path d="M0 -12L3.5 -4L12 -3.5L5.5 2L7.5 10.5L0 6L-7.5 10.5L-5.5 2L-12 -3.5L-3.5 -4Z" fill="${d.lin("#ffe08a", "#e0a526")}"/>`,
    ) +
    `<circle cx="52" cy="58" r="9" fill="${d.rad("#ffb36b", "#e8833a")}"/><circle cx="55" cy="56" r="2" fill="${INK}"/>`
  );
}

/** A pink pig with white wings, flying, centred on the origin, facing left. */
function flyingPig(d: Drawing): string {
  const pink = d.lin("#ffc4d6", "#ef8fb0");
  const wing = d.lin("#ffffff", "#dfe7f2");
  return (
    `<path d="M8 -12C0 -44 34 -52 40 -30C34 -30 32 -26 34 -22C28 -22 26 -18 26 -14Z" fill="${wing}" stroke="#9fb3cc" stroke-width="1.5"/>` +
    `<path d="M30 -2Q40 -8 36 -14" stroke="#ef8fb0" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<rect x="-18" y="12" width="7" height="12" rx="3" fill="#e27ea0"/><rect x="8" y="12" width="7" height="12" rx="3" fill="#e27ea0"/>` +
    `<ellipse cx="0" cy="0" rx="32" ry="20" fill="${pink}"/>` +
    `<circle cx="-30" cy="-6" r="16" fill="${pink}"/>` +
    `<path d="M-36 -20L-30 -30L-24 -21Z" fill="#ef8fb0"/>` +
    `<ellipse cx="-43" cy="-3" rx="7" ry="6" fill="#f7a8c2"/><circle cx="-45" cy="-4" r="1.4" fill="#b8577a"/><circle cx="-41" cy="-4" r="1.4" fill="#b8577a"/>` +
    `<circle cx="-31" cy="-10" r="2" fill="${INK}"/>` +
    `<path d="M-8 -8C-22 -44 16 -54 22 -26C15 -26 13 -22 15 -17C8 -18 5 -13 6 -8Z" fill="${wing}" stroke="#9fb3cc" stroke-width="1.5"/>` +
    `<path d="M-2 -14C-4 -26 4 -34 12 -34M4 -12C4 -20 8 -24 14 -24" stroke="#9fb3cc" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
  );
}

export const PICTURES_4_TO_7 = {
  /** Something upsetting on a tablet, a worried child beside it. */
  "upsetting-screen": picture(
    "A tablet showing a storm cloud, and a worried child",
    HUE.tell,
    (d) =>
      at(96, 206, tablet(d, 160, 116, at(70, 46, stormCloud(d), 0.8)), 1, -4) +
      at(290, 210, person(d, { ...CHILD_A, mood: "worried" }), 1.05),
  ),
  /** A child telling a grown-up, side by side on a sofa. */
  "telling-a-grown-up": picture(
    "A child and a grown-up talking on a sofa",
    HUE.tell,
    (d) =>
      at(200, 212, sofa(d, true)) +
      at(240, 186, person(d, ADULT_A), 1.25) +
      at(152, 186, person(d, { ...CHILD_A, mood: "open" })) +
      at(200, 212, sofa(d, false)) +
      at(104, 72, bubble(46, 38, "right", heart(d, ["#ff8fa3", "#e0566f"]))),
  ),
  /** A wooden box with a padlock: things kept private. */
  "locked-box": picture(
    "A wooden box locked with a padlock",
    HUE.private,
    (d) =>
      at(200, 204, chest(d), 1.15) +
      at(110, 70, glint(14)) +
      at(296, 92, glint(10)),
  ),
  /** A home, a birthday cake and a school bag: private things. */
  "private-things": picture(
    "A house, a birthday cake and a school bag",
    HUE.private,
    (d) =>
      at(92, 200, house(d), 1.1) +
      at(204, 200, cake(d), 1.05) +
      at(312, 200, backpack(d), 1.05),
  ),
  /** A padlock and its key: a password. */
  "lock-and-key": picture(
    "A gold padlock and its key",
    HUE.private,
    (d) =>
      at(156, 196, padlock(d), 1.6) +
      at(232, 168, key(d), 1.25, -18) +
      at(312, 70, glint(14)),
  ),
  /** Kind messages on a tablet. */
  "kind-messages": picture(
    "A tablet showing a kind message with a heart and a smiley face",
    HUE.kind,
    (d) =>
      at(
        110,
        214,
        tablet(
          d,
          180,
          180,
          `<rect x="14" y="16" width="96" height="36" rx="18" fill="#e9edf3"/>` +
            at(38, 34, smiley(d)) +
            `<rect x="58" y="31" width="40" height="6" rx="3" fill="#b4bccb"/>` +
            `<rect x="50" y="64" width="96" height="36" rx="18" fill="${d.lin("#7fb2ec", "#4f78c4")}"/>` +
            at(124, 84, heart(d, ["#ff8fa3", "#e0566f"]), 0.8) +
            `<rect x="62" y="79" width="40" height="6" rx="3" fill="#fff" fill-opacity=".8"/>` +
            `<rect x="14" y="112" width="70" height="36" rx="18" fill="#e9edf3"/>` +
            at(38, 130, heart(d, ["#ff8fa3", "#e0566f"]), 0.7) +
            `<rect x="52" y="127" width="22" height="6" rx="3" fill="#b4bccb"/>`,
        ),
      ) +
      at(322, 74, glint(14)) +
      at(84, 52, glint(10)),
  ),
  /** A video call: a friend on the tablet, a child waving back. */
  "video-call": picture(
    "A child waving to a friend on a video call",
    HUE.kind,
    (d) =>
      at(
        60,
        210,
        tablet(
          d,
          170,
          130,
          `<rect width="150" height="110" fill="${d.lin("#d9e8fb", "#b9d0f0")}"/>` +
            at(75, 150, person(d, CHILD_C), 1.15),
        ),
        1,
        -3,
      ) +
      at(292, 210, person(d, { ...CHILD_B, wave: true }), 1.05) +
      at(216, 66, bubble(46, 38, "left", heart(d, ["#ff8fa3", "#e0566f"]))),
  ),
  /** A pop-up asking to buy gems. */
  "buy-pop-up": picture(
    "A tablet with a pop-up asking to buy gems",
    HUE.stop,
    (d) =>
      at(100, 208, tablet(d, 200, 150, at(10, 10, buyPopUp(d))), 1, -3) +
      at(330, 214, stopSign(d), 0.95),
  ),
  /** A child asking a grown-up a question. */
  "asking-a-grown-up": picture(
    "A child asking a grown-up a question",
    HUE.stop,
    (d) =>
      at(160, 212, person(d, { ...CHILD_C, mood: "open" })) +
      at(250, 212, person(d, ADULT_B), 1.3) +
      at(126, 92, bubble(44, 40, "right", QUESTION(28))),
  ),
  /** A made-up creature on a tablet. */
  "pretend-creature": picture(
    "A tablet showing a friendly one-eyed made-up creature",
    HUE.pretend,
    (d) =>
      at(
        110,
        214,
        tablet(
          d,
          180,
          170,
          `<rect width="160" height="150" fill="${d.lin("#e3f5f2", "#bfe6df")}"/>` +
            at(80, 126, creature(d), 1.15) +
            at(30, 30, glint(12)) +
            at(134, 24, glint(9)),
        ),
      ) + at(318, 112, bubble(46, 40, "left", QUESTION(28))),
  ),
  /** A talking speaker: a computer, not a person. */
  "talking-speaker": picture(
    "A smart speaker talking",
    HUE.pretend,
    (d) =>
      at(196, 200, speaker(d), 1.3) +
      at(252, 140, soundWaves("#2a9d8f")) +
      at(128, 70, bubble(44, 40, "right", QUESTION(28))),
  ),
  /** A news page under a magnifying glass. */
  "checking-the-news": picture(
    "A news page under a magnifying glass",
    HUE.real,
    (d) =>
      at(176, 212, newspaper(d), 1.25) +
      at(262, 104, magnifier(d), 1.1) +
      at(96, 52, glint(12)),
  ),
  /** A child saying "Please stop.", a grown-up beside them. */
  "saying-please-stop": picture(
    "A child saying Please stop, with a grown-up beside them",
    HUE.tell,
    (d) =>
      at(118, 212, person(d, { ...CHILD_B, mood: "open" })) +
      at(
        150,
        106,
        bubble(132, 46, "left", text(0, 7, "Please stop.", 20, INK)),
      ) +
      at(320, 212, person(d, ADULT_B), 1.28),
  ),
  /** An unkind message on a tablet; the child goes to a grown-up instead. */
  "unkind-message": picture(
    "A tablet with a cross face on it, and a child going to a grown-up",
    HUE.kind,
    (d) =>
      at(
        22,
        208,
        tablet(
          d,
          130,
          100,
          `<rect width="110" height="80" fill="#f4f6f9"/>` +
            at(30, 62, bubble(64, 40, "left", crossFace(d), "#ffe3df")),
        ),
        1,
        -5,
      ) +
      at(222, 212, person(d, { ...CHILD_C, mood: "worried" })) +
      at(322, 212, person(d, ADULT_A), 1.25) +
      at(258, 64, bubble(46, 38, "left", heart(d, ["#ff8fa3", "#e0566f"]))),
  ),
  /** A child happily playing their game: no need to ask. */
  "playing-is-fine": picture(
    "A happy child playing a game on a tablet, with a green tick",
    HUE.stop,
    (d) =>
      at(48, 210, tablet(d, 170, 120, gameScreen(d)), 1, -3) +
      at(222, 70, tick(d)) +
      at(318, 210, person(d, { ...CHILD_A, wave: true }), 1.05),
  ),
  /** A pig with wings on a tablet: made with a computer. */
  "flying-pig": picture(
    "A tablet showing a pig flying with wings, and a question mark",
    HUE.pretend,
    (d) =>
      at(
        70,
        214,
        tablet(
          d,
          210,
          170,
          `<rect width="190" height="150" fill="${d.lin("#cfe9ff", "#eef7ff")}"/>` +
            `<ellipse cx="44" cy="128" rx="36" ry="12" fill="#fff"/><ellipse cx="150" cy="136" rx="42" ry="13" fill="#fff"/>` +
            at(100, 74, flyingPig(d), 1.3) +
            at(160, 26, glint(12)),
        ),
      ) + at(328, 108, bubble(46, 40, "left", QUESTION(28))),
  ),
};
