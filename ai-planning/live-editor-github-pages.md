# Proposal: `cast-builder` Live Editor — GitHub Pages Web App

## Overview

A browser-hosted live editor for `.castscript` files, deployed to GitHub Pages,
that lets users write a script, see it compile in real time, and play back the
result in an embedded asciinema player — all without installing anything.

Because `@cast-builder/core` is already **browser-safe** (zero Node.js imports,
fully async `compile()` via the `FileResolver` interface), the entire compile
pipeline runs in the browser. No server required. No API. No backend.

---

## 1. Where Does It Live?

### Recommendation: A separate `packages/web` workspace inside `cast-builder/`

```
cast-builder/
├── packages/
│   ├── core/          @cast-builder/core  (library)
│   ├── cli/           @cast-builder/cli   (CLI tool)
│   └── web/           cast-builder live editor  ← NEW
├── ai-planning/
└── package.json       (workspace root — add "packages/web")
```

**Why inside `cast-builder/` rather than a separate repo:**
- Direct workspace dependency on `@cast-builder/core` — no publish/version lag;
  always runs the latest core.
- Single CI pipeline: the existing `ci.yml` can add a `build-web` job that
  builds and deploys to GitHub Pages.
- One place for issues, PRs, and planning.
- The web package is `private: true` — never published to npm.

**Why not the repo root or a sibling directory:**
- The live editor is tightly coupled to `@cast-builder/core`; keeping it in
  the monorepo makes that relationship explicit.
- A separate top-level directory (like `cast-editor/`) would require publishing
  `@cast-builder/core` first for every iteration, slowing development.

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Build tool | **Vite** | Zero-config, fast HMR, excellent ESM/TypeScript support, built-in GitHub Pages deploy |
| UI framework | **Preact** | Tiny (3kB), React-compatible API, ideal for a focused tool with no heavy UI needs |
| Editor component | **CodeMirror 6** | Best-in-class browser editor; supports custom syntax highlighting, line numbers, auto-complete |
| Player | **asciinema-player** | Official JS player; already used as an npm dependency (`^3.9.0`) in the Forge app — same package, same version |
| Styling | **CSS custom properties** (no framework) | Keeps bundle small; matches the terminal aesthetic |
| State persistence | **`localStorage`** | Keep it all in the frontend; no auth, no server |

All dependencies are `devDependencies` / bundled — the deployed site is 100%
static HTML/JS/CSS.

---

## 3. Features

### 3.1 Core Features (MVP)

#### Live compile
- As the user types in the editor, `@cast-builder/core`'s `compile()` is called
  (debounced, 400ms) and the result is passed to the asciinema player.
- Compile errors are displayed inline below the editor with line number,
  message, and a red highlight on the offending line.
- A "Compile" button for manual trigger (useful for slow connections or long
  scripts where debounce feels too aggressive).

#### Embedded asciinema player
- The compiled `.cast` is passed directly to `asciinema-player` as a blob URL
  or inline data — no file download needed.
- The player shows the recording immediately below the editor.
- Player controls: play/pause, speed (0.5×, 1×, 1.5×, 2×), seek bar, loop
  toggle, chapter markers (from `marker:` directives).

#### Download compiled cast
- A "Download .cast" button saves the compiled output as a file.
- Filename defaults to the script's `title` config value, falling back to
  `recording.cast`.

#### Copy castscript
- A "Copy script" button copies the current editor content to the clipboard.

---

### 3.2 Local Storage — Persistence

All state is saved to `localStorage` automatically so users never lose their
work between sessions.

#### Keys used

| Key | Value | Notes |
|---|---|---|
| `cast-builder:script` | The full `.castscript` text | Saved on every edit (debounced 1s) |
| `cast-builder:theme` | `"light"` or `"dark"` | UI theme preference |
| `cast-builder:speed` | `"1"`, `"1.5"`, etc. | Last-used player speed |
| `cast-builder:splits` | JSON `{editorWidth: number}` | Panel size preference |
| `cast-builder:examples:last` | Name of last-loaded example | Remembers which example was active |

#### Saved scripts (named slots)

Beyond the single "current script", users can **save and name up to 10 scripts**
in localStorage:

```
cast-builder:saved:0  → { name: "My Demo", script: "--- config ---\n..." }
cast-builder:saved:1  → { name: "SSH Login Example", script: "..." }
...
```

A "Saved scripts" panel in the sidebar shows all slots with Load / Rename /
Delete actions. This gives a lightweight "project" feel without any server.

**Storage size:** `.castscript` files are typically 1–5 KB. 10 saved scripts +
current = well within localStorage's 5–10 MB limit.

---

### 3.3 Examples Library

A built-in examples dropdown (populated from the `packages/core/examples/`
directory at build time via a Vite plugin) lets users load any example with one
click:

- Hello World
- Git Workflow
- Styled Output
- Interactive (SSH / password)
- Forge Deploy
- Advanced (raw:, set:, include:#block)

Loading an example replaces the current editor content (with a confirmation
dialog if the current script has unsaved changes).

---

### 3.4 Editor Features

#### `.castscript` syntax highlighting
A custom CodeMirror 6 language mode that highlights:
- Section headers (`--- config ---`, `--- script ---`) — bold
- Directive keywords (`$`, `>`, `>>`, `type:`, `wait:`, `marker:`, etc.) — coloured by category
- Config keys — highlighted
- Inline style tags `{bold green: text}` — tag name in one colour, content in another
- Comments (`#`) — dimmed
- Block labels (`[name]`) — distinct colour

#### Auto-complete
CodeMirror completions for:
- All directive keywords (triggered on blank line start)
- Config keys (inside `--- config ---` section)
- Style modifiers (inside `{` tags)
- Known typing speeds (`slow`, `normal`, `fast`, `instant`)

#### Error highlighting
When `compile()` returns a `ParseError` or `CompileError`, the offending line
is highlighted red in the editor gutter.

---

### 3.5 UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  cast-builder live editor        [Examples ▾]  [☀/🌙]  [GitHub] │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│   CodeMirror editor          │   asciinema-player               │
│   (.castscript source)       │   (compiled cast playback)       │
│                              │                                  │
│                              │   ▶ ━━━━━━━━━━━━━━━  0:00/0:34  │
│                              │   Speed: [1×▾]  [⟳ Loop]        │
│                              │                                  │
├──────────────────────────────┴──────────────────────────────────┤
│  Status bar: ✔ Compiled (0.8ms) · 42 events · 0:34             │
│  [Compile]  [Download .cast]  [Copy script]  [Save ▾]          │
└─────────────────────────────────────────────────────────────────┘
│  Saved scripts: [My Demo] [SSH Login] [+] ...                   │
└─────────────────────────────────────────────────────────────────┘
```

- **Left panel:** CodeMirror editor — resizable via a drag handle
- **Right panel:** asciinema player
- **Bottom bar:** status (compile time, event count, duration), action buttons
- **Saved scripts strip:** horizontally scrollable list of named saved slots
- **Header:** examples dropdown, dark/light toggle, GitHub link

The layout is responsive — on narrow screens (mobile) the panels stack
vertically: editor on top, player below.

---

### 3.6 Nice-to-Have Features (Post-MVP)

| Feature | Description |
|---|---|
| **Share link** | Encode the current script as a URL-safe base64 parameter (`?s=...`) so scripts can be shared as URLs without a server |
| **Diff view** | Show what changed between the last compile and the current one |
| **Marker navigation** | Click a chapter marker in the player to jump to the corresponding line in the editor |
| **Export to SVG** | Use `svg-term` WASM or similar to export the compiled cast as an animated SVG |
| **PWA / offline** | Add a service worker so the editor works offline after first load |
| **Import .cast file** | Drag and drop a `.cast` file to decompile it into a `.castscript` (using the decompile logic ported to browser) |

---

## 4. Keeping It All in the Frontend

### 4.1 FileResolver for `include:` and `>>` in the browser

Since there's no filesystem in the browser, `include:` and `>>` directives are
handled by an **in-memory FileResolver** backed by the saved scripts store:

```typescript
// packages/web/src/compiler.ts
import { compile, FileResolverErrorCode } from '@cast-builder/core';
import type { FileResolverResult } from '@cast-builder/core';

function createBrowserResolver(files: Map<string, string>) {
  return (path: string): FileResolverResult => {
    const content = files.get(path);
    if (content === undefined) {
      return {
        ok: false,
        code: FileResolverErrorCode.NotFound,
        message: `File "${path}" not found. In the browser editor, only saved scripts can be included.`,
        path,
      };
    }
    return { ok: true, content };
  };
}

// Build the resolver from saved localStorage slots
const files = new Map(getSavedScripts().map(s => [s.name, s.script]));
const compiled = await compile(config, nodes, {
  resolver: createBrowserResolver(files),
  onResolveError: 'warn', // show warning in the player rather than crashing
});
```

This means a user can:
1. Save a script named `login.castscript`
2. In another script, write `include: login.castscript`
3. The browser resolver finds it in localStorage and inlines it

For `>>` file output, the same mechanism applies — the "file" must exist as a
saved script slot. The UI surfaces this clearly: the resolver error message
explains that only saved scripts are available.

### 4.2 No server at all

- **Compile:** runs in the main thread (scripts are small; compile is <10ms)
  or optionally in a Web Worker for zero UI jank.
- **Player:** `asciinema-player` accepts a blob URL or inline data object —
  no HTTP request needed.
- **Storage:** `localStorage` only — no IndexedDB, no cookies, no auth.
- **Deployment:** Vite builds a static `dist/` that GitHub Pages serves directly.
- **No telemetry, no analytics, no tracking.**

---

## 5. Directory Structure

```
cast-builder/packages/web/
├── package.json              private: true, deps: @cast-builder/core, preact, codemirror
├── tsconfig.json
├── vite.config.ts            base: '/cast-builder/' for GitHub Pages subpath
├── index.html
├── public/
│   ├── favicon.svg
│   └── asciinema-player.css  (copied from player-assets/)
└── src/
    ├── main.ts               entry point — mount Preact app
    ├── App.tsx               root component — layout
    │
    ├── components/
    │   ├── Editor.tsx        CodeMirror 6 wrapper
    │   ├── Player.tsx        asciinema-player wrapper
    │   ├── StatusBar.tsx     compile status, action buttons
    │   ├── SavedScripts.tsx  saved script slots (localStorage)
    │   └── ExamplesMenu.tsx  built-in examples dropdown
    │
    ├── editor/
    │   ├── language.ts       CodeMirror .castscript language definition
    │   ├── highlight.ts      syntax highlighting rules
    │   └── autocomplete.ts   completion source
    │
    ├── compiler/
    │   ├── compile.ts        debounced compile() wrapper + browser FileResolver
    │   └── worker.ts         optional Web Worker for off-thread compilation
    │
    ├── storage/
    │   └── localStorage.ts   typed wrappers around localStorage get/set/list
    │
    └── examples/
        └── index.ts          imports all example .castscript files at build time
```

---

## 6. `package.json` for `packages/web`

```json
{
  "name": "@cast-builder/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@cast-builder/core": "*",
    "preact":             "^10.0.0",
    "@codemirror/view":   "^6.0.0",
    "@codemirror/state":  "^6.0.0",
    "@codemirror/language": "^6.0.0",
    "@codemirror/autocomplete": "^6.0.0",
    "asciinema-player":   "^3.9.0"
  },
  "devDependencies": {
    "typescript":  "^5.4.0",
    "vite":        "^5.0.0",
    "@preact/preset-vite": "^2.0.0"
  }
}
```

---

## 7. GitHub Pages Deployment

Add a `deploy-pages` job to `.github/workflows/ci.yml` (or a separate
`pages.yml`):

```yaml
deploy-pages:
  name: Deploy live editor to GitHub Pages
  runs-on: ubuntu-latest
  needs: test
  if: github.ref == 'refs/heads/main'
  permissions:
    contents: read
    pages: write
    id-token: write
  environment:
    name: github-pages
    url: ${{ steps.deploy.outputs.page_url }}
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: "npm"
    - run: npm ci
    - run: npm run build --workspace=packages/core
    - run: npm run build --workspace=packages/web
    - uses: actions/upload-pages-artifact@v3
      with:
        path: packages/web/dist
    - id: deploy
      uses: actions/deploy-pages@v4
