/**
 * Asciicast v2 encoder.
 *
 * v2 format: NDJSON where the first line is the header and subsequent lines
 * are events. Timestamps in v2 are ABSOLUTE seconds from recording start
 * (unlike v3 which uses deltas).
 *
 * Spec reference: https://docs.asciinema.org/manual/asciicast/v2/
 */
import type { CompiledCast } from '../compiler/types.js';
export declare function encodeV2(cast: CompiledCast): string;
//# sourceMappingURL=v2.d.ts.map