/**
 * Terminal state machine — applies a stream of raw terminal bytes to a virtual
 * screen buffer, tracking the visible text on each line.
 *
 * This is intentionally minimal: we only track enough state to reconstruct
 * visible text for the decompile command. We do not implement full VT100
 * (no scrollback, no reverse video, no complex cursor addressing).
 */
/** Strip all escape sequences, leaving only printable characters */
export declare function stripAllEscapes(s: string): string;
export declare class ScreenBuffer {
    private lines;
    private curRow;
    private curCol;
    private cols;
    constructor(cols?: number, rows?: number);
    /**
     * Feed a raw chunk of terminal bytes into the buffer.
     * Returns any complete logical lines that have been finalised by \n.
     */
    feed(data: string): string[];
    /** Get the current line's visible text (trimmed of trailing spaces). */
    currentLine(): string;
    /** Flush the current (possibly incomplete) line. */
    flush(): string;
    private handleCSI;
}
//# sourceMappingURL=terminal.d.ts.map