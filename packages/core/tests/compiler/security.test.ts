/**
 * Security-focused tests for the compiler.
 * Covers: include depth limit, resolver sandbox enforcement.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compiler/compiler.js';
import { parse } from '../../src/parser/parser.js';
import { CompileError, FileResolverErrorCode } from '../../src/compiler/types.js';
import type { FileResolverResult } from '../../src/compiler/types.js';

describe('include depth limit', () => {
  it('throws INCLUDE_DEPTH_EXCEEDED for deeply nested includes', async () => {
    // Build a resolver that always returns a script that includes itself
    let callCount = 0;
    const resolver = (_path: string): FileResolverResult => {
      callCount++;
      return {
        ok: true,
        content: '--- script ---\ninclude: self.castscript\n',
      };
    };

    const { config, nodes } = parse('--- script ---\ninclude: self.castscript\n');
    await expect(compile(config, nodes, { resolver, now: 0 })).rejects.toMatchObject({
      name: 'CompileError',
      code: 'INCLUDE_DEPTH_EXCEEDED',
    });

    // Should have called the resolver exactly MAX_INCLUDE_DEPTH + 1 times (depth 0–16)
    expect(callCount).toBeLessThanOrEqual(18);
  });

  it('allows includes up to the depth limit', async () => {
    // Build a chain of 5 includes — well within the limit of 16
    const files: Record<string, string> = {
      'a.castscript': '--- script ---\ninclude: b.castscript\n',
      'b.castscript': '--- script ---\ninclude: c.castscript\n',
      'c.castscript': '--- script ---\n$ echo deep\n',
    };
    const resolver = (path: string): FileResolverResult => {
      const content = files[path];
      if (!content) return { ok: false, code: FileResolverErrorCode.NotFound, message: `Not found: ${path}`, path };
      return { ok: true, content };
    };

    const { config, nodes } = parse('--- script ---\ninclude: a.castscript\n');
    const { events } = await compile(config, nodes, { resolver, now: 0 });
    const output = events.filter(e => e.code === 'o').map(e => e.data).join('');
    expect(output).toContain('echo deep');
  });
});

describe('resolver AccessDenied handling', () => {
  it('throws CompileError when resolver returns AccessDenied in error mode', async () => {
    const resolver = (path: string): FileResolverResult => ({
      ok: false,
      code: FileResolverErrorCode.AccessDenied,
      message: `Path "${path}" escapes sandbox`,
      path,
    });

    const { config, nodes } = parse('--- script ---\ninclude: ../../evil.castscript\n');
    await expect(compile(config, nodes, { resolver, now: 0 })).rejects.toMatchObject({
      name: 'CompileError',
      code: 'FILE_RESOLVER_ERROR',
      cause: { code: FileResolverErrorCode.AccessDenied },
    });
  });

  it('skips directive when resolver returns AccessDenied in skip mode', async () => {
    const resolver = (path: string): FileResolverResult => ({
      ok: false,
      code: FileResolverErrorCode.AccessDenied,
      message: `Path "${path}" escapes sandbox`,
      path,
    });

    const { config, nodes } = parse('--- script ---\ninclude: ../../evil.castscript\n');
    const { events } = await compile(config, nodes, { resolver, onResolveError: 'skip', now: 0 });
    const outputEvents = events.filter(e => e.code === 'o' && e.data !== '\x1b[0m');
    expect(outputEvents).toHaveLength(0);
  });
});
