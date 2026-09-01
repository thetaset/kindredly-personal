export const COMPANION_REQUEST_CODE_DIGITS = 3
export const COMPANION_ACCESS_KEY_DIGITS = 5

export function sanitizeRequestCodeInput(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, COMPANION_REQUEST_CODE_DIGITS)
}

export function sanitizeAccessKeyInput(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, COMPANION_ACCESS_KEY_DIGITS)
}

export function isValidRequestCode(value: string) {
  return new RegExp(`^\\d{${COMPANION_REQUEST_CODE_DIGITS}}$`).test(String(value || ''))
}

export function isValidAccessKey(value: string) {
  return new RegExp(`^\\d{${COMPANION_ACCESS_KEY_DIGITS}}$`).test(String(value || ''))
}

export function generateRandomRequestCode(randomFn: () => number = Math.random) {
  const sample = Number(randomFn())
  const normalized = Number.isFinite(sample) ? sample : Math.random()
  const value = Math.max(0, Math.min(999, Math.floor(normalized * 1000)))
  return String(value).padStart(COMPANION_REQUEST_CODE_DIGITS, '0')
}

export function generateAccessKeyFromRequestCode(requestCode: string) {
  if (!isValidRequestCode(requestCode)) {
    throw new Error('Request code must be a 3-digit numeric string.')
  }

  const digits = requestCode.split('').map((digit) => Number(digit))
  const numericCode = Number(requestCode)
  const mixed = (
    digits[0] * 341 +
    digits[1] * 587 +
    digits[2] * 911 +
    numericCode * 73 +
    17291
  ) % 100000

  return String(mixed).padStart(COMPANION_ACCESS_KEY_DIGITS, '0')
}

export function verifyAccessKey(requestCode: string, accessKey: string) {
  if (!isValidRequestCode(requestCode) || !isValidAccessKey(accessKey)) {
    return false
  }

  return generateAccessKeyFromRequestCode(requestCode) === accessKey
}

// ---------------------------------------------------------------------------
// Time-based Unlock PIN
//
// UI NAME: "Admin code". CODE/DATA NAME: unlockPin — every identifier here, the
// `unlockWithoutPin` IPC field, and the Kotlin/Go ports keep the old name on
// purpose. Same convention as Daily Check-in / `checkpoint`: the label changed,
// the wire did not. If you are grepping for one and finding the other, they are
// the same thing.
//
// The code reuses generateAccessKeyFromRequestCode, but instead of a random
// request code shown by the Companion app, the request-code input is derived
// from the current 15-minute time window. Both the Kindredly app and the
// Companion compute the same window independently, so the code is always
// available without pairing. It rotates every 15 minutes.
//
// NOT single-use and NOT a secret: it verifies unlimited times, a +/-1 window
// skew keeps any given code live for ~45 minutes, and it is a pure function of
// the clock — identical on every install. Do not describe it as "one-time".
// ---------------------------------------------------------------------------

export const COMPANION_UNLOCK_PIN_DIGITS = COMPANION_ACCESS_KEY_DIGITS
export const COMPANION_UNLOCK_PIN_PERIOD_MS = 15 * 60 * 1000
// Accept the neighbouring windows so a PIN read near a boundary, or a small
// clock skew between the two machines, still verifies.
export const COMPANION_UNLOCK_PIN_SKEW_WINDOWS = 1

export function sanitizeUnlockPinInput(value: string) {
  return sanitizeAccessKeyInput(value)
}

export function isValidUnlockPin(value: string) {
  return isValidAccessKey(value)
}

export function unlockPinWindow(now: number = Date.now()) {
  return Math.floor(Number(now) / COMPANION_UNLOCK_PIN_PERIOD_MS)
}

export function unlockPinExpiresAtMs(now: number = Date.now()) {
  return (unlockPinWindow(now) + 1) * COMPANION_UNLOCK_PIN_PERIOD_MS
}

function requestCodeForWindow(window: number) {
  const normalized = ((Math.trunc(window) % 1000) + 1000) % 1000
  return String(normalized).padStart(COMPANION_REQUEST_CODE_DIGITS, '0')
}

export function generateUnlockPin(now: number = Date.now()) {
  return generateAccessKeyFromRequestCode(requestCodeForWindow(unlockPinWindow(now)))
}

export function verifyUnlockPin(
  pin: string,
  now: number = Date.now(),
  skewWindows: number = COMPANION_UNLOCK_PIN_SKEW_WINDOWS,
) {
  const sanitized = sanitizeUnlockPinInput(pin)
  if (!isValidUnlockPin(sanitized)) {
    return false
  }

  const currentWindow = unlockPinWindow(now)
  const tolerance = Math.max(0, Math.trunc(skewWindows))
  for (let offset = -tolerance; offset <= tolerance; offset += 1) {
    if (generateAccessKeyFromRequestCode(requestCodeForWindow(currentWindow + offset)) === sanitized) {
      return true
    }
  }

  return false
}
