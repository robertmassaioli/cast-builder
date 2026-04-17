# Proposal: `cast-builder` — A Human-Writable Format That Compiles to `.cast`

## Overview

This document proposes **`cast-builder`**: a tool that reads a simple,
human-writable plain-text script file (`.castscript`) and compiles it into a
valid asciicast v3 `.cast` file. The goal is to make terminal recordings
**authorable and maintainable** in the same way a developer authors code —
written in a text editor, committed to version control, reviewed in pull
requests, and re-compiled whenever it needs updating.

**Implementation language: TypeScript.** The project is a Node.js CLI tool
written in TypeScript throughout — types, compiler, CLI entry-point, and tests.
No Python, no Rust. This choice maximises accessibility for web/JS developers
already familiar with the asciinema ecosystem (the player and Forge app are
already JS/TS), enables sharing of ANSI-rendering logic with browser-side
tooling, and gives a rich npm ecosystem for argument parsing, testing, and
ANSI handling.

---

## 1. Motivation

### The problem with recorded `.cast` files

A `.cast` file captured by `asciinema rec` is essentially a timestamped log
of raw terminal bytes. It is:

- **Opaque** — the content is tangled ANSI escape sequences and per-keystroke
  output events; not human-readable.
- **Fragile** — any change (new output, different path, updated version number)
  requires re-recording the entire session from scratch.
- **Hard to maintain** — there is no way to update just one command's output
  without affecting timing of everything that follows.
- **Not version-control-friendly** — binary-like diffs give no meaningful
  signal about what actually changed in the demo.

### The vision

A developer writes a `.castscript` file — a clean, readable, structured
plain-text document describing what should appear on screen. They run:

```
cast-builder compile demo.castscript demo.cast
```

The tool synthesises a realistic `.cast` file complete with typing animations,
command output, timing, prompt rendering, markers, and theme. When the demo
needs updating they edit the script, re-compile, done.

---

## 2. The `.castscript` File Format

The format is designed around three core principles:
1. **Readability first** — a non-technical stakeholder should be able to read
   and understand a `.castscript` file.
2. **Minimal syntax** — use as few special characters as possible; favour
   English words.
3. **Escape hatch** — allow raw ANSI output for advanced users who need it.

### 2.1 Overall structure

A `.castscript` file has two sections:

```
--- config ---
... key: value pairs ...
--- script ---
... directives ...
```

The `--- config ---` section is optional; sensible defaults apply to everything.

---

### 2.2 Config section

All fields are optional. Example:

```
--- config ---
title:       My Project Demo
width:       120
height:      30
shell:       bash
prompt:      user@host:~/project$ 
theme:       dracula
typing-speed: normal    # slow | normal | fast | instant
idle-time:   1.0        # seconds between unrelated blocks
```

| Key | Default | Description |
|---|---|---|
| `title` | `""` | Stored in cast header `title` field |
| `width` | `120` | Terminal columns |
| `height` | `30` | Terminal rows |
| `shell` | `bash` | Used for prompt rendering and `$ ` prefix behaviour |
| `prompt` | `$ ` | The prompt string printed before typed commands |
| `theme` | `default` | Named theme or inline hex definition |
| `typing-speed` | `normal` | Controls character-by-character typing animation |
| `idle-time` | `1.0` | Pause inserted automatically between script blocks |
| `output-format` | `v3` | `v2` or `v3` |
| `env` | `{}` | Environment variables stored in cast header |

**Typing speed presets** (controls inter-character delay):

| Preset | Avg delay per char | Jitter |
|---|---|---|
| `instant` | 0 ms | none |
| `fast` | 30 ms | ±10 ms |
| `normal` | 80 ms | ±40 ms |
| `slow` | 150 ms | ±60 ms |

A custom speed can be given as a number: `typing-speed: 60ms`.

---

### 2.3 Script section — Directives

Every line in the script section is a **directive**. Blank lines are ignored.
Lines beginning with `#` are comments and are ignored.

---

#### `$ <command>`  — Type and run a command

```
$ ls -la
$ git status
$ docker build -t myapp .
```

The compiler:
1. Renders the prompt string to the terminal output.
2. Emits character-by-character typing events at the configured speed with
   realistic jitter.
3. Emits a newline/enter keypress event.
4. Emits the output block that follows (see below).

---

#### `> <text>`  — Output line(s)

