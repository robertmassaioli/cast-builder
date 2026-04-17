# @cast-builder/core

Core library for parsing and compiling `.castscript` files into [asciinema](https://asciinema.org) `.cast` recordings.

Zero runtime dependencies. Browser-safe — no Node.js built-ins. Runs in Node.js, Deno, Bun, Cloudflare Workers, and web browsers.

## Install

```bash
npm install @cast-builder/core
```

## Usage

```typescript
import { parse, compile, encodeV3 } from '@cast-builder/core';
import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile('demo.castscript', 'utf8');

// Parse the .castscript source
const { config, nodes } = parse(source);

// Optional: fix the RNG seed for reproducible timing
config.typingSeed = 42;

// Compile to a cast event stream (async — resolver may be async)
const cast = await compile(config, nodes, {
  // Supply a FileResolver for ">>" and "include:" directives.
  // Without one, scripts that use those directives will throw CompileError.
  resolver: (path) => fetch(`/castscripts/${path}`).then((r) => {
    if (!r.ok) return { ok: false as const, code: FileResolverErrorCode.NotFound,
                        message: `HTTP ${r.status}`, path };
    return r.text().then((content) => ({ ok: true as const, content }));
  }),
  now: Date.now() / 1000 | 0,  // Unix timestamp for the cast header (optional)
});

// Encode as asciicast v3 NDJSON
const output = encodeV3(cast);

await writeFile('demo.cast', output);
```

### Node.js example (with filesystem access)

```typescript
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse, compile, encodeV3, FileResolverErrorCode } from '@cast-builder/core';
import type { FileResolverResult } from '@cast-builder/core';

const scriptPath = 'demo.castscript';
const scriptDir = dirname(resolve(scriptPath));
const source = readFileSync(scriptPath, 'utf8');
const { config, nodes } = parse(source);

// Build a Node.js filesystem resolver
const resolver = (path: string): FileResolverResult => {
  try {
    return { ok: true, content: readFileSync(resolve(scriptDir, path), 'utf8') };
  } catch {
    return { ok: false, code: FileResolverErrorCode.NotFound,
             message: `File not found: ${path}`, path };
  }
};

const cast = await compile(config, nodes, { resolver, now: 0 });
const output = encodeV3(cast);
```

## API

### `parse(source: string): ParseResult`

Parses a `.castscript` string into a `Config` + `ScriptNode[]`. Synchronous.

### `compile(config, nodes, options?): Promise<CompiledCast>`

Compiles a parsed script into a `CompiledCast` (header + event stream). **Async.**

```typescript
interface CompileOptions {
  /** File resolver for `>>` and `include:` directives. Defaults to NULL_RESOLVER. */
  resolver?: FileResolver;
  /** Unix timestamp (seconds) for the cast header. Defaults to Date.now()/1000. */
  now?: number;
  /** What to do when a file can't be resolved: 'error' (default) | 'warn' | 'skip' */
  onResolveError?: 'error' | 'warn' | 'skip';
}
```

Scripts with no `>>` or `include:` directives compile synchronously (the resolver is never called) — `await` resolves immediately.

### `encodeV3(cast: CompiledCast): string`

Encodes a `CompiledCast` as asciicast v3 NDJSON (delta timestamps). **Recommended.**

### `encodeV2(cast: CompiledCast): string`

Encodes a `CompiledCast` as asciicast v2 NDJSON (absolute timestamps).

## FileResolver

The `FileResolver` interface lets the library remain browser-safe by delegating all I/O to the caller:

```typescript
type FileResolver = (path: string) => FileResolverResult | Promise<FileResolverResult>;

type FileResolverResult =
  | { ok: true;  content: string }
  | { ok: false; code: FileResolverErrorCode; message: string; path: string };

enum FileResolverErrorCode {
  NotFound       = 'NOT_FOUND',
  ReadError      = 'READ_ERROR',
  AccessDenied   = 'ACCESS_DENIED',
  UnsupportedPath = 'UNSUPPORTED_PATH',
}
```

**In-memory resolver (tests / browser editor):**

```typescript
const resolver = (path: string): FileResolverResult => {
  const content = files.get(path);
  return content !== undefined
    ? { ok: true, content }
    : { ok: false, code: FileResolverErrorCode.NotFound, message: `Not found: ${path}`, path };
};
```

## Sub-path exports

```typescript
import { parse } from '@cast-builder/core/parser';
import { compile } from '@cast-builder/core/compiler';
import { encodeV3 } from '@cast-builder/core/encoder/v3';
import { encodeV2 } from '@cast-builder/core/encoder/v2';
```

## Types

All types are exported from the main entry point:

```typescript
import type {
  Config, ScriptNode, ParseResult,             // parser types
  CastHeader, CastEvent, CompiledCast,         // compiler/encoder types
  StyledText, PlainSpan, StyledSpan,           // styled text types
  FileResolver, FileResolverResult, CompileOptions, // I/O types
} from '@cast-builder/core';

import {
  FileResolverErrorCode, CompileError, NULL_RESOLVER,
} from '@cast-builder/core';
```

## Utilities

```typescript
import {
  stripAllEscapes,   // strip ANSI escapes from a string
  ScreenBuffer,      // VT100 terminal state machine (for decompile tools)
  modifiersToAnsi,   // convert style modifier strings to ANSI sequences
  parseDuration,     // parse "2s" / "500ms" → milliseconds
  createRng,         // seeded PRNG (mulberry32) for deterministic jitter
} from '@cast-builder/core';
```

## CLI

For the command-line tool (`cast-builder compile`, `decompile`, etc.):

```bash
npm install -g @cast-builder/cli
# or
npx @cast-builder/cli --help
```

See [`@cast-builder/cli` on npm](https://www.npmjs.com/package/@cast-builder/cli).
