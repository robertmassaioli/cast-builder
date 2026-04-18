# Proposal: CSS Architecture Improvement for `packages/web`

## The Problem

`src/styles.css` is 434 lines of global CSS for the entire app. As the app
grows it will become:

- **Hard to navigate** — styles for unrelated components are interleaved
- **Hard to refactor** — renaming a class means finding all usages across `.css`
  and `.tsx` files
- **Prone to collision** — global class names like `.btn` or `.icon-btn` can
  accidentally affect unintended elements
- **Disconnected from components** — there's no mechanical link between a
  component's JSX and its styles

The ideal solution **co-locates styles with the component** that uses them,
gives TypeScript-level safety, and ideally keeps the bundle small.

---

## Constraint: Preact compatibility

We use **Preact** (not React). This rules out or complicates some options:

- ✅ Any CSS-in-JS that works with standard JSX/TSX (most do)
- ✅ CSS Modules (Vite native, framework-agnostic)
- ✅ Vanilla Extract (Vite native, framework-agnostic)
- ✅ Linaria / Panda CSS (compile-time, framework-agnostic)
- ⚠️ `styled-components` — works with Preact via `preact/compat` but adds
  runtime overhead and requires `babel-plugin-styled-components` for optimal
  DX; not recommended for Preact-first projects
- ❌ Chakra UI / MUI — React-specific, not worth the compat shim overhead

---

## Options

### Option A: CSS Modules (recommended baseline)

**What it is:** Vite has built-in CSS Modules support — rename `styles.css` →
`Component.module.css`, import as an object, use `styles.className`.

```tsx
// Editor.module.css
.container { height: 100%; overflow: hidden; }
.errorLine  { background: rgba(248, 81, 73, 0.15); }

// Editor.tsx
import styles from './Editor.module.css';
<div class={styles.container} />
```

**How it works:** Vite compiles class names to unique hashes (`Editor_container_x3f2`)
at build time. Zero runtime overhead. CSS still lives in `.css` files, just
split per-component.

| | |
|---|---|
| Runtime cost | **Zero** — purely build-time |
| Bundle impact | Same as current (CSS extracted to a `.css` file) |
| TypeScript safety | Partial — class names are typed as `string`, not validated |
| Preact compat | ✅ Native — just Vite |
| DX | Good — familiar CSS syntax, co-located with component |
| CSS variables / theming | ✅ Works normally — global vars still apply |
| Vite config change | None |

**Migration effort:** Low — move CSS rules into per-component files.

---

### Option B: Vanilla Extract ⭐ (recommended for this project)

**What it is:** Styles are written in TypeScript (`.css.ts` files), compiled at
build time to static CSS. No runtime. Full TypeScript type-safety on class names.
Invented by the Seek team; used by major design systems.

```tsx
// editor.css.ts
import { style } from '@vanilla-extract/css';

export const container = style({
  height: '100%',
  overflow: 'hidden',
});

export const errorLine = style({
  backgroundColor: 'rgba(248, 81, 73, 0.15)',
  borderLeft: '3px solid #f85149',
});

// Editor.tsx
import * as styles from './editor.css.js';
<div class={styles.container} />   // ← TypeScript knows container exists
```

**Theming** via `createTheme` / `createGlobalTheme` — replaces the current CSS
custom properties (`--bg`, `--text`, etc.) with a typed theme contract:

```typescript
// theme.css.ts
import { createTheme, createGlobalTheme } from '@vanilla-extract/css';

export const [darkTheme, vars] = createTheme({
  color: { bg: '#0d1117', text: '#c9d1d9', accent: '#7c6af7', border: '#30363d' },
  space: { sm: '4px', md: '8px', lg: '16px' },
});

export const lightTheme = createTheme(vars, {
  color: { bg: '#ffffff', text: '#24292f', accent: '#6e5fdb', border: '#d0d7de' },
  space: { sm: '4px', md: '8px', lg: '16px' },
});
```

Switching theme is as simple as swapping a class on `<body>` — no JavaScript
style injection at runtime.

| | |
|---|---|
| Runtime cost | **Zero** — all compiled to static CSS at build time |
| Bundle impact | Same or smaller (deduplication at compile time) |
| TypeScript safety | **Full** — missing class names are TypeScript errors |
| Preact compat | ✅ Framework-agnostic |
| DX | Excellent — write CSS in TS, IDE autocomplete on style properties |
| CSS variables / theming | ✅ Typed theme contract replaces manual `--var` |
| Vite config change | Add `@vanilla-extract/vite-plugin` |

**Migration effort:** Medium — rewrite CSS in TypeScript syntax, replace `--var` 
references with typed `vars.color.accent` etc. ~3–4 hours for the current 434 lines.

---

### Option C: `styled-components` / `@emotion/styled`

**What it is:** The classic CSS-in-JS approach — write CSS as template literals
inside component files, injected into `<style>` tags at runtime.

```tsx
import styled from 'styled-components';
const Container = styled.div`
  height: 100%;
  overflow: hidden;
`;
```

| | |
|---|---|
| Runtime cost | **Non-zero** — CSS injected at runtime via JS |
| Bundle impact | Adds ~12–30KB (styled-components runtime) |
| TypeScript safety | Good (with `@types/styled-components`) |
| Preact compat | ⚠️ Requires `preact/compat` alias in Vite config |
| DX | Excellent — co-location, prop-based variants |
| SSR | Requires additional setup |
| Theming | ThemeProvider context pattern |

