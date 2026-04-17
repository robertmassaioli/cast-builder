/**
 * Terminal state machine — applies a stream of raw terminal bytes to a virtual
 * screen buffer, tracking the visible text on each line.
 *
 * This is intentionally minimal: we only track enough state to reconstruct
 * visible text for the decompile command. We do not implement full VT100
 * (no scrollback, no reverse video, no complex cursor addressing).
 */
// ── Escape sequence filters ───────────────────────────────────────────────────
/** OSC sequences: ESC ] ... BEL or ESC ] ... ESC \ */
const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
/** CSI sequences: ESC [ ... (final byte in 0x40–0x7e) */
const CSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]/g;
/** ESC + single char sequences (ESC = ESC > ESC ( etc.) */
const ESC_SIMPLE_RE = /\x1b[^[\]]/g;
/** Strip all escape sequences, leaving only printable characters */
export function stripAllEscapes(s) {
    return s
        .replace(OSC_RE, '')
        .replace(CSI_RE, '')
        .replace(ESC_SIMPLE_RE, '')
        .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, ''); // other control chars
}
// ── Screen line buffer ────────────────────────────────────────────────────────
export class ScreenBuffer {
    lines;
    curRow;
    curCol;
    cols;
    constructor(cols = 200, rows = 50) {
        this.cols = cols;
        this.lines = Array.from({ length: rows }, () => '');
        this.curRow = 0;
        this.curCol = 0;
    }
    /**
     * Feed a raw chunk of terminal bytes into the buffer.
     * Returns any complete logical lines that have been finalised by \n.
     */
    feed(data) {
        const completed = [];
        let i = 0;
        while (i < data.length) {
            const ch = data[i];
            // OSC sequence (title, CWD, etc.) — skip entirely
            if (ch === '\x1b' && data[i + 1] === ']') {
                const endBel = data.indexOf('\x07', i);
                const endSt = data.indexOf('\x1b\\', i + 2);
                let end;
                if (endBel !== -1 && (endSt === -1 || endBel < endSt)) {
                    end = endBel + 1;
                }
                else if (endSt !== -1) {
                    end = endSt + 2;
                }
                else {
                    end = data.length; // malformed, skip rest
                }
                i = end;
                continue;
            }
            // CSI sequence — ESC [
            if (ch === '\x1b' && data[i + 1] === '[') {
                const seqStart = i;
                i += 2;
                // Collect parameter bytes
                while (i < data.length && data[i] !== undefined && data[i] >= ' ' && data[i] < '@')
                    i++;
                // Skip intermediate bytes
                while (i < data.length && data[i] !== undefined && data[i] >= '@' && data[i] <= '~') {
                    const cmd = data[i];
                    const params = data.slice(seqStart + 2, i);
                    this.handleCSI(cmd, params);
                    i++;
                    break;
                }
                continue;
            }
            // Simple ESC sequences (ESC =, ESC >, ESC (, etc.)
            if (ch === '\x1b') {
                i += 2; // skip ESC + next char
                continue;
            }
            // Carriage return — move cursor to start of line
            if (ch === '\r') {
                this.curCol = 0;
                i++;
                continue;
            }
            // Line feed / newline — finalise current line, move down
            if (ch === '\n') {
                completed.push(this.currentLine());
                this.curRow++;
                if (this.curRow >= this.lines.length) {
                    // Scroll: drop first line, add blank at end
                    this.lines.shift();
                    this.lines.push('');
                    this.curRow = this.lines.length - 1;
                }
                i++;
                continue;
            }
            // Backspace
            if (ch === '\b') {
                if (this.curCol > 0)
                    this.curCol--;
                i++;
                continue;
            }
            // Other control characters — skip
            if (ch !== undefined && ch < ' ') {
                i++;
                continue;
            }
            // Printable character — write to buffer
            if (ch !== undefined) {
                const row = this.lines[this.curRow] ?? '';
                // Pad line to cursor column if necessary
                const padded = row.padEnd(this.curCol, ' ');
                this.lines[this.curRow] = padded.slice(0, this.curCol) + ch + padded.slice(this.curCol + 1);
                this.curCol++;
            }
            i++;
        }
        return completed;
    }
    /** Get the current line's visible text (trimmed of trailing spaces). */
    currentLine() {
        return (this.lines[this.curRow] ?? '').trimEnd();
    }
    /** Flush the current (possibly incomplete) line. */
    flush() {
        return this.currentLine();
    }
    handleCSI(cmd, params) {
        const nums = params.split(';').map((p) => (p === '' ? 1 : parseInt(p, 10)));
        const n = nums[0] ?? 1;
        switch (cmd) {
            case 'A': // Cursor up
                this.curRow = Math.max(0, this.curRow - n);
                break;
            case 'B': // Cursor down
                this.curRow = Math.min(this.lines.length - 1, this.curRow + n);
                break;
            case 'C': // Cursor forward
                this.curCol = Math.min(this.cols - 1, this.curCol + n);
                break;
            case 'D': // Cursor back
                this.curCol = Math.max(0, this.curCol - n);
                break;
            case 'H': // Cursor position
            case 'f': {
                const row = (nums[0] ?? 1) - 1;
                const col = (nums[1] ?? 1) - 1;
                this.curRow = Math.max(0, Math.min(this.lines.length - 1, row));
                this.curCol = Math.max(0, Math.min(this.cols - 1, col));
                break;
            }
            case 'J': // Erase in display
                if (n === 2) {
                    // Clear entire screen
                    this.lines = this.lines.map(() => '');
                    this.curRow = 0;
                    this.curCol = 0;
                }
                break;
            case 'K': // Erase in line
                if (n === 0 || n === 1) {
                    // Erase from cursor to end of line (0) or start to cursor (1)
                    const row = this.lines[this.curRow] ?? '';
                    this.lines[this.curRow] = n === 0
                        ? row.slice(0, this.curCol)
                        : ' '.repeat(this.curCol) + row.slice(this.curCol);
                }
                else if (n === 2) {
                    this.lines[this.curRow] = '';
                }
                break;
            // SGR (colours/styles) — ignore for text reconstruction
            case 'm':
                break;
            // All other CSI sequences ignored
            default:
                break;
        }
    }
}
//# sourceMappingURL=terminal.js.map