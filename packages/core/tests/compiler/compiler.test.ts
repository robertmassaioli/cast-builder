import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compiler/compiler.js';
import { parse } from '../../src/parser/parser.js';
import { FileResolverErrorCode, CompileError } from '../../src/compiler/types.js';
import type { FileResolverResult } from '../../src/compiler/types.js';

async function compileScript(source: string) {
  const { config, nodes } = parse(source);
  config.typingSeed = 1; // deterministic
  return compile(config, nodes, { now: 0 });
}

describe('compiler — basic output', () => {
  it('produces a header with correct cols/rows', async () => {
    const { header } = await compileScript('--- config ---\nwidth: 80\nheight: 24\n--- script ---\n');
    expect(header.cols).toBe(80);
    expect(header.rows).toBe(24);
  });

  it('sets version 3 by default', async () => {
    const { header } = await compileScript('--- script ---\n');
    expect(header.version).toBe(3);
  });

  it('sets version 2 when output-format: v2', async () => {
    const { header } = await compileScript('--- config ---\noutput-format: v2\n--- script ---\n');
    expect(header.version).toBe(2);
  });

  it('includes title in header when set', async () => {
    const { header } = await compileScript('--- config ---\ntitle: My Demo\n--- script ---\n');
    expect(header.title).toBe('My Demo');
  });

  it('uses injectable now for timestamp', async () => {
    const { config, nodes } = parse('--- script ---\n');
    const { header } = await compile(config, nodes, { now: 12345 });
    expect(header.timestamp).toBe(12345);
  });
});

describe('compiler — events', () => {
  it('emits output events for a command', async () => {
    const { events } = await compileScript('--- config ---\ntyping-speed: instant\n--- script ---\n$ ls\n');
    const outputEvents = events.filter((e) => e.code === 'o');
    expect(outputEvents.length).toBeGreaterThan(2);
  });

  it('emits a marker event', async () => {
    const { events } = await compileScript('--- script ---\nmarker: Step 1\n');
    const markers = events.filter((e) => e.code === 'm');
    expect(markers).toHaveLength(1);
    expect(markers[0]?.data).toBe('Step 1');
  });

  it('emits a resize event', async () => {
    const { events } = await compileScript('--- script ---\nresize: 80x24\n');
    const resizes = events.filter((e) => e.code === 'r');
    expect(resizes).toHaveLength(1);
    expect(resizes[0]?.data).toBe('80x24');
  });

  it('emits a clear screen event', async () => {
    const { events } = await compileScript('--- script ---\nclear\n');
    const clears = events.filter((e) => e.code === 'o' && e.data.includes('\x1b[2J'));
    expect(clears.length).toBeGreaterThan(0);
  });

  it('hidden: emits only a CRLF (Enter) with no character echo', async () => {
    const { events } = await compileScript(
      '--- config ---\ntyping-speed: instant\n--- script ---\nhidden: secret\n',
    );
    const outputEvents = events.filter((e) => e.code === 'o' && e.data !== '\x1b[0m');
    expect(outputEvents).toHaveLength(1);
    expect(outputEvents[0]?.data).toBe('\r\n');
  });

  it('events have monotonically increasing times', async () => {
    const { events } = await compileScript(
      '--- config ---\ntyping-speed: normal\n--- script ---\n$ echo hello\n> hello\nwait: 1s\n$ echo world\n> world\n',
    );
    for (let i = 1; i < events.length; i++) {
      expect(events[i]?.time).toBeGreaterThanOrEqual(events[i - 1]?.time ?? 0);
    }
  });

  it('set prompt: changes prompt mid-script', async () => {
    const { events } = await compileScript(
      '--- config ---\ntyping-speed: instant\nprompt: A> \n--- script ---\n$ cmd1\nset prompt: B> \n$ cmd2\n',
    );
    const allOutput = events.filter((e) => e.code === 'o').map((e) => e.data).join('');
    expect(allOutput).toContain('A> ');
    expect(allOutput).toContain('B> ');
  });

  it('multiple markers appear in order', async () => {
    const { events } = await compileScript(
      '--- script ---\nmarker: Alpha\nmarker: Beta\nmarker: Gamma\n',
    );
    const markers = events.filter((e) => e.code === 'm');
    expect(markers.map((m) => m.data)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});

describe('compiler — FileResolver', () => {
  function makeResolver(files: Record<string, string>) {
    return (path: string): FileResolverResult => {
      const content = files[path];
      if (content === undefined) {
        return { ok: false, code: FileResolverErrorCode.NotFound,
                 message: `Not found: ${path}`, path };
      }
      return { ok: true, content };
    };
  }

  it('file-output uses the resolver', async () => {
    const resolver = makeResolver({ 'out.txt': 'line1\nline2\n' });
    const { config, nodes } = parse('--- script ---\n>> out.txt\n');
    const { events } = await compile(config, nodes, { resolver, now: 0 });
    const output = events.filter((e) => e.code === 'o').map((e) => e.data).join('');
    expect(output).toContain('line1');
    expect(output).toContain('line2');
  });

  it('include uses the resolver', async () => {
    const resolver = makeResolver({
      'other.castscript': '--- script ---\n$ echo included\n',
    });
    const { config, nodes } = parse('--- script ---\ninclude: other.castscript\n');
    const { events } = await compile(config, nodes, { resolver, now: 0, });
    const output = events.filter((e) => e.code === 'o').map((e) => e.data).join('');
    expect(output).toContain('echo included');
  });

  it('include with block name extracts only that block', async () => {
    const resolver = makeResolver({
      'blocks.castscript': '--- script ---\n[a]\n$ echo A\n[b]\n$ echo B\n',
    });
    const { config, nodes } = parse('--- script ---\ninclude: blocks.castscript#a\n');
    const { events } = await compile(config, nodes, { resolver, now: 0 });
    const output = events.filter((e) => e.code === 'o').map((e) => e.data).join('');
    expect(output).toContain('echo A');
    expect(output).not.toContain('echo B');
  });

  it('throws CompileError when file not found (onResolveError: error)', async () => {
    const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
    await expect(compile(config, nodes, { now: 0 })).rejects.toMatchObject({
      name: 'CompileError',
      code: 'FILE_RESOLVER_ERROR',
    });
  });

  it('skips directive when onResolveError: skip', async () => {
    const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
    const { events } = await compile(config, nodes, { onResolveError: 'skip', now: 0 });
    const outputEvents = events.filter((e) => e.code === 'o' && e.data !== '\x1b[0m');
    expect(outputEvents).toHaveLength(0);
  });

  it('emits warning event when onResolveError: warn', async () => {
    const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
    const { events } = await compile(config, nodes, { onResolveError: 'warn', now: 0 });
    const output = events.filter((e) => e.code === 'o').map((e) => e.data).join('');
    expect(output).toContain('[warning:');
    expect(output).toContain('missing.txt');
  });

  it('CompileError carries FileResolverError as cause', async () => {
    const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
    let caught: unknown;
    try {
      await compile(config, nodes, { now: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(CompileError);
    const err = caught as CompileError;
    expect(err.cause?.code).toBe(FileResolverErrorCode.AccessDenied);
    expect(err.cause?.path).toBe('missing.txt');
  });
});
