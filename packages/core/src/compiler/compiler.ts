/**
 * Compiler — converts a ParseResult into a CompiledCast.
 *
 * Browser-safe: zero Node.js built-in imports. All I/O is delegated to the
 * caller-supplied FileResolver in CompileOptions.
 */

import { CLEAR_SCREEN, CRLF, RESET, modifiersToAnsi } from '../util/ansi.js';
import { TimingEngine } from './timing.js';
import {
  CompileError,
  FileResolverErrorCode,
  NULL_RESOLVER,
  type CastEvent,
  type CastHeader,
  type CompiledCast,
  type CompileOptions,
  type FileResolverError,
} from './types.js';
import { parse, parseStyledText } from '../parser/parser.js';
import type { Config, ScriptNode, StyledText } from '../parser/types.js';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compile a parsed .castscript into a CompiledCast (header + event stream).
 *
 * @param config   Parsed configuration (from parse())
 * @param nodes    Parsed script nodes (from parse())
 * @param options  Optional: FileResolver, injectable timestamp (now), error handling
 *
 * @returns Promise<CompiledCast> — async because the FileResolver may be async
 *          (e.g. fetch-based in browsers). Scripts with no `>>` or `include:`
 *          directives resolve immediately.
 */
export async function compile(
  config: Config,
  nodes: ScriptNode[],
  options: CompileOptions = {},
): Promise<CompiledCast> {
  const resolver = options.resolver ?? NULL_RESOLVER;
  const onResolveError = options.onResolveError ?? 'error';
  const timestamp = options.now ?? Math.floor(Date.now() / 1000);

  const header = buildHeader(config, timestamp);
  const events: CastEvent[] = [];
  const engine = new TimingEngine(config.typingSpeed, config.typingSeed);

  // Mutable compile-time config (mid-script `set` directives mutate this copy)
  const liveConfig: Config = { ...config, env: { ...config.env } };

  await compileNodes(nodes, events, engine, liveConfig, resolver, onResolveError);

  // Emit reset at end to restore terminal state
  events.push({ time: engine.seconds, code: 'o', data: RESET });

  return { header, events };
}

// ── Internal node compiler ────────────────────────────────────────────────────

const MAX_INCLUDE_DEPTH = 16;

async function compileNodes(
  nodes: ScriptNode[],
  events: CastEvent[],
  engine: TimingEngine,
  config: Config,
  resolver: NonNullable<CompileOptions['resolver']>,
  onResolveError: NonNullable<CompileOptions['onResolveError']>,
  isFirstBlock = { value: true },
  depth = 0,
): Promise<void> {
  if (depth > MAX_INCLUDE_DEPTH) {
    throw new CompileError(
      'INCLUDE_DEPTH_EXCEEDED',
      `Maximum include depth (${MAX_INCLUDE_DEPTH}) exceeded — possible circular include.`,
    );
  }
  for (const node of nodes) {
    switch (node.kind) {
      case 'comment':
      case 'block-label':
        break;

      case 'marker':
        events.push({ time: engine.seconds, code: 'm', data: node.label });
        break;

      case 'wait':
        engine.advance(node.ms);
        break;

      case 'clear':
        events.push({ time: engine.seconds, code: 'o', data: CLEAR_SCREEN });
        break;

      case 'resize':
        events.push({ time: engine.seconds, code: 'r', data: `${node.cols}x${node.rows}` });
        break;

      case 'raw':
        events.push({ time: engine.seconds, code: 'o', data: unescapeRaw(node.ansi) });
        break;

      case 'command': {
        // Insert idle gap between command blocks (skip before the very first)
        if (!isFirstBlock.value) {
          engine.advance(config.idleTime * 1000);
        }
        isFirstBlock.value = false;

        // Render prompt (supports inline style tags)
        const promptText = parseStyledText(config.prompt);
        const promptData = renderStyledText(promptText);
        events.push({ time: engine.seconds, code: 'o', data: promptData });

        // Type each character of the command with realistic jitter
        for (const ch of node.text) {
          engine.typeChar();
          events.push({ time: engine.seconds, code: 'o', data: ch });
        }

        // Press Enter
        engine.typeChar();
        events.push({ time: engine.seconds, code: 'o', data: CRLF });
        break;
      }

      case 'output': {
        const rendered = renderStyledText(node.text);
        engine.emitLine(0);
        events.push({ time: engine.seconds, code: 'o', data: rendered + CRLF });
        break;
      }

      case 'print': {
        const rendered = renderStyledText(node.text);
        events.push({ time: engine.seconds, code: 'o', data: rendered + CRLF });
        break;
      }

      case 'type': {
        for (const ch of node.text) {
          engine.typeChar();
          events.push({ time: engine.seconds, code: 'o', data: ch });
        }
        break;
      }

      case 'hidden': {
        // Advance timing for each character (no echo — nothing displayed)
        for (const _ch of node.text) {
          engine.typeChar();
        }
        // Emit Enter keypress — moves to new line, as a real terminal would
        engine.typeChar();
        events.push({ time: engine.seconds, code: 'o', data: CRLF });
        break;
      }

      case 'file-output': {
        const result = await resolver(node.path);
        if (!result.ok) {
          const handled = await handleResolveError(result, events, engine, onResolveError);
          if (!handled) break;
          continue;
        }
        const lines = result.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip trailing empty line from final newline
          if (i === lines.length - 1 && line === '') continue;
          engine.emitLine(i);
          events.push({ time: engine.seconds, code: 'o', data: (line ?? '') + CRLF });
        }
        break;
      }

      case 'include': {
        const result = await resolver(node.path);
        if (!result.ok) {
          await handleResolveError(result, events, engine, onResolveError);
          break;
        }
        const { nodes: includeNodes } = parse(result.content);

        let nodesToCompile: ScriptNode[];
        if (node.block) {
          nodesToCompile = extractBlock(includeNodes, node.block);
        } else {
          nodesToCompile = includeNodes.filter((n) => n.kind !== 'block-label');
        }

        // Pass the same resolver — it is responsible for path resolution
        await compileNodes(nodesToCompile, events, engine, config, resolver, onResolveError, isFirstBlock, depth + 1);
        break;
      }

      case 'set': {
        switch (node.key) {
          case 'typing-speed': {
            const speed =
              node.value === 'instant' ||
              node.value === 'fast' ||
              node.value === 'normal' ||
              node.value === 'slow'
                ? node.value
                : parseInt(node.value, 10) || ('normal' as const);
            config.typingSpeed = speed;
            engine.setSpeed(speed);
            break;
          }
          case 'prompt':
            config.prompt = node.value;
            break;
          case 'idle-time':
            config.idleTime = parseFloat(node.value);
            break;
          case 'title':
            config.title = node.value;
            break;
          default:
            break;
        }
        break;
      }
    }
  }
}

