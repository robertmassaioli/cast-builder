/**
 * Lexer — tokenises a raw .castscript string into a flat list of Tokens.
 * Phase 0: structure only. Full implementation in Phase 1.
 */

import { type Token, type TokenKind } from './types.js';

export function lex(source: string): Token[] {
  const lines = source.split('\n');
  const tokens: Token[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + 1;
    tokens.push(classifyLine(line, lineNum));
  }

  return tokens;
}

function classifyLine(line: string, lineNum: number): Token {
  const make = (kind: TokenKind, value?: string): Token => ({
    kind,
    raw: line,
    line: lineNum,
    ...(value !== undefined ? { value } : {}),
  });

  if (line === '--- config ---') return make('config-section-header');
  if (line === '--- script ---') return make('script-section-header');
  if (/^\s*$/.test(line)) return make('blank');
  if (/^\s*#/.test(line)) return make('comment');
  if (/^\[.+\]$/.test(line)) return make('block-label', line.slice(1, -1));
  if (line.startsWith('$ ')) return make('command', line.slice(2));
  if (line.startsWith('>> ')) return make('file-output', line.slice(3));
  if (line.startsWith('> ')) return make('output', line.slice(2));
  if (line.startsWith('type: ')) return make('type', line.slice(6));
  if (line.startsWith('hidden: ')) return make('hidden', line.slice(8));
  if (line.startsWith('print: ')) return make('print', line.slice(7));
  if (line.startsWith('wait: ')) return make('wait', line.slice(6));
  if (line === 'clear') return make('clear');
  if (line.startsWith('marker: ')) return make('marker', line.slice(8));
  if (line.startsWith('resize: ')) return make('resize', line.slice(8));
  if (line.startsWith('set ')) return make('set', line.slice(4));
  if (line.startsWith('include: ')) return make('include', line.slice(9));
  if (line.startsWith('raw: ')) return make('raw', line.slice(5));

  // Config key: value lines
  const configMatch = line.match(/^(\S[^:]*?)\s*:\s*(.*)$/);
  if (configMatch) return make('config-line', line);

  // Fallback — treat as comment so we don't hard-crash during Phase 0
  return make('comment');
}