**Not recommended** for this project because:
1. Runtime cost is unnecessary — our styles are entirely static
2. Preact compat adds complexity and bundle size
3. Vanilla Extract gives the same DX with zero runtime overhead

---

### Option D: Linaria (compile-time styled-components)

**What it is:** Same API as styled-components but extracted to static CSS at
build time. No runtime. Works with Vite via `@linaria/vite`.

```tsx
import { styled } from '@linaria/react';
const Container = styled.div`
  height: 100%;
  overflow: hidden;
`;
```

| | |
|---|---|
| Runtime cost | **Zero** — extracted at build time |
| Bundle impact | Minimal |
| TypeScript safety | Moderate |
| Preact compat | ⚠️ Uses `@linaria/react` — needs testing with Preact |
| DX | Good — familiar styled-components syntax |
| Vite config | `@linaria/vite` |

---

### Option E: UnoCSS (utility-first, Tailwind-compatible)

**What it is:** A utility-first atomic CSS engine — like Tailwind but
on-demand (only generates CSS for classes actually used).

```tsx
<div class="h-full overflow-hidden flex flex-col" />
```

| | |
|---|---|
| Runtime cost | **Zero** — pure static CSS |
| Bundle impact | Typically very small (only used utilities) |
| TypeScript safety | None on class names (unless using typed variants) |
| Preact compat | ✅ Framework-agnostic |
| DX | Divisive — some love it, some hate the long class strings |
| Theming | CSS variables via `@unocss/preset-mini` theme config |

**Not recommended** for this project — a terminal-themed UI editor benefits
from expressive, named styles rather than utility classes. The current styles
are precise and custom (e.g. the resize handle, CodeMirror theme overrides).
Utility classes would be verbose and less readable here.

---

## Recommendation: **Vanilla Extract**

For this project specifically:

1. **Zero runtime** — critical for a tool that already loads CodeMirror +
   asciinema-player. We don't want more JS for styling.
2. **TypeScript-native** — the entire project is TypeScript. Writing styles in
   TypeScript means IDE autocomplete, rename refactoring, and type errors when
   a style is deleted but still referenced.
3. **Typed theming** — replaces the current ad-hoc `--css-variable` theme with
   a typed contract. Dark/light switching is just a class swap.
4. **Preact-compatible** — no compat shims needed; Vanilla Extract is framework-
   agnostic.
5. **Vite-native** — the `@vanilla-extract/vite-plugin` integrates with zero
   additional config.

The only real trade-off vs CSS Modules is that CSS syntax is replaced with
TypeScript object syntax — a small learning curve but one that pays off
immediately with type safety.

---

## Migration Plan (if Vanilla Extract is chosen)

### Phase 1 — Setup (30 mins)
```bash
npm install --save-dev @vanilla-extract/css @vanilla-extract/vite-plugin
```

Add to `vite.config.ts`:
```typescript
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
plugins: [preact(), vanillaExtractPlugin()],
```

### Phase 2 — Theme contract (1 hour)

Create `src/theme.css.ts`:
```typescript
import { createTheme } from '@vanilla-extract/css';

export const [darkTheme, vars] = createTheme({
  color: {
    bg: '#0d1117',        bgPanel: '#161b22',  bgHeader: '#1c2128',
    bgInput: '#21262d',   border: '#30363d',   text: '#c9d1d9',
    textMuted: '#6e7681', accent: '#7c6af7',   accentDim: '#2d2563',
    ok: '#3fb950',        error: '#f85149',
    btnBg: '#21262d',     btnHover: '#30363d', btnBorder: '#30363d',
  },
});

export const lightTheme = createTheme(vars, {
  color: {
    bg: '#ffffff',        bgPanel: '#f6f8fa',  bgHeader: '#f6f8fa',
    bgInput: '#ffffff',   border: '#d0d7de',   text: '#24292f',
    textMuted: '#57606a', accent: '#6e5fdb',   accentDim: '#ddd9f9',
    ok: '#3fb950',        error: '#f85149',
    btnBg: '#f6f8fa',     btnHover: '#eaeef2', btnBorder: '#d0d7de',
  },
});
```

Apply to `<body>` in `App.tsx`:
```typescript
document.body.className = theme === 'dark' ? darkTheme : lightTheme;
```

### Phase 3 — Per-component style files (2–3 hours)

Split `styles.css` into:
```
src/
  theme.css.ts          — theme contract (darkTheme, lightTheme, vars)
  global.css.ts         — global resets, body, #app (createGlobalStyle)
  components/
    Editor.css.ts
    Player.css.ts
    StatusBar.css.ts
    SavedScripts.css.ts
    ExamplesMenu.css.ts
  App.css.ts
```

Delete `src/styles.css` once all rules are migrated.

### Phase 4 — Verify (30 mins)
- `npm run build` — check no regressions
- Visual check of dark + light themes
- Verify CodeMirror theme overrides still apply (they use `.cm-*` classes via
  `EditorView.theme()` — unaffected by Vanilla Extract)

**Total estimated effort: ~4–5 hours**

---

## Summary

| Option | Runtime | TS safety | Preact | Effort | Recommendation |
|---|---|---|---|---|---|
| CSS Modules | Zero | Partial | ✅ Native | Low | Good baseline |
| **Vanilla Extract** | **Zero** | **Full** | **✅ Native** | **Medium** | **⭐ Recommended** |
| styled-components | Runtime | Good | ⚠️ Compat | Medium | Not recommended |
| Linaria | Zero | Moderate | ⚠️ Untested | Medium | Acceptable |
| UnoCSS | Zero | None | ✅ Native | Low | Not a good fit here |
