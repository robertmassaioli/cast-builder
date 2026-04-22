# @cast-builder/core

Core library for parsing and compiling `.castscript` files into [asciinema](https://asciinema.org) `.cast` recordings.

Zero runtime dependencies. Browser-safe — no Node.js built-ins. Runs in Node.js, Deno, Bun, Cloudflare Workers, and web browsers.

---

## The `.castscript` format

A `.castscript` file has two sections separated by section headers.

```
--- config ---
title:        My Demo
width:        120
height:       30
prompt:       user@host:~/project$ 
typing-speed: normal
idle-time:    1.0

--- script ---

marker: Start

$ echo "Hello, world!"
> Hello, world!

wait: 1s
clear
```

### Config section

The `--- config ---` section sets global properties for the recording. All keys are optional — sensible defaults apply.

| Key | Type | Default | Description |
|---|---|---|---|
| `title` | string | _(none)_ | Recording title shown in the player |
| `width` | integer | `120` | Terminal width in columns |
| `height` | integer | `30` | Terminal height in rows |
| `shell` | string | `bash` | Shell name (informational, stored in header) |
| `prompt` | string | `$ ` | Prompt string prepended before each `$` command. Trailing space is preserved. Supports inline style tags. |
| `theme` | string | `default` | Theme name (informational, stored in header) |
| `typing-speed` | speed | `normal` | Default typing speed — `slow`, `normal`, `fast`, `instant`, or `Nms` (e.g. `60ms`) |
| `typing-seed` | integer | _(random)_ | Seed for the typing-jitter RNG — set for fully reproducible output |
| `idle-time` | float (seconds) | `1.0` | Pause inserted between consecutive command blocks |
| `output-format` | `v2` \| `v3` | `v3` | Asciicast output format. v3 uses delta timestamps (recommended); v2 uses absolute timestamps |
| `env` | `KEY=VALUE` | _(none)_ | Environment variable stored in the cast header. Repeat the key for multiple entries. |

### Script section

The `--- script ---` section contains an ordered list of **directives**, one per line. Blank lines and `#` comment lines are ignored.

#### Commands and output

| Directive | Description |
|---|---|
| `$ command` | Type the command at the prompt with a realistic typing animation, then press Enter. The `idle-time` gap is inserted before every command after the first. |
| `> text` | Print an output line. Supports inline style tags. A small timing delay between lines simulates real output. |
| `>> path/to/file` | Embed the contents of a file as output lines. Requires a `FileResolver` to be provided. |

#### Text input

| Directive | Description |
|---|---|
| `type: text` | Type text with a typing animation but **without** pressing Enter. Useful for interactive prompts. |
| `hidden: text` | Type text with timing but **without echoing** it (e.g. for passwords). Only a newline is emitted. |
| `print: text` | Instantly emit text with no typing animation. Supports inline style tags. |

#### Timing and control

| Directive | Description |
|---|---|
| `wait: 2s` | Insert a pause. Use `s` for seconds or `ms` for milliseconds (e.g. `wait: 500ms`, `wait: 1.5s`). |
| `clear` | Clear the terminal screen (emits `ESC[2J ESC[H`). |
| `resize: 80x24` | Change terminal dimensions mid-recording (`cols x rows`). |
| `marker: Label` | Insert a named chapter marker. Markers appear in the asciinema player's timeline. |

#### Mid-script overrides

| Directive | Description |
|---|---|
| `set typing-speed: fast` | Override the typing speed for all subsequent directives. |
| `set prompt: root@server:~# ` | Change the prompt for all subsequent `$` commands. |
| `set idle-time: 0.5` | Change the between-command idle gap. |
| `set title: New Title` | Update the title (informational). |

#### Includes and blocks

| Directive | Description |
|---|---|
| `[block-name]` | Define a named block. Everything from this label to the next label (or end of file) belongs to the block. |
| `include: other.castscript` | Inline the full script content of another file. |
| `include: other.castscript#block-name` | Inline only the named `[block-name]` section from another file. |

Both `include:` and `>>` require a `FileResolver` to be provided to `compile()`. Includes can nest up to 16 levels deep (circular includes are detected and rejected).

#### Raw output

| Directive | Description |
|---|---|
| `raw: \x1b[1mBold\x1b[0m` | Emit a raw ANSI escape sequence verbatim. Use when the inline style tag system doesn't cover what you need (e.g. blinking, 256-colour codes, cursor positioning). Supports `\xNN`, `\n`, `\r`, `\t`, `\\`. |

#### Comments

```
# This line is a comment and is completely ignored
```

### Inline style tags

Output lines (`>`) and `print:` directives support inline style tags to colour and format text without writing raw ANSI codes by hand:

```
> Status: {bold green: OK}
> {red: Error}: something went wrong
> {#ff6600: Custom true-colour text}
> {bold: {underline: nested styles}}
```

**Syntax:** `{modifier modifier …: content}` — one or more space-separated modifiers, a colon-space, then the content. Tags nest arbitrarily.

**Text modifiers:**

| Modifier | Effect |
|---|---|
| `bold` | Bold |
| `dim` | Dimmed / faint |
| `italic` | Italic |
| `underline` | Underline |

**Foreground colours:**

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `#rrggbb` (24-bit hex)

**Background colours:**

`bg-black`, `bg-red`, `bg-green`, `bg-yellow`, `bg-blue`, `bg-magenta`, `bg-cyan`, `bg-white`

Multiple modifiers can be combined in any order: `{bold red: text}`, `{bold bg-blue: text}`, `{italic #00aaff: text}`.

### Typing speed values

The `typing-speed` config key and the `set typing-speed:` directive accept:

| Value | Avg delay per character |
|---|---|
| `instant` | 0 ms (no animation) |
| `fast` | ~30 ms |
| `normal` | ~80 ms |
| `slow` | ~150 ms |
| `Nms` | Exactly N ms (e.g. `60ms`) |

A small random jitter (±25% of the average) is added to each character delay to make typing look natural. Set `typing-seed` for fully deterministic output.

### Complete example

```
--- config ---
title:        Git Workflow Demo
width:        100
height:       28
prompt:       user@host:~/project$ 
typing-speed: normal
idle-time:    0.8

--- script ---

marker: Initialise

$ git init
> Initialized empty Git repository in /home/user/project/.git/

marker: Stage and Commit

$ git add .

$ git commit -m "Initial commit"
> {bold: [main (root-commit) 1a2b3c4]} Initial commit
>  3 files changed, {green: 42 insertions(+)}

marker: Push

$ git push origin main
> {dim: Enumerating objects: 5, done.}
> To github.com:user/project.git
>  * {green: [new branch]}      main -> main
```

---

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
