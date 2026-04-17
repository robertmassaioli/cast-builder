// Compiler types — the output side of the pipeline.
// These types are frozen in Phase 0; implementations are filled in Phase 1+.
export const TYPING_PROFILES = {
    instant: { avgDelayMs: 0, jitterMs: 0 },
    fast: { avgDelayMs: 30, jitterMs: 10 },
    normal: { avgDelayMs: 80, jitterMs: 40 },
    slow: { avgDelayMs: 150, jitterMs: 60 },
};
//# sourceMappingURL=types.js.map