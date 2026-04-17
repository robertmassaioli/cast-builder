/**
 * Asciicast v3 encoder.
 *
 * v3 format: NDJSON where the first line is the header and subsequent lines
 * are events. Timestamps in v3 are DELTA times (seconds since previous event),
 * unlike v2 which uses absolute times.
 *
 * Spec reference: https://docs.asciinema.org/manual/asciicast/v3/
 */
import type { CompiledCast } from '../compiler/types.js';
export declare function encodeV3(cast: CompiledCast): string;
//# sourceMappingURL=v3.d.ts.map