Lines immediately following a `$` directive that begin with `>` are the
**expected output** of that command. Each line is emitted as a single Output
event with a small inter-line delay (simulating real command output streaming).

```
$ ls -la
> total 48
> drwxr-xr-x  8 user staff  256 17 Apr 10:00 .
> drwxr-xr-x 12 user staff  384 17 Apr 09:55 ..
> -rw-r--r--  1 user staff 1234 17 Apr 10:00 README.md
```

Output lines support **inline style tags** (see §2.4) for colour and formatting.

---

#### `>> <file>`  — Output from file

Embed the full contents of an external file as the output, one line at a time.
Useful for long command outputs (e.g. `docker build` logs, `npm install`).

```
$ npm install
>> fixtures/npm-install-output.txt
```

---

#### `type: <text>`  — Type text without pressing Enter

Emits character-by-character typing events but no newline. Useful for
interactive prompts, password entry (see `hidden:`), or partial input.

```
type: Are you sure? [y/N] 
type: y
```

---

#### `hidden: <text>`  — Type text that does not echo

Emits typing events but suppresses output events (simulates password entry).

```
$ sudo apt update
hidden: mypassword
```

---

#### `print: <text>`  — Instantly print text (no typing animation)

Emits output text immediately without any typing delay. Good for banners,
ASCII art, or any content that would never be typed character-by-character.

```
print: ╔══════════════════════════════╗
print: ║   Welcome to the demo!       ║
print: ╚══════════════════════════════╝
```

---

#### `wait: <duration>`  — Insert a pause

Insert an explicit pause. Useful for dramatic effect or to simulate reading
time before the next command.

```
$ make test
> All 42 tests passed.
wait: 2s
$ echo "Done!"
```

Duration formats: `2s`, `500ms`, `1.5s`.

---

#### `clear`  — Clear the screen

Emits the ANSI clear-screen escape sequence (`\x1b[2J\x1b[H`) as an Output
event.

```
clear
$ echo "Fresh start"
```

---

#### `marker: <label>`  — Insert a named chapter marker

Emits an asciicast `m`-type marker event. Integrates with `asciinema play
--pause-on-markers` and the web player's chapter list.

```
marker: Step 1 — Installation
$ npm install -g myapp
```

---

#### `resize: <cols>x<rows>`  — Change terminal dimensions mid-script

Emits a Resize event. Subsequent content renders at the new size.

```
resize: 80x24
$ cat narrow-output.txt
resize: 120x30
```

---

#### `set <key>: <value>`  — Override a config value mid-script

Temporarily change a config parameter for subsequent directives.

```
set typing-speed: fast
$ git add .
$ git commit -m "wip"
set typing-speed: normal
```

Supported mid-script keys: `typing-speed`, `prompt`, `idle-time`.

---

#### `include: <file.castscript>`  — Include another script file

Merges another `.castscript` file at this point. Enables modular, reusable
script segments (e.g. a shared "login sequence").

```
include: common/login.castscript
$ ls -la
```

---

#### `raw: <ansi-string>`  — Emit a raw ANSI escape sequence

Escape hatch for advanced users who need precise control over terminal output.
The string is emitted verbatim as a single Output event.

```
raw: \x1b[1;32mSuccess!\x1b[0m\r\n
```

---

#### `[block]` — Inline named block (for `include` targeting)

Blocks allow a single `.castscript` to contain multiple named sections that
can be included individually by other scripts.

```
[install]
$ npm install -g myapp
> added 42 packages in 3s

[verify]
$ myapp --version
> myapp 1.4.2
```

---

### 2.4 Inline Style Tags (for `>` output lines)

Output lines support a lightweight inline markup for common ANSI styles,
avoiding the need to write raw escape codes in readable scripts:

| Syntax | Effect |
|---|---|
| `{bold: text}` | Bold |
| `{dim: text}` | Dimmed |
| `{green: text}` | Green foreground |
| `{red: text}` | Red foreground |
| `{yellow: text}` | Yellow foreground |
| `{blue: text}` | Blue foreground |
| `{cyan: text}` | Cyan foreground |
| `{white: text}` | White foreground |
| `{bg-red: text}` | Red background |
| `{#rrggbb: text}` | 24-bit true colour foreground |
| `{bold green: text}` | Combined modifiers |

Example:

```
$ git status
> On branch {bold: main}
> {green: nothing to commit, working tree clean}
```

The compiler translates these tags to the appropriate ANSI escape sequences
before emitting them as Output events.

