# The `.castscript` format — language specification

A `.castscript` file is a plain-text script that compiles into an [asciinema](https://asciinema.org) `.cast` recording.
It separates **what to show** from **when to show it**, letting you write, version-control, and re-compile terminal demos without re-recording them.

> **This document is the normative specification.** The `@cast-builder/core` README, the CLI `--help` output, and the web editor's built-in Docs panel all derive from it.

---

## File structure

A `.castscript` file consists of two optional sections in order:

```
--- config ---
<config lines>

--- script ---
<script directives>
```

Both sections are optional. A file with no section headers is treated as a pure script section. Section headers must appear exactly as shown (no extra whitespace).

---

## Config section

The `--- config ---` section sets global properties for the recording. Each line has the form:

```
key:    value
```

Alignment whitespace between the colon and value is stripped automatically. All keys are optional — sensible defaults apply.

### Config keys

| Key | Type | Default | Description |
|---|---|---|---|
| `title` | string | _(none)_ | Recording title shown in the asciinema player |
| `width` | integer | `120` | Terminal width in columns |
| `height` | integer | `30` | Terminal height in rows |
| `shell` | string | `bash` | Shell name — informational, stored in the cast header |
| `prompt` | string | `$ ` | Prompt string prepended before each `$` command. **Trailing whitespace is preserved** (significant). Supports inline style tags. |
| `theme` | string | `default` | Theme name — informational, stored in the cast header |
| `typing-speed` | speed | `normal` | Default typing speed. See [Typing speed values](#typing-speed-values). |
| `typing-seed` | integer | _(random)_ | Seed for the typing-jitter RNG. Set for fully reproducible, bit-identical output. |
| `idle-time` | float (s) | `1.0` | Seconds of pause inserted between consecutive command blocks. |
| `output-format` | `v2` \| `v3` | `v3` | Asciicast output format. `v3` uses delta timestamps (recommended); `v2` uses absolute timestamps. |
| `env` | `KEY=VALUE` | _(none)_ | An environment variable stored in the cast header. Repeat the line for multiple entries. |

### Example

```
--- config ---
title:        My Demo
width:        120
height:       30
shell:        bash
prompt:       user@host:~/project$ 
theme:        default
typing-speed: normal
typing-seed:  42
idle-time:    1.0
output-format: v3
env:          SHELL=/bin/bash
env:          TERM=xterm-256color
```

---

## Script section

The `--- script ---` section contains an ordered sequence of **directives**, one per line.

**Blank lines** and **comment lines** (beginning with `#`) are ignored everywhere in the script section.

```
# This is a comment — ignored by the compiler
```

---

## Directives reference

### `$ command` — Shell command

```
$ git status
```

Types the command at the prompt character-by-character with a realistic typing animation, then presses Enter. The prompt string from config (or the most recent `set prompt:`) is emitted first.

An `idle-time` pause is automatically inserted **before** every command after the first, simulating the gap between a command finishing and the user typing the next one.

---

### `> text` — Output line

```
> On branch main
> nothing to commit
>
> {green: ✔} All checks passed
```

Prints a line of terminal output. A small per-line timing delay (15–25 ms) is added between consecutive output lines to simulate real command output arriving incrementally.

An empty `>` line emits a blank line.

Supports **inline style tags**. See [Inline style tags](#inline-style-tags).

---

### `>> path/to/file` — File output

```
>> output/build-log.txt
```

Embeds the entire contents of a file as output lines, as if the command had printed them. Each line of the file becomes one output event.

Requires a `FileResolver` to be supplied to `compile()`. In the CLI, this is the Node.js filesystem resolver (paths are relative to the `.castscript` file, sandboxed — path traversal is rejected). In the web editor, files must be saved in Saved Scripts by the same name.

---

### `type: text` — Type without Enter

```
type: Are you sure you want to continue? (yes/no) 
```

Types text character-by-character with a typing animation, but **does not press Enter**. Useful for simulating interactive prompts where the user types a response on the same line.

Does not support inline style tags (raw terminal text only).

---

### `hidden: text` — Hidden input (password)

```
hidden: my-secret-password
```

Advances the clock by the typing time for each character, but **does not emit any characters** to the terminal (simulates a password field that doesn't echo). After all characters are "typed", emits a newline (`\r\n`) as if Enter was pressed.

---

### `print: text` — Instant print

```
print: ╔══════════════════════╗
print: {bold: Section header}
```

Instantly emits text with **no typing animation**. Unlike `>`, there is no per-line timing delay. Use for decorative banners, separators, or any output that should appear instantaneously.

Supports **inline style tags**.

---

### `wait: duration` — Pause

```
wait: 1s
wait: 500ms
wait: 1.5s
```

Inserts an explicit pause in the recording. The duration format is:

- `Ns` — N seconds (integer or decimal, e.g. `1s`, `1.5s`, `0.3s`)
- `Nms` — N milliseconds (integer only, e.g. `500ms`, `200ms`)

---

### `clear` — Clear screen

```
clear
```

Clears the terminal screen and moves the cursor to the home position (emits `ESC[2J ESC[H`).

---

### `marker: label` — Chapter marker

```
marker: Step 1 — Initialise
```

Inserts a named chapter marker at the current time position. Markers are visible in the asciinema player's timeline scrubber and allow viewers to jump to named sections.

---

### `resize: cols x rows` — Resize terminal

```
resize: 80x24
```

Changes the terminal dimensions mid-recording. Emits an `r` event in the asciicast format. Useful for demos that change terminal size (e.g. split-pane simulations).

---

### `set key: value` — Mid-script config override

```
set typing-speed: fast
set prompt: root@server:~# 
set idle-time: 0.5
set title: New Title
```

Overrides a config key for all subsequent directives. Supported keys:

| Key | Effect |
|---|---|
| `typing-speed` | Change typing speed from this point onward |
| `prompt` | Change the prompt for subsequent `$` commands |
| `idle-time` | Change the between-command pause |
| `title` | Update the title (informational) |

Note: **trailing whitespace in `set prompt:` is preserved** — include a trailing space if your prompt ends with one.

---

### `[block-name]` — Named block label

```
[login]
$ ssh user@server.example.com
hidden: my-password

[verify]
$ whoami
> user
```

Defines a named block. Everything from this label to the next `[label]` or end of file belongs to the block. Block labels are **ignored** during normal compilation (they are only meaningful when a file is included with `include: file#block`).

Block names may contain letters, digits, hyphens, and underscores.

---

### `include: path` — Include another script

```
include: shared/login.castscript
include: shared/login.castscript#login
```

Inlines the content of another `.castscript` file at the current position:

- `include: file` — inlines the **entire** script section of the file (block labels are stripped)
- `include: file#block-name` — inlines **only** the named `[block-name]` section

Requires a `FileResolver`. Includes may nest up to **16 levels deep**. Circular includes are detected and rejected with a `CompileError`.

---

### `raw: escape-sequence` — Raw ANSI output

```
raw: \x1b[1;4mBold and underlined\x1b[0m\r\n
raw: \x1b[38;5;208mOrange 256-colour\x1b[0m\r\n
raw: \x1b[5mBlinking\x1b[0m\r\n
```

Emits a raw ANSI/VT100 escape sequence verbatim. Use when the inline style tag system doesn't cover what you need, such as:

- Blinking text (`\x1b[5m`)
- 256-colour codes (`\x1b[38;5;Nm`)
- Complex cursor positioning
- Terminal title sequences (`\x1b]0;Title\x07`)

**Escape sequences supported in `raw:` values:**

| Escape | Meaning |
|---|---|
| `\xNN` | Hex byte (e.g. `\x1b` = ESC) |
| `\n` | Line feed |
| `\r` | Carriage return |
| `\t` | Tab |
| `\\` | Literal backslash |

---

## Inline style tags

Output lines (`>`) and `print:` directives support inline style tags for applying ANSI colours and text attributes without writing raw escape codes.

### Syntax

```
{modifier modifier …: content}
```

- One or more **space-separated** modifiers before the colon-space
- Content after the colon-space (may itself contain nested style tags)
- Tags close with `}`

### Examples

```
> Status: {bold green: OK}
> {red: Error}: something went wrong
> {#ff6600: True-colour orange text}
> {bold: {underline: nested styles work}}
> {bold bg-blue: white text on blue background}
```

### Text attribute modifiers

| Modifier | ANSI effect |
|---|---|
| `bold` | Bold / bright |
| `dim` | Dimmed / faint |
| `italic` | Italic |
| `underline` | Underline |

### Foreground colour modifiers

| Modifier | Colour |
|---|---|
| `black` | Black |
| `red` | Red |
| `green` | Green |
| `yellow` | Yellow |
| `blue` | Blue |
| `magenta` | Magenta |
| `cyan` | Cyan |
| `white` | White |
| `#rrggbb` | 24-bit true colour (e.g. `#ff6600`) |

### Background colour modifiers

`bg-black`, `bg-red`, `bg-green`, `bg-yellow`, `bg-blue`, `bg-magenta`, `bg-cyan`, `bg-white`

### Combining modifiers

Multiple modifiers can be combined in any order:

```
{bold red: text}
{bold bg-blue: text}
{italic #00aaff: text}
{bold underline green: text}
```

---

## Typing speed values

The `typing-speed` config key and the `set typing-speed:` directive accept:

| Value | Avg delay per character | Jitter |
|---|---|---|
| `instant` | 0 ms | none |
| `fast` | ~30 ms | ±10 ms |
| `normal` | ~80 ms | ±40 ms |
| `slow` | ~150 ms | ±60 ms |
| `Nms` | Exactly N ms | ±25% of N |

Jitter is applied using a seeded PRNG (mulberry32). Set `typing-seed` in the config section for fully deterministic, bit-identical output across compiles.

---

## Complete annotated example

```
--- config ---
title:        Git Workflow Demo
width:        100
height:       28
prompt:       user@host:~/project$ 
typing-speed: normal
idle-time:    0.8

--- script ---

# ── Chapter 1 ──────────────────────────────────────────────────────────────

marker: Initialise

$ git init
> Initialized empty Git repository in /home/user/project/.git/

$ git status
> On branch main
>
> No commits yet
>
> nothing to commit

# ── Chapter 2 ──────────────────────────────────────────────────────────────

marker: Stage and Commit

$ git add .

$ git commit -m "Initial commit"
> {bold: [main (root-commit) 1a2b3c4]} Initial commit
>  3 files changed, {green: 42 insertions(+)}

# ── Chapter 3 ──────────────────────────────────────────────────────────────

marker: Push

$ git push origin main
> {dim: Enumerating objects: 5, done.}
> To github.com:user/project.git
>  * {green: [new branch]}      main -> main

wait: 2s
clear
```

---

## Error handling

### `ParseError`

Thrown synchronously by `parse()` when the source is structurally invalid. The error message includes the 1-based line number:

```
Line 12: Invalid resize value: "abc"
Line 7: Invalid typing-speed: "turbo". Expected slow|normal|fast|instant|Nms.
```

### `CompileError`

Thrown (rejected) asynchronously by `compile()`. Machine-readable codes:

| Code | Cause |
|---|---|
| `FILE_RESOLVER_ERROR` | `>>` or `include:` failed and `onResolveError` is `'error'` |
| `INVALID_DIRECTIVE` | A named block referenced by `include: file#block` does not exist |
| `INCLUDE_DEPTH_EXCEEDED` | Include nesting exceeded 16 levels (possible circular include) |

---

## Relationship to the asciicast format

`cast-builder` produces files compatible with the [asciicast v2](https://docs.asciinema.org/manual/asciicast/v2/) and [asciicast v3](https://docs.asciinema.org/manual/asciicast/v3/) specifications:

- **v3** (default): delta timestamps — each event stores time elapsed since the previous event
- **v2**: absolute timestamps — each event stores time elapsed since recording start

Both formats are NDJSON (newline-delimited JSON). The first line is the header object; subsequent lines are event arrays `[time, code, data]`.

Event codes used by `cast-builder`:

| Code | Meaning |
|---|---|
| `o` | Terminal output (text, ANSI sequences) |
| `i` | Terminal input (not used by cast-builder) |
| `r` | Terminal resize |
| `m` | Chapter marker |

---

## See also

- [`@cast-builder/core`](./packages/core/README.md) — programmatic API (parse, compile, encode)
- [`@cast-builder/cli`](./packages/cli/README.md) — command-line tool
- [asciinema](https://asciinema.org) — the player and hosting platform
- [asciicast v3 spec](https://docs.asciinema.org/manual/asciicast/v3/)
