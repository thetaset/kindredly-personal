// The drawing kit for Kindredly's built-in lesson pictures (HAT-534, DCL-15, HAT-580): every picture
// is an SVG drawn in code in the drawn card art style (docs/guides/drawn-card-art.md → Lesson pictures):
// one scene of a few objects, lit from the top left, a soft shadow under each, the ground the picture's
// hue at 14%. The pictures themselves are in one file per pack beside this one.
//
// The ground is the hue at 14% opacity over a transparent picture, so it mixes into whatever surface
// the lesson sits on, light or dark, as the card art's color-mix does. Objects keep their own colours,
// and words only ever sit on a light object (a card, a screen, a sign), so they read in both themes.

export const WIDTH = 400;
export const HEIGHT = 240;
export const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
export const INK = "#2b3445";
export const GOLD: [string, string] = ["#ffe08a", "#d99a0b"];

/** Collects one picture's gradients, clip paths and shadow so every part can ask for them by colour. */
export class Drawing {
  private defs: string[] = [];
  private count = 0;

  /** A gradient lit from the top left (the card art's `160deg`). */
  lin(from: string, to: string): string {
    const id = `g${this.count++}`;
    this.defs.push(
      `<linearGradient id="${id}" x1=".3" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`,
    );
    return `url(#${id})`;
  }

  /** A round thing's highlight, at 35% 35%. */
  rad(from: string, to: string): string {
    const id = `g${this.count++}`;
    this.defs.push(
      `<radialGradient id="${id}" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient>`,
    );
    return `url(#${id})`;
  }

  clip(shape: string): string {
    const id = `c${this.count++}`;
    this.defs.push(`<clipPath id="${id}">${shape}</clipPath>`);
    return `url(#${id})`;
  }

  svg(hue: string, body: string): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">` +
      `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".26"/></filter>${this.defs.join("")}</defs>` +
      `<rect width="${WIDTH}" height="${HEIGHT}" rx="18" fill="${hue}" fill-opacity=".14"/>` +
      body +
      `</svg>`
    );
  }
}

// ---- Parts. Each draws around its own origin; place it with at(). ----

export function at(
  x: number,
  y: number,
  part: string,
  scale = 1,
  rotate = 0,
): string {
  const s = scale === 1 ? "" : ` scale(${scale})`;
  const r = rotate ? ` rotate(${rotate})` : "";
  return `<g transform="translate(${x} ${y})${r}${s}">${part}</g>`;
}

/** The soft dark patch an object casts on the floor. */
export function floorShadow(width: number): string {
  return `<ellipse cx="0" cy="2" rx="${width / 2}" ry="${Math.max(4, width / 14)}" fill="#000" fill-opacity=".12"/>`;
}

export function text(
  x: number,
  y: number,
  words: string,
  size: number,
  fill: string,
  weight = 700,
): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle">${words}</text>`;
}

/** Four-pointed glint, as on the card art. */
export function glint(size = 10): string {
  const s = size / 2;
  const i = s * 0.24;
  return `<path d="M0 ${-s}L${i} ${-i}L${s} 0L${i} ${i}L0 ${s}L${-i} ${i}L${-s} 0L${-i} ${-i}Z" fill="#f0b429"/>`;
}

/** A heart about 28 wide, its point at the bottom, centred on the origin. */
export function heart(d: Drawing, color: [string, string]): string {
  return `<path d="M0 11C-17 0-15-13-7-13C-3-13 0-10 0-7C0-10 3-13 7-13C15-13 17 0 0 11Z" fill="${d.lin(color[0], color[1])}"/>`;
}

export type Person = {
  skin: [string, string];
  hair: string;
  shirt: [string, string];
  style: "short" | "long" | "bun" | "curly";
  mood?: "happy" | "worried" | "open";
  wave?: boolean;
};

