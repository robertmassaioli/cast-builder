/**
 * ANSI escape sequence utilities.
 * Implemented directly from the ANSI/VT100 spec — no third-party library.
 * This keeps output byte-for-byte deterministic regardless of npm dependency updates.
 */

const ESC = '\x1b';
const CSI = `${ESC}[`;

// ── SGR (Select Graphic Rendition) ────────────────────────────────────────────

const MODIFIER_CODES: Record<string, number> = {
  reset: 0,
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  // foreground colours
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  // background colours
  'bg-black': 40,
  'bg-red': 41,
  'bg-green': 42,
  'bg-yellow': 43,
  'bg-blue': 44,
  'bg-magenta': 45,
  'bg-cyan': 46,
  'bg-white': 47,
};

/**
 * Convert a list of style modifier strings into an ANSI SGR escape sequence.
 * Supports named modifiers (bold, green, bg-red, …) and hex colours (#rrggbb).
 */
export function modifiersToAnsi(modifiers: string[]): string {
  const codes: string[] = [];

  for (const mod of modifiers) {
    if (mod in MODIFIER_CODES) {
      codes.push(String(MODIFIER_CODES[mod]));
    } else if (/^#[0-9a-fA-F]{6}$/.test(mod)) {
      // 24-bit true colour foreground: ESC[38;2;r;g;bm
      const r = parseInt(mod.slice(1, 3), 16);
      const g = parseInt(mod.slice(3, 5), 16);
      const b = parseInt(mod.slice(5, 7), 16);
      codes.push(`38;2;${r};${g};${b}`);
    } else {
      // Unknown modifier — ignore gracefully
    }
  }

  if (codes.length === 0) return '';
  return `${CSI}${codes.join(';')}m`;
}

/** Reset all SGR attributes. */
export const RESET = `${CSI}0m`;

/** Clear the terminal screen and move cursor to home position. */
export const CLEAR_SCREEN = `${CSI}2J${CSI}H`;

/** Move cursor to home (top-left). */
export const CURSOR_HOME = `${CSI}H`;

/**
 * Render a carriage-return + newline (standard terminal line ending).
 */
export const CRLF = '\r\n';
