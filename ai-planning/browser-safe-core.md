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

## 1. Current FS Touch Points

There are exactly **two places** in `@cast-builder/core` that touch the filesystem,
both in `src/compiler/compiler.ts`:

| Directive | What it does today | Lines |
|---|---|---|
| `file-output` (`>> path`) | `readFileSync(resolve(sourceDir, path))` | 131–138 |
| `include` (`include: path`) | `readFileSync(resolve(sourceDir, path))` + re-parses + recurses | 151–162 |

There is also a default parameter `sourceDir: string = process.cwd()` in the
`compile()` signature, which references `process.cwd()` — a Node.js global that
does not exist in browsers.

No other file in `src/` touches `node:fs`, `node:path`, or `process`.

---

## 2. The Solution: A FileResolver Interface

Replace the two `readFileSync` calls with a **caller-supplied async resolver
function**. The core library becomes a pure transform: `source text → cast events`.
The host environment (CLI, browser, bundler plugin) supplies the I/O.

### 2.1 The interface

```typescript
// src/compiler/types.ts (addition)

/**
 * A function that resolves a file path to its string contents.
 * The core library calls this for `>>` (file-output) and `include:` directives.
 *
 * - In Node.js/CLI: implemented with `fs.readFileSync` or `fs.promises.readFile`
 * - In a browser: implemented with `fetch()`, an in-memory Map, or a virtual FS
 * - In tests: implemented with a simple `Map<string, string>`
 *
 * @param path  The raw path string from the directive (e.g. "fixtures/out.txt"
 *              or "common/login.castscript"). The resolver is responsible for
 *              interpreting this relative to whatever base makes sense in its
 *              environment.
 * @returns     The file contents as a string, or throws if not found.
 */
export type FileResolver = (path: string) => string | Promise<string>;

/**
 * A no-op resolver that throws for any file access.
 * Used as the default so that scripts without `>>` or `include:` work
 * in all environments with zero configuration.
 */
export const NULL_RESOLVER: FileResolver = (path: string) => {
  throw new Error(
    `File access required for "${path}" but no FileResolver was provided. ` +
    `Pass a resolver as the third argument to compile().`
  );
};
```

### 2.2 Updated `compile()` signature

```typescript
// Before (Node.js only)
export function compile(
  config: Config,
  nodes: ScriptNode[],
  sourceDir: string = process.cwd(),
): CompiledCast

// After (browser-safe, async)
export async function compile(
  config: Config,
  nodes: ScriptNode[],
  resolver?: FileResolver,
): Promise<CompiledCast>
```

The `resolver` parameter replaces `sourceDir`. Path interpretation is entirely
delegated to the resolver — the core library passes the raw path string from
the directive verbatim and awaits the result.

### 2.3 Updated internal usage

```typescript
// file-output
case 'file-output': {
  const fileContent = await resolver(node.path);
  const lines = fileContent.split('\n');
  // ... emit lines as events
  break;
}

// include
case 'include': {
  const includeSource = await resolver(node.path);
  const { nodes: includeNodes } = parse(includeSource);
  // ... compile included nodes recursively (passing same resolver)
  await compileNodes(nodesToCompile, events, engine, config, resolver, isFirstBlock);
  break;
}
```

---

## 3. FileResolver Implementations

### 3.1 Node.js synchronous (CLI, default)

```typescript
// packages/cli/src/resolvers/node.ts
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export function createNodeResolver(baseDir: string): FileResolver {
  return (path: string): string => {
    return readFileSync(resolve(baseDir, path), 'utf8');
  };
}
```

The CLI passes this to `compile()`:

```typescript
// packages/cli/src/commands/compile.ts
import { createNodeResolver } from '../resolvers/node.js';

const resolver = createNodeResolver(sourceDir);
const compiled = await compile(config, nodes, resolver);
```

### 3.2 Browser fetch-based

```typescript
// browser example (not shipped in core — implemented by the host app)
const resolver: FileResolver = async (path: string) => {
  const response = await fetch(`/castscripts/${path}`);
  if (!response.ok) throw new Error(`Could not fetch ${path}: ${response.status}`);
  return response.text();
};

const compiled = await compile(config, nodes, resolver);
```

### 3.3 In-memory (tests and browser editor)

```typescript
// Perfect for unit tests and browser editors with virtual filesystems
const files = new Map<string, string>([
  ['fixtures/output.txt', 'line one\nline two\n'],
  ['common/login.castscript', '[login]\n$ ssh user@host\n'],
]);

const resolver: FileResolver = (path: string) => {
  const content = files.get(path);
  if (!content) throw new Error(`File not found: ${path}`);
  return content;
};

const compiled = await compile(config, nodes, resolver);
```

### 3.4 Virtual FS (for bundler plugins / Vite)

```typescript
// Vite plugin example
const resolver: FileResolver = async (path: string) => {
  const id = await vite.pluginContainer.resolveId(path, importer);
  const result = await vite.pluginContainer.load(id?.id ?? path);
  return typeof result === 'string' ? result : result?.code ?? '';
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

All existing tests that call `compile()` directly need `await`:

```typescript
// Before
const { events } = compile(config, nodes);

// After
const { events } = await compile(config, nodes);
```

### 7.2 Add resolver tests

```typescript
it('file-output uses the resolver', async () => {
  const resolver = (path: string) => path === 'out.txt' ? 'line1\nline2\n' : '';
  const { nodes } = parse('--- script ---\n$ cat out.txt\n>> out.txt\n');
  const { config } = parse('--- script ---\n');
  const { events } = await compile(config, nodes, resolver);
  const outputEvents = events.filter(e => e.code === 'o');
  expect(outputEvents.some(e => e.data.includes('line1'))).toBe(true);
});

it('throws if file-output is used without a resolver', async () => {
  const { config, nodes } = parse('--- script ---\n>> out.txt\n');
  await expect(compile(config, nodes)).rejects.toThrow('FileResolver');
});

it('include uses the resolver', async () => {
  const resolver = (path: string) =>
    path === 'other.castscript' ? '--- script ---\n$ echo included\n' : '';
  const { config, nodes } = parse('--- script ---\ninclude: other.castscript\n');
  const { events } = await compile(config, nodes, resolver);
  const allOutput = events.filter(e => e.code === 'o').map(e => e.data).join('');
  expect(allOutput).toContain('echo included');
});
```

### 7.3 Browser smoke test (stretch goal)

A Playwright or Puppeteer test that loads a minimal HTML page bundled with
`@cast-builder/core` and verifies that `compile()` runs successfully in Chrome
and Firefox with an in-memory resolver.

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

## 9. Summary

| Dimension | Before | After |
|---|---|---|
| `compile()` signature | `(config, nodes, sourceDir?)` | `(config, nodes, resolver?)` |
| `compile()` return type | `CompiledCast` | `Promise<CompiledCast>` |
| Node.js built-in imports in core | `node:fs`, `node:path` | **none** |
| Browser-safe | ❌ | ✅ |
| Deno/Bun/Workers compatible | Partial | ✅ |
| Scripts without `>>` / `include:` | Works everywhere | Works everywhere (no resolver needed) |
| Breaking change | — | Yes — `compile()` is now async |
