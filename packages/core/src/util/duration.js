/**
 * Parse a duration string like "2s", "1.5s", or "500ms" into milliseconds.
 * Throws if the string is not a valid duration.
 */
export function parseDuration(input) {
    const trimmed = input.trim();
    const msMatch = trimmed.match(/^(\d+)ms$/);
    if (msMatch) {
        return parseInt(msMatch[1] ?? '0', 10);
    }
    const sMatch = trimmed.match(/^(\d+(?:\.\d+)?)s$/);
    if (sMatch) {
        return Math.round(parseFloat(sMatch[1] ?? '0') * 1000);
    }
    throw new Error(`Invalid duration: "${input}". Expected format: "2s", "1.5s", or "500ms".`);
}
/**
 * Convert milliseconds to seconds, rounded to 6 decimal places.
 */
export function msToSeconds(ms) {
    return Math.round(ms * 1000) / 1_000_000;
}
//# sourceMappingURL=duration.js.map