/** A peg figure standing on the origin, about 110 tall (a grown-up is the same figure scaled up). */
export function person(d: Drawing, p: Person): string {
  const hx = 0;
  const hy = -76;
  const hair = p.hair;
  const behind =
    p.style === "long"
      ? `<rect x="-27" y="${hy - 25}" width="54" height="56" rx="24" fill="${hair}"/>`
      : p.style === "curly"
        ? [-20, -10, 0, 10, 20]
            .map(
              (x, i) =>
                `<circle cx="${x}" cy="${hy - 16 - (i % 2) * 6}" r="11" fill="${hair}"/>`,
            )
            .join("") +
          `<circle cx="-23" cy="${hy - 2}" r="9" fill="${hair}"/><circle cx="23" cy="${hy - 2}" r="9" fill="${hair}"/>`
        : p.style === "bun"
          ? `<circle cx="6" cy="${hy - 27}" r="11" fill="${hair}"/>`
          : "";
  const cap =
    p.style === "curly"
      ? ""
      : `<path d="M${hx - 24} ${hy - 1}C${hx - 26} ${hy - 32} ${hx + 26} ${hy - 32} ${hx + 24} ${hy - 1}C${hx + 14} ${hy - 13} ${hx - 4} ${hy - 17} ${hx - 24} ${hy - 1}Z" fill="${hair}"/>`;
  const mood = p.mood || "happy";
  const mouth =
    mood === "worried"
      ? `<path d="M${hx - 6} ${hy + 14}Q${hx} ${hy + 9} ${hx + 6} ${hy + 14}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : mood === "open"
        ? `<ellipse cx="${hx}" cy="${hy + 12}" rx="4" ry="4.5" fill="#7a2e2e"/>`
        : `<path d="M${hx - 7} ${hy + 10}Q${hx} ${hy + 16} ${hx + 7} ${hy + 10}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const brows =
    mood === "worried"
      ? `<path d="M${hx - 13} ${hy - 4}L${hx - 5} ${hy - 8}M${hx + 13} ${hy - 4}L${hx + 5} ${hy - 8}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
      : "";
  const arm = p.wave
    ? `<g transform="translate(19 -46) rotate(-150)"><rect x="-6" y="0" width="12" height="34" rx="6" fill="${p.shirt[1]}"/><circle cx="0" cy="37" r="7" fill="${p.skin[1]}"/></g>`
    : "";
  return (
    floorShadow(62) +
    arm +
    `<path d="M-21 -54H21Q29 -54 30 -46L33 -5Q34 0 29 0H-29Q-34 0 -33 -5L-30 -46Q-29 -54 -21 -54Z" fill="${d.lin(p.shirt[0], p.shirt[1])}"/>` +
    `<path d="M-18 -54H18" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>` +
    behind +
    `<circle cx="${hx}" cy="${hy}" r="24" fill="${d.rad(p.skin[0], p.skin[1])}"/>` +
    cap +
    `<ellipse cx="${hx - 8}" cy="${hy + 2}" rx="2.6" ry="3.2" fill="${INK}"/><ellipse cx="${hx + 8}" cy="${hy + 2}" rx="2.6" ry="3.2" fill="${INK}"/>` +
    brows +
    `<circle cx="${hx - 14}" cy="${hy + 9}" r="4" fill="#f28b82" fill-opacity=".45"/><circle cx="${hx + 14}" cy="${hy + 9}" r="4" fill="#f28b82" fill-opacity=".45"/>` +
    mouth
  );
}

export const SKIN: Record<string, [string, string]> = {
  light: ["#ffe3cf", "#f2bf9c"],
  tan: ["#f1c79f", "#d39b6c"],
  brown: ["#c48a5c", "#97623a"],
  deep: ["#9a6440", "#6e4224"],
};

/** A tablet whose bottom-left corner is the origin; `screen` draws in the screen's own coordinates. */
export function tablet(d: Drawing, w: number, h: number, screen = ""): string {
  const sw = w - 20;
  const sh = h - 20;
  const clip = d.clip(`<rect width="${sw}" height="${sh}" rx="6"/>`);
  return (
    at(w / 2, 0, floorShadow(w * 0.9)) +
    `<g filter="url(#sh)"><rect x="0" y="${-h}" width="${w}" height="${h}" rx="14" fill="${d.lin("#6a7388", "#4b5366")}"/></g>` +
    `<rect x="1" y="${-h + 1}" width="${w - 2}" height="${h - 2}" rx="13" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"/>` +
    `<g transform="translate(10 ${-h + 10})"><rect width="${sw}" height="${sh}" rx="6" fill="${d.lin("#ffffff", "#e6ecf4")}"/><g clip-path="${clip}">${screen}</g></g>`
  );
}

