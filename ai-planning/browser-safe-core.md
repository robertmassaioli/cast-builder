# Proposal: Make `@cast-builder/core` Browser-Safe (No FS Operations)

## Overview

The goal is for `@cast-builder/core` to run **entirely in a web browser** — no
`node:fs`, no `node:path`, no `process.cwd()`. This enables use cases like:

- A live in-browser `.castscript` editor/previewer (e.g. a CodeMirror or Monaco
  editor that compiles and plays the cast in real time)
- A static site plugin (Astro, Next.js, Docusaurus) that compiles casts at
  build time in a browser-compatible worker
- A Deno/Bun/Cloudflare Workers deployment with no Node.js APIs
- A VS Code extension web worker (which runs in a browser context)

---

## 1. Full Audit of Environmental Assumptions

A complete scan of `@cast-builder/core/src/` reveals **four** touch points that
are either non-browser-safe or reduce determinism/testability:

| Location | API used | Browser-safe? | Issue |
|---|---|---|---|
| `compiler/compiler.ts:7-8` | `import { readFileSync } from 'node:fs'` | ❌ | Node.js only |
| `compiler/compiler.ts:8` | `import { dirname, resolve } from 'node:path'` | ❌ | Node.js only |
| `compiler/compiler.ts:20` | `sourceDir: string = process.cwd()` | ❌ | `process` does not exist in browsers |
| `compiler/compiler.ts:247` | `Math.floor(Date.now() / 1000)` | ✅ | Browser-safe, but not injectable for testing |
| `compiler/timing.ts:17` | `Math.floor(Math.random() * 0xffffffff)` | ✅ | Browser-safe, but makes timing non-deterministic without a seed |

### Summary

- **`node:fs` + `node:path` + `process.cwd()`** — genuinely block browser use.
  Must be removed from core.
- **`Date.now()`** — works in browsers, but callers cannot control the recorded
  timestamp (e.g. for reproducible output or zero-ing out timestamps before sharing).
  Should be injectable via `CompileOptions`.
- **`Math.random()`** — works in browsers, but already has a `typingSeed` escape
  hatch via `Config`. The default unseeded path is fine; no change needed.

No other file in `src/` imports any Node.js built-ins.

---

## 2. The Solution: FileResolver, CompileOptions, and a Typed Error Model

### 2.1 FileResolver — typed result, not throw-on-error

Rather than having the resolver throw an exception on failure (which forces
callers to catch untyped errors), it returns a **discriminated union**. This
makes error handling explicit at the type level and allows the compiler to
include rich context (which directive triggered the read, what the path was)
in error events rather than crashing the whole compilation.

```typescript
// src/compiler/types.ts (addition)

// ── File resolver result ───────────────────────────────────────────────────

/**
 * Structured error codes for file resolution failures.
 * Using an enum (not a string) so callers can switch on the code exhaustively.
 */
export enum FileResolverErrorCode {
  /** The file does not exist at the given path. */
  NotFound = 'NOT_FOUND',
  /** The file exists but cannot be read (permissions, I/O error, etc.). */
  ReadError = 'READ_ERROR',
  /** The path is outside the permitted root / sandbox. */
  AccessDenied = 'ACCESS_DENIED',
  /** The resolver does not support this type of path (e.g. absolute path in browser). */
  UnsupportedPath = 'UNSUPPORTED_PATH',
}

export interface FileResolverError {
  readonly ok: false;
  readonly code: FileResolverErrorCode;
  /** Human-readable description of what went wrong. */
  readonly message: string;
  /** The original path that was requested. */
  readonly path: string;
}

export interface FileResolverSuccess {
  readonly ok: true;
  /** The file contents as a UTF-8 string. */
  readonly content: string;
}

export type FileResolverResult = FileResolverSuccess | FileResolverError;

/**
 * A function that resolves a file path to its contents.
 * Called by the compiler for `>>` (file-output) and `include:` directives.
 *
 * Returns a discriminated union — never throws. The compiler decides how to
 * handle errors (emit a warning event, skip the directive, or abort).
 *
 * @param path  The raw path string from the directive, verbatim.
 *              The resolver is responsible for interpreting it relative to
 *              whatever base makes sense in its environment.
 */
export type FileResolver = (path: string) => FileResolverResult | Promise<FileResolverResult>;

/**
 * A no-op resolver that returns ACCESS_DENIED for any path.
 * The default when no resolver is provided — safe in all environments.
 * Scripts with no `>>` or `include:` directives never invoke it.
 */
export const NULL_RESOLVER: FileResolver = (path: string): FileResolverError => ({
  ok: false,
  code: FileResolverErrorCode.AccessDenied,
  message: `File access is not available. Pass a FileResolver to compile() to enable ">>" and "include:" directives.`,
  path,
});

// ── Compiler options ───────────────────────────────────────────────────────

/**
 * Options passed to compile() to inject environmental dependencies.
 * All fields are optional — sensible defaults apply in every environment.
 */
export interface CompileOptions {
  /**
   * Resolver for file paths referenced by `>>` and `include:` directives.
   * Defaults to NULL_RESOLVER (file access disabled).
   */
  resolver?: FileResolver;

  /**
   * Override the Unix timestamp (seconds) stored in the cast header.
   * Useful for:
   *   - Reproducible/deterministic output (pass a fixed value)
   *   - Stripping recording date before sharing (pass 0)
   *   - Testing (pass a known value to assert on the header)
   *
   * Defaults to Math.floor(Date.now() / 1000) — current wall-clock time.
   */
  now?: number;

  /**
   * How to handle a FileResolverError when `>>` or `include:` fails.
   *
   * - 'error' (default): abort compilation and throw a CompileError
   * - 'warn':  emit a comment-like output event with the error message and continue
   * - 'skip':  silently skip the directive and continue
   */
  onResolveError?: 'error' | 'warn' | 'skip';
}
```