---

## 3. A Complete Example

```castscript
--- config ---
title:        Deploying with Forge
width:        110
height:       28
prompt:       user@laptop:~/my-forge-app$ 
theme:        dracula
typing-speed: normal
idle-time:    0.8

--- script ---

# ── Chapter 1: Build ───────────────────────────────────────────────
marker: Build

print: ╔══════════════════════════════════════╗
print: ║   Forge App Deployment Demo          ║
print: ╚══════════════════════════════════════╝

wait: 1.5s

$ npm run build
> 
> {bold: > my-forge-app@1.0.0 build}
> {bold: > webpack --mode production}
>
> asset main.js {green: 42.1 KiB}
> webpack compiled {green: successfully} in 3421 ms

wait: 1s

# ── Chapter 2: Deploy ──────────────────────────────────────────────
marker: Deploy

$ forge deploy
> Deploying your app to the development environment.
> {dim: Processing...}
>
>   {green: ✔} Uploaded app
>   {green: ✔} Deployed app to development environment
>
> {bold: Deployed successfully.}

wait: 1s

# ── Chapter 3: Install ─────────────────────────────────────────────
marker: Install

$ forge install --upgrade
> {yellow: Warning: This will upgrade your app on the following site:}
> {yellow:   https://your-site.atlassian.net}
>
type: ? Do you want to continue? (Y/n) 
wait: 800ms
type: Y
>
> {green: ✔} App installed successfully.

wait: 2s
clear
```

---

## 4. Compiler Architecture

```
.castscript file
       │
       ▼
┌─────────────┐
│   Lexer     │  Tokenise lines into directive tokens
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Parser    │  Build an ordered list of ScriptNode structs
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Timing Engine      │  Walk nodes, maintaining a running clock.
│                     │  Apply typing-speed, idle-time, wait rules.
│                     │  Emit a stream of (Duration, EventData) pairs.
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  ANSI Renderer      │  Translate style tags → escape sequences.
│                     │  Render prompt string.
│                     │  Apply theme colour mappings.
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Cast Encoder       │  Reuse asciinema's V2Encoder / V3Encoder.
│                     │  Write header then event stream.
└──────┬──────────────┘
       │
       ▼
  output.cast
```

### 4.1 Timing Engine detail

The timing engine maintains:
- `clock: Duration` — current absolute time in the output cast.
- `terminal_size: (u16, u16)` — tracks current cols/rows.
- `typing_speed: TypingSpeedProfile` — current profile (avg delay + jitter fn).
- `idle_time: Duration` — gap inserted between top-level blocks.

For each directive:

| Directive | Time consumed |
|---|---|
| `$ cmd` | `prompt_time` + `len(cmd) × char_delay` + `enter_delay` |
| `> line` | `line_delay` (default 20 ms) per line, plus output length |
| `wait: Ns` | Exactly N seconds |
| `clear` | 1 event at current clock |
| `marker:` | 0 time (inserted at current clock) |
| `set` | 0 time |
| `resize:` | 0 time (1 event) |
| `type:` | `len(text) × char_delay` |
| `print:` | 1 event, `line_delay` per line |

Between top-level command blocks (i.e. between `$` directives), `idle-time`
is added to the clock automatically.

### 4.2 Jitter

Typing jitter makes the recording feel human. The compiler uses a
seeded pseudo-random number generator (seed can be set in config for
reproducible output) to vary each character delay within the jitter range of
the active speed preset. The seed is stored as a comment in the cast header
for reproducibility.

```
--- config ---
typing-seed: 42   # Omit for random seed (non-reproducible)
```

### 4.3 Prompt rendering

The `prompt` config value is emitted verbatim as an Output event before each
`$` command. Inline style tags work here too:

```
--- config ---
prompt: {bold green: user@host}{white: :}{bold blue: ~/project}{white: $ }
```

---

## 5. CLI Interface

```
cast-builder compile  <script> [output.cast] [options]
cast-builder validate <script>
cast-builder preview  <script>
cast-builder init     [output.castscript]
```

### `compile`

```
cast-builder compile demo.castscript demo.cast
cast-builder compile demo.castscript -            # write to stdout
cast-builder compile - demo.cast                  # read from stdin
```

Options:

| Flag | Description |
|---|---|
| `--format v2\|v3` | Override output format (default: v3) |
| `--typing-speed slow\|normal\|fast\|instant\|Nms` | Override speed |
| `--seed N` | Override RNG seed for reproducible timing |
| `--no-jitter` | Disable timing jitter (fully deterministic) |
| `--overwrite` | Overwrite output file if it exists |

