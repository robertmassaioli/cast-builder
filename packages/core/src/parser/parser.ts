/**
 * Parser — converts a Token[] into a ParseResult (Config + ScriptNode[]).
 */

import { parseDuration } from '../util/duration.js';
import { lex } from './lexer.js';
import {
  DEFAULT_CONFIG,
  ParseError,
  type Config,
  type ConfigKey,
  type ParseResult,
  type ScriptNode,
  type StyledText,
  type TypingSpeed,
} from './types.js';

// ── Public API ────────────────────────────────────────────────────────────────

export function parse(source: string): ParseResult {
  const tokens = lex(source);

  let idx = 0;
  const config: Config = { ...DEFAULT_CONFIG, env: {} };
  const nodes: ScriptNode[] = [];

  // Skip to config section if present
  if (tokens[idx]?.kind === 'config-section-header') {
    idx++;
    idx = parseConfigSection(tokens, idx, config);
  }

  // Expect script section
  if (tokens[idx]?.kind === 'script-section-header') {
    idx++;
  }

  // Parse script body
  while (idx < tokens.length) {
    const token = tokens[idx];
    if (!token) break;

    switch (token.kind) {
      case 'blank':
      case 'comment':
      case 'config-section-header':
      case 'script-section-header':
        idx++;
        break;

      case 'block-label':
        nodes.push({ kind: 'block-label', name: token.value ?? '' });
        idx++;
        break;

      case 'command':
        nodes.push({ kind: 'command', text: token.value ?? '' });
        idx++;
        break;

      case 'output':
        nodes.push({ kind: 'output', text: parseStyledText(token.value ?? '') });
        idx++;
        break;

      case 'file-output':
        nodes.push({ kind: 'file-output', path: token.value ?? '' });
        idx++;
        break;

      case 'type':
        nodes.push({ kind: 'type', text: token.value ?? '' });
        idx++;
        break;

      case 'hidden':
        nodes.push({ kind: 'hidden', text: token.value ?? '' });
        idx++;
        break;

      case 'print':
        nodes.push({ kind: 'print', text: parseStyledText(token.value ?? '') });
        idx++;
        break;

      case 'wait': {
        const ms = parseDuration(token.value ?? '0s');
        nodes.push({ kind: 'wait', ms });
        idx++;
        break;
      }

      case 'clear':
        nodes.push({ kind: 'clear' });
        idx++;
        break;

      case 'marker':
        nodes.push({ kind: 'marker', label: token.value ?? '' });
        idx++;
        break;

      case 'resize': {
        const parts = (token.value ?? '').split('x');
        const cols = parseInt(parts[0] ?? '0', 10);
        const rows = parseInt(parts[1] ?? '0', 10);
        if (isNaN(cols) || isNaN(rows)) {
          throw new ParseError(token.line, `Invalid resize value: "${token.value}"`);
        }
        nodes.push({ kind: 'resize', cols, rows });
        idx++;
        break;
      }

      case 'set': {
        // "set key: value" — preserve trailing whitespace in value (e.g. for prompt)
        const setMatch = (token.value ?? '').match(/^(\S[^:]*?)\s*:\s*(.*)$/);
        if (!setMatch) throw new ParseError(token.line, `Invalid set directive: "${token.raw}"`);
        const key = (setMatch[1] ?? '').trim() as ConfigKey;
        // Preserve trailing whitespace — significant for 'prompt' key
        const value = setMatch[2] ?? '';
        nodes.push({ kind: 'set', key, value });
        idx++;
        break;
      }

      case 'include': {
        const raw = token.value ?? '';
        const hashIdx = raw.lastIndexOf('#');
        if (hashIdx > 0) {
          nodes.push({ kind: 'include', path: raw.slice(0, hashIdx).trim(), block: raw.slice(hashIdx + 1).trim() });
        } else {
          nodes.push({ kind: 'include', path: raw.trim() });
        }
        idx++;
        break;
      }

      case 'raw':
        nodes.push({ kind: 'raw', ansi: token.value ?? '' });
        idx++;
        break;

      case 'config-line':
        // config lines appearing outside a config section are ignored
        idx++;
        break;

      default:
        idx++;
    }
  }

  return { config, nodes };
}

// ── Config section parser ─────────────────────────────────────────────────────

