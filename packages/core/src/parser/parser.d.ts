/**
 * Parser — converts a Token[] into a ParseResult (Config + ScriptNode[]).
 * Phase 0: structure and type-safe stubs only. Full implementation in Phase 1.
 */
import { type ParseResult, type StyledText } from './types.js';
export declare function parse(source: string): ParseResult;
/**
 * Parse a styled text string containing optional {modifier: content} tags
 * into a StyledText array.
 *
 * Phase 0: minimal recursive parser. Full Unicode/edge-case handling in Phase 1.
 */
export declare function parseStyledText(input: string): StyledText;
//# sourceMappingURL=parser.d.ts.map