### `validate`

Parse and type-check the script without producing output. Reports errors with
line numbers.

```
cast-builder validate demo.castscript
# demo.castscript:14: unknown directive 'ouput:' (did you mean 'output'?)
# demo.castscript:27: include file 'missing.castscript' not found
```

### `preview`

Compile and immediately pipe to `asciinema play -` for instant preview:

```
cast-builder preview demo.castscript
```

### `init`

Generate a starter `.castscript` with commented-out examples of every
directive — the equivalent of a project scaffold:

```
cast-builder init my-demo.castscript
```

---

## 6. The `.castscript` File as a First-Class Artifact

### 6.1 Version control

Because `.castscript` files are plain text with no binary content:
- **Diffs are meaningful** — changing a command's output is a 1-line diff.
- **Merge conflicts are resolvable** — two people editing different sections
  can merge cleanly.
- **History is auditable** — git blame shows who changed what part of the demo.

### 6.2 CI/CD integration

A `.castscript` can be compiled in CI and the resulting `.cast` file published
as a release artifact or deployed to asciinema.org automatically:

```yaml
# .github/workflows/demo.yml
- name: Compile demo
  run: cast-builder compile docs/demo.castscript docs/demo.cast --no-jitter

- name: Upload to asciinema.org
  run: asciinema upload docs/demo.cast
```

### 6.3 Relationship to `cast-edit`

The two tools are complementary:

| Scenario | Tool |
|---|---|
| Creating a demo from scratch / maintaining it over time | `cast-builder` |
| Post-processing a real recording (sanitise, trim, speed) | `cast-edit` |
| Hybrid: record a real session, then clean it up | `asciinema rec` → `cast-edit` |
| Hybrid: build a scripted demo, then tweak timing | `cast-builder` → `cast-edit` |

A real workflow might be: record a rough session with `asciinema rec`, convert
its output events into a `.castscript` using `cast-builder decompile` (see
§7), refine the script, then recompile.

---

## 7. Stretch Goals

### 7.1 `decompile` — Cast → castscript (round-trip)

Reverse-engineer a `.cast` file back into a best-effort `.castscript`. The
compiler uses ANSI parsing to extract visible text, reconstruct likely command/
output boundaries, and produce an editable script.

```
cast-builder decompile recorded.cast editable.castscript
```

This is imperfect (ANSI state reconstruction is lossy) but gives an excellent
starting point for cleaning up a real recording.

### 7.2 Variables and templating

Support `{{variable}}` substitution so the same script can be compiled for
different environments:

```
--- config ---
vars:
  version: 1.4.2
  site:    https://your-site.atlassian.net

--- script ---
$ myapp --version
> myapp {{version}}
```

Compiled with: `cast-builder compile demo.castscript --var version=2.0.0`

### 7.3 Conditional blocks

```
#if platform == "linux"
$ apt install myapp
#else
$ brew install myapp
#endif
```

### 7.4 Loop blocks

Useful for simulating progress bars or repeated output:

```
loop: 5 times, delay 200ms
> {green: .}
```

### 7.5 Audio sync markers

Emit timing markers that align with an audio commentary track (works with
`asciinema upload --audio-url`):

```
audio-sync: 12.5s   # insert cast marker at this wall-clock time in the audio
```

---

## 8. Implementation Roadmap

| Phase | Scope | Notes |
|---|---|---|
| **Phase 0 — Format spec** | Finalise `.castscript` syntax; write EBNF grammar; set up TypeScript project scaffold | Detailed in §10 below |
| **Phase 1 — TypeScript MVP** | `compile`, `validate`, `init`; all core directives; v3 output | TypeScript/Node.js; `commander` for CLI, `chalk` for ANSI rendering |
| **Phase 2 — Full CLI** | `preview`, `decompile`; `include`; style tags; all stretch-goal directives | Extends Phase 1 codebase |
| **Phase 3 — Rust integration** | Optionally integrate as `asciinema build` subcommand; reuse encoders | Full performance; single binary — evaluate after Phase 2 |
| **Phase 4 — Templating** | Variables, conditionals, loops | Makes scripts reusable across projects |

---

## 9. Summary