```

The editor will be live at:
`https://robertmassaioli.github.io/cast-builder/`

---

## 8. Implementation Roadmap

| Phase | Scope | Est. effort |
|---|---|---|
| **Phase 0 — Scaffold** | `packages/web/` setup, Vite config, Preact hello world, GitHub Pages deploy | 2–3 hours |
| **Phase 1 — Editor + compile** | CodeMirror basic editor, debounced compile, error display, player integration | 4–6 hours |
| **Phase 2 — Persistence** | localStorage current script, saved slots, examples menu | 2–3 hours |
| **Phase 3 — Syntax highlighting** | CodeMirror `.castscript` language mode, auto-complete | 3–4 hours |
| **Phase 4 — Polish** | Responsive layout, dark/light theme, status bar, download/copy | 2–3 hours |
| **Phase 5 — Share links** | URL-encoded script parameter (`?s=base64`) | 1–2 hours |

Total estimated effort: **~15–20 hours** for a polished, fully-featured editor.

---

## 9. Summary

| Dimension | Decision |
|---|---|
| Location | `cast-builder/packages/web/` (monorepo workspace, `private: true`) |
| Framework | Preact + CodeMirror 6 + asciinema-player |
| Build | Vite — static HTML/JS/CSS, no server |
| Deployment | GitHub Pages via GitHub Actions on every push to `main` |
| URL | `https://robertmassaioli.github.io/cast-builder/` |
| Persistence | `localStorage` — current script auto-saved, 10 named saved slots |
| `include:` in browser | In-memory FileResolver backed by localStorage saved slots |
| Backend | **None** — 100% frontend |
| Offline | Optional PWA / service worker (post-MVP) |
| Analytics | None |