/** A white speech bubble whose tail points down-left (or down-right) to the origin. */
export function bubble(
  w: number,
  h: number,
  tail: "left" | "right",
  inner = "",
  fill = "#ffffff",
): string {
  const x = tail === "left" ? -10 : -w + 10;
  const t = tail === "left" ? `M2 -16L-2 0L18 -16Z` : `M-2 -16L2 0L-18 -16Z`;
  return (
    `<g filter="url(#sh)"><rect x="${x}" y="${-h - 14}" width="${w}" height="${h}" rx="${Math.min(18, h / 2)}" fill="${fill}"/><path d="${t}" fill="${fill}"/></g>` +
    `<g transform="translate(${x + w / 2} ${-14 - h / 2})">${inner}</g>`
  );
}

export function padlock(d: Drawing): string {
  return (
    floorShadow(70) +
    `<path d="M-19 -40V-58A19 19 0 0 1 19 -58V-40" stroke="${d.lin("#c9d0db", "#8a93a3")}" stroke-width="9" fill="none"/>` +
    `<path d="M-16 -44V-58A16 16 0 0 1 2 -74" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<g filter="url(#sh)"><rect x="-32" y="-46" width="64" height="46" rx="10" fill="${d.lin(GOLD[0], GOLD[1])}"/></g>` +
    `<path d="M-24 -44H24" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="0" cy="-27" r="6" fill="#7a5410"/><path d="M-3 -24H3L4 -12H-4Z" fill="#7a5410"/>`
  );
}

/** A gold key lying flat, ring on the left. */
export function key(d: Drawing): string {
  const g = d.lin(GOLD[0], GOLD[1]);
  return (
    `<g filter="url(#sh)"><circle cx="0" cy="0" r="14" fill="none" stroke="${g}" stroke-width="8"/>` +
    `<rect x="14" y="-4" width="50" height="8" rx="3" fill="${g}"/><rect x="48" y="2" width="6" height="11" rx="1.5" fill="${g}"/><rect x="58" y="2" width="6" height="8" rx="1.5" fill="${g}"/></g>` +
    `<path d="M-9 -7A11 11 0 0 1 3 -11" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>`
  );
}

/** A wooden box with a gold-banded lid, a padlock on its front. */
export function chest(d: Drawing): string {
  const gold = d.lin(GOLD[0], GOLD[1]);
  return (
    floorShadow(140) +
    `<g filter="url(#sh)"><rect x="-62" y="-58" width="124" height="58" rx="6" fill="${d.lin("#d8ae7f", "#b88957")}"/>` +
    `<path d="M-64 -58V-76Q-64 -98 -42 -98H42Q64 -98 64 -76V-58Z" fill="${d.lin("#c79b6d", "#a0723f")}"/></g>` +
    `<path d="M-58 -94Q-40 -96 40 -96" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<rect x="-66" y="-62" width="132" height="8" rx="3" fill="${gold}"/>` +
    `<rect x="-46" y="-97" width="9" height="97" fill="${gold}"/><rect x="37" y="-97" width="9" height="97" fill="${gold}"/>` +
    at(0, -14, padlock(d), 0.5)
  );
}