| Dimension | `asciinema rec` (today) | `cast-builder` |
|---|---|---|
| Authoring method | Live recording at a terminal | Write a text file in any editor |
| Maintainability | Re-record from scratch for any change | Edit one line, recompile |
| Version control diff quality | Opaque / unreadable | Clean, meaningful diffs |
| Output determinism | Non-deterministic (human typing) | Deterministic (seeded RNG) |
| Error correction | Mistakes are baked into the recording | Edit the script and recompile |
| CI/CD integration | Awkward | First-class (`cast-builder compile` in a pipeline) |
| Learning curve | None (just type in your terminal) | Minimal (simple directive syntax) |
| Realism of output | 100% real | Simulated (typing jitter, realistic delays) |

---

## 10. Phase 0 — Format Specification & TypeScript Project Scaffold

Phase 0 has no runtime compiler yet. Its deliverables are:
1. A finalized, unambiguous EBNF grammar for `.castscript`.
2. A worked example library.
3. A TypeScript project scaffold that subsequent phases build directly on top of.

---

### 10.1 EBNF Grammar

```ebnf
castscript      = [ config-section ] script-section ;

(* ── Config ─────────────────────────────────────────────────────── *)
config-section  = "--- config ---" NEWLINE { config-line } ;
config-line     = WHITESPACE* config-key ":" WHITESPACE* config-value NEWLINE ;
config-key      = "title" | "width" | "height" | "shell" | "prompt"
                | "theme" | "typing-speed" | "typing-seed"
                | "idle-time" | "output-format" | "env" ;
config-value    = text-to-eol ;

(* ── Script ─────────────────────────────────────────────────────── *)
script-section  = "--- script ---" NEWLINE { script-line } ;
script-line     = comment-line
                | blank-line
                | block-label
                | command-line
                | output-line
                | file-output-line
                | type-line
                | hidden-line
                | print-line
                | wait-line
                | clear-line
                | marker-line
                | resize-line
                | set-line
                | include-line
                | raw-line ;

comment-line    = WHITESPACE* "#" text-to-eol NEWLINE ;
blank-line      = WHITESPACE* NEWLINE ;
block-label     = "[" identifier "]" NEWLINE ;

command-line    = "$ " text-to-eol NEWLINE ;
output-line     = "> " styled-text NEWLINE ;
file-output-line= ">> " filepath NEWLINE ;
type-line       = "type: " text-to-eol NEWLINE ;
hidden-line     = "hidden: " text-to-eol NEWLINE ;
print-line      = "print: " styled-text NEWLINE ;
wait-line       = "wait: " duration NEWLINE ;
clear-line      = "clear" NEWLINE ;
marker-line     = "marker: " text-to-eol NEWLINE ;
resize-line     = "resize: " INTEGER "x" INTEGER NEWLINE ;
set-line        = "set " config-key ": " config-value NEWLINE ;
include-line    = "include: " filepath [ "#" identifier ] NEWLINE ;
raw-line        = "raw: " text-to-eol NEWLINE ;

(* ── Inline style tags ───────────────────────────────────────────── *)
styled-text     = { plain-text | style-tag } ;
style-tag       = "{" style-spec ": " styled-text "}" ;
style-spec      = style-modifier { WHITESPACE style-modifier } ;
style-modifier  = "bold" | "dim" | "italic" | "underline"
                | "green" | "red" | "yellow" | "blue"
                | "cyan" | "white" | "magenta"
                | "bg-red" | "bg-green" | "bg-blue" | "bg-yellow"
                | hex-color ;
hex-color       = "#" 6 * HEX-DIGIT ;

(* ── Durations ───────────────────────────────────────────────────── *)
duration        = ( DECIMAL "s" ) | ( INTEGER "ms" ) ;

(* ── Terminals ───────────────────────────────────────────────────── *)
identifier      = LETTER { LETTER | DIGIT | "-" | "_" } ;
filepath        = text-to-eol ;        (* validated at compile time *)
text-to-eol     = { any character except NEWLINE } ;
plain-text      = { any character except "{" | NEWLINE } ;
```

**Key grammar decisions:**

- `$`, `>`, `>>` use a **space as the separator** (not a colon) to mirror
  shell conventions and keep command lines copy-pasteable.
- `type:`, `print:`, `wait:`, etc. use a **colon-space** separator —
  consistent with YAML-like config and clearly distinct from `$`-prefixed
  command lines.
- Style tags use `{modifier: content}` with a **colon-space** inside braces —
  readable and unambiguous because bare `{` is otherwise illegal in output lines.
