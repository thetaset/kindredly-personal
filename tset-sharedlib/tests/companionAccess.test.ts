import {
  generateAccessKeyFromRequestCode,
  generateRandomRequestCode,
  sanitizeAccessKeyInput,
  sanitizeRequestCodeInput,
  verifyAccessKey,
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