export function house(d: Drawing): string {
  return (
    floorShadow(84) +
    `<g filter="url(#sh)"><rect x="-34" y="-52" width="68" height="52" rx="3" fill="${d.lin("#fbeedb", "#ecc999")}"/>` +
    `<rect x="16" y="-92" width="11" height="24" fill="${d.lin("#c96a52", "#9e4a36")}"/>` +
    `<path d="M-46 -48L0 -88L46 -48Q48 -44 44 -44H-44Q-48 -44 -46 -48Z" fill="${d.lin("#ef7a62", "#c0412f")}"/></g>` +
    `<rect x="-11" y="-30" width="22" height="30" rx="3" fill="${d.lin("#5f87d1", "#3c62a8")}"/><circle cx="6" cy="-15" r="1.8" fill="#ffe08a"/>` +
    `<rect x="14" y="-40" width="14" height="13" rx="2" fill="#bfe0f5"/><path d="M21 -40V-27M14 -33.5H28" stroke="#fff" stroke-width="2"/>` +
    `<rect x="-28" y="-40" width="14" height="13" rx="2" fill="#bfe0f5"/><path d="M-21 -40V-27M-28 -33.5H-14" stroke="#fff" stroke-width="2"/>`
  );
}

export function cake(d: Drawing): string {
  const candle = (x: number, c: string) =>
    `<rect x="${x - 3}" y="-74" width="6" height="22" rx="2" fill="${c}"/>` +
    `<path d="M${x} -88C${x + 6} -81 ${x + 4} -76 ${x} -76C${x - 4} -76 ${x - 6} -81 ${x} -88Z" fill="${d.lin("#ffe08a", "#e8833a")}"/>`;
  return (
    floorShadow(96) +
    `<ellipse cx="0" cy="-3" rx="48" ry="7" fill="${d.lin("#ffffff", "#d9dee6")}"/>` +
    `<g filter="url(#sh)"><rect x="-38" y="-54" width="76" height="50" rx="9" fill="${d.lin("#f9c9d8", "#e58aa6")}"/></g>` +
    `<path d="M-38 -45Q-38 -54 -29 -54H29Q38 -54 38 -45V-38Q33 -32 28 -38Q22 -30 15 -38Q8 -30 1 -38Q-6 -30 -13 -38Q-20 -30 -27 -38Q-33 -32 -38 -38Z" fill="#fff"/>` +
    `<path d="M-38 -20H38" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>` +
    candle(-18, "#4f78c4") +
    candle(0, "#3f8f4f") +
    candle(18, "#8a5bd1")
  );
}

export function backpack(d: Drawing): string {
  return (
    floorShadow(80) +
    `<path d="M-14 -76Q-14 -92 0 -92Q14 -92 14 -76" stroke="#1f6f66" stroke-width="6" fill="none"/>` +
    `<g filter="url(#sh)"><rect x="-32" y="-80" width="64" height="80" rx="18" fill="${d.lin("#4fbdb0", "#22786e")}"/></g>` +
    `<path d="M-22 -76Q0 -80 22 -76" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<rect x="-22" y="-38" width="44" height="30" rx="8" fill="${d.lin("#3aa597", "#1d675f")}"/>` +
    `<path d="M-16 -31H16" stroke="#e0a526" stroke-width="2.5" stroke-linecap="round"/><circle cx="14" cy="-31" r="2.5" fill="#e0a526"/>`
  );
}

export function gem(d: Drawing): string {
  return (
    `<path d="M-14 -6L-8 -14H8L14 -6L0 14Z" fill="${d.lin("#c9a4f2", "#7b46c4")}"/>` +
    `<path d="M-14 -6H14L0 14Z" fill="#6a37b0" fill-opacity=".35"/><path d="M-8 -14L-3 -6H3L8 -14Z" fill="#fff" fill-opacity=".35"/>`
  );
}

