import {
  COMPANION_UNLOCK_PIN_PERIOD_MS,
  generateAccessKeyFromRequestCode,
  generateRandomRequestCode,
  generateUnlockPin,
  sanitizeAccessKeyInput,
  sanitizeRequestCodeInput,
  unlockPinExpiresAtMs,
  unlockPinWindow,
  verifyAccessKey,
  verifyUnlockPin,
} from '../src/restrictions/companionAccess'

describe('companion access helpers', () => {
  test('sanitizes request code input to three digits', () => {
    expect(sanitizeRequestCodeInput('72a49')).toBe('724')
    expect(sanitizeRequestCodeInput('0099')).toBe('009')
  })

  test('sanitizes access key input to five digits', () => {
    expect(sanitizeAccessKeyInput('12a34b567')).toBe('12345')
  })

  test('generates deterministic five digit access keys', () => {
    const accessKey = generateAccessKeyFromRequestCode('724')
    expect(accessKey).toBe(generateAccessKeyFromRequestCode('724'))
    expect(accessKey).toHaveLength(5)
    expect(accessKey).toMatch(/^\d{5}$/)
  })

  test('verifies valid access keys and rejects invalid ones', () => {
    const accessKey = generateAccessKeyFromRequestCode('724')
    expect(verifyAccessKey('724', accessKey)).toBe(true)
    expect(verifyAccessKey('724', '00000')).toBe(false)
    expect(verifyAccessKey('72', accessKey)).toBe(false)
  })

  test('can generate zero padded request codes', () => {
    expect(generateRandomRequestCode(() => 0)).toBe('000')
    expect(generateRandomRequestCode(() => 0.009)).toBe('009')
    expect(generateRandomRequestCode(() => 0.724)).toBe('724')
  })
})

describe('time-based unlock PIN', () => {
  const PERIOD = COMPANION_UNLOCK_PIN_PERIOD_MS
  const now = PERIOD * 1000 + 1 // window 1000 -> derived request code '000'

  test('derives a deterministic five digit PIN from the time window', () => {
    expect(unlockPinWindow(now)).toBe(1000)
    expect(generateUnlockPin(now)).toBe(generateAccessKeyFromRequestCode('000'))
    expect(generateUnlockPin(now)).toMatch(/^\d{5}$/)
  })

  test('PIN is stable within a window and rotates across windows', () => {
    expect(generateUnlockPin(now)).toBe(generateUnlockPin(now + PERIOD - 2))
    expect(generateUnlockPin(now)).not.toBe(generateUnlockPin(now + PERIOD))
  })

  test('reports when the current PIN expires', () => {
    expect(unlockPinExpiresAtMs(now)).toBe(PERIOD * 1001)
  })

  test('verifies the current PIN and neighbouring windows for clock skew', () => {
    expect(verifyUnlockPin(generateUnlockPin(now), now)).toBe(true)
    expect(verifyUnlockPin(generateUnlockPin(now - PERIOD), now)).toBe(true)
    expect(verifyUnlockPin(generateUnlockPin(now + PERIOD), now)).toBe(true)
  })

  test('rejects PINs outside the skew window and malformed input', () => {
    expect(verifyUnlockPin(generateUnlockPin(now + PERIOD * 2), now)).toBe(false)
    expect(verifyUnlockPin('123', now)).toBe(false)
    expect(verifyUnlockPin(generateUnlockPin(now - PERIOD), now, 0)).toBe(false)
  })
})