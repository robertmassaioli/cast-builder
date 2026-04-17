import { describe, it, expect } from 'vitest';
import { parse, parseStyledText } from '../../src/parser/parser.js';

describe('parser — config section', () => {
  it('parses default config when no config section present', () => {
    const { config } = parse('--- script ---\n');
    expect(config.width).toBe(120);
    expect(config.height).toBe(30);
    expect(config.outputFormat).toBe('v3');
    expect(config.typingSpeed).toBe('normal');
  });

  it('parses all config keys', () => {
    const src = `--- config ---
title:        My Demo
width:        80
height:       24
shell:        zsh
prompt:       $ 
theme:        dracula
typing-speed: fast
typing-seed:  42
idle-time:    0.5
output-format: v2
env:          SHELL=/bin/zsh
--- script ---
`;
    const { config } = parse(src);
    expect(config.title).toBe('My Demo');
    expect(config.width).toBe(80);
    expect(config.height).toBe(24);
    expect(config.shell).toBe('zsh');
    expect(config.theme).toBe('dracula');
    expect(config.typingSpeed).toBe('fast');
    expect(config.typingSeed).toBe(42);
    expect(config.idleTime).toBe(0.5);
    expect(config.outputFormat).toBe('v2');
    expect(config.env['SHELL']).toBe('/bin/zsh');
  });
});

describe('parser — script nodes', () => {
  it('parses a simple command', () => {
    const { nodes } = parse('--- script ---\n$ ls -la\n');
    expect(nodes[0]).toEqual({ kind: 'command', text: 'ls -la' });
  });

  it('parses output lines', () => {
    const { nodes } = parse('--- script ---\n> hello world\n');
    expect(nodes[0]?.kind).toBe('output');
  });

  it('parses wait with seconds', () => {
    const { nodes } = parse('--- script ---\nwait: 2s\n');
    expect(nodes[0]).toEqual({ kind: 'wait', ms: 2000 });
  });

  it('parses wait with milliseconds', () => {
    const { nodes } = parse('--- script ---\nwait: 500ms\n');
    expect(nodes[0]).toEqual({ kind: 'wait', ms: 500 });
  });

  it('parses clear', () => {
    const { nodes } = parse('--- script ---\nclear\n');
    expect(nodes[0]).toEqual({ kind: 'clear' });
  });

  it('parses marker', () => {
    const { nodes } = parse('--- script ---\nmarker: Step 1\n');
    expect(nodes[0]).toEqual({ kind: 'marker', label: 'Step 1' });
  });

  it('parses resize', () => {
    const { nodes } = parse('--- script ---\nresize: 80x24\n');
    expect(nodes[0]).toEqual({ kind: 'resize', cols: 80, rows: 24 });
  });

  it('parses block labels', () => {
    const { nodes } = parse('--- script ---\n[my-block]\n');
    expect(nodes[0]).toEqual({ kind: 'block-label', name: 'my-block' });
  });

  it('parses include with block', () => {
    const { nodes } = parse('--- script ---\ninclude: other.castscript#install\n');
    expect(nodes[0]).toEqual({ kind: 'include', path: 'other.castscript', block: 'install' });
  });

  it('skips comments', () => {
    const { nodes } = parse('--- script ---\n# this is a comment\n$ ls\n');
    const nonComment = nodes.filter((n) => n.kind !== 'comment');
    expect(nonComment[0]).toEqual({ kind: 'command', text: 'ls' });
  });
});

describe('parseStyledText', () => {
  it('parses plain text', () => {
    const result = parseStyledText('hello world');
    expect(result).toEqual([{ kind: 'plain', text: 'hello world' }]);
  });

  it('parses a single style tag', () => {
    const result = parseStyledText('{green: success}');
    expect(result).toEqual([
      {
        kind: 'styled',
        modifiers: ['green'],
        content: [{ kind: 'plain', text: 'success' }],
      },
    ]);
  });

  it('parses mixed plain and styled text', () => {
    const result = parseStyledText('Status: {bold green: OK}!');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ kind: 'plain', text: 'Status: ' });
    expect(result[1]?.kind).toBe('styled');
    expect(result[2]).toEqual({ kind: 'plain', text: '!' });
  });

  it('parses multiple modifiers', () => {
    const result = parseStyledText('{bold green: text}');
    const span = result[0];
    expect(span?.kind).toBe('styled');
    if (span?.kind === 'styled') {
      expect(span.modifiers).toEqual(['bold', 'green']);
    }
  });
});
