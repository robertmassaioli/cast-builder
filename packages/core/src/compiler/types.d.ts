export interface CastTheme {
    fg: string;
    bg: string;
    palette: string;
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
    time: number;
    code: CastEventCode;
    data: string;
}
export interface CompiledCast {
    header: CastHeader;
    events: CastEvent[];
}
export interface TypingProfile {
    avgDelayMs: number;
    jitterMs: number;
}
export declare const TYPING_PROFILES: Record<string, TypingProfile>;
//# sourceMappingURL=types.d.ts.map