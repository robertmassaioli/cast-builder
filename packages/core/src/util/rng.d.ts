/**
 * Mulberry32 — a fast, seedable 32-bit PRNG.
 * Used to generate deterministic typing jitter when a seed is provided.
 *
 * Returns a factory that, given a seed, produces a function returning
 * pseudo-random floats in [0, 1).
 */
export declare function createRng(seed: number): () => number;
/**
 * Return a random integer in the range [-jitter, +jitter] (inclusive).
 */
export declare function jitterMs(rng: () => number, jitterRange: number): number;
//# sourceMappingURL=rng.d.ts.map