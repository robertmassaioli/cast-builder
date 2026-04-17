/**
 * @cast-builder/core — public API
 *
 * High-level usage:
 *
 *   import { parse, compile, encodeV3 } from '@cast-builder/core';
 *
 *   const { config, nodes } = parse(source);
 *   config.typingSeed = 42;
 *   const cast = compile(config, nodes, sourceDir);
 *   const ndjson = encodeV3(cast);
 */
export { parse, parseStyledText } from './parser/parser.js';
export { compile, renderStyledText } from './compiler/compiler.js';
export { encodeV2 } from './encoder/v2.js';
export { encodeV3 } from './encoder/v3.js';
export type { Config, ConfigKey, TypingSpeed, ScriptNode, StyledText, PlainSpan, StyledSpan, ParseResult, Token, TokenKind, } from './parser/types.js';
export { DEFAULT_CONFIG, ParseError } from './parser/types.js';
export type { CastHeader, CastTheme, CastEvent, CastEventCode, CompiledCast, TypingProfile, } from './compiler/types.js';
export { TYPING_PROFILES } from './compiler/types.js';
export { stripAllEscapes, ScreenBuffer } from './util/terminal.js';
export { parseDuration, msToSeconds } from './util/duration.js';
export { createRng, jitterMs } from './util/rng.js';
export { modifiersToAnsi, RESET, CLEAR_SCREEN, CURSOR_HOME, CRLF } from './util/ansi.js';
//# sourceMappingURL=index.d.ts.map