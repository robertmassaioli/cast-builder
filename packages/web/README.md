# @cast-builder/web — Live Editor

A browser-based live editor for the `.castscript` format. Write and compile
terminal recordings directly in your browser — no installation required.

**Live at:** https://robertmassaioli.github.io/cast-builder/

---

## Features

- **Live compile** — edits are compiled automatically (400ms debounce) using
  `@cast-builder/core` running entirely in the browser
- **Embedded player** — compiled recordings play inline via
  [asciinema-player](https://github.com/asciinema/asciinema-player)
- **Syntax highlighting** — `.castscript` directives coloured by type
- **Autocomplete** — context-aware completions (Ctrl+Space)
- **Keyboard shortcut** — Ctrl+Enter / Cmd+Enter to compile immediately
- **Dark / light theme** — toggle in the header, persisted to localStorage
- **Playback speed** — 0.5×, 1×, 1.5×, 2× controls
- **Resizable panels** — drag the divider between editor and player
- **Saved scripts** — up to 10 named scripts stored in localStorage
- **Built-in examples** — all example `.castscript` files loadable from the
  Examples menu
- **Download** — export the compiled `.cast` or the `.castscript` source
- **100% frontend** — no server, no backend, no telemetry

---

## Local Development

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Setup

```bash
# From the monorepo root
cd cast-builder

# Install all workspace dependencies
npm install

# Build @cast-builder/core first (the web app depends on it)
npm run build --workspace=packages/core
```

### Run the dev server

```bash
# Option 1 — from monorepo root
npm run dev --workspace=packages/web

# Option 2 — from the web package directory
cd packages/web
npx vite
```

Open http://localhost:5173/cast-builder/ in your browser.

> **Note:** The `/cast-builder/` base path is required even in development
> because `vite.config.ts` sets `base: '/cast-builder/'` to match the
> GitHub Pages deployment URL.

### Build for production

```bash
# From monorepo root — builds core then web
npm run build --workspace=packages/core && npm run build --workspace=packages/web

# Output is in packages/web/dist/
```

### Preview the production build locally

```bash
cd packages/web
npx vite preview
# Open http://localhost:4173/cast-builder/
```

---

## Deploying to GitHub Pages

The repository includes a GitHub Actions workflow that automatically deploys
the live editor to GitHub Pages on every push to `main`.

### One-time setup

1. **Enable GitHub Pages** in your repository settings:
   - Go to **Settings → Pages**
   - Under **Source**, select **GitHub Actions**
   - Save

2. **No secrets needed** — the workflow uses the built-in `GITHUB_TOKEN`
   with `pages: write` permission.

3. **Check the base URL** in `vite.config.ts`:

   ```typescript
   base: '/cast-builder/',
   ```

   This must match your GitHub Pages URL path. If your repo is named
   `cast-builder` and your GitHub username is `robertmassaioli`, the live URL
   will be:

   ```
   https://robertmassaioli.github.io/cast-builder/
   ```

   If you fork this repo under a different name, update `base` accordingly.

### How the workflow works

The workflow is defined in `.github/workflows/pages.yml`:

```
push to main
     ↓
[build]
  npm ci
  npm run build --workspace=packages/core   ← must build core first
  npm run build --workspace=packages/web
  upload dist/ as Pages artifact
     ↓
[deploy]
  deploy artifact to GitHub Pages
```

- Triggers on every push to `main`
- Also triggerable manually via **Actions → Deploy Live Editor → Run workflow**
- Only one deployment runs at a time (concurrent deployments are cancelled)

### Manual deployment (without GitHub Actions)

If you want to deploy from your local machine:

```bash
# 1. Build
npm run build --workspace=packages/core
npm run build --workspace=packages/web

# 2. Deploy using gh-pages (install if needed: npm install -g gh-pages)
gh-pages -d packages/web/dist

# Or push the dist/ directory to the gh-pages branch manually:
git subtree push --prefix packages/web/dist origin gh-pages
```

> **Important:** If you use manual deployment, make sure GitHub Pages is
> configured to deploy from the `gh-pages` branch (not GitHub Actions).

---

## Architecture

```
packages/web/
├── src/
│   ├── main.tsx              — Entry point; renders <App /> into #app
│   ├── App.tsx               — Root layout: Header + main panels + Footer
│   ├── App.css.ts            — Layout styles (Vanilla Extract)
│   ├── theme.css.ts          — Typed dark/light theme contract (vars.*)
│   ├── global.css.ts         — Global resets, body, #app, button base
│   ├── components/
│   │   ├── Editor.tsx        — CodeMirror 6 editor
│   │   ├── Player.tsx        — asciinema-player wrapper
│   │   ├── Footer.tsx        — StatusBar + SavedScripts combined
│   │   ├── StatusBar.tsx     — Compile status + action buttons
│   │   ├── SavedScripts.tsx  — localStorage save/load/rename/delete
│   │   └── ExamplesMenu.tsx  — Built-in examples dropdown
│   ├── compiler/
│   │   └── compile.ts        — Browser compile wrapper (async, in-memory resolver)
│   ├── editor/
│   │   ├── language.ts       — .castscript CodeMirror 6 language definition
│   │   ├── highlight.ts      — Syntax highlighting themes
│   │   ├── autocomplete.ts   — Context-aware completions
│   │   └── errorDecoration.ts — Error line highlighting
│   ├── storage/
│   │   └── localStorage.ts   — Typed localStorage helpers
│   └── examples/
│       └── index.ts          — Built-in example .castscript files
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Styling: Vanilla Extract

All styles are written in TypeScript (`.css.ts` files) and compiled to static
CSS at build time — zero runtime overhead. The theme system uses a typed
contract:

```typescript
import { vars } from '../theme.css.js';

const myStyle = style({
  color: vars.color.accent,      // TypeScript error if 'accent' doesn't exist
  padding: vars.space.md,
  borderRadius: vars.radius.sm,
});
```

Dark/light themes are swapped by applying a class to `<body>`:
```typescript
document.body.className = theme === 'dark' ? darkTheme : lightTheme;
```

### localStorage keys

| Key | Content |
|---|---|
| `cb:current-script` | Current editor content (auto-saved) |
| `cb:theme` | `"dark"` or `"light"` |
| `cb:player-speed` | `0.5`, `1`, `1.5`, or `2` |
| `cb:saved-scripts` | JSON array of `{ name, script, updatedAt }` |
| `cb:last-example` | Name of the last loaded example |

---

## Browser Compatibility

Requires a modern browser with:
- ES modules (`import`/`export`)
- `localStorage`
- `URL.createObjectURL`
- `dvh` CSS units (for full-height layout)

Tested on Chrome 120+, Firefox 121+, Safari 17+.

---

## Notes

- The web app uses `@cast-builder/core` directly as an npm workspace
  dependency (`"*"`). It always uses the local version — no publish step
  needed to pick up core changes during development.
- `include:` directives in the browser use **saved scripts as the filesystem**.
  If your script has `include: login.castscript`, save a script named
  `login.castscript` in the Saved Scripts panel and it will resolve correctly.
- Scripts with `>> file.txt` (file output) will show a warning event in the
  compiled cast because there is no real filesystem in the browser. Use
  `print:` or `>` output lines instead for browser-compiled scripts.
