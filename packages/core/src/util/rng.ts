/**
 * Mulberry32 — a fast, seedable 32-bit PRNG.
 * Used to generate deterministic typing jitter when a seed is provided.
 *
 * Returns a factory that, given a seed, produces a function returning
 * pseudo-random floats in [0, 1).
 */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Return a random integer in the range [-jitter, +jitter] (inclusive).
 */
export function jitterMs(rng: () => number, jitterRange: number): number {
  if (jitterRange === 0) return 0;
  return Math.round((rng() * 2 - 1) * jitterRange);
}
