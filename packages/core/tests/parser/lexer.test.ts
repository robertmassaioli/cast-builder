import { describe, it, expect } from 'vitest';
import { lex } from '../../src/parser/lexer.js';

describe('lexer', () => {
  it('classifies section headers', () => {
    const tokens = lex('--- config ---\n--- script ---');
    expect(tokens[0]?.kind).toBe('config-section-header');
    expect(tokens[1]?.kind).toBe('script-section-header');
  });

  it('classifies blank lines and comments', () => {
    const tokens = lex('\n   \n# a comment');
    expect(tokens[0]?.kind).toBe('blank');
    expect(tokens[1]?.kind).toBe('blank');
    expect(tokens[2]?.kind).toBe('comment');
  });

  it('classifies command lines', () => {
    const tokens = lex('$ ls -la');
    expect(tokens[0]?.kind).toBe('command');
    expect(tokens[0]?.value).toBe('ls -la');
  });

  it('classifies output lines (> and >>)', () => {
    const tokens = lex('> hello world\n>> fixtures/out.txt');
    expect(tokens[0]?.kind).toBe('output');
    expect(tokens[0]?.value).toBe('hello world');
    expect(tokens[1]?.kind).toBe('file-output');
    expect(tokens[1]?.value).toBe('fixtures/out.txt');
  });

  it('classifies all directive types', () => {
    const lines = [
      'type: some text',
      'hidden: secret',
      'print: banner',
      'wait: 2s',
      'clear',
      'marker: Step 1',
      'resize: 80x24',
      'set typing-speed: fast',
      'include: other.castscript',
      'raw: \\x1b[1mBold\\x1b[0m',
      '[my-block]',
    ];
    const tokens = lex(lines.join('\n'));
    expect(tokens[0]?.kind).toBe('type');
    expect(tokens[1]?.kind).toBe('hidden');
    expect(tokens[2]?.kind).toBe('print');
    expect(tokens[3]?.kind).toBe('wait');
    expect(tokens[4]?.kind).toBe('clear');
    expect(tokens[5]?.kind).toBe('marker');
    expect(tokens[6]?.kind).toBe('resize');
    expect(tokens[7]?.kind).toBe('set');
    expect(tokens[8]?.kind).toBe('include');
    expect(tokens[9]?.kind).toBe('raw');
    expect(tokens[10]?.kind).toBe('block-label');
    expect(tokens[10]?.value).toBe('my-block');
  });

  it('records correct line numbers', () => {
    const tokens = lex('$ foo\n$ bar\n$ baz');
    expect(tokens[0]?.line).toBe(1);
    expect(tokens[1]?.line).toBe(2);
    expect(tokens[2]?.line).toBe(3);
  });
});
