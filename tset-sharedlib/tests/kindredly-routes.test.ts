/**
 * The route allowlist is a security boundary, not a formatter.
 *
 * Every URL it builds is handed to the main process and, on macOS, becomes an argv element of
 * `open -a <Browser> <url>`. So what is asserted here is mostly what CANNOT come out of it: a
 * different scheme, a different origin, a flag, or an empty route that would silently land on the
 * router's default and read as a button going to the wrong place.
 */
import {
  KINDREDLY_ROUTE_FALLBACK,
  isKindredlyExtensionId,
  kindredlyExtensionUrl,
  kindredlyRoutePath,
  kindredlyWebappUrl,
  type KindredlyRoute,
} from '../src/types/kindredly-routes'

const VALID_ID = 'kekfgmohihmjcmalpkpmpaeiehcmkgbj'

describe('kindredlyRoutePath', () => {
  it.each([
    [{ name: 'home' } as KindredlyRoute, '#/'],
    [{ name: 'settings' } as KindredlyRoute, '#/settings'],
    [{ name: 'device' } as KindredlyRoute, '#/settings/device'],
    [{ name: 'deviceLinking' } as KindredlyRoute, '#/settings/device?focus=linking'],
    [{ name: 'adminCode' } as KindredlyRoute, '#/settings/admincode'],
    [{ name: 'usageLimits', userId: 'abc123' } as KindredlyRoute, '#/manage/user/abc123/usagelimits'],
  ])('maps %j', (route, expected) => {
    expect(kindredlyRoutePath(route)).toBe(expected)
  })

  /**
   * Never '' and never undefined. A caller that got a blank suffix would build a URL with no route
   * on it, which renders Home and is indistinguishable from the button being wired wrong.
   */
  it.each([undefined, null, {} as KindredlyRoute, { name: 'nope' } as unknown as KindredlyRoute])(
    'falls back to the device page for %j',
    (route) => {
      expect(kindredlyRoutePath(route)).toBe(kindredlyRoutePath(KINDREDLY_ROUTE_FALLBACK))
      expect(kindredlyRoutePath(route)).toBe('#/settings/device')
    },
  )

  /**
   * The one route carrying a parameter, and so the only one that can be steered from outside.
   * Anything that is not an id we would have minted degrades to a real page rather than building
   * `/manage/user//usagelimits`.
   */
  it.each([
    '',
    '../../settings',
    'a b',
    'x/y',
    '"; open -a Calculator; "',
    'a'.repeat(65),
  ])('refuses %j as a user id', (userId) => {
    expect(kindredlyRoutePath({ name: 'usageLimits', userId })).toBe('#/settings')
  })
})

describe('kindredlyExtensionUrl', () => {
  it('addresses the extension by id', () => {
    expect(kindredlyExtensionUrl(VALID_ID, { name: 'adminCode' })).toBe(
      `chrome-extension://${VALID_ID}/index.html#/settings/admincode`,
    )
  })

  /** '' is the caller's signal to use the website instead — see openDeviceControlsPage. */
  it.each(['', 'not-an-id', VALID_ID.toUpperCase(), `${VALID_ID}z`, VALID_ID.slice(1)])(
    'returns nothing for the unusable id %j',
    (id) => {
      expect(kindredlyExtensionUrl(id, { name: 'home' })).toBe('')
    },
  )

  it('cannot be steered off chrome-extension:// by any route', () => {
    const routes: KindredlyRoute[] = [
      { name: 'home' },
      { name: 'settings' },
      { name: 'device' },
      { name: 'deviceLinking' },
      { name: 'adminCode' },
      { name: 'usageLimits', userId: 'kid-1' },
    ]
    for (const route of routes) {
      expect(kindredlyExtensionUrl(VALID_ID, route)).toMatch(
        new RegExp(`^chrome-extension://${VALID_ID}/index\\.html#/`),
      )
    }
  })
})

describe('kindredlyWebappUrl', () => {
  it('joins the base without doubling the slash', () => {
    expect(kindredlyWebappUrl('https://kindredly.ai', { name: 'home' })).toBe('https://kindredly.ai/kindredapp/#/')
    expect(kindredlyWebappUrl('https://kindredly.ai///', { name: 'home' })).toBe('https://kindredly.ai/kindredapp/#/')
  })

  it('carries the linking focus a parent was sent for', () => {
    expect(kindredlyWebappUrl('http://localhost:3031', { name: 'deviceLinking' })).toBe(
      'http://localhost:3031/kindredapp/#/settings/device?focus=linking',
    )
  })
})

describe('isKindredlyExtensionId', () => {
  it('accepts only the 32-character a–p form Chrome uses', () => {
    expect(isKindredlyExtensionId(VALID_ID)).toBe(true)
    expect(isKindredlyExtensionId('kekfgmohihmjcmalpkpmpaeiehcmkgbz')).toBe(false)
    expect(isKindredlyExtensionId(undefined)).toBe(false)
    expect(isKindredlyExtensionId(null)).toBe(false)
  })
})