/** A pop-up asking to buy gems, sized for a tablet screen 180 wide. */
export function buyPopUp(d: Drawing): string {
  return (
    `<rect width="180" height="110" fill="#000" fill-opacity=".18"/>` +
    `<g filter="url(#sh)"><rect x="22" y="12" width="136" height="88" rx="10" fill="#fff"/></g>` +
    at(56, 38, gem(d)) +
    at(42, 24, glint(9)) +
    text(112, 44, "Gems!", 15, INK) +
    `<rect x="34" y="62" width="64" height="26" rx="13" fill="${d.lin("#5cb66c", "#2f7d3f")}"/>` +
    text(66, 80, "Buy", 14, "#fff") +
    `<rect x="104" y="62" width="44" height="26" rx="13" fill="#e9edf3"/>` +
    text(126, 80, "No", 13, "#5b6478", 600)
  );
}

export function stopSign(d: Drawing): string {
  const pts = (r: number) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = ((22.5 + i * 45) * Math.PI) / 180;
      return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    }).join(" ");
  return (
    floorShadow(40) +
    `<rect x="-4" y="-80" width="8" height="80" rx="2" fill="${d.lin("#c9d0db", "#8a93a3")}"/>` +
    `<g transform="translate(0 -104)"><g filter="url(#sh)"><polygon points="${pts(36)}" fill="${d.lin("#f06b5f", "#c0392b")}"/></g>` +
    `<polygon points="${pts(31)}" fill="none" stroke="#fff" stroke-width="3"/>` +
    text(0, 6, "STOP", 16, "#fff", 800) +
    `</g>`
  );
}

/** A storm cloud with rain, centred on the origin. */
export function stormCloud(d: Drawing): string {
  return (
    `<path d="M-10 26L-16 40M4 26L-2 40M18 26L12 40" stroke="#6aa6e8" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M-30 20Q-46 20 -46 6Q-46 -8 -32 -9Q-30 -28 -10 -28Q4 -28 10 -18Q14 -22 22 -22Q38 -22 38 -6Q48 -4 48 7Q48 20 34 20Z" fill="${d.lin("#b4bccb", "#7d8698")}"/>` +
    `<path d="M2 18L-6 32H2L-4 46L12 26H4L10 18Z" fill="#f0b429"/>`
  );
}

/** A friendly made-up creature, standing on the origin. */
export function creature(d: Drawing): string {
  return (
    `<path d="M-22 -58L-16 -76L-10 -60ZM10 -60L16 -76L22 -58Z" fill="${d.lin("#ffe08a", "#e0a526")}"/>` +
    `<ellipse cx="-16" cy="-3" rx="10" ry="6" fill="#2f7d3f"/><ellipse cx="16" cy="-3" rx="10" ry="6" fill="#2f7d3f"/>` +
    `<circle cx="0" cy="-34" r="32" fill="${d.rad("#a8e08a", "#3f8f4f")}"/>` +
    `<circle cx="0" cy="-42" r="13" fill="#fff"/><circle cx="2" cy="-40" r="6" fill="${INK}"/><circle cx="4" cy="-42" r="2" fill="#fff"/>` +
    `<path d="M-12 -20Q0 -10 12 -20" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M-4 -16L-2 -11L1 -15Z" fill="#fff"/>` +
    `<circle cx="-20" cy="-26" r="4" fill="#f28b82" fill-opacity=".5"/><circle cx="20" cy="-26" r="4" fill="#f28b82" fill-opacity=".5"/>`
  );
}

/** A smart speaker, a fabric cylinder with a light ring, standing on the origin. */
export function speaker(d: Drawing): string {
  return (
    floorShadow(76) +
    `<g filter="url(#sh)"><path d="M-34 -72V-8Q-34 0 0 0Q34 0 34 -8V-72Z" fill="${d.lin("#eef1f5", "#b4bccb")}"/></g>` +
    `<path d="M-34 -60Q0 -52 34 -60M-34 -46Q0 -38 34 -46M-34 -32Q0 -24 34 -32M-34 -18Q0 -10 34 -18" stroke="#9aa3b2" stroke-opacity=".35" stroke-width="1.5" fill="none"/>` +
    `<ellipse cx="0" cy="-72" rx="34" ry="9" fill="${d.lin("#5b6478", "#3f4757")}"/>` +
    `<ellipse cx="0" cy="-72" rx="26" ry="6" fill="none" stroke="#5ec8f2" stroke-width="3"/>`
  );
}

