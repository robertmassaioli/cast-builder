/**
 * ANSI escape sequence utilities.
 * Implemented directly from the ANSI/VT100 spec — no third-party library.
 * This keeps output byte-for-byte deterministic regardless of npm dependency updates.
 */
/**
 * Convert a list of style modifier strings into an ANSI SGR escape sequence.
 * Supports named modifiers (bold, green, bg-red, …) and hex colours (#rrggbb).
 */
export declare function modifiersToAnsi(modifiers: string[]): string;
/** Reset all SGR attributes. */
export declare const RESET = "\u001B[0m";
/** Clear the terminal screen and move cursor to home position. */
export declare const CLEAR_SCREEN = "\u001B[2J\u001B[H";
/** Move cursor to home (top-left). */
export declare const CURSOR_HOME = "\u001B[H";
/**
 * Render a carriage-return + newline (standard terminal line ending).
 */
export declare const CRLF = "\r\n";
//# sourceMappingURL=ansi.d.ts.map