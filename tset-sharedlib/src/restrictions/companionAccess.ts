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