export function soundWaves(color: string): string {
  return [14, 26, 38]
    .map(
      (r, i) =>
        `<path d="M${r * 0.7} ${-r * 0.7}A${r} ${r} 0 0 1 ${r * 0.7} ${r * 0.7}" stroke="${color}" stroke-opacity="${1 - i * 0.25}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    )
    .join("");
}

export function newspaper(d: Drawing): string {
  const lines = [0, 1, 2, 3]
    .map(
      (i) =>
        `<rect x="${i < 2 ? 10 : -50}" y="${-58 + i * 12}" width="${i < 2 ? 40 : 100}" height="5" rx="2.5" fill="#c3cad6"/>`,
    )
    .join("");
  return (
    floorShadow(120) +
    `<g transform="rotate(-6)"><g filter="url(#sh)"><rect x="-64" y="-128" width="128" height="128" rx="4" fill="#f4f6f9"/></g></g>` +
    `<g filter="url(#sh)"><rect x="-60" y="-124" width="120" height="124" rx="4" fill="${d.lin("#ffffff", "#eef1f5")}"/></g>` +
    `<rect x="-50" y="-112" width="100" height="10" rx="3" fill="${INK}"/>` +
    `<rect x="-50" y="-94" width="54" height="40" rx="3" fill="${d.lin("#9cc3f0", "#4f78c4")}"/>` +
    `<path d="M-50 -54L-34 -72L-22 -62L-10 -76L4 -54Z" fill="#3f8f4f" fill-opacity=".85"/>` +
    `<rect x="10" y="-94" width="40" height="5" rx="2.5" fill="#c3cad6"/><rect x="10" y="-82" width="34" height="5" rx="2.5" fill="#c3cad6"/>` +
    lines
  );
}

export function magnifier(d: Drawing): string {
  return (
    `<g filter="url(#sh)"><rect x="24" y="-6" width="14" height="52" rx="6" transform="rotate(-45 31 -6)" fill="${d.lin("#c88a4a", "#8a5a2b")}"/>` +
    `<circle cx="0" cy="0" r="30" fill="#fff" fill-opacity=".25" stroke="${d.lin("#8a93a3", "#4b5366")}" stroke-width="8"/></g>` +
    `<path d="M-18 -10A20 20 0 0 1 -6 -20" stroke="#fff" stroke-opacity=".9" stroke-width="4" fill="none" stroke-linecap="round"/>`
  );
}

export function sofa(d: Drawing, back: boolean): string {
  const c = d.lin("#f29a5c", "#c7652a");
  return back
    ? `<g filter="url(#sh)"><rect x="-120" y="-96" width="240" height="64" rx="20" fill="${c}"/></g>`
    : floorShadow(250) +
        `<g filter="url(#sh)"><rect x="-112" y="-44" width="224" height="36" rx="10" fill="${d.lin("#f6ad78", "#d47436")}"/>` +
        `<rect x="-134" y="-66" width="34" height="62" rx="14" fill="${c}"/><rect x="100" y="-66" width="34" height="62" rx="14" fill="${c}"/></g>` +
        `<rect x="-104" y="-8" width="10" height="10" rx="2" fill="#7a4a24"/><rect x="94" y="-8" width="10" height="10" rx="2" fill="#7a4a24"/>`;
}

export function smiley(d: Drawing): string {
  return (
    `<circle cx="0" cy="0" r="13" fill="${d.rad("#ffe08a", "#e0a526")}"/>` +
    `<circle cx="-4.5" cy="-3" r="1.8" fill="${INK}"/><circle cx="4.5" cy="-3" r="1.8" fill="${INK}"/>` +
    `<path d="M-6 3Q0 9 6 3" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`
  );
}

export const QUESTION = (size: number) =>
  text(0, size * 0.36, "?", size, "#4f78c4", 800);