### 2.2 CompileError — structured compilation errors

```typescript
// src/compiler/types.ts (addition)

/**
 * Thrown by compile() when a fatal error occurs (e.g. file not found in 'error' mode,
 * or a resize with invalid dimensions).
 */
export class CompileError extends Error {
  constructor(
    /** Machine-readable code for programmatic handling. */
    public readonly code: 'FILE_RESOLVER_ERROR' | 'INVALID_DIRECTIVE' | 'INCLUDE_DEPTH_EXCEEDED',
    message: string,
    /** The underlying FileResolverError, if applicable. */
    public readonly cause?: FileResolverError,
  ) {
    super(message);
    this.name = 'CompileError';
  }
}
```

### 2.3 Updated `compile()` signature

```typescript
// Before (Node.js only, synchronous)
export function compile(
  config: Config,
  nodes: ScriptNode[],
  sourceDir: string = process.cwd(),
): CompiledCast

// After (browser-safe, async, options object)
export async function compile(
  config: Config,
  nodes: ScriptNode[],
  options?: CompileOptions,
): Promise<CompiledCast>
```

Using an **options object** (rather than positional arguments) makes it easy to
add future options without breaking callers again.

### 2.4 Updated internal usage

```typescript
// Inside compileNodes():

case 'file-output': {
  const result = await options.resolver(node.path);
  if (!result.ok) {
    switch (options.onResolveError) {
      case 'skip': continue;
      case 'warn':
        events.push({ time: engine.seconds, code: 'o',
          data: `[warning: could not read "${node.path}": ${result.message}]\r\n` });
        continue;
      default: // 'error'
        throw new CompileError('FILE_RESOLVER_ERROR',
          `file-output: ${result.message} (code: ${result.code})`, result);
    }
  }
  const lines = result.content.split('\n');
  // ... emit lines
  break;
}

case 'include': {
  const result = await options.resolver(node.path);
  if (!result.ok) {
    // same error handling as above
  }
  const { nodes: includeNodes } = parse(result.content);
  // ... compile recursively
  break;
}
```

### 2.5 Injectable `now` for deterministic headers

```typescript
// Inside buildHeader():
function buildHeader(config: Config, options: CompileOptions): CastHeader {
  return {
    version: config.outputFormat === 'v2' ? 2 : 3,
    cols: config.width,
    rows: config.height,
    // Caller-injectable — defaults to current time
    timestamp: options.now ?? Math.floor(Date.now() / 1000),
    ...(config.title ? { title: config.title } : {}),
    ...(Object.keys(config.env).length > 0 ? { env: config.env } : {}),
  };
}
```

---

## 3. FileResolver Implementations

### 3.1 Node.js (CLI)

```typescript
// packages/cli/src/resolvers/node.ts
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FileResolverErrorCode,
  type FileResolverResult,
} from '@cast-builder/core';

export function createNodeResolver(baseDir: string) {
  return (path: string): FileResolverResult => {
    const fullPath = resolve(baseDir, path);
    if (!existsSync(fullPath)) {
      return { ok: false, code: FileResolverErrorCode.NotFound,
               message: `File not found: ${fullPath}`, path };
    }
    try {
      const content = readFileSync(fullPath, 'utf8');
      return { ok: true, content };
    } catch (err) {
      return { ok: false, code: FileResolverErrorCode.ReadError,
               message: `Could not read "${fullPath}": ${String(err)}`, path };
    }
  };
}
```

