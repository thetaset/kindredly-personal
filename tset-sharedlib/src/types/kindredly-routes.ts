/**
 * The places in Kindredly the Companion is allowed to send someone, as a closed set.
 *
 * ## Why an allowlist and not a path string
 *
 * The Companion's window runs over `file://` and has no router of its own, so every "go to
 * Kindredly" is really "open a URL in a browser". On macOS that URL becomes an argv element of
 * `open -a <Browser> <url>`, which is why the shape of what the renderer may ask for is a security
 * question and not a tidiness one. A named route cannot be bent into a flag, a `file:` URL or a
 * different origin; a free-form string handed across an IPC boundary can be all three.
 *
 * So the renderer names a destination and the main process owns the address — the same division
 * `net:request` already makes for server calls, and `app:launchBrowser` makes for browsers.
 *
 * ## Why it lives in sharedlib
 *
 * Both ends need it and they are different packages. `tset-electron` builds the
 * `chrome-extension://` form; the Companion renderer (in `tset-client`) builds the website form to
 * hand over as the fallback, and types the IPC payload. A duplicated union either side of a
 * process boundary is the thing this package exists to prevent.
 *
 * ## These are the client's OWN routes
 *
 * Every path below is a route in `tset-client/src/router/home.router.ts`, which is mounted by both
 * the extension and the webapp — hash history, so the same suffix works in
 * `chrome-extension://<id>/index.html#/…` and `https://kindredly.ai/kindredapp/#/…`. Adding a route
 * here means adding it there first.
 */

export type KindredlyRoute =
  /** `/` — Home. */
  | { name: 'home' }
  /** `/settings` — the settings shell, which redirects to the dashboard or the menu by width. */
  | { name: 'settings' }
  /** `/settings/device` — this computer. */
  | { name: 'device' }
  /** `/settings/device`, scrolled to and flashing the "link this computer" control. */
  | { name: 'deviceLinking' }
  /** `/settings/admincode` — the rotating number this app asks for. */
  | { name: 'adminCode' }
  /** `/manage/user/<id>/usagelimits` — one child's category time budgets. */
  | { name: 'usageLimits'; userId: string }

/**
 * Where an unrecognised or malformed route lands.
 *
 * The device page, because every caller of this module is the Companion and that is the page about
 * the computer it is running on. Never a blank string: a caller that fell through to '' would build
 * `chrome-extension://<id>/index.html` with no route at all, which renders the router's default and
 * looks like the button went to the wrong place rather than to a fallback.
 */
export const KINDREDLY_ROUTE_FALLBACK: KindredlyRoute = { name: 'device' }

/**
 * Ids Chrome will actually accept. Duplicated deliberately rather than imported from the main
 * process: this module is the boundary, and a boundary that trusts its caller to have validated is
 * not one. `main.ts` keeps its own copy for filtering extension *directory* names, which is a
 * different job on the same shape.
 */
const EXTENSION_ID_PATTERN = /^[a-p]{32}$/

/** Kindredly user ids, as they appear in a route. Anything else is not an id we minted. */
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function isKindredlyExtensionId(value: string | undefined | null): value is string {
  return !!value && EXTENSION_ID_PATTERN.test(value)
}

/**
 * The hash suffix for a route, including the leading `#`.
 *
 * Total: every input produces a usable path. A `usageLimits` with an id we would not have minted
 * degrades to the settings page rather than building `/manage/user//usagelimits` — a route that
 * resolves to nothing and leaves a parent staring at a blank pane.
 */
export function kindredlyRoutePath(route?: KindredlyRoute | null): string {
  switch (route?.name) {
    case 'home':
      return '#/'
    case 'settings':
      return '#/settings'
    case 'deviceLinking':
      // The query rides inside the hash, which is where vue-router's hash history reads it from.
      return '#/settings/device?focus=linking'
    case 'adminCode':
      return '#/settings/admincode'
    case 'usageLimits':
      return USER_ID_PATTERN.test(String(route.userId || ''))
        ? `#/manage/user/${route.userId}/usagelimits`
        : '#/settings'
    case 'device':
      return '#/settings/device'
    default:
      return kindredlyRoutePath(KINDREDLY_ROUTE_FALLBACK)
  }
}

/**
 * The extension's own copy of Kindredly, in the browser it is installed in.
 *
 * '' when the id is not one Chrome would load — the caller's signal to fall back to the website.
 * Chromium only: Firefox serves extensions from `moz-extension://<per-install uuid>/`, which is not
 * derivable from an id, and Safari's pages cannot be addressed from outside at all.
 */
export function kindredlyExtensionUrl(extensionId: string, route?: KindredlyRoute | null): string {
  if (!isKindredlyExtensionId(extensionId)) return ''
  return `chrome-extension://${extensionId}/index.html${kindredlyRoutePath(route)}`
}

/**
 * The website copy. `base` is `config.serverHostname`, so this is the dev server on a dev machine.
 *
 * The second choice, always — a browser with Kindredly in it can do things a website cannot, and
 * linking a computer is the standing example.
 */
export function kindredlyWebappUrl(base: string, route?: KindredlyRoute | null): string {
  const trimmed = String(base || '').replace(/\/+$/, '')
  return `${trimmed}/kindredapp/${kindredlyRoutePath(route)}`
}
