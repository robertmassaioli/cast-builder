/**
 * Compiler — converts a ParseResult into a CompiledCast.
 * Phase 0: structure and type-safe stubs. Full implementation in Phase 1.
 */

import { CLEAR_SCREEN, CRLF, RESET, modifiersToAnsi } from '../util/ansi.js';
import { TimingEngine } from './timing.js';
import type { CastEvent, CastHeader, CompiledCast } from './types.js';
import type { Config, ScriptNode, StyledText } from '../parser/types.js';

export function compile(config: Config, nodes: ScriptNode[]): CompiledCast {
  const header = buildHeader(config);
  const events: CastEvent[] = [];
  const engine = new TimingEngine(config.typingSpeed, config.typingSeed);

  let firstBlock = true;

  for (const node of nodes) {
    switch (node.kind) {
      case 'comment':
      case 'block-label':
        // No output
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
        // Insert idle gap between command blocks (skip before first)
        if (!firstBlock) {
          engine.advance(config.idleTime * 1000);
        }
        firstBlock = false;

        // Render prompt
        const promptData = renderStyledText([{ kind: 'plain', text: config.prompt }]);
        events.push({ time: engine.seconds, code: 'o', data: promptData });

        // Type each character of the command
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
        // Advance timing only — no output events
        for (const _ch of node.text) {
          engine.typeChar();
        }
        break;
      }

      case 'file-output':
        // Phase 1: read file and emit lines. Phase 0: emit placeholder.
        events.push({
          time: engine.seconds,
          code: 'o',
          data: `[file output: ${node.path}]${CRLF}`,
        });
        break;

      case 'include':
        // Phase 2: resolve and inline included script. Phase 0: placeholder.
        events.push({
          time: engine.seconds,
          code: 'o',
          data: `[include: ${node.path}${node.block ? `#${node.block}` : ''}]${CRLF}`,
        });
        break;

      case 'set':
        // Apply mid-script config overrides
        if (node.key === 'typing-speed') {
          const speed = node.value === 'instant' || node.value === 'fast' ||
            node.value === 'normal' || node.value === 'slow'
            ? node.value
            : parseInt(node.value, 10) || 'normal';
          engine.setSpeed(speed);
        }
        // Other mid-script set keys handled in Phase 1
        break;
    }
  }

  // Emit reset at end to restore terminal state
  events.push({ time: engine.seconds, code: 'o', data: RESET });

  return { header, events };
}

// ── Header builder ────────────────────────────────────────────────────────────

function buildHeader(config: Config): CastHeader {
  const header: CastHeader = {
    version: config.outputFormat === 'v2' ? 2 : 3,
    cols: config.width,
    rows: config.height,
    timestamp: Math.floor(Date.now() / 1000),
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

/**
 * Unescape common escape sequences in raw: directive strings.
 * e.g. "\\x1b[1m" → "\x1b[1m"
 */
function unescapeRaw(input: string): string {
  return input
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}