function parseConfigSection(
  tokens: ReturnType<typeof lex>,
  startIdx: number,
  config: Config,
): number {
  let idx = startIdx;

  while (idx < tokens.length) {
    const token = tokens[idx];
    if (!token) break;
    if (token.kind === 'script-section-header') break;
    if (token.kind === 'blank' || token.kind === 'comment') {
      idx++;
      continue;
    }

    // Parse key: value
    // Consume all leading whitespace after the colon (alignment spaces),
    // but preserve trailing whitespace in the value (significant for `prompt`).
    const match = token.raw.match(/^(\S[^:]*?)\s*:\s*(.*)$/);
    if (!match) {
      idx++;
      continue;
    }

    const key = (match[1] ?? '').trim();
    // Greedy capture — trailing whitespace preserved; applyConfigKey trims per-key
    const value = match[2] ?? '';

    applyConfigKey(key, value, config, token.line);
    idx++;
  }

  return idx;
}

function applyConfigKey(key: string, value: string, config: Config, line: number): void {
  // For most keys trim the value; for `prompt` preserve trailing whitespace
  const trimmed = value.trimEnd();
  switch (key) {
    case 'title':
      config.title = trimmed;
      break;
    case 'width':
      config.width = parseInt(trimmed, 10);
      break;
    case 'height':
      config.height = parseInt(trimmed, 10);
      break;
    case 'shell':
      config.shell = trimmed;
      break;
    case 'prompt':
      config.prompt = value; // preserve trailing space (e.g. "$ " or "user@host:~$ ")
      break;
    case 'theme':
      config.theme = trimmed;
      break;
    case 'typing-speed':
      config.typingSpeed = parseTypingSpeed(trimmed, line);
      break;
    case 'typing-seed':
      config.typingSeed = parseInt(trimmed, 10);
      break;
    case 'idle-time':
      config.idleTime = parseFloat(trimmed);
      break;
    case 'output-format':
      if (trimmed === 'v2' || trimmed === 'v3') {
        config.outputFormat = trimmed;
      } else {
        throw new ParseError(line, `Invalid output-format: "${trimmed}". Must be "v2" or "v3".`);
      }
      break;
    case 'env': {
      // env: KEY=VALUE
      const eqIdx = value.indexOf('=');
      if (eqIdx > 0) {
        const envKey = value.slice(0, eqIdx).trim();
        const envVal = value.slice(eqIdx + 1).trim();
        config.env[envKey] = envVal;
      }
      break;
    }
    default:
      // Unknown keys are silently ignored
      break;
  }
}

function parseTypingSpeed(value: string, line: number): TypingSpeed {
  if (value === 'instant' || value === 'fast' || value === 'normal' || value === 'slow') {
    return value;
  }
  const msMatch = value.match(/^(\d+)ms$/);
  if (msMatch) return parseInt(msMatch[1] ?? '0', 10);
  throw new ParseError(line, `Invalid typing-speed: "${value}". Expected slow|normal|fast|instant|Nms.`);
}

// ── Styled text parser ────────────────────────────────────────────────────────

/**
 * Parse a styled text string containing optional {modifier: content} tags
 * into a StyledText array.
 *
 */
export function parseStyledText(input: string): StyledText {
  const result: StyledText = [];
  let i = 0;

  while (i < input.length) {
    const braceIdx = input.indexOf('{', i);
    if (braceIdx === -1) {
      // No more tags — rest is plain text
      const rest = input.slice(i);
      if (rest.length > 0) result.push({ kind: 'plain', text: rest });
      break;
    }

    // Plain text before this tag
    if (braceIdx > i) {
      result.push({ kind: 'plain', text: input.slice(i, braceIdx) });
    }

    // Find the colon-space separator inside the brace
    const colonIdx = input.indexOf(': ', braceIdx);
    if (colonIdx === -1) {
      // Malformed tag — treat rest as plain text
      result.push({ kind: 'plain', text: input.slice(braceIdx) });
      break;
    }

    const modifierStr = input.slice(braceIdx + 1, colonIdx).trim();
    const modifiers = modifierStr.split(/\s+/).filter(Boolean);

    // Find matching closing brace (handles arbitrary nesting depth)
    let depth = 1;
    let j = colonIdx + 2;
    while (j < input.length && depth > 0) {
      if (input[j] === '{') depth++;
      else if (input[j] === '}') depth--;
      if (depth > 0) j++;
    }

    const innerText = input.slice(colonIdx + 2, j);
    const content = parseStyledText(innerText); // recurse

    result.push({ kind: 'styled', modifiers, content });
    i = j + 1; // skip past closing '}'
  }

  return result;
}
