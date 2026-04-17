/**
 * TimingEngine — maintains the running clock and typing jitter.
 * Phase 0: types and structure. Full implementation in Phase 1.
 */
import type { TypingSpeed } from '../parser/types.js';
export declare class TimingEngine {
    private clockMs;
    private profile;
    private rng;
    constructor(speed: TypingSpeed, seed?: number);
    /** Current clock position in seconds. */
    get seconds(): number;
    /** Advance clock by a fixed number of milliseconds. */
    advance(ms: number): void;
    /**
     * Advance clock by one character-typing delay (avg + jitter).
     * Returns the new clock position in seconds.
     */
    typeChar(): number;
    /**
     * Advance clock by a per-line output emission delay.
     * Simulates the small gap between lines of command output.
     */
    emitLine(lineIndex: number): number;
    /** Override the active typing speed profile mid-script. */
    setSpeed(speed: TypingSpeed): void;
}
//# sourceMappingURL=timing.d.ts.map