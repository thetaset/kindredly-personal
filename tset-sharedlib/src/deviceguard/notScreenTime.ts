/**
 * Phone apps whose time is not screen time (HAT-952): the Clock, calls, Settings, the keyboard, the
 * phone's own screens, Calculator and Camera.
 *
 * Their sessions are still recorded and shown in History. They are left out of every limit, the
 * overall one included, on the device (`notCountedAppIds` in the compiled ruleset) and on the Usage
 * page (`ActivityService._getUsageSummaryFull`), the same way Always allowed time is.
 *
 * Two sources. Guard marks an inventory entry `notScreenTime` when the phone itself names it as its
 * clock, calculator, camera, dialer or Settings (`AppInventoryCollector`), which covers any maker.
 * The list below covers the apps no launcher icon puts in the inventory (System UI, the in-call
 * screen, keyboards, permission prompts) and phones whose Guard predates the flag.
 *
 * A parent who files one of these apps under a usage type on the Apps page makes it count again:
 * their choice outranks this list, as it outranks the system-furniture rule.
 */

import type { DeviceAppInventoryEntry, DeviceAppPolicy } from '../types/device-guard.types'
import { policyEntryFor } from './deviceAppPolicy'

export const NOT_SCREEN_TIME_ANDROID: readonly string[] = [
  // Clock
  'com.google.android.deskclock',
  'com.android.deskclock',
  'com.sec.android.app.clockpackage',
  'com.oneplus.deskclock',
  'com.coloros.alarmclock',
  // Phone and calls
  'com.google.android.dialer',
  'com.android.dialer',
  'com.samsung.android.dialer',
  'com.samsung.android.incallui',
  'com.android.incallui',
  'com.android.server.telecom',
  // Settings, keyboard and the phone's own screens
  'android',
  'com.android.systemui',
  'com.android.settings',
  'com.google.android.permissioncontroller',
  'com.android.permissioncontroller',
  'com.google.android.packageinstaller',
  'com.android.packageinstaller',
  'com.google.android.inputmethod.latin',
  'com.samsung.android.honeyboard',
  'com.sec.android.inputmethod',
  'com.touchtype.swiftkey',
  // Calculator
  'com.google.android.calculator',
  'com.android.calculator2',
  'com.sec.android.app.popupcalculator',
  'com.oneplus.calculator',
  'com.miui.calculator',
  // Camera
  'com.google.android.GoogleCamera',
  'com.android.camera',
  'com.android.camera2',
  'com.sec.android.app.camera',
  'com.oneplus.camera',
  'com.oplus.camera',
]

const NOT_SCREEN_TIME_SET = new Set(NOT_SCREEN_TIME_ANDROID)

/** An Android app whose time counts toward no limit, unless the parent gave it a usage type. */
export function isNotScreenTimeApp(
  app: Pick<DeviceAppInventoryEntry, 'pkg' | 'platform' | 'notScreenTime'>,
  policy?: DeviceAppPolicy | null,
): boolean {
  if (!app?.pkg || (app.platform || 'android') !== 'android') return false
  if (!app.notScreenTime && !NOT_SCREEN_TIME_SET.has(app.pkg)) return false
  return !policyEntryFor(app, policy)?.eduValue
}

/**
 * The Android packages the device leaves out of every budget: the list, plus what the inventory
 * marks, minus what the parent gave a usage type. Sorted, so both compilers emit the same array.
 */
export function compileNotCountedAppIds(
  apps: DeviceAppInventoryEntry[] | null | undefined,
  policy?: DeviceAppPolicy | null,
): string[] {
  const out = new Set<string>()
  for (const pkg of NOT_SCREEN_TIME_ANDROID) {
    if (isNotScreenTimeApp({ pkg, platform: 'android' }, policy)) out.add(pkg)
  }
  for (const app of apps || []) {
    if (app?.pkg && !app.removed && isNotScreenTimeApp(app, policy)) out.add(app.pkg)
  }
  return [...out].sort()
}