// ── Resolve error handler ─────────────────────────────────────────────────────

/**
 * Handle a FileResolverError according to onResolveError policy.
 * Returns false if the caller should `break` (skip), true if it should `continue`.
 * Throws CompileError for 'error' policy.
 */
async function handleResolveError(
  error: FileResolverError,
  events: CastEvent[],
  engine: TimingEngine,
  policy: NonNullable<CompileOptions['onResolveError']>,
): Promise<boolean> {
  switch (policy) {
    case 'skip':
      return false;
    case 'warn':
      events.push({
        time: engine.seconds,
        code: 'o',
        data: `[warning: could not read "${error.path}": ${error.message} (${error.code})]\r\n`,
      });
      return false;
    default: // 'error'
      throw new CompileError(
        'FILE_RESOLVER_ERROR',
        `${error.code}: ${error.message}`,
        error,
      );
  }
}

// ── Block extraction ──────────────────────────────────────────────────────────

function extractBlock(nodes: ScriptNode[], blockName: string): ScriptNode[] {
  let inBlock = false;
  const result: ScriptNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'block-label') {
      if (node.name === blockName) {
        inBlock = true;
      } else if (inBlock) {
        break;
      }
      continue;
    }
    if (inBlock) result.push(node);
  }

  if (!inBlock) {
    throw new CompileError('INVALID_DIRECTIVE', `include: block "[${blockName}]" not found`);
  }

  return result;
}

// ── Header builder ────────────────────────────────────────────────────────────

function buildHeader(config: Config, timestamp: number): CastHeader {
  const header: CastHeader = {
    version: config.outputFormat === 'v2' ? 2 : 3,
    cols: config.width,
    rows: config.height,
    timestamp,
  };

  if (config.title) header.title = config.title;
  if (Object.keys(config.env).length > 0) header.env = config.env;

  return header;
}

// ── Styled text renderer ──────────────────────────────────────────────────────

export function renderStyledText(text: StyledText): string {
  let out = '';

  for (const span of text) {
    if (span.kind === 'plain') {
      out += span.text;
    } else {
      const openSeq = modifiersToAnsi(span.modifiers);
      const inner = renderStyledText(span.content);
      out += openSeq + inner + RESET;
    }
  }

  return out;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function unescapeRaw(input: string): string {
  return input
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}
