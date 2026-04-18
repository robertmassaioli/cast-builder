/**
 * TimingEngine — maintains the running clock and typing jitter.
 */

import { jitterMs, createRng } from '../util/rng.js';
import { TYPING_PROFILES, type TypingProfile } from './types.js';
import type { TypingSpeed } from '../parser/types.js';

export class TimingEngine {
  private clockMs: number = 0;
  private profile: TypingProfile;
  private rng: () => number;

  constructor(speed: TypingSpeed, seed?: number) {
    this.profile = resolveProfile(speed);
    this.rng = createRng(seed ?? Math.floor(Math.random() * 0xffffffff));
  }

  /** Current clock position in seconds. */
  get seconds(): number {
    return this.clockMs / 1000;
  }

  /** Advance clock by a fixed number of milliseconds. */
  advance(ms: number): void {
    this.clockMs += Math.max(0, ms);
  }

  /**
   * Advance clock by one character-typing delay (avg + jitter).
   * Returns the new clock position in seconds.
   */
  typeChar(): number {
    const delay = Math.max(0, this.profile.avgDelayMs + jitterMs(this.rng, this.profile.jitterMs));
    this.clockMs += delay;
    return this.seconds;
  }

  /**
   * Advance clock by a per-line output emission delay.
   * Simulates the small gap between lines of command output.
   */
  emitLine(lineIndex: number): number {
    // 15–25 ms between output lines
    const base = 20;
    const variation = jitterMs(this.rng, 5);
    this.clockMs += Math.max(1, base + variation + lineIndex * 2);
    return this.seconds;
  }

  /** Override the active typing speed profile mid-script. */
  setSpeed(speed: TypingSpeed): void {
    this.profile = resolveProfile(speed);
  }
}

function resolveProfile(speed: TypingSpeed): TypingProfile {
  if (typeof speed === 'number') {
    return { avgDelayMs: speed, jitterMs: Math.round(speed * 0.25) };
  }
  return TYPING_PROFILES[speed] ?? TYPING_PROFILES['normal']!;
}