The CLI passes this via `CompileOptions`:

```typescript
// packages/cli/src/commands/compile.ts
import { createNodeResolver } from '../resolvers/node.js';

const compiled = await compile(config, nodes, {
  resolver: createNodeResolver(sourceDir),
  now: opts.timestamp ? parseInt(opts.timestamp, 10) : undefined,
  onResolveError: 'error',
});
```

### 3.2 Browser — fetch-based

```typescript
// Browser host app (not shipped in core)
import { FileResolverErrorCode, type FileResolverResult } from '@cast-builder/core';

const resolver = async (path: string): Promise<FileResolverResult> => {
  try {
    const response = await fetch(`/castscripts/${path}`);
    if (response.status === 404) {
      return { ok: false, code: FileResolverErrorCode.NotFound,
               message: `Not found: /castscripts/${path}`, path };
    }
    if (!response.ok) {
      return { ok: false, code: FileResolverErrorCode.ReadError,
               message: `HTTP ${response.status} fetching "${path}"`, path };
    }
    return { ok: true, content: await response.text() };
  } catch (err) {
    return { ok: false, code: FileResolverErrorCode.ReadError,
             message: String(err), path };
  }
};

const compiled = await compile(config, nodes, { resolver });
```

### 3.3 In-memory (tests and browser editor)

```typescript
// Perfect for unit tests and browser editors with virtual filesystems
import { FileResolverErrorCode, type FileResolverResult } from '@cast-builder/core';

function createMemoryResolver(files: Map<string, string>) {
  return (path: string): FileResolverResult => {
    const content = files.get(path);
    if (content === undefined) {
      return { ok: false, code: FileResolverErrorCode.NotFound,
               message: `File not found in memory: "${path}"`, path };
    }
    return { ok: true, content };
  };
}

// Usage in tests:
const resolver = createMemoryResolver(new Map([
  ['fixtures/output.txt', 'line one\nline two\n'],
  ['common/login.castscript', '[login]\n$ ssh user@host\n'],
]));

const compiled = await compile(config, nodes, { resolver, now: 0 });
```

### 3.4 Sandboxed resolver — path traversal protection

A resolver can enforce a sandbox to prevent `include: ../../../etc/passwd`:

```typescript
import { resolve, relative } from 'node:path';
import { FileResolverErrorCode, type FileResolverResult } from '@cast-builder/core';

function createSandboxedResolver(root: string) {
  return (path: string): FileResolverResult => {
    const fullPath = resolve(root, path);
    // Reject any path that escapes the root
    if (relative(root, fullPath).startsWith('..')) {
      return { ok: false, code: FileResolverErrorCode.AccessDenied,
               message: `Path "${path}" escapes the sandbox root`, path };
    }
    // ... proceed with read
  };
}
```

### 3.5 Virtual FS (bundler plugins / Vite)

```typescript
// Vite plugin example
const resolver = async (path: string): Promise<FileResolverResult> => {
  try {
    const id = await vite.pluginContainer.resolveId(path, importer);
    const result = await vite.pluginContainer.load(id?.id ?? path);
    const content = typeof result === 'string' ? result : (result?.code ?? '');
    return { ok: true, content };
  } catch (err) {
    return { ok: false, code: FileResolverErrorCode.ReadError,
             message: String(err), path };
  }
};
```

---

## 4. Impact on the Public API

### 4.1 `compile()` becomes async

This is the only **breaking change**. All callers must `await compile(...)`.

```typescript
// Before
const compiled = compile(config, nodes, sourceDir);

// After
const compiled = await compile(config, nodes, resolver);
```

The CLI already runs in an async context (commander action handlers can be
`async`). Tests using `compile()` need to be updated to `await`.

### 4.2 `parse()` stays synchronous

`parse()` never touches the filesystem — it is already browser-safe. No change.

### 4.3 `encodeV2()` / `encodeV3()` stay synchronous

Encoders are pure functions. No change.

### 4.4 Scripts with no `>>` or `include:` directives

If the script has no `file-output` or `include` nodes, the resolver is **never
called**. These scripts compile identically in all environments, including
browsers, with no resolver needed:

```typescript
// Resolver is optional — fine for simple scripts
const compiled = await compile(config, nodes);
```

---

## 5. Removing `node:fs` and `node:path` from Core Entirely

After the resolver refactor, `compiler.ts` no longer imports from `node:fs`
or `node:path`. The only remaining step is to verify no other core file imports
Node.js built-ins:

| File | Current imports | After refactor |
|---|---|---|
| `compiler/compiler.ts` | `node:fs`, `node:path` | ✅ removed |
| `parser/parser.ts` | none | ✅ already clean |
| `parser/lexer.ts` | none | ✅ already clean |
| `parser/types.ts` | none | ✅ already clean |
| `compiler/types.ts` | none | ✅ already clean |
| `compiler/timing.ts` | none | ✅ already clean |
| `encoder/v2.ts` | none | ✅ already clean |
| `encoder/v3.ts` | none | ✅ already clean |
| `util/ansi.ts` | none | ✅ already clean |
| `util/duration.ts` | none | ✅ already clean |
| `util/rng.ts` | none | ✅ already clean |
| `util/terminal.ts` | none | ✅ already clean |

After removing the two imports in `compiler.ts`, the entire `@cast-builder/core`
package contains **zero Node.js built-in imports**.

---

## 6. Package.json Changes

To signal browser compatibility, add a `browser` entry and update `exports`:

```json
// packages/core/package.json
{
  "exports": {
    ".": {
      "browser": "./dist/index.js",
      "import":  "./dist/index.js",
      "types":   "./dist/index.d.ts"
    }
  },
  "browser": "./dist/index.js"
}
```

This tells bundlers (webpack, Vite, Rollup) that the package is safe to include
in a browser bundle without any Node.js polyfills.

---

## 7. Testing Strategy

### 7.1 Update existing tests

All existing tests that call `compile()` directly need `await` and use the
options object. Use the in-memory resolver and injectable `now` for determinism:

```typescript
// Before
const compiled = compile(config, nodes);

// After
const compiled = await compile(config, nodes, { now: 0 });
```

The `now: 0` makes the header `timestamp` deterministic in all tests —
no more stripping timestamps in golden tests.

### 7.2 Add resolver tests

```typescript
import { FileResolverErrorCode, CompileError } from '@cast-builder/core';

it('file-output uses the resolver', async () => {
  const resolver = (path: string) =>
    path === 'out.txt'
      ? { ok: true as const, content: 'line1\nline2\n' }
      : { ok: false as const, code: FileResolverErrorCode.NotFound,
          message: `not found: ${path}`, path };

  const { config, nodes } = parse('--- script ---\n$ cat out.txt\n>> out.txt\n');
  const { events } = await compile(config, nodes, { resolver, now: 0 });
  const output = events.filter(e => e.code === 'o').map(e => e.data).join('');
  expect(output).toContain('line1');
  expect(output).toContain('line2');
});

it('throws CompileError (FILE_RESOLVER_ERROR) when file-output fails in error mode', async () => {
  const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
  await expect(compile(config, nodes)).rejects.toMatchObject({
    name: 'CompileError',
    code: 'FILE_RESOLVER_ERROR',
    cause: { code: FileResolverErrorCode.AccessDenied },
  });
});

it('skips file-output when onResolveError is skip', async () => {
  const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
  const { events } = await compile(config, nodes, { onResolveError: 'skip', now: 0 });
  // No output events except the trailing RESET
  const outputEvents = events.filter(e => e.code === 'o' && e.data !== '\x1b[0m');
  expect(outputEvents).toHaveLength(0);
});

it('emits warning event when onResolveError is warn', async () => {
  const { config, nodes } = parse('--- script ---\n>> missing.txt\n');
  const { events } = await compile(config, nodes, { onResolveError: 'warn', now: 0 });
  const output = events.filter(e => e.code === 'o').map(e => e.data).join('');
  expect(output).toContain('[warning:');
});

it('include uses the resolver', async () => {
  const resolver = (path: string) =>
    path === 'other.castscript'
      ? { ok: true as const, content: '--- script ---\n$ echo included\n' }
      : { ok: false as const, code: FileResolverErrorCode.NotFound,
          message: `not found: ${path}`, path };

  const { config, nodes } = parse('--- script ---\ninclude: other.castscript\n');
  const { events } = await compile(config, nodes, { resolver, now: 0 });
  const output = events.filter(e => e.code === 'o').map(e => e.data).join('');
  expect(output).toContain('echo included');
});

it('now option controls the header timestamp', async () => {
  const { config, nodes } = parse('--- script ---\n');
  const cast = await compile(config, nodes, { now: 12345 });
  expect(cast.header.timestamp).toBe(12345);
});
```

### 7.3 Golden tests — simplified by injectable `now`

Golden tests no longer need `stripTimestamp()` since `now: 0` can be passed
to make the timestamp deterministic. Update golden test helpers:

```typescript
function compileExample(name: string): Promise<string> {
  const src = readFileSync(`examples/${name}.castscript`, 'utf8');
  const { config, nodes } = parse(src);
  config.typingSeed = 42;
  return compile(config, nodes, {
    resolver: createNodeResolver(`examples/`),
    now: 0,  // deterministic timestamp
  }).then(encodeV3);
}
```

### 7.4 Browser smoke test (stretch goal)

A Playwright test that bundles `@cast-builder/core` into a minimal HTML page
and verifies `compile()` runs in Chrome and Firefox with an in-memory resolver.

---

## 8. Migration Steps

1. Add `FileResolver` and `NULL_RESOLVER` to `src/compiler/types.ts`
2. Update `compile()` signature: `sourceDir: string` → `resolver?: FileResolver`
3. Update `compileNodes()` to accept and thread `resolver` instead of `sourceDir`
4. Replace `readFileSync` calls with `await resolver(path)`
5. Remove `import { readFileSync } from 'node:fs'` and `import { ... } from 'node:path'`
6. Remove `import { ... } from 'node:path'` (no longer needed)
7. Update `packages/cli/src/commands/compile.ts` to use `createNodeResolver`
8. Update `packages/cli/src/commands/preview.ts` similarly
9. Add `createNodeResolver` to `packages/cli/src/resolvers/node.ts`
10. Update all tests: `compile(...)` → `await compile(...)`
11. Add new resolver tests (§7.2)
12. Add `"browser"` field to `packages/core/package.json`
13. Verify `tsc --noEmit` clean in both packages
14. Verify `npm test --workspaces` all pass

Estimated effort: **1–2 hours** — mostly mechanical `await` additions and moving
`readFileSync` out of core into the CLI resolver.

---

## 8. Migration Steps

1. Add `FileResolverErrorCode`, `FileResolverError`, `FileResolverSuccess`,
   `FileResolverResult`, `FileResolver`, `CompileOptions`, `CompileError`
   to `src/compiler/types.ts`
2. Update `compile()` signature: `(config, nodes, sourceDir?)` →
   `async (config, nodes, options?)`
3. Update `compileNodes()` to accept and thread `options: CompileOptions`
   instead of `sourceDir: string`
4. Replace `readFileSync` calls with `await options.resolver(path)` +
   discriminated union error handling
5. Replace `dirname` / `resolve` (path manipulation) — removed entirely from core;
   path resolution is now the resolver's responsibility
6. Remove `import { readFileSync } from 'node:fs'`
7. Remove `import { dirname, resolve } from 'node:path'`
8. Remove `process.cwd()` default parameter
9. Update `buildHeader()` to use `options.now ?? Math.floor(Date.now() / 1000)`
10. Add `createNodeResolver` to `packages/cli/src/resolvers/node.ts`
11. Update all CLI commands to pass `CompileOptions` with `createNodeResolver`
12. Update all tests: `compile(config, nodes)` → `await compile(config, nodes, { now: 0 })`
13. Add new resolver + error handling tests (§7.2)
14. Update golden tests to use `now: 0` instead of `stripTimestamp()` hack
15. Regenerate golden fixtures with `now: 0`
16. Add `"browser": "./dist/index.js"` to `packages/core/package.json`
17. Verify `tsc --noEmit` clean in both packages
18. Verify `npm test --workspaces` all pass

Estimated effort: **2–3 hours** — mostly mechanical `await` additions, options
object threading, and moving `readFileSync` out of core into the CLI resolver.

---

## 9. Summary

| Dimension | Before | After |
|---|---|---|
| `compile()` signature | `(config, nodes, sourceDir?)` | `async (config, nodes, options?)` |
| `compile()` return type | `CompiledCast` | `Promise<CompiledCast>` |
| File error handling | Throws untyped exception | Returns `FileResolverResult` discriminated union |
| Error codes | None | `FileResolverErrorCode` enum (NotFound, ReadError, AccessDenied, UnsupportedPath) |
| Resolve error behaviour | Always throws | Configurable: `'error'` \| `'warn'` \| `'skip'` |
| Header timestamp | Always `Date.now()` | Injectable via `options.now` |
| Path traversal protection | None | Resolver's responsibility; `AccessDenied` code available |
| Node.js built-in imports in core | `node:fs`, `node:path` | **none** |
| Browser-safe | ❌ | ✅ |
| Deno / Bun / Cloudflare Workers | Partial | ✅ |
| Scripts without `>>` / `include:` | Works everywhere | Works everywhere (resolver never called) |
| Golden test timestamp stripping | `stripTimestamp()` regex hack | Pass `now: 0` — no hack needed |
| Breaking change | — | Yes — `compile()` is now `async` and takes options object |
