# @cast-builder/core

Core library for parsing and compiling `.castscript` files into [asciinema](https://asciinema.org) `.cast` recordings.

Zero runtime dependencies. Use this if you want to integrate cast-builder into your own tools, plugins, or pipelines programmatically.

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

// Compile to a cast event stream
const cast = compile(config, nodes, process.cwd());

// Encode as asciicast v3 NDJSON
const output = encodeV3(cast);

await writeFile('demo.cast', output);
```

## API

### `parse(source: string): ParseResult`

Parses a `.castscript` string into a `Config` + `ScriptNode[]`.

### `compile(config: Config, nodes: ScriptNode[], sourceDir?: string): CompiledCast`

Compiles a parsed script into a `CompiledCast` (header + event stream).  
`sourceDir` is used to resolve relative paths in `include:` and `>>` directives.

### `encodeV3(cast: CompiledCast): string`

Encodes a `CompiledCast` as asciicast v3 NDJSON (delta timestamps). **Recommended.**

### `encodeV2(cast: CompiledCast): string`

Encodes a `CompiledCast` as asciicast v2 NDJSON (absolute timestamps).

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
  Config, ScriptNode, ParseResult,        // parser types
  CastHeader, CastEvent, CompiledCast,    // compiler/encoder types
  StyledText, PlainSpan, StyledSpan,      // styled text types
} from '@cast-builder/core';
```

## Utilities

```typescript
import {
  stripAllEscapes,   // strip ANSI escapes from a string
  ScreenBuffer,      // VT100 terminal state machine
  modifiersToAnsi,   // convert style modifiers to ANSI sequences
  parseDuration,     // parse "2s" / "500ms" → milliseconds
  createRng,         // seeded PRNG (mulberry32)
} from '@cast-builder/core';
```

## CLI

For the command-line tool (`cast-builder compile`, `decompile`, etc.):

```bash
npm install -g cast-builder
# or
npx cast-builder --help
```

See [cast-builder on npm](https://www.npmjs.com/package/cast-builder).
