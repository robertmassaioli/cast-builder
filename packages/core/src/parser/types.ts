// Parser types — the contract between the lexer, parser, compiler, and test suite.
// These types are frozen in Phase 0; implementations are filled in Phase 1+.

export type ConfigKey =
  | 'title'
  | 'width'
  | 'height'
  | 'shell'
  | 'prompt'
  | 'theme'
  | 'typing-speed'
  | 'typing-seed'
  | 'idle-time'
  | 'output-format'
  | 'env';

export type TypingSpeed = 'instant' | 'fast' | 'normal' | 'slow' | number; // number = ms per char

export interface Config {
  title?: string;
  width: number; // default 120
  height: number; // default 30
  shell: string; // default 'bash'
  prompt: string; // default '$ '
  theme: string; // default 'default'
  typingSpeed: TypingSpeed; // default 'normal'
  typingSeed?: number;
  idleTime: number; // seconds, default 1.0
  outputFormat: 'v2' | 'v3'; // default 'v3'
  env: Record<string, string>;
}

export const DEFAULT_CONFIG: Config = {
  width: 120,
  height: 30,
  shell: 'bash',
  prompt: '$ ',
  theme: 'default',
  typingSpeed: 'normal',
  idleTime: 1.0,
  outputFormat: 'v3',
  env: {},
};

// ── Styled text ────────────────────────────────────────────────────────────────

export type StyledText = Array<PlainSpan | StyledSpan>;

export interface PlainSpan {
  kind: 'plain';
  text: string;
}

export interface StyledSpan {
  kind: 'styled';
  modifiers: string[];
  content: StyledText;
}

// ── Script nodes ───────────────────────────────────────────────────────────────

export type ScriptNode =
  | { kind: 'command'; text: string }
  | { kind: 'output'; text: StyledText }
  | { kind: 'file-output'; path: string }
  | { kind: 'type'; text: string }
  | { kind: 'hidden'; text: string }
  | { kind: 'print'; text: StyledText }
  | { kind: 'wait'; ms: number }
  | { kind: 'clear' }
  | { kind: 'marker'; label: string }
  | { kind: 'resize'; cols: number; rows: number }
  | { kind: 'set'; key: ConfigKey; value: string }
  | { kind: 'include'; path: string; block?: string }
  | { kind: 'raw'; ansi: string }
  | { kind: 'block-label'; name: string }
  | { kind: 'comment' };

// ── Tokens (produced by the lexer) ────────────────────────────────────────────

export type TokenKind =
  | 'config-section-header'
  | 'script-section-header'
  | 'config-line'
  | 'command'
  | 'output'
  | 'file-output'
  | 'type'
  | 'hidden'
  | 'print'
  | 'wait'
  | 'clear'
  | 'marker'
  | 'resize'
  | 'set'
  | 'include'
  | 'raw'
  | 'block-label'
  | 'comment'
  | 'blank';

export interface Token {
  kind: TokenKind;
  raw: string; // the original line
  line: number; // 1-based line number
  value?: string; // extracted directive value (everything after the prefix)
}

// ── Parse result ──────────────────────────────────────────────────────────────

export interface ParseResult {
  config: Config;
  nodes: ScriptNode[];
}

// ── Parse error ───────────────────────────────────────────────────────────────

export class ParseError extends Error {
  constructor(
    public readonly line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}
