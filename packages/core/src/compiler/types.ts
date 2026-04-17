// Compiler types — the output side of the pipeline.
// These types are frozen in Phase 0; implementations are filled in Phase 1+.

export interface CastTheme {
  fg: string; // hex e.g. "#cccccc"
  bg: string; // hex e.g. "#000000"
  palette: string; // 16 colours separated by ":"
}

export interface CastHeader {
  version: 2 | 3;
  cols: number;
  rows: number;
  title?: string;
  timestamp?: number;
  idleTimeLimit?: number;
  env?: Record<string, string>;
  theme?: CastTheme;
}

export type CastEventCode = 'o' | 'i' | 'r' | 'm' | 'x';

export interface CastEvent {
  time: number; // absolute seconds from recording start
  code: CastEventCode;
  data: string;
}

export interface CompiledCast {
  header: CastHeader;
  events: CastEvent[];
}

// ── Typing speed profiles ─────────────────────────────────────────────────────

export interface TypingProfile {
  avgDelayMs: number; // average milliseconds between characters
  jitterMs: number; // maximum random offset (±)
}

export const TYPING_PROFILES: Record<string, TypingProfile> = {
  instant: { avgDelayMs: 0, jitterMs: 0 },
  fast: { avgDelayMs: 30, jitterMs: 10 },
  normal: { avgDelayMs: 80, jitterMs: 40 },
  slow: { avgDelayMs: 150, jitterMs: 60 },
};
