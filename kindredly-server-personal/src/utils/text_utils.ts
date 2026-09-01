/** Escape a value for interpolation into HTML (emails, notification messages rendered via v-html). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeString(input: string): string {
  // Remove any script tags or potentially harmful content
  return input
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/<.*?javascript:.*?>/gi, '')
    .replace(/<.*?\\s+on.*?>/gi, '')
    .replace(/<.*?>/gi, ''); // Optionally remove all HTML tags
}
