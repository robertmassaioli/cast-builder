/**
 * Compiler — converts a ParseResult into a CompiledCast.
 * Phase 1: full implementation of all directives including file-output,
 * include/blocks, full set key support, and styled prompt rendering.
 */
import type { CompiledCast } from './types.js';
import type { Config, ScriptNode, StyledText } from '../parser/types.js';
export declare function compile(config: Config, nodes: ScriptNode[], sourceDir?: string): CompiledCast;
export declare function renderStyledText(text: StyledText): string;
//# sourceMappingURL=compiler.d.ts.map