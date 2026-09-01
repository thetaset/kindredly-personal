const d="## APP CLASS: GAME\n\nThis app is a game. Build it with Kaboom.js (v3000, preloaded global `kaboom`).\n\n- Init ONCE: `const k = kaboom({ root: document.getElementById('app'), width: 640, height: 400, background: [24, 26, 36] })`. Never call `kaboom()` twice — rerunning the app resets the sandbox for you.\n- Use k.* methods: `k.add([k.rect(w,h), k.pos(x,y), k.color(r,g,b), k.area(), 'tag'])`, `k.onKeyDown`, `k.onUpdate`, `k.onCollide`, `k.destroy`, `k.rand`, `k.text`.\n- Game loop = `k.onUpdate(...)` callbacks. NEVER `while(true)` or busy-wait loops — they freeze the sandbox and the run times out.\n- Sprites: no external images (no network for assets). Draw with primitives: `k.rect`, `k.circle`, `k.text`, `k.color`. Emoji inside `k.text(...)` make good characters.\n- Canvas colors are literal RGB — that is fine INSIDE the game canvas. Any HTML around the canvas (menus, score screens) must use --knd-* tokens, never hardcoded colors.\n- Keyboard: `k.onKeyDown('left', ...)` for held movement, `k.onKeyPress('space', ...)` for taps. Also add on-screen buttons or `k.onClick` for touch users when it fits the game.\n- Keep player state (score, level) in plain variables; save high scores with `kindredly.refState` (getdocs: refstate).\n- Scenes: `k.scene('menu', ...)` / `k.go('menu')` for menu → play → game-over flow.\n- Phones matter: keyboard-only controls make the game unplayable in the mobile app. Add on-screen touch controls (or tap/swipe on the canvas) alongside the keys, and size the canvas from the container rather than a fixed width.\n\nPitfalls: forgetting `k.area()` on both colliders (onCollide silently never fires); moving objects without `k.onUpdate`/`move` (teleporting); spawning unbounded objects without `k.destroy` (slowdown).\n",p='## APP CLASS: TOOL / TRACKER\n\nThis app is a practical tool (tracker, list, counter, calculator, planner).\n\n- UI: semantic HTML styled by Pico (preloaded) — `<main class="container">`, `<article>` for cards, `<button>`, `<form role="group">`, `<summary>`. Bare Pico elements are already themed; add custom colors only via --knd-* tokens.\n- Rendering: keep ONE `render()` function that rebuilds the UI from a single state object, then re-attaches listeners. Call it after every state change. Render immediately on load — never leave #app empty while waiting on async data.\n- ALWAYS escape user text before putting it in innerHTML (`escapeHtml` helper — the scaffold has one). Unescaped input is the top tool-app bug.\n- Persistence: `kindredly.refState` (no prompts, per-app local). Save the whole state object under one key after each change; load it once at startup in the background, then re-render. Wrap host calls in try/catch — the app must still work if a call fails. Details: getdocs refstate. For data shared across family members use sharedRefState (prompts the user; getdocs: sharedrefstate).\n- Forms: handle `submit` with `e.preventDefault()`; trim input; ignore empty submissions.\n- Looks: `knd-card` rows, a `knd-stat` tile for the headline number, `knd-icon-btn` + `<knd-icon>` for row actions (delete, edit, done) instead of text buttons, and a `knd-empty` block for the nothing-yet state. Getting these four right is most of the difference between a sketch and a finished tool (getdocs: ui-kit, icons).\n- Dates/times: `new Date().toISOString()` for stored timestamps, `toLocaleDateString()` for display.\n- Phones matter: one column at 320px, ~44px rows and buttons, 16px inputs, and row actions as icon buttons that are always visible — not revealed on hover.\n\nPitfalls: re-attaching listeners to stale elements after innerHTML replacement (attach INSIDE render, after setting innerHTML); storing DOM nodes in state (store plain data only); saving on every keystroke (save on submit/change instead).\n',u='## APP CLASS: CONTENT VIEWER\n\nThis app fetches and displays content (lookups, feeds, dashboards, quizzes over data).\n\n- Network: plain `await fetch(url)` works — the host performs it and returns a real Response. https only, 2MB cap. The FIRST call to a new hostname shows the user a permission prompt, and reading vs sending prompt separately, so keep all requests on as few hostnames as possible. Details: getdocs net.\n- Every fetch renders three states: loading (`<p aria-busy="true">Loading…</p>`), error (friendly message with the status — check `res.ok` / catch), and empty ("no results"). Never leave stale or blank UI after a failed fetch.\n- Escape ALL fetched text before innerHTML (`escapeHtml` helper — the scaffold has one). Remote data is untrusted.\n- Cache responses that rarely change in `kindredly.refState` (store `{ data, fetchedAt }`, refetch when stale) so the app opens instantly and works offline-ish. Details: getdocs refstate.\n- UI: Pico semantic HTML — `<article>` per result card, `<main class="container">`. Custom colors only via --knd-* tokens.\n- Looks: `knd-grid` of `knd-card`s for results, `knd-chip` for tags/metadata, and `knd-empty` with a large `<knd-icon>` for the no-results and error states — those two screens are seen more often than you expect (getdocs: ui-kit, icons).\n- Phones matter: results stack in one column at 320px (`knd-grid` handles it), long titles wrap rather than overflow, and the search field is reachable without scrolling.\n- Good public JSON APIs need no keys: Wikipedia REST (`en.wikipedia.org/api/rest_v1/page/summary/<topic>`), Open-Meteo weather (`api.open-meteo.com`). Avoid APIs requiring auth keys — there is no way to store secrets safely.\n\nPitfalls: rendering `res.json` fields without checking they exist (guard with fallbacks); firing a fetch per keystroke (fetch on submit); assuming cookies/auth are sent (they are not — credentials omitted).\n',h="## APP CLASS: CREATIVE / CANVAS\n\nThis app is a creative tool (drawing, patterns, generative art, simple animation).\n\n- Use a 2D canvas: fixed logical size (e.g. 640×400) with `max-width:100%` CSS so it scales; map pointer coords through `getBoundingClientRect()` scaled by `canvas.width / rect.width` (the scaffold shows this — keep that pattern or coordinates drift when scaled).\n- Pointer events, not mouse events: `pointerdown` / `pointermove` / `pointerup` / `pointercancel` + `canvas.setPointerCapture(e.pointerId)` and CSS `touch-action:none` — this makes drawing work with touch and stylus too.\n- Animation: `requestAnimationFrame` loop with a stop condition — NEVER `while(true)`/busy-wait (freezes the sandbox; run times out).\n- Colors drawn ONTO the canvas (strokeStyle/fillStyle, palettes) are literal values — that is fine; they are content, not UI. The HTML around the canvas (toolbars, buttons) must use Pico + --knd-* tokens only. Give the canvas an explicit background (`background: var(--knd-surface)` CSS, or paint it) so art is visible in both light and dark themes.\n- Toolbar patterns: swatch buttons setting a `strokeColor` variable, range input for brush size, Clear button (`ctx.clearRect`).\n- Phones matter: use pointer events (never mouse-only), `touch-action:none` on the canvas so drawing does not scroll the page, `max-width:100%` so it fits a narrow pane, and ~44px swatch buttons.\n- Persistence is optional; canvases as data-URLs are big. If saving, prefer storing the STROKES (arrays of points/colors) in `kindredly.refState` and replaying them — not the bitmap. Details: getdocs refstate.\n\nPitfalls: resizing the canvas element via width/height attributes mid-session (wipes the drawing); forgetting `ctx.beginPath()` on pointerdown (lines connect across strokes); drawing in CSS pixels instead of canvas pixels (offset strokes).\n",m='## APP GUIDANCE (GENERAL)\n\nNo app class is set for this project. General best practices:\n\n- UI: semantic HTML styled by Pico (preloaded) — `<main class="container">`, `<article>` for cards, `<button>`, `<form role="group">`. Bare Pico elements are already themed for light and dark; add custom colors only via --knd-* tokens (getdocs: theming).\n- Keep ONE `render()` function that rebuilds the UI from a single state object and re-attaches listeners after setting innerHTML. Render immediately on load — never leave #app blank while waiting on async work.\n- ALWAYS escape user or fetched text before putting it in innerHTML.\n- Looks: a `knd-*` CSS kit (cards, layout, buttons, chips, stat tiles, empty states) and a 146-icon SVG set (`<knd-icon name="star-fill">`) ship with the sandbox and follow the theme. Use icons rather than emoji for actions and status (getdocs: ui-kit, icons).\n- Persistence: `kindredly.refState` (no prompts; getdocs: refstate). Network: plain `fetch` (getdocs: net). Wrap host API calls in try/catch — the app must still work when a call fails.\n- Games/animation: Kaboom.js is preloaded (getdocs: kaboom-patterns). Reactive forms: Alpine.js is preloaded (getdocs: alpine-patterns).\n- NEVER use blocking loops (`while(true)`, busy-wait) — the sandbox run times out.\n\nIf the user\'s request clearly fits a class (game, tool/tracker, content viewer, creative/canvas), you may suggest they set the app type via "Change app type" for better guidance — but proceed with the request either way.\n',f=`# Ref State API (local persistence, no prompts)

\`\`\`js
await kindredly.refState.get(key, { scope: 'user'|'account', namespace })
await kindredly.refState.set(key, value, { scope, namespace })
await kindredly.refState.delete(key, { scope, namespace })
const { entries } = await kindredly.refState.list({ scope, namespace, limit })
\`\`\`

- No permission prompts. Data is stored locally on this device, scoped to this app + namespace. It does NOT sync across devices.
- \`scope: 'user'\` = per-user, \`scope: 'account'\` = shared by users on this device. Both are local namespaces only.
- Values must be JSON-serializable (objects/arrays/primitives). Primitives and arrays are fine — the host wraps/unwraps them.
- Keep values compact JSON; no huge blobs (images/data-URLs).
- Pick ONE short namespace string for the whole app (e.g. \`'tracker'\`) and reuse it everywhere.

Pattern — single state key, load-then-render:

\`\`\`js
let state = { items: [] }
const save = async () => {
  try { await kindredly.refState.set('state', state, { scope: 'user', namespace: 'myapp' }) }
  catch (e) { console.warn('save failed', e) }
}
// at startup, render defaults first, then hydrate:
try {
  const stored = await kindredly.refState.get('state', { scope: 'user', namespace: 'myapp' })
  if (stored && typeof stored === 'object') { state = stored; render() }
} catch (e) { console.warn('load failed', e) }
\`\`\`

Always try/catch host calls: the app must keep working (unsaved) when a call fails.
`,g=`# Shared Ref State API (server-backed persistence, permissioned)

\`\`\`js
await kindredly.sharedRefState.get(key, { scope: 'user'|'account', namespace })
await kindredly.sharedRefState.set(key, value, { scope, namespace })
await kindredly.sharedRefState.delete(key, { scope, namespace })
const { entries } = await kindredly.sharedRefState.list({ scope, namespace, limit })
\`\`\`

- Server-backed: syncs across the user's devices. \`scope: 'account'\` is shared across ALL users in the family account (leaderboards, shared lists); \`scope: 'user'\` is private to the current user.
- The FIRST call shows the user a permission prompt (separate read/write grants per scope). Wrap calls in try/catch and degrade gracefully if the user declines — e.g. fall back to local \`refState\`.
- Values must be JSON-serializable. Keep them compact; this hits the server.
- Requires the user to be signed in; calls fail cleanly otherwise.

When to use which storage:
- Device-local, silent → \`refState\` (default choice)
- Sync across devices / share within the family → \`sharedRefState\`
- Resets each run and nobody minds → a plain in-memory variable

Pattern — shared family counter with local fallback:

\`\`\`js
async function loadCount() {
  try {
    const v = await kindredly.sharedRefState.get('count', { scope: 'account', namespace: 'jar' })
    return typeof v === 'number' ? v : 0
  } catch (e) {
    console.warn('shared read failed, using local', e)
    const local = await kindredly.refState.get('count', { scope: 'user', namespace: 'jar' })
    return typeof local === 'number' ? local : 0
  }
}
\`\`\`
`,y=`# Network API (permissioned fetch)

Plain \`fetch()\` works. There is no direct network — \`connect-src 'none'\` blocks the real
fetch/XHR/WebSocket — but \`window.fetch\` is replaced by a shim that routes the request through the
host, which prompts the user and performs it. You get a real \`Response\` back.

\`\`\`js
const res = await fetch(url)        // .ok .status .headers .json() .text() .blob()
if (!res.ok) throw new Error('HTTP ' + res.status)
const data = await res.json()
\`\`\`

\`kindredly.net.fetchJson(url, { timeoutMs })\` → \`{ ok, status, url, json }\` also still works and is
fine for a simple JSON read.

Apps that use \`kindredly.location\` lose network by default — an app that can read coordinates must
not also be able to send them somewhere. Design for location OR network, not both.

- For a **kid** the block is absolute: the call throws \`E_LOCATION_NET_BLOCKED\` and there is no
  prompt that can unblock it.
- An **adult** answers one extra "internet AND location?" prompt. Never rely on this.
- Either way, remote images stay blocked for location apps. Draw visuals yourself.

Rules:
- https:// only (http:// allowed only for localhost).
- The FIRST request to each hostname prompts. **Reading and sending prompt separately** — being
  allowed to GET from a host does not allow POSTing to it. Stay on as few hostnames as possible.
- Methods: GET/HEAD/POST/PUT/PATCH/DELETE. No cookies (credentials omitted). Do not use APIs that
  need secret keys — there is nowhere safe to store one.
- Bodies: string, URLSearchParams, or bytes. **FormData is not supported.** Max 100KB.
- Responses max 2MB (250KB through fetchJson). \`timeoutMs\` 1000–20000, default 12000.
- \`XMLHttpRequest\` is NOT shimmed — use fetch.

Pattern — fetch with the three UI states:

\`\`\`js
show('<p aria-busy="true">Loading…</p>')
try {
  const res = await fetch(url)
  if (!res.ok) { show('<p>Request failed (HTTP ' + res.status + ').</p>'); return }
  const data = await res.json()
  if (!data || !data.items?.length) { show('<p>No results.</p>'); return }
  render(data)
} catch (e) {
  console.warn(e)
  show('<p>Could not load: ' + escapeHtml(e?.message || e) + '</p>')
}
\`\`\`

Escape ALL fetched text before innerHTML. Guard every field you render (\`d.title || fallback\`).
`,k=`# Files API (read this app's attachments)

\`\`\`js
const { files } = await kindredly.files.list({ prefix })       // [{filename, fileId, fileType, namespace}]
const text = await kindredly.files.readText('data.json')
const json = await kindredly.files.readJson('data.json')
const dataUrl = await kindredly.files.readDataUrl('image.png') // for <img src>
const { bytes, fileType } = await kindredly.files.readBytes('archive.zip') // Uint8Array
const { entries } = await kindredly.files.zipList('archive.zip')
const entryText = await kindredly.files.zipReadText('archive.zip', 'path/in/zip.txt')
const { bytes: b } = await kindredly.files.zipReadBytes('archive.zip', 'path/in/zip.bin')
\`\`\`

- READ-ONLY, and only files attached to THIS app item (the user attaches them in the editor). No prompts.
- \`readText\`/\`readJson\` are decoded by the host — do not base64-decode yourself.
- Use \`readDataUrl\` for images: \`img.src = await kindredly.files.readDataUrl('photo.png')\`.
- Reads are size-capped; keep data files reasonably small.
- Your own source files (run.js) are attachments too — ignore them when listing data files (filter by extension or use a \`prefix\`).

Pattern — optional data file with fallback:

\`\`\`js
let config = { title: 'My App' }
try {
  const parsed = await kindredly.files.readJson('config.json')
  if (parsed && typeof parsed === 'object') config = parsed
} catch (e) {
  console.warn('config.json missing/invalid, using defaults', e)
}
\`\`\`
`,b="# Theming (light/dark safety)\n\nThe sandbox runs inside Kindredly with light AND dark themes. Pico's `data-theme` and the design tokens are set for you — do not fight them.\n\nTheme-adaptive tokens (they flip with the host theme):\n\n```\nvar(--knd-bg)          page background\nvar(--knd-surface)     card / panel background\nvar(--knd-surface-2)   subtle raised background\nvar(--knd-text)        primary text\nvar(--knd-muted)       secondary / helper text\nvar(--knd-border)      borders / dividers\nvar(--knd-accent)      brand / primary accent\nvar(--knd-accent-text) text ON an accent background\n```\n\nRules:\n- NEVER hardcode UI colors (`#fff`, `color: black`, `rgba(0,0,0,…)`) and never `!important` on colors. A hardcoded light surface plus Pico's themed text is the classic invisible-text-in-dark-mode bug.\n- PREFER bare Pico: semantic HTML (`<article>`, `<button>`, `<h1>`, `<summary>`) with no color overrides is readable in every theme.\n- When you need custom colors, use ONLY the tokens: `background: var(--knd-surface); color: var(--knd-text); border: 1px solid var(--knd-border);`\n- A custom-colored surface MUST set both background AND color from tokens — never one without the other.\n- Exception: colors drawn INSIDE a canvas (games, drawing apps) are content, not UI — literals are fine there. Give the canvas itself a token background so the art shows in both themes.\n- Inject app CSS with a `<style>` tag created in JS (`document.createElement('style')`); scope selectors under `#app`.\n\nMentally test every screen in BOTH light and dark before finishing.\n",w=`Built-in SVG icon set. Prefer it over emoji for UI affordances: icons inherit \`currentColor\`
and font size, so they stay legible in both themes.

- Markup: \`<knd-icon name="star-fill" size="24"></knd-icon>\` — fine inside innerHTML, template
  literals and Alpine templates.
- String: \`kindredly.icons.svg('star-fill', { size: 24, class: 'knd-accent', label: 'Save' })\`.
  \`.element(name, opts)\` returns a DOM node instead.

Colour with CSS, not a fill attribute. Pass \`label\` when the icon carries meaning alone; without it
it is \`aria-hidden\`. Unknown names render nothing and warn. Complete set:

**actions** — plus-lg, dash-lg, x-lg, check-lg, arrow-left, arrow-right, arrow-up, arrow-down, chevron-left, chevron-right, chevron-up, chevron-down, arrow-clockwise, arrow-counterclockwise, arrow-repeat, three-dots, three-dots-vertical, list, grid-3x3-gap-fill, search, funnel, gear, sliders, pencil, trash, copy, clipboard, download, upload, share, link-45deg, paperclip, printer, eye, eye-slash, filter-circle

**media** — play-fill, pause-fill, stop-fill, skip-start-fill, skip-end-fill, volume-up-fill, volume-mute-fill, mic-fill, camera-fill, image, music-note-beamed, headphones, film, camera-video-fill, soundwave

**status** — check-circle-fill, x-circle-fill, exclamation-triangle-fill, info-circle-fill, question-circle, bell-fill, flag-fill, hourglass-split, shield-check

**objects** — star, star-fill, heart, heart-fill, bookmark-fill, trophy-fill, gift-fill, lightbulb-fill, fire, magic, palette-fill, brush-fill, eraser-fill, scissors, key-fill, lock-fill, unlock-fill, balloon-fill

**content** — file-earmark-text, folder-fill, journal-text, book-fill, card-text, chat-dots-fill, envelope-fill, calendar-event, clock-fill, alarm-fill, stopwatch-fill, sticky-fill, newspaper

**data** — bar-chart-fill, pie-chart-fill, graph-up, table, list-check, check2-square, square, circle-fill, dice-5-fill, calculator-fill, percent, sort-down

**people** — person-fill, people-fill, emoji-smile-fill, emoji-laughing-fill, emoji-neutral-fill, emoji-frown-fill, hand-thumbs-up-fill, hand-thumbs-down-fill

**world** — sun-fill, moon-stars-fill, cloud-fill, cloud-rain-fill, snow, tree-fill, flower1, globe-americas, map-fill, geo-alt-fill, thermometer-half, droplet-fill, lightning-charge-fill, wind

**life** — house-fill, rocket-takeoff-fill, airplane-fill, car-front-fill, bicycle, controller, puzzle-fill, basket-fill, cart-fill, coin, piggy-bank-fill, cup-hot-fill, egg-fried, heart-pulse-fill, bandaid-fill, backpack-fill, mortarboard-fill, pencil-square, wifi, battery-half, activity
`,v='A small CSS component layer (sandbox-ui.css) sits on top of Pico. Pico already styles raw elements\n— `<button>`, `<input>`, `<article>` — so reach for these classes only for the pieces Pico has no\nopinion about. Every class is built on the `--knd-*` tokens, so it follows the host theme; never\nhardcode a colour.\n\n**Layout** — `knd-stack` (vertical, gap) · `knd-stack-sm` · `knd-row` (horizontal, wraps) ·\n`knd-row-tight` · `knd-spread` (space-between) · `knd-center` · `knd-grow` (fill remaining) ·\n`knd-wrap` (centred 42rem column) · `knd-grid` (auto-fit, min 10rem) · `knd-grid-2` · `knd-grid-3`\n\n**Surfaces** — `knd-card` (bordered, padded, subtle shadow) · `knd-card-flat` · `knd-card-action`\n(adds hover lift; use when the card is clickable) · `knd-panel` (tinted, no border) ·\n`knd-toolbar` (pill bar for controls) · `knd-divider`\n\n**Text** — `knd-title` · `knd-subtitle` · `knd-eyebrow` (small caps label) · `knd-muted` ·\n`knd-small` · `knd-accent` · `knd-good` · `knd-warn` · `knd-bad` · `knd-nowrap`\n\n**Stat tile** — `knd-stat` wrapping `knd-stat-value` (large, tabular numerals) and\n`knd-stat-label`. This is the standard score / streak / total block.\n\n**Controls** — `knd-btn` (accent fill) with `knd-btn-ghost` (outlined), `knd-btn-quiet` (no fill,\nno border), and sizes `knd-btn-sm` / `knd-btn-lg` / `knd-btn-pill` / `knd-btn-block`.\n`knd-icon-btn` is a square icon-only button — pair it with `<knd-icon>`. `knd-chip` is a pill\nbadge, with `knd-chip-accent` / `knd-chip-good` / `knd-chip-warn` / `knd-chip-bad`.\n\n**Lists** — `knd-list` on the `<ul>`, `knd-list-item` on each row (flex, divider between).\n\n**Feedback** — `knd-empty` (centred empty state; put a large `<knd-icon>` inside) ·\n`knd-progress` wrapping `knd-progress-bar` (set its width in a style rule or via `style.width`).\n\n**Motion** — `knd-fade-in`, `knd-pop`. Both respect prefers-reduced-motion.\n\nDesign defaults worth following: one accent colour, generous whitespace, a single `knd-title` per\nscreen, and an empty state for every list that can be empty. Buttons carry a verb, not "OK".\n',S=`How a finished app looks. These are the rules generated apps break most often.

**Don't rebuild chrome the host already provides.**

- No app title, logo, byline or version in the app body. Kindredly shows the app's name around it;
  repeating it wastes the top of a small pane. Start with the content.
- No "welcome to…" paragraph. If a user needs one sentence to start, it belongs in the empty
  state, not above a UI they can already see.
- No fake window bars, tab strips, footers or back buttons for a single-screen app.
- No credits, no "built with", no instructions block. One line of hint text at most.

**Put the main thing first.**

- The primary content or action is at the top and needs no scrolling.
- Settings, options, filters and resets do NOT belong on the main screen. Hide them behind a gear
  icon button, a \`<details>\` block, or a second view. A first-time user should see the app doing
  its job, not a form for configuring it.
- One primary (filled) button per screen; everything else quiet or an icon button. Rare actions go
  in a menu.

**Show state, don't explain it.**

- Every list that can be empty needs an empty state, and it carries the first action ("Add your
  first task"), not an apology.
- Loading, empty and error are three different screens. Never leave a blank pane.
- After an action the UI must visibly change. Don't narrate what the screen already shows.
- Never render raw JSON, ids or debug output.

**It has to work on a phone. Not optional.**

- Apps run in the Kindredly mobile app and in a narrow side pane. Design for 320px first.
- One column that reflows. No fixed pixel width or height on a layout container, no horizontal
  scrolling. Multi-column only via \`knd-grid\` (auto-fit) or an explicit \`minmax()\`.
- Touch first: pointer/click handlers, never mousedown-only or mouse-drag. Nothing may be
  reachable only on \`:hover\` — phones have no hover.
- Tap targets ~44px. Inputs at 16px or larger, or iOS zooms on focus.
- Canvas: \`max-width:100%; height:auto\`, buffer sized from the measured element, and
  \`touch-action:none\` on anything draggable.
- Re-read your CSS for fixed widths and hover-only controls before finishing. \`checkapp\` proves it
  rendered, not that it fits a phone.

**Finishing details.**

- Icons from the icon set, never emoji (getdocs: icons).
- Buttons say the verb: "Add task", not "OK" or "Submit".
- Confirm only destructive, non-undoable things. Never confirm an add.
- Space groups with \`knd-stack\` gaps, not \`<br>\`.
`,E=`# Storage decision guide

Anything the user would be upset to lose goes in \`kindredly.refState\`. That is the rule; the rest is detail.

1. **In-memory variables** — state that can reset each run (UI state, current game).
2. **\`kindredly.refState\`** — THE way to persist app data. Async, JSON values, namespaced, no permission prompts. Device-local. Use it for lists, scores, settings, drafts, progress — everything. getdocs: refstate.
3. **\`kindredly.sharedRefState\`** — like refState but server-backed: syncs across devices and (with \`scope:'account'\`) across family members. Prompts the user on first use. getdocs: sharedrefstate.

NOT available (opaque-origin sandbox): cookies, IndexedDB — never use them.

**Do not use \`localStorage\` or \`sessionStorage\` for app data.** They are not real storage here: the sandbox replaces both with in-memory shims. \`localStorage\` is then best-effort mirrored into refState so third-party libraries that expect it keep working, but that mirror caps out around 800KB, silently keeps only strings, and can be lost if the app writes before the mirror has loaded. \`sessionStorage\` is never persisted at all. Reach for them only if a library you did not write insists on them.

Rules of thumb:
- One app = one namespace string, one main state key. Save the whole state object after each change.
- Values must be JSON-serializable; keep them compact (no data-URLs/blobs).
- Load at startup in the background: render defaults first, hydrate + re-render when the read returns.
- try/catch every refState/sharedRefState call; the app must keep working unsaved on failure.
`,x="# Kaboom.js patterns (v3000, preloaded global)\n\nInit once, methods via the returned context:\n\n```js\nconst k = kaboom({ root: document.getElementById('app'), width: 640, height: 400, background: [24, 26, 36] })\n```\n\nObjects are component lists; tags (strings) enable collisions:\n\n```js\nconst player = k.add([k.rect(28, 28), k.pos(100, 100), k.color(91, 140, 255), k.area(), 'player'])\nk.add([k.text('Score: 0', { size: 20 }), k.pos(12, 12)])\nk.add([k.circle(8), k.pos(300, 200), k.color(255, 208, 80), k.area(), 'coin'])\n```\n\nInput and movement (held key = onKeyDown, tap = onKeyPress):\n\n```js\nk.onKeyDown('left', () => player.move(-240, 0))   // move() is per-second, call every frame\nk.onKeyPress('space', () => jump())\nk.onClick(() => { /* tap/click anywhere */ })\n```\n\nCollisions need `k.area()` on BOTH objects:\n\n```js\nplayer.onCollide('coin', (c) => { k.destroy(c); score++ })\n```\n\nFrame logic: `k.onUpdate(() => { ... })` — never `while(true)`. Timers: `k.wait(1, fn)`, `k.loop(2, fn)`.\n\nScenes for menu/play/game-over:\n\n```js\nk.scene('play', () => { /* build level */ })\nk.scene('over', (score) => { k.add([k.text('Game over: ' + score)]); k.onKeyPress(() => k.go('play')) })\nk.go('play')\n```\n\nPhysics: add `k.body()` (+`k.area()`) for gravity; a static floor needs `k.body({ isStatic: true })`; `player.jump(600)`.\n\nNo external sprite/sound URLs (sandbox has no asset network) — use `k.rect`/`k.circle`/`k.text` primitives and emoji in `k.text`. Canvas colors are literal RGB and that is fine inside the game.\n",A='# Alpine.js patterns (preloaded)\n\nAlpine gives reactive UI without a render loop — good for forms and small interactive widgets:\n\n```js\nconst app = document.getElementById(\'app\')\napp.innerHTML = `\n  <main class="container" x-data="{ count: 0, name: \'\' }">\n    <h3>Counter</h3>\n    <p>Count: <strong x-text="count"></strong></p>\n    <button @click="count++">+1</button>\n    <input x-model="name" placeholder="Your name" />\n    <p x-show="name">Hello, <span x-text="name"></span>!</p>\n  </main>`\n```\n\nAlpine 3 auto-initializes DOM injected after load (it watches the document). If directives ever fail to activate, call `Alpine.initTree(app)` once after setting innerHTML — but do not call it on trees Alpine already initialized (duplicate handlers).\n\nCore directives:\n- `x-data="{...}"` — component state (on a wrapping element)\n- `x-text` / `x-show` / `x-if` (on `<template>`) — bind text / visibility / existence\n- `x-model` — two-way bind inputs\n- `@click`, `@submit.prevent` — events\n- `x-for` (on `<template>`) — lists: `<template x-for="item in items" :key="item.id">`\n\nBigger state with methods:\n\n```html\n<div x-data="{\n  items: [],\n  add(text) { if (text.trim()) this.items.push({ text, done: false }) }\n}">\n```\n\nChoose ONE approach per app: either Alpine drives the UI (declarative), or a manual `render()` rebuilds innerHTML — mixing both causes lost state (innerHTML replacement destroys Alpine components). Alpine + async host APIs: call them from `@click` handlers and set state properties when they resolve; Alpine re-renders automatically.\n',I=`# Location API (capability-gated device position)

\`\`\`js
const pos = await kindredly.location.get({ timeoutMs, enableHighAccuracy })
// pos: { lat, lon, accuracyM, altitude, heading, speedMps, timestamp }
\`\`\`

- Foreground only, one fix per call. No background tracking, no \`watch\` — poll with a timer.
- Coordinates round to ~1m. \`accuracyM\` is meters; treat \`> 100\` as coarse.
- Options: \`timeoutMs\` 1000–100000 (default 20000), \`maximumAge\` cache ms (default 60000),
  \`enableHighAccuracy\` (default false; true costs battery and is slower).

How permission works (do not build your own permission UI):
- Saving the app writes the capability declaration from its code automatically. Without it
  every call fails with \`E_CAPABILITY_NOT_DECLARED\`.
- Adults see an Allow/Deny prompt on first use; the answer is remembered.
- Kids cannot approve location themselves. The call fails with \`E_GUARDIAN_APPROVAL_PENDING\`
  and a guardian request is sent automatically. Show a friendly waiting state.
- NEVER retry a permission error in a loop. If the app polls on a timer, both
  \`E_GUARDIAN_APPROVAL_PENDING\` and \`E_PERMISSION_DENIED\` must STOP the timer, not just skip
  the tick — polling through them pesters the guardian for as long as the app stays open.
  Let the user press Start again.

IMPORTANT — location apps have no internet:
- No remote images, and by default no \`kindredly.net.fetchJson\` — positions must not leave the
  device. Store in \`kindredly.refState\`; draw maps yourself (canvas/SVG), never map tiles.
- Absolute for kids (\`E_LOCATION_NET_BLOCKED\`). An adult can combine both via one extra
  prompt — do not design around it.

Error handling pattern (note that permission errors stop the polling):

\`\`\`js
try {
  const pos = await kindredly.location.get()
  render(pos)
} catch (e) {
  const msg = String(e?.message || e)
  if (msg.includes('E_GUARDIAN_APPROVAL_PENDING')) stopTimer('Waiting for a guardian to allow location.')
  else if (msg.includes('E_PERMISSION_DENIED')) stopTimer('Location is not allowed for this app.')
  else if (msg.includes('E_UNSUPPORTED_PLATFORM')) stopTimer('Not available on this device.')
  else show('<p>No fix yet.</p>') // transient — retrying is fine
}
\`\`\`

Distance between two readings (meters, fine for walk/ride tracking):

\`\`\`js
function distanceM(a, b) {
  const R = 6371000, toRad = (d) => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon)
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
\`\`\`
`,L=`# Capture API (capability-gated photo capture)

\`\`\`js
const shot = await kindredly.capture.photo()
// shot: { dataUrl, mimeType: 'image/jpeg', width, height }
\`\`\`

- Kindredly opens its own camera screen; the user takes the photo there. The app never sees
  the camera stream — it receives one finished JPEG (max dimension 1600px) as a data URL.
- Render with \`<img src="...">\` (the dataUrl), or draw it onto a canvas.
- The call can take minutes (a human is framing a shot) — show a "camera open" state and wait.

How permission works (do not build your own permission UI):
- The app must be saved with capture usage in its code — saving writes the capability
  declaration automatically. Without it every call fails with \`E_CAPABILITY_NOT_DECLARED\`.
- Adults see an Allow/Deny prompt on first use; kids need a guardian's approval
  (\`E_GUARDIAN_APPROVAL_PENDING\` — show a friendly waiting state, do NOT retry in a loop).

Storage: photo data URLs are large (hundreds of KB). Store at most a handful in
\`kindredly.refState\`, and prefer keeping only the latest few. Never store them in
\`sharedRefState\`.

Error handling pattern:

\`\`\`js
try {
  const shot = await kindredly.capture.photo()
  addPhoto(shot)
} catch (e) {
  const msg = String(e?.message || e)
  if (msg.includes('E_CAPTURE_CANCELLED')) return // user closed the camera — not an error
  if (msg.includes('E_GUARDIAN_APPROVAL_PENDING')) show('<p>Waiting for a guardian to allow the camera.</p>')
  else if (msg.includes('E_PERMISSION_DENIED')) show('<p>The camera is not allowed for this app.</p>')
  else show('<p>Could not take a photo.</p>')
}
\`\`\`
`,T="'__KND_THEME_CSS__'",P=`// Starter game (Kaboom.js). Arrow keys move the square; collect the dots.
(() => {
  const app = document.getElementById('app')
  if (!app) return

  const style = document.createElement('style')
  style.textContent = '__KND_THEME_CSS__'
  document.head.appendChild(style)

  const k = kaboom({
    root: app,
    width: 640,
    height: 400,
    background: [24, 26, 36],
  })

  const SPEED = 240
  const player = k.add([
    k.rect(28, 28),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(91, 140, 255),
    k.area(),
    'player',
  ])

  let score = 0
  const scoreLabel = k.add([k.text('Score: 0', { size: 20 }), k.pos(12, 12)])

  function spawnDot() {
    k.add([
      k.circle(8),
      k.pos(k.rand(30, k.width() - 30), k.rand(50, k.height() - 30)),
      k.color(255, 208, 80),
      k.area(),
      'dot',
    ])
  }
  spawnDot()

  k.onKeyDown('left', () => player.move(-SPEED, 0))
  k.onKeyDown('right', () => player.move(SPEED, 0))
  k.onKeyDown('up', () => player.move(0, -SPEED))
  k.onKeyDown('down', () => player.move(0, SPEED))
  k.onUpdate(() => {
    player.pos.x = Math.max(0, Math.min(k.width() - 28, player.pos.x))
    player.pos.y = Math.max(0, Math.min(k.height() - 28, player.pos.y))
  })

  player.onCollide('dot', (dot) => {
    k.destroy(dot)
    score += 1
    scoreLabel.text = 'Score: ' + score
    spawnDot()
  })
})()
`,C=`// Starter tracker: add, check off, and remove items. Persists via refState.
(() => {
  const NAMESPACE = 'tracker'
  const app = document.getElementById('app')
  if (!app) return

  const style = document.createElement('style')
  style.textContent = '__KND_THEME_CSS__'
  document.head.appendChild(style)

  const escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

  let items = []

  const save = async () => {
    try {
      await kindredly.refState.set('items', items, { scope: 'user', namespace: NAMESPACE })
    } catch (e) {
      console.warn('refState.set failed:', e)
    }
  }

  const render = () => {
    app.innerHTML =
      // No title heading: Kindredly already shows the app's name around this pane.
      '<main class="container">'
      + '<form id="addForm" role="group">'
      + '  <input id="newItem" placeholder="Add an item…" autocomplete="off" />'
      + '  <button type="submit">Add</button>'
      + '</form>'
      + '<div id="list">'
      + (items.length === 0 ? '<p><small>Nothing yet — add your first item above.</small></p>' : '')
      + items.map((it, i) =>
          '<article style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; margin:0.5rem 0;">'
          + '<input type="checkbox" data-toggle="' + i + '"' + (it.done ? ' checked' : '') + ' />'
          + '<span style="flex:1;' + (it.done ? ' text-decoration:line-through; opacity:0.6;' : '') + '">' + escapeHtml(it.text) + '</span>'
          + '<button data-remove="' + i + '" class="secondary outline" aria-label="Remove">' + (kindredly.icons?.svg('x-lg', { size: 14 }) || 'Remove') + '</button>'
          + '</article>'
        ).join('')
      + '</div>'
      + '</main>'

    document.getElementById('addForm')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const input = document.getElementById('newItem')
      const text = (input?.value || '').trim()
      if (!text) return
      items.push({ text, done: false })
      render()
      await save()
    })
    app.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('change', async () => {
      const i = Number(el.getAttribute('data-toggle'))
      if (items[i]) items[i].done = !items[i].done
      render()
      await save()
    }))
    app.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', async () => {
      items.splice(Number(el.getAttribute('data-remove')), 1)
      render()
      await save()
    }))
  }

  render()
  Promise.resolve().then(async () => {
    try {
      const stored = await kindredly.refState.get('items', { scope: 'user', namespace: NAMESPACE })
      if (Array.isArray(stored)) { items = stored; render() }
    } catch (e) {
      console.warn('refState.get failed:', e)
    }
  })
})()
`,N=`// Starter viewer: look up a topic and show a summary (Wikipedia REST API).
(() => {
  const app = document.getElementById('app')
  if (!app) return

  const style = document.createElement('style')
  style.textContent = '__KND_THEME_CSS__'
  document.head.appendChild(style)

  const escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

  app.innerHTML =
    // No title heading: Kindredly already shows the app's name around this pane.
    '<main class="container">'
    + '<form id="searchForm" role="group">'
    + '  <input id="topic" placeholder="e.g. Saturn" autocomplete="off" />'
    + '  <button type="submit">Look up</button>'
    + '</form>'
    + '<div id="result"><p><small>Search a topic to see a short summary.</small></p></div>'
    + '</main>'

  const result = document.getElementById('result')
  const show = (html) => { if (result) result.innerHTML = html }

  document.getElementById('searchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const topic = (document.getElementById('topic')?.value || '').trim()
    if (!topic) return
    show('<p aria-busy="true">Loading…</p>')
    try {
      const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(topic)
      const res = await kindredly.net.fetchJson(url, { timeoutMs: 8000 })
      if (!res.ok) {
        show('<p>No summary found (HTTP ' + res.status + '). Try another topic.</p>')
        return
      }
      const d = res.json || {}
      show(
        '<article>'
        + '<h4>' + escapeHtml(d.title || topic) + '</h4>'
        + '<p>' + escapeHtml(d.extract || 'No summary available.') + '</p>'
        + '</article>'
      )
    } catch (err) {
      console.warn(err)
      show('<p>Could not load: ' + escapeHtml(err?.message || err) + '</p>')
    }
  })
})()
`,R=`// Starter drawing pad: pointer drawing on a canvas with colors and clear.
(() => {
  const app = document.getElementById('app')
  if (!app) return

  const style = document.createElement('style')
  style.textContent = '__KND_THEME_CSS__'
  document.head.appendChild(style)

  const COLORS = ['#5b8cff', '#ff6b6b', '#ffd050', '#51cf66', '#845ef7']
  let strokeColor = COLORS[0]
  let drawing = false

  app.innerHTML =
    // No title heading: Kindredly already shows the app's name around this pane.
    '<main class="container">'
    + '<div id="palette" role="group" style="margin-bottom:0.5rem;"></div>'
    + '<canvas id="pad" width="640" height="400" style="border:1px solid var(--knd-border); border-radius:0.5rem; background: var(--knd-surface); touch-action:none; max-width:100%;"></canvas>'
    + '<p><button id="clear" class="secondary">Clear</button></p>'
    + '</main>'

  const canvas = document.getElementById('pad')
  const ctx = canvas.getContext('2d')
  const palette = document.getElementById('palette')

  COLORS.forEach((c) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('aria-label', 'Color ' + c)
    b.style.cssText = 'width:2rem; height:2rem; border-radius:50%; padding:0; margin-right:0.4rem; background:' + c + '; border:2px solid var(--knd-border);'
    b.addEventListener('click', () => { strokeColor = c })
    palette.appendChild(b)
  })

  const posOf = (e) => {
    const r = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true
    canvas.setPointerCapture(e.pointerId)
    const p = posOf(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return
    const p = posOf(e)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.stroke()
  })
  const stop = () => { drawing = false }
  canvas.addEventListener('pointerup', stop)
  canvas.addEventListener('pointercancel', stop)

  document.getElementById('clear')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  })
})()
`,D=[{id:"game",filename:"run.js",code:P},{id:"tool",filename:"run.js",code:C},{id:"content",filename:"run.js",code:N},{id:"creative",filename:"run.js",code:R}],M=`// Weather demo app (uses kindredly.net.fetchJson + kindredly.refState)
// - First run will prompt for network + ref state permissions.
// - Stores your last location in Ref State (scope: user).

(async () => {
  const NAMESPACE = 'weatherDemo'
  const app = document.getElementById('app')
  if (!app) return

  const escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  const render = (html) => {
    app.innerHTML = html
  }

  const defaultLoc = { label: 'Austin, TX', lat: 30.2672, lon: -97.7431 }
  let saved = null
  try {
    saved = await kindredly.refState.get('location', { scope: 'user', namespace: NAMESPACE })
  } catch (e) {
    // If permission denied, the host will throw; we'll still show UI.
    console.warn('refState.get(location) failed:', e)
  }
  const loc = (saved && typeof saved === 'object') ? saved : defaultLoc

  render([
    '<div class="p-3">',
    '  <h3 class="mb-2">Weather Demo</h3>',
    '  <p class="text-muted">Uses <code>kindredly.net.fetchJson</code> to call Open‑Meteo and <code>kindredly.refState</code> to remember your location.</p>',
    '  <div class="mb-2">',
    '    <label class="form-label">Label</label>',
    '    <input id="label" class="form-control" value="' + escapeHtml(loc.label || '') + '" />',
    '  </div>',
    '  <div class="row g-2 mb-2">',
    '    <div class="col">',
    '      <label class="form-label">Latitude</label>',
    '      <input id="lat" class="form-control" value="' + escapeHtml(loc.lat) + '" />',
    '    </div>',
    '    <div class="col">',
    '      <label class="form-label">Longitude</label>',
    '      <input id="lon" class="form-control" value="' + escapeHtml(loc.lon) + '" />',
    '    </div>',
    '  </div>',
    '  <div class="d-flex gap-2 mb-3">',
    '    <button id="save" class="btn btn-outline-secondary">Save location</button>',
    '    <button id="fetch" class="btn btn-primary">Fetch weather</button>',
    '  </div>',
    '  <pre id="out" class="bg-light border rounded p-2">Ready.</pre>',
    '</div>',
  ].join('\\n'))

  const out = document.getElementById('out')
  const setOut = (text) => { if (out) out.textContent = String(text) }

  const readLoc = () => {
    const label = (document.getElementById('label')?.value || '').trim()
    const lat = Number((document.getElementById('lat')?.value || '').trim())
    const lon = Number((document.getElementById('lon')?.value || '').trim())
    return { label: label || 'Custom', lat, lon }
  }

  document.getElementById('save')?.addEventListener('click', async () => {
    const nextLoc = readLoc()
    await kindredly.refState.set('location', nextLoc, { scope: 'user', namespace: NAMESPACE })
    setOut('Saved location to Ref State.')
  })

  document.getElementById('fetch')?.addEventListener('click', async () => {
    const nextLoc = readLoc()
    if (!Number.isFinite(nextLoc.lat) || !Number.isFinite(nextLoc.lon)) {
      setOut('Please enter valid numbers for lat/lon.')
      return
    }

    setOut('Loading...')
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + encodeURIComponent(String(nextLoc.lat))
      + '&longitude=' + encodeURIComponent(String(nextLoc.lon))
      + '&current=temperature_2m,wind_speed_10m'
      + '&timezone=auto'
    const res = await kindredly.net.fetchJson(url, { timeoutMs: 8000 })
    if (!res.ok) {
      throw new Error('HTTP ' + String(res.status))
    }
    setOut(JSON.stringify(res.json?.current || res.json, null, 2))
  })
})().catch(err => {
  console.error(err)
  const app = document.getElementById('app')
  if (app) app.textContent = String(err?.message || err)
})
`,O=`// Swear Jar demo app (simplified + reliable)
// - Renders immediately
// - Uses kindredly.refState for local persistence (no prompts)

(() => {
  const NAMESPACE = 'swearJar'
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML =
    '<div>'
    + '<h3>Swear Jar</h3>'
    + '<p>Simple counter with optional Ref State persistence.</p>'
    + '<p id="sjStatus"><small>Loading…</small></p>'
    + '<p>Count: <strong id="sjCount">0</strong> <span id="sjFace" aria-hidden="true">🙂</span></p>'
    + '<p>'
    + '  <button id="sjAdd" type="button">Add +1</button>'
    + '  <button id="sjReset" type="button">Reset</button>'
    + '</p>'
    + '<hr />'
    + '<p><small>Tip: if Ref State permission is denied, the counter still works locally.</small></p>'
    + '</div>'

  let count = 0
  const countEl = document.getElementById('sjCount')
  const faceEl = document.getElementById('sjFace')
  const statusEl = document.getElementById('sjStatus')

  const setStatus = (t) => { if (statusEl) statusEl.textContent = String(t || '') }
  const render = () => {
    if (countEl) countEl.textContent = String(count)
    if (faceEl) faceEl.textContent = '😮'
    setTimeout(() => { if (faceEl) faceEl.textContent = '🙂' }, 450)
  }

  const tryPersist = async () => {
    try {
      await kindredly.refState.set('count', count, { scope: 'user', namespace: NAMESPACE })
      setStatus('Saved.')
    } catch (e) {
      console.warn('refState.set failed:', e)
      setStatus('Not saved (error)')
    }
  }

  document.getElementById('sjAdd')?.addEventListener('click', async () => {
    count += 1
    render()
    await tryPersist()
  })

  document.getElementById('sjReset')?.addEventListener('click', async () => {
    count = 0
    render()
    await tryPersist()
  })

  // Load saved value in background
  setStatus('Loading saved count…')
  Promise.resolve()
    .then(async () => {
      const stored = await kindredly.refState.get('count', { scope: 'user', namespace: NAMESPACE })
      if (typeof stored === 'number' && Number.isFinite(stored)) count = stored
      render()
      setStatus('Ready.')
    })
    .catch((e) => {
      console.warn('refState.get failed:', e)
      render()
      setStatus('Ready (failed to load saved state).')
    })
})()
`,_=`// Hello demo app (minimal sanity check)
// - No Ref State, no Net API

(() => {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML =
    '<div class="p-3">'
    + '<div class="fw-bold mb-2">Hello from Kindredly Apps</div>'
    + '<div class="text-muted mb-3">If you can see this, the sandbox compiled + ran your code.</div>'
    + '<button id="btn" type="button" class="btn btn-primary btn-sm">Click me</button>'
    + '<span class="ms-2">Count: <strong id="count">0</strong></span>'
    + '</div>'

  let count = 0
  const countEl = document.getElementById('count')
  document.getElementById('btn')?.addEventListener('click', () => {
    count += 1
    if (countEl) countEl.textContent = String(count)
  })
})()
`,j=`// Counter demo app (local state only)
(() => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML =
    '<div>'
    + '<h3>Counter</h3>'
    + '<p>Local state only (no host APIs).</p>'
    + '<p>Count: <strong id="c">0</strong></p>'
    + '<p><button id="inc" type="button">+1</button> <button id="dec" type="button">-1</button></p>'
    + '</div>'
  let n = 0
  const el = document.getElementById('c')
  const render = () => { if (el) el.textContent = String(n) }
  document.getElementById('inc')?.addEventListener('click', () => { n += 1; render() })
  document.getElementById('dec')?.addEventListener('click', () => { n -= 1; render() })
  render()
})()
`,B=`// Ref State KV demo (tests persistence)
(async () => {
  const app = document.getElementById('app')
  if (!app) return
  const ns = 'testKV'

  app.innerHTML =
    '<div>'
    + '<h3>Ref State KV</h3>'
    + '<p><small>This app reads/writes a single key in Ref State.</small></p>'
    + '<p>Status: <span id="st">Idle</span></p>'
    + '<p><label>Key <input id="k" value="hello" /></label></p>'
    + '<p><label>Value <input id="v" value="world" /></label></p>'
    + '<p><button id="load" type="button">Load</button> <button id="save" type="button">Save</button></p>'
    + '<pre id="out"></pre>'
    + '</div>'

  const st = (t) => { const el = document.getElementById('st'); if (el) el.textContent = String(t) }
  const out = (t) => { const el = document.getElementById('out'); if (el) el.textContent = String(t || '') }
  const getKey = () => (document.getElementById('k')?.value || 'hello')
  const getVal = () => (document.getElementById('v')?.value || '')

  document.getElementById('load')?.addEventListener('click', async () => {
    st('Loading…')
    try {
      const v = await kindredly.refState.get(getKey(), { scope: 'user', namespace: ns })
      out(JSON.stringify(v, null, 2))
      st('Loaded')
    } catch (e) {
      console.warn(e)
      out(String(e?.message || e))
      st('Failed')
    }
  })

  document.getElementById('save')?.addEventListener('click', async () => {
    st('Saving…')
    try {
      await kindredly.refState.set(getKey(), getVal(), { scope: 'user', namespace: ns })
      st('Saved')
    } catch (e) {
      console.warn(e)
      out(String(e?.message || e))
      st('Failed')
    }
  })
})().catch(e => console.error(e))
`,H=`// Net fetchJson demo (tests hostname permission + networking)
(async () => {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML =
    '<div>'
    + '<h3>Net fetchJson</h3>'
    + '<p><small>Fetches JSON from a URL via kindredly.net.fetchJson.</small></p>'
    + '<p><label>URL <input id="u" value="https://api.github.com/zen" /></label></p>'
    + '<p><button id="go" type="button">Fetch</button></p>'
    + '<pre id="out"></pre>'
    + '</div>'

  const out = (t) => { const el = document.getElementById('out'); if (el) el.textContent = String(t || '') }
  document.getElementById('go')?.addEventListener('click', async () => {
    out('Loading…')
    const url = String(document.getElementById('u')?.value || '')
    try {
      const res = await kindredly.net.fetchJson(url, { timeoutMs: 8000 })
      out(JSON.stringify(res, null, 2))
    } catch (e) {
      console.warn(e)
      out(String(e?.message || e))
    }
  })
})().catch(e => console.error(e))
`,U=`// Timer demo app (no host APIs)
(() => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = '<div><h3>Timer</h3><p>Seconds: <strong id="t">0</strong></p><p><button id="stop" type="button">Stop</button></p></div>'
  const tEl = document.getElementById('t')
  let s = 0
  const id = setInterval(() => {
    s += 1
    if (tEl) tEl.textContent = String(s)
  }, 1000)
  document.getElementById('stop')?.addEventListener('click', () => {
    clearInterval(id)
  })
})()
`,K=`// Console demo app (verifies sandbox-console bridge)
(() => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = '<div><h3>Console Test</h3><p>Open DevTools console; this app logs a few messages.</p><p><button id="log" type="button">Log now</button></p></div>'
  console.log('console-test: log')
  console.warn('console-test: warn')
  console.error('console-test: error (expected)')
  document.getElementById('log')?.addEventListener('click', () => {
    console.log('console-test: button clicked at', new Date().toISOString())
  })
})()
`,F=`// Walk Tracker demo (kindredly.location + refState; location apps have NO internet)
(async () => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = [
    '<div class="knd-card">',
    '  <h3><knd-icon name="geo-alt-fill" size="20"></knd-icon> Walk Tracker</h3>',
    '  <p>Distance: <strong id="dist">0</strong> m &middot; Points: <span id="count">0</span></p>',
    '  <p id="status" class="knd-muted">Press Start, then walk.</p>',
    '  <p><button id="toggle" type="button">Start</button> <button id="reset" type="button" class="secondary">Reset</button></p>',
    '</div>',
  ].join('')

  const NS = 'walktracker'
  let points = (await kindredly.refState.get('points', { namespace: NS })) || []
  let timerId = null
  let sampling = false

  const distanceM = (a, b) => {
    const R = 6371000, toRad = (d) => d * Math.PI / 180
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon)
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(s))
  }
  const totalM = () => points.reduce((sum, p, i) => (i ? sum + distanceM(points[i - 1], p) : 0), 0)
  const status = (t) => { const el = document.getElementById('status'); if (el) el.textContent = t }
  const render = () => {
    const d = document.getElementById('dist'); if (d) d.textContent = String(Math.round(totalM()))
    const c = document.getElementById('count'); if (c) c.textContent = String(points.length)
  }

  // Stop the timer, not just this tick. A permission answer is not a transient failure:
  // polling through it re-asks forever and keeps pestering the guardian.
  const stopTracking = (message) => {
    if (timerId) { clearInterval(timerId); timerId = null }
    const btn = document.getElementById('toggle')
    if (btn) btn.textContent = 'Start'
    if (message) status(message)
  }

  const sample = async () => {
    if (sampling) return // a fix can take longer than the 10s tick — never overlap requests
    sampling = true
    try {
      const pos = await kindredly.location.get({ timeoutMs: 15000 })
      points.push({ lat: pos.lat, lon: pos.lon, t: pos.timestamp })
      await kindredly.refState.set('points', points, { namespace: NS })
      status('Tracking… accuracy ' + (pos.accuracyM ?? '?') + 'm')
      render()
    } catch (e) {
      const msg = String(e?.message || e)
      if (msg.includes('E_GUARDIAN_APPROVAL_PENDING')) stopTracking('Waiting for a guardian to allow location. Press Start once they do.')
      else if (msg.includes('E_PERMISSION_DENIED')) stopTracking('Location is not allowed for this app.')
      else status('No fix yet — still trying.')
    } finally {
      sampling = false
    }
  }

  document.getElementById('toggle')?.addEventListener('click', (ev) => {
    if (timerId) { stopTracking('Paused.'); return }
    ev.currentTarget.textContent = 'Stop'
    status('Getting a fix…')
    sample()
    timerId = setInterval(sample, 10000)
  })
  document.getElementById('reset')?.addEventListener('click', async () => {
    stopTracking() // the status below says "press Start", so actually stop
    points = []
    await kindredly.refState.set('points', points, { namespace: NS })
    render(); status('Cleared. Press Start to begin.')
  })

  render()
})().catch(e => console.error(e))
`,z=`// Photo Journal demo (kindredly.capture + refState)
(async () => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = [
    '<div class="knd-card">',
    '  <h3><knd-icon name="camera-fill" size="20"></knd-icon> Photo Journal</h3>',
    '  <p id="status" class="knd-muted">Keep your latest three photos.</p>',
    '  <p><button id="snap" type="button">Take a photo</button></p>',
    '  <div id="shots" style="display:flex; gap:8px; flex-wrap:wrap;"></div>',
    '</div>',
  ].join('')

  const NS = 'photojournal'
  let shots = (await kindredly.refState.get('shots', { namespace: NS })) || []
  const status = (t) => { const el = document.getElementById('status'); if (el) el.textContent = t }
  const render = () => {
    const wrap = document.getElementById('shots')
    if (!wrap) return
    wrap.innerHTML = ''
    for (const s of shots) {
      const img = document.createElement('img')
      img.src = s.dataUrl
      img.alt = 'Journal photo'
      img.style.width = '30%'
      img.style.borderRadius = '8px'
      wrap.appendChild(img)
    }
  }

  document.getElementById('snap')?.addEventListener('click', async () => {
    status('Camera open…')
    try {
      const shot = await kindredly.capture.photo()
      shots = [{ dataUrl: shot.dataUrl, t: Date.now() }, ...shots].slice(0, 3) // data URLs are big — keep few
      await kindredly.refState.set('shots', shots, { namespace: NS })
      status('Saved.')
      render()
    } catch (e) {
      const msg = String(e?.message || e)
      if (msg.includes('E_CAPTURE_CANCELLED')) status('No photo taken.')
      else if (msg.includes('E_GUARDIAN_APPROVAL_PENDING')) status('Waiting for a guardian to allow the camera.')
      else if (msg.includes('E_PERMISSION_DENIED')) status('The camera is not allowed for this app.')
      else status('Could not take a photo.')
    }
  })

  render()
})().catch(e => console.error(e))
`,q={weather:M,swearJar:O,hello:_,counter:j,refStateKV:B,netFetch:H,timer:U,console:K,walkTracker:F,photoJournal:z},o=[{id:"default",label:"Default",css:""},{id:"playful",label:"Playful",css:["#app { --pico-border-radius: 1rem; }","#app h1, #app h2, #app h3 { color: var(--knd-accent); }","#app button { border-radius: 999px; font-weight: 700; }","#app article { border: 2px solid var(--knd-accent); border-radius: 1rem; box-shadow: 4px 4px 0 var(--knd-border); }"].join(`
`)},{id:"minimal",label:"Minimal",css:["#app { max-width: 42rem; margin: 0 auto; }","#app h1, #app h2, #app h3 { font-weight: 500; letter-spacing: -0.01em; }","#app article { border: 1px solid var(--knd-border); box-shadow: none; background: var(--knd-surface); color: var(--knd-text); }","#app button { border-radius: 0.25rem; }"].join(`
`)},{id:"retro",label:"Retro",css:["#app { font-family: 'Courier New', monospace; }","#app h1, #app h2, #app h3 { text-transform: uppercase; letter-spacing: 0.08em; }","#app article, #app button, #app input { border: 2px solid var(--knd-text); border-radius: 0; }","#app article { background: var(--knd-surface); color: var(--knd-text); box-shadow: 4px 4px 0 var(--knd-text); }"].join(`
`)}];function J(e){return o.find(t=>t.id===e)||o[0]}const G=[{id:"game",label:"Game",icon:"controller",blurb:"Arcade-style games with Kaboom.js",packText:String(d),scaffoldId:"game"},{id:"tool",label:"Tool",icon:"check2-square",blurb:"Trackers, lists, counters, planners",packText:String(p),scaffoldId:"tool"},{id:"content",label:"Viewer",icon:"journal-text",blurb:"Look up and display content from the web",packText:String(u),scaffoldId:"content"},{id:"creative",label:"Creative",icon:"palette",blurb:"Drawing and creative canvas apps",packText:String(h),scaffoldId:"creative"}],V=String(m),s=[{id:"refstate",title:"Ref State API",oneLiner:"local persistence, no prompts",text:String(f)},{id:"sharedrefstate",title:"Shared Ref State API",oneLiner:"server-backed persistence, syncs, permissioned",text:String(g)},{id:"net",title:"Network API",oneLiner:"fetch(), permissioned per host and per read/write",text:String(y)},{id:"files",title:"Files API",oneLiner:"read this app's attachments",text:String(k)},{id:"theming",title:"Theming",oneLiner:"full --knd-* token table and light/dark rules",text:String(b)},{id:"icons",title:"Icon set",oneLiner:"built-in SVG icons and the complete name list",text:String(w)},{id:"ui-kit",title:"UI kit",oneLiner:"knd-* CSS classes for cards, layout, buttons, chips",text:String(v)},{id:"ui-design",title:"UI design rules",oneLiner:"what a finished app looks like; the mistakes to avoid",text:String(S)},{id:"storage",title:"Storage guide",oneLiner:"refState vs sharedRefState, and why not localStorage",text:String(E)},{id:"kaboom-patterns",title:"Kaboom.js patterns",oneLiner:"game objects, input, collisions, scenes",text:String(x)},{id:"alpine-patterns",title:"Alpine.js patterns",oneLiner:"reactive forms and widgets",text:String(A)},{id:"location",title:"Location API",oneLiner:"device position; guardian-gated for kids; no-internet rule",text:String(I)},{id:"capture",title:"Capture API",oneLiner:"photo capture via the host camera screen",text:String(L)}];function r(e){return e&&G.find(t=>t.id===e)||null}function W(e){var t;return((t=r(e))==null?void 0:t.packText)||V}function Y(e){const t=String(e||"").trim().toLowerCase();return s.find(n=>n.id===t)||null}function X(){return s.map(e=>e.id)}function Q(e,t){const n=r(e);if(!n)return[];const a=D.find(c=>c.id===n.scaffoldId);if(!a)return[];const i=J(t),l=a.code.replace(T,JSON.stringify(i.css));return[{filename:a.filename,code:l}]}export{G as A,q as D,Y as a,o as b,Q as c,W as g,X as l};