export const CHILD_A: Person = {
  skin: SKIN.tan,
  hair: "#5a3a22",
  shirt: ["#ffd066", "#e0a526"],
  style: "short",
};
export const CHILD_B: Person = {
  skin: SKIN.brown,
  hair: "#2b2018",
  shirt: ["#7fb2ec", "#4f78c4"],
  style: "curly",
};
export const CHILD_C: Person = {
  skin: SKIN.light,
  hair: "#b5652d",
  shirt: ["#a7d98f", "#3f8f4f"],
  style: "long",
};
export const ADULT_A: Person = {
  skin: SKIN.deep,
  hair: "#1f1712",
  shirt: ["#b48ae6", "#7b46c4"],
  style: "bun",
};
export const ADULT_B: Person = {
  skin: SKIN.light,
  hair: "#6b4a2b",
  shirt: ["#5fc2b5", "#2a9d8f"],
  style: "short",
};

export const HUE = {
  tell: "#4f78c4",
  private: "#8a5bd1",
  kind: "#e0566f",
  stop: "#e8833a",
  pretend: "#2a9d8f",
  real: "#3f8f4f",
};

export function draw(hue: string, scene: (d: Drawing) => string): string {
  const d = new Drawing();
  const body = scene(d);
  return d.svg(hue, body);
}

/** One picture: its alt, read aloud, and its SVG, drawn the first time it is shown. */
export type LessonPictureEntry = { alt: string; svg: () => string };

export function picture(
  alt: string,
  hue: string,
  scene: (d: Drawing) => string,
): LessonPictureEntry {
  let made: string | null = null;
  return { alt, svg: () => (made ??= draw(hue, scene)) };
}

// ---- Word cards: a few words on a white card, for a page whose point is a phrase, not a scene. ----

/** `words` split into `count` lines of about equal length. */
function balance(words: string[], count: number): string[] {
  const target = words.join(' ').length / count;
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > target && lines.length < count - 1) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return [...lines, line];
}

/**
 * A white card holding one to three short lines, with the hue as a bar down its left edge and,
 * if given, an object standing to its right on the floor (its origin is where it touches the floor,
 * as for `padlock` or `stopSign`; lift a part drawn around its centre, e.g. `at(0, -50, magnifier(d))`).
 * Lines too long to set large are re-flowed onto more lines, three at most. Escape `&`, `<` and `>`
 * in the words as `&amp;`, `&lt;`, `&gt;`.
 */
export function wordCard(d: Drawing, hue: string, lines: string[], object?: string): string {
  const left = 28;
  const width = object ? 236 : 344;
  const top = 34;
  const height = 168;
  const room = width - 56;
  const sizeFor = (set: string[]) => {
    const longest = Math.max(...set.map((l) => l.replace(/&[a-z]+;/g, 'x').length));
    return Math.min(40, Math.floor(room / (longest * 0.56)), set.length > 2 ? 34 : 40);
  };
  let set = lines;
  while (sizeFor(set) < 28 && set.length < 3) set = balance(set.join(' ').split(' '), set.length + 1);
  const size = sizeFor(set);
  const lineHeight = size * 1.22;
  const firstBaseline = top + height / 2 - ((set.length - 1) * lineHeight) / 2 + size * 0.35;
  const words = set
    .map(
      (line, i) =>
        `<text x="${left + 34}" y="${(firstBaseline + i * lineHeight).toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${INK}">${line}</text>`,
    )
    .join('');
  return (
    `<g filter="url(#sh)"><rect x="${left}" y="${top}" width="${width}" height="${height}" rx="16" fill="${d.lin('#ffffff', '#eef1f5')}"/></g>` +
    `<path d="M${left + 14} ${top + 22}V${top + height - 22}" stroke="${hue}" stroke-width="7" stroke-linecap="round"/>` +
    words +
    (object ? at(left + width + (400 - left - width) / 2, 204, object) : '')
  );
}


