# cast-builder

A monorepo for compiling human-writable `.castscript` files into [asciinema](https://asciinema.org) `.cast` recordings.

Instead of recording a live terminal session and being stuck with it forever, you write a plain-text script and **compile** it into a `.cast` file — the same way you'd write Markdown and render it to HTML.

```
cast-builder compile demo.castscript demo.cast
asciinema play demo.cast
```

---

## Packages

| Package | npm | Description |
|---|---|---|
| [`packages/core`](./packages/core) | [`@cast-builder/core`](https://www.npmjs.com/package/@cast-builder/core) | Core library — parser, compiler, encoders. Zero runtime deps. Browser-safe. |
| [`packages/cli`](./packages/cli) | [`@cast-builder/cli`](https://www.npmjs.com/package/@cast-builder/cli) | CLI tool — wraps `@cast-builder/core` with `commander`. |

---

## Quick start

### CLI (most users)

```bash
# Scaffold a starter script
npx @cast-builder/cli init my-demo.castscript

# Edit my-demo.castscript, then compile
npx @cast-builder/cli compile my-demo.castscript my-demo.cast

# Play it
asciinema play my-demo.cast
```

### Library (programmatic use)

```bash
npm install @cast-builder/core
```

```typescript
import { parse, compile, encodeV3, FileResolverErrorCode } from '@cast-builder/core';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const scriptPath = 'demo.castscript';
const source = readFileSync(scriptPath, 'utf8');
const { config, nodes } = parse(source);
config.typingSeed = 42; // deterministic timing

// compile() is async — provide a FileResolver for ">>" and "include:" directives
const cast = await compile(config, nodes, {
  resolver: (path) => {
    try {
      return { ok: true, content: readFileSync(resolve(dirname(scriptPath), path), 'utf8') };
    } catch {
      return { ok: false, code: FileResolverErrorCode.NotFound, message: `Not found: ${path}`, path };
    }
  },
});
await writeFile('demo.cast', encodeV3(cast));
```

---

## The `.castscript` format

```
--- config ---
title:        My Demo
width:        120
height:       30
prompt:       user@host:~/project$ 
typing-speed: normal
idle-time:    1.0

--- script ---

marker: Introduction

$ echo "Hello, world!"
> Hello, world!

wait: 1s

$ git status
> On branch main
> {green: nothing to commit, working tree clean}

clear
```

### Directives

| Directive | Description |
|---|---|
| `$ command` | Type and run a shell command (with animated typing) |
| `> output` | Output line — supports `{bold green: styled}` inline tags |
| `>> path/to/file` | Embed a file's contents as output |
| `type: text` | Type text without pressing Enter |
| `hidden: text` | Type text that doesn't echo (e.g. passwords) |
| `print: text` | Instantly print text (no typing animation) |
| `wait: 2s` / `wait: 500ms` | Insert a pause |
| `clear` | Clear the screen |
| `marker: Label` | Insert a named chapter marker |
| `resize: 80x24` | Change terminal dimensions mid-script |
| `set typing-speed: fast` | Override config mid-script |
| `include: other.castscript` | Include another script (optionally `#block-name`) |
| `[block-name]` | Define a named block for selective inclusion |
| `raw: \x1b[1mBold\x1b[0m` | Emit a raw ANSI escape sequence |
| `# comment` | Comment (ignored) |

### Inline style tags

```
> {bold: text}          {green: text}       {red: text}
> {bold green: text}    {#ff6600: text}     {bg-blue: text}
```

Supported: `bold`, `dim`, `italic`, `underline`, `green`, `red`, `yellow`, `blue`, `cyan`, `magenta`, `white`, `bg-red` (and other `bg-*`), `#rrggbb` (24-bit true colour).

---

## CLI reference

```
cast-builder compile <script> [output]
  -f, --format <v2|v3>     Output format (default: v3)
  --typing-speed <speed>   slow | normal | fast | instant | Nms
  --seed <n>               RNG seed for deterministic/reproducible timing
  --no-jitter              Disable timing jitter
  --now <timestamp>        Override cast header timestamp (Unix seconds; 0 = strip date)
  --overwrite              Overwrite existing output file

cast-builder validate <script>
  Parse and type-check without producing output. Exits 1 with line numbers on error.

cast-builder preview <script>
  Compile and immediately pipe to `asciinema play` for instant preview.

cast-builder init [output]
  Generate a starter .castscript scaffold (default: demo.castscript).

cast-builder decompile <cast> [output]
  Reverse-engineer a .cast file into an editable .castscript (best-effort).
  --prompt <string>   Known prompt suffix for better command detection
  --no-strip          Preserve raw ANSI in output lines
```

---

## Why?

| | `asciinema rec` | `cast-builder` |
|---|---|---|
| Authoring | Live recording at a terminal | Write a text file in any editor |
| Maintainability | Re-record from scratch for any change | Edit one line, recompile |
| Version control diffs | Opaque / unreadable | Clean, meaningful diffs |
| Determinism | Non-deterministic (human typing) | Reproducible with `--seed` |
| CI/CD | Awkward | First-class (`compile` in a pipeline) |

The two approaches are complementary — use `cast-builder` for scripted demos you want to maintain, and `asciinema rec` + `cast-builder decompile` for cleaning up real recordings.

---

## Development

```bash
# Install all workspace dependencies
npm install

# Build (core first, then cli)
npm run build

# Run all tests (both packages)
npm test

# Run the CLI in dev mode (no build step, from monorepo root)
npm run dev -- compile packages/core/examples/hello-world.castscript out.cast
```

### Workspace structure

```
cast-builder/
├── packages/
│   ├── core/               @cast-builder/core
│   │   ├── src/            parser, compiler, encoders, utilities
│   │   ├── tests/          unit tests + golden fixtures
│   │   └── examples/       example .castscript + .cast files
│   └── cli/                cast-builder CLI
│       ├── src/commands/   compile, validate, preview, init, decompile
│       └── tests/          CLI integration tests
├── ai-planning/            design proposals and planning documents
├── .github/workflows/      CI + npm publish GitHub Actions
└── package.json            npm workspaces root
```

### Publishing

Both packages are published to npm independently. Core must be published before CLI.

```bash
# Via GitHub: create a Release — the publish workflow handles everything.

# Manually:
npm run build
npm publish --workspace=packages/core
npm publish --workspace=packages/cli
```

Requires `NPM_TOKEN` set in GitHub repository secrets for automated publishing.

---

## Licence

MIT
