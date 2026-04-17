# cast-builder

Compile human-writable `.castscript` files into [asciinema](https://asciinema.org) `.cast` recordings.

```
cast-builder compile   demo.castscript demo.cast
cast-builder validate  demo.castscript
cast-builder preview   demo.castscript
cast-builder init      my-demo.castscript
cast-builder decompile demo.cast demo.castscript
```

## Why?

A `.cast` file recorded by `asciinema rec` is a timestamped log of raw terminal bytes. It's opaque, hard to edit, and requires a full re-record for any change. A `.castscript` is plain text — readable, diffable, version-controlled, and re-compiled in milliseconds.

## Quick start

```bash
npm install
npm run dev -- init my-demo.castscript   # scaffold a starter script
npm run dev -- compile my-demo.castscript my-demo.cast
```

## `.castscript` format

A script file has two sections:

```
--- config ---
title:        My Demo
width:        120
height:       30
prompt:       user@host:~/project$ 
typing-speed: normal   # slow | normal | fast | instant | Nms
idle-time:    1.0

--- script ---

marker: Step 1

$ echo "Hello, world!"
> Hello, world!

wait: 1s
clear
```

### Directives

| Directive | Description |
|---|---|
| `$ command` | Type and run a shell command |
| `> text` | Output line (supports inline style tags) |
| `>> path/to/file` | Embed file contents as output |
| `type: text` | Type text without pressing Enter |
| `hidden: text` | Type text that doesn't echo (password) |
| `print: text` | Instantly print text (no typing animation) |
| `wait: 2s` / `wait: 500ms` | Insert a pause |
| `clear` | Clear the screen |
| `marker: Label` | Insert a named chapter marker |
| `resize: 80x24` | Change terminal dimensions |
| `set typing-speed: fast` | Override a config value mid-script |
| `include: other.castscript` | Include another script file |
| `include: other.castscript#block` | Include a named block |
| `[block-name]` | Define a named block |
| `raw: \x1b[1mBold\x1b[0m` | Emit a raw ANSI escape sequence |
| `# comment` | Comment (ignored) |

### Inline style tags

Use `{modifier: text}` in `>` and `print:` lines:

```
> Status: {bold green: OK}
> {red: Error}: something went wrong
> {#ff6600: Custom colour}
> {bold: {underline: nested}}
```

Modifiers: `bold`, `dim`, `italic`, `underline`, `green`, `red`, `yellow`, `blue`, `cyan`, `magenta`, `white`, `bg-red`, `bg-green`, `bg-blue`, `bg-yellow`, `#rrggbb`

## CLI reference

```
cast-builder compile <script> [output] [options]
  -f, --format <v2|v3>       Output format (default: v3)
  --typing-speed <speed>     Override typing speed (slow|normal|fast|instant|Nms)
  --seed <n>                 RNG seed for deterministic/reproducible timing
  --no-jitter                Disable timing jitter (fully deterministic output)
  --overwrite                Overwrite existing output file

cast-builder validate <script>
  Parse and type-check a .castscript without producing output.
  Exits 0 on success, 1 on error (with line numbers).

cast-builder preview <script>
  Compile and immediately pipe to `asciinema play` for instant preview.
  Requires asciinema to be installed and on PATH.

cast-builder init [output]
  Generate a starter .castscript scaffold (default: demo.castscript).

cast-builder decompile <cast> [output] [options]
  Reverse-engineer an existing .cast file into an editable .castscript.
  Supports asciicast v2 and v3. Best-effort: ANSI state reconstruction
  is lossy, but gives a solid starting point for editing.
  --prompt <string>    Known prompt string to improve command detection
  --no-strip           Preserve raw ANSI escape sequences in output lines
```

## Development

```bash
npm install          # install dependencies
npm run build        # compile TypeScript → dist/
npm run dev          # run directly via tsx (no build step)
npm test             # run test suite
npm run test:watch   # watch mode
npm run lint         # ESLint
npm run format       # Prettier
```

## Project structure

```
src/
  index.ts          CLI entry-point
  cli/              Command handlers (compile, validate, preview, init, decompile)
  parser/           Lexer, parser, and AST types
  compiler/         Compiler, timing engine
  encoder/          v2 and v3 asciicast encoders
  util/             ANSI utilities, duration parser, seeded RNG
tests/
  parser/           Lexer and parser unit tests
  compiler/         Timing engine and ANSI utility tests
  encoder/          v3 encoder tests
  golden/           Golden-file integration tests
examples/           Example .castscript files
```

## Relationship to `cast-edit`

| Scenario | Tool |
|---|---|
| Creating / maintaining a scripted demo | `cast-builder` |
| Post-processing a real recording | `cast-edit` |
| Record rough session, then clean up | `asciinema rec` → `cast-edit` |
| Build scripted demo, then tweak timing | `cast-builder` → `cast-edit` |