- Block labels `[name]` must appear on their own line with no leading whitespace.
- Comments (`#`) are only valid at the **start of a line** (after optional
  whitespace). Inline comments are not supported to avoid ambiguity with shell
  commands that use `#`.

---

### 10.2 Example Library

Phase 0 ships a `examples/` directory containing at least the following
`.castscript` files, each demonstrating a different capability slice:

| File | Demonstrates |
|---|---|
| `examples/hello-world.castscript` | Minimal: one command, one output, no config |
| `examples/git-workflow.castscript` | Multi-command flow; markers; idle-time |
| `examples/styled-output.castscript` | Full inline style tag usage |
| `examples/interactive.castscript` | `type:`, `hidden:`, `wait:` for interactive prompts |
| `examples/modular/` | `include:` with named `[block]` sections |
| `examples/forge-deploy.castscript` | The complete example from §3 |

Each example ships with its **expected compiled output** as a `.cast` file so
the Phase 1 test suite can use them as golden fixtures.

---

### 10.3 TypeScript Project Scaffold

The scaffold establishes the full project structure that Phases 1–4 will fill
in. It contains real, working TypeScript but no compiler logic yet — only
skeletons, types, and wiring.

#### Directory layout

```
cast-builder/
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── vitest.config.ts
│
├── src/
│   ├── index.ts              ← CLI entry-point (bin)
│   │
│   ├── cli/
│   │   ├── compile.ts        ← `cast-builder compile` command handler
│   │   ├── validate.ts       ← `cast-builder validate` command handler
│   │   ├── preview.ts        ← `cast-builder preview` command handler
│   │   └── init.ts           ← `cast-builder init` command handler
│   │
│   ├── parser/
│   │   ├── lexer.ts          ← Tokenise raw .castscript text → Token[]
│   │   ├── parser.ts         ← Token[] → ScriptNode[]
│   │   └── types.ts          ← Token, ScriptNode, ConfigNode union types
│   │
│   ├── compiler/
│   │   ├── compiler.ts       ← ScriptNode[] → CastEvent[]
│   │   ├── timing.ts         ← TimingEngine: clock, jitter, idle-time
│   │   ├── ansi.ts           ← StyleTag → ANSI escape sequences
│   │   └── types.ts          ← CastEvent, CastHeader, TypingProfile types
│   │
│   ├── encoder/
│   │   ├── v3.ts             ← CastEvent[] → asciicast v3 NDJSON string
│   │   └── v2.ts             ← CastEvent[] → asciicast v2 NDJSON string
│   │
│   └── util/
│       ├── duration.ts       ← Parse "2s", "500ms" → milliseconds
│       └── rng.ts            ← Seeded PRNG (mulberry32) for jitter
│
├── tests/
│   ├── parser/
│   │   ├── lexer.test.ts
│   │   └── parser.test.ts
│   ├── compiler/
│   │   ├── timing.test.ts
│   │   └── ansi.test.ts
│   ├── encoder/
│   │   └── v3.test.ts
│   └── golden/               ← Golden-file tests using examples/
│       └── golden.test.ts
│
└── examples/
    ├── hello-world.castscript
    ├── hello-world.cast       ← Golden output
    ├── git-workflow.castscript
    ├── git-workflow.cast
    └── ...
```

#### `package.json`

```json
{
  "name": "cast-builder",
  "version": "0.1.0",
  "description": "Compile .castscript files into asciinema .cast recordings",
  "type": "module",
  "bin": {
    "cast-builder": "./dist/index.js"
  },
  "scripts": {
    "build":   "tsc",
    "dev":     "tsx src/index.ts",
    "test":    "vitest run",
    "test:watch": "vitest",
    "lint":    "eslint src tests",
    "format":  "prettier --write src tests"
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node":         "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser":        "^7.0.0",
    "eslint":    "^9.0.0",
    "prettier":  "^3.0.0",
    "tsx":       "^4.0.0",
    "typescript":"^5.4.0",
    "vitest":    "^1.0.0"
  }
}
```

**Dependency rationale:**

| Package | Role | Why |
|---|---|---|
| `commander` | CLI argument parsing | Mature, zero-dependency, idiomatic |
| `tsx` | Run TS directly during dev | No build step needed in development |
| `vitest` | Test runner | Native ESM support; fast; compatible with `tsx` |
| `prettier` + `eslint` | Code style | Consistent style from day one |

