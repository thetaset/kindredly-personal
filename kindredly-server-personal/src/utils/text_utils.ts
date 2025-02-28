export function sanitizeString(input: string): string {
    // Remove any script tags or potentially harmful content
    return input.replace(/<script.*?>.*?<\/script>/gi, '')
        .replace(/<.*?javascript:.*?>/gi, '')
        .replace(/<.*?\\s+on.*?>/gi, '')
        .replace(/<.*?>/gi, ''); // Optionally remove all HTML tags
}