> **Note:** No ANSI library dependency is taken on purpose. The `ansi.ts`
> module will implement escape sequence generation directly from the spec —
> this keeps the output byte-for-byte deterministic and avoids version-skew
> issues with third-party ANSI libraries.

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target":           "ES2022",
    "module":           "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir":           "./dist",
    "rootDir":          "./src",
    "strict":           true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "declaration":      true,
    "declarationMap":   true,
    "sourceMap":        true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

`strict: true` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
are enabled from the start to catch the class of bugs (missing null checks,
wrong optional handling) that are common in parser/compiler code.

#### Core TypeScript types (Phase 0 deliverable)

These types live in `src/parser/types.ts` and `src/compiler/types.ts` and act
as the **contract** between the parser, compiler, encoder, and test suite.
Phases 1+ fill in the implementations; the types are frozen in Phase 0.

```typescript
// src/parser/types.ts

export type ConfigKey =
  | 'title' | 'width' | 'height' | 'shell' | 'prompt'
  | 'theme'  | 'typing-speed' | 'typing-seed'
  | 'idle-time' | 'output-format' | 'env';

export interface Config {
  title?:        string;
  width:         number;         // default 120
  height:        number;         // default 30
  shell:         string;         // default 'bash'
  prompt:        string;         // default '$ '
  theme:         string;         // default 'default'
  typingSpeed:   TypingSpeed;    // default 'normal'
  typingSeed?:   number;
  idleTime:      number;         // seconds, default 1.0
  outputFormat:  'v2' | 'v3';   // default 'v3'
  env:           Record<string, string>;
}

export type TypingSpeed = 'instant' | 'fast' | 'normal' | 'slow' | number; // number = ms

export type ScriptNode =
  | { kind: 'command';     text: string }
  | { kind: 'output';      text: StyledText }
  | { kind: 'file-output'; path: string }
  | { kind: 'type';        text: string }
  | { kind: 'hidden';      text: string }
  | { kind: 'print';       text: StyledText }
  | { kind: 'wait';        ms: number }
  | { kind: 'clear' }
  | { kind: 'marker';      label: string }
  | { kind: 'resize';      cols: number; rows: number }
  | { kind: 'set';         key: ConfigKey; value: string }
  | { kind: 'include';     path: string; block?: string }
  | { kind: 'raw';         ansi: string }
  | { kind: 'block-label'; name: string }
  | { kind: 'comment' };

export type StyledText = Array<PlainSpan | StyledSpan>;
export interface PlainSpan  { kind: 'plain';  text: string }
export interface StyledSpan { kind: 'styled'; modifiers: string[]; content: StyledText }
```

```typescript
// src/compiler/types.ts

export interface CastHeader {
  version:        2 | 3;
  cols:           number;
  rows:           number;
  title?:         string;
  timestamp?:     number;
  idleTimeLimit?: number;
  env?:           Record<string, string>;
  theme?:         CastTheme;
}

export interface CastTheme {
  fg:      string;  // hex e.g. "#cccccc"
  bg:      string;
  palette: string;  // 16 colours separated by ":"
}

export type CastEventCode = 'o' | 'i' | 'r' | 'm' | 'x';

export interface CastEvent {
  time: number;       // absolute seconds from recording start
  code: CastEventCode;
  data: string;
}

export interface CompiledCast {
  header: CastHeader;
  events: CastEvent[];
}
```

---

### 10.4 Phase 0 Acceptance Criteria

Phase 0 is complete when all of the following are true:

- [ ] EBNF grammar document is written and reviewed (§10.1).
- [ ] All example `.castscript` files exist and are valid according to the grammar (§10.2).
- [ ] `package.json`, `tsconfig.json`, ESLint, Prettier configs are committed.
- [ ] All TypeScript types in `src/parser/types.ts` and `src/compiler/types.ts` are defined and compile with zero errors (`tsc --noEmit`).
- [ ] `src/index.ts` wires up `commander` with the four subcommands (`compile`, `validate`, `preview`, `init`); each prints `"not yet implemented"` as a stub.
- [ ] `vitest` runs successfully (zero tests, zero failures) — CI green from day one.
- [ ] A `README.md` in the repo root documents the project purpose, the `.castscript` format at a glance, and how to run `npm run dev`.
- [ ] Golden fixture `.cast` files for all examples are hand-authored and committed so Phase 1 has regression targets immediately.

