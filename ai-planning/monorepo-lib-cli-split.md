# Proposal: Split `cast-builder` into a Monorepo (Library + CLI)

## Overview

Currently `cast-builder` is a single npm package that is simultaneously:
- A **CLI tool** (`cast-builder compile`, `decompile`, `validate`, etc.)
- An implicit **library** (the parser, compiler, and encoders are pure TypeScript
  modules that any Node.js/Deno/Bun program could import directly)

The `commander` dependency is only needed for the CLI layer. The library core
(`parser/`, `compiler/`, `encoder/`, `util/`) has **zero runtime dependencies**
and is already cleanly separated from `cli/` in the source tree.

This proposal recommends splitting into a monorepo with two packages:

| Package | Name | Role |
|---|---|---|
| Library | `@cast-builder/core` | Parser, compiler, encoders, utilities — zero deps |
| CLI | `cast-builder` | CLI wrapper — depends on `@cast-builder/core` + `commander` |

---

## 1. Is It Already Usable as a Library?

**Partially yes** — the core modules are importable today:

```typescript
import { parse } from 'cast-builder/dist/parser/parser.js';
import { compile } from 'cast-builder/dist/compiler/compiler.js';
import { encodeV3 } from 'cast-builder/dist/encoder/v3.js';
```

But this is **not a proper library API** because:

- Deep import paths like `/dist/parser/parser.js` are an implementation detail,
  not a stable public API surface.
- There is no `exports` field in `package.json` defining what is public.
- `commander` is a runtime dependency even for consumers who only want the
  parser/compiler — they pay for it but never use it.
- The package name `cast-builder` signals a tool, not a library.
- TypeScript consumers get no guidance on which types are public vs internal.
- There is no `main` / `exports` entry point for `import 'cast-builder'`.

---

## 2. Who Would Use the Library?

Splitting enables a new class of consumers that cannot practically use the CLI:

| Consumer | Use case |
|---|---|
| **CI/CD pipelines** | Programmatically compile `.castscript` → `.cast` as part of a docs build, without shelling out to a subprocess |
| **Vite / webpack plugins** | `castscript-loader` that auto-compiles on file change during dev |
| **Astro / Next.js / Docusaurus plugins** | Embed compiled casts directly into static site builds |
| **asciinema server** | Custom ingestion pipeline that accepts `.castscript` uploads and compiles server-side |
| **Editor extensions** | VS Code extension for `.castscript` with live preview, syntax highlighting, diagnostics |
| **Test frameworks** | Assert on compiled cast output in unit tests (`expect(compile(src).events).toMatchSnapshot()`) |
| **`cast-edit` tool** | The companion editor (see `asciinema-cast-editor.md`) can import `@cast-builder/core` encoders to avoid duplicating the v2/v3 serialisation logic |

---

## 3. Proposed Monorepo Structure

```
cast-builder/                        ← monorepo root
├── package.json                     ← workspace root (npm workspaces)
├── .npmrc                           ← registry config
├── .gitignore
├── README.md                        ← top-level overview
│
├── packages/
│   ├── core/                        ← @cast-builder/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts             ← public API entry point
│   │   │   ├── parser/
│   │   │   │   ├── types.ts
│   │   │   │   ├── lexer.ts
│   │   │   │   └── parser.ts
│   │   │   ├── compiler/
│   │   │   │   ├── types.ts
│   │   │   │   ├── compiler.ts
│   │   │   │   └── timing.ts
│   │   │   ├── encoder/
│   │   │   │   ├── v2.ts
│   │   │   │   └── v3.ts
│   │   │   └── util/
│   │   │       ├── ansi.ts
│   │   │       ├── duration.ts
│   │   │       ├── rng.ts
│   │   │       └── terminal.ts
│   │   └── tests/                   ← all existing unit + golden tests
│   │       ├── parser/
│   │       ├── compiler/
│   │       ├── encoder/
│   │       └── golden/
│   │
│   └── cli/                         ← cast-builder (the CLI)
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts             ← commander wiring
│       │   └── commands/
│       │       ├── compile.ts
│       │       ├── validate.ts
│       │       ├── preview.ts
│       │       ├── init.ts
│       │       └── decompile.ts
│       └── tests/                   ← CLI integration tests (spawn subprocess)
│
├── examples/                        ← shared examples (used by both packages)
│   ├── hello-world.castscript
│   ├── hello-world.cast
│   └── ...
│
└── ai-planning/                     ← planning docs
    └── ...
```

---

## 4. Package Details

### 4.1 `@cast-builder/core`

```json
{
  "name": "@cast-builder/core",
  "version": "0.1.0",
  "description": "Library for parsing and compiling .castscript files into asciinema .cast recordings",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./parser": {
      "import": "./dist/parser/index.js",
      "types": "./dist/parser/index.d.ts"
    },
    "./compiler": {
      "import": "./dist/compiler/index.js",
      "types": "./dist/compiler/index.d.ts"
    },
    "./encoder": {
      "import": "./dist/encoder/index.js",
      "types": "./dist/encoder/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "dependencies": {},
  "engines": { "node": ">=18.0.0" }
}
```

**No runtime dependencies.** The public `src/index.ts` re-exports the stable
public API surface:

```typescript
// packages/core/src/index.ts

// High-level: the two functions most consumers need
export { parse } from './parser/parser.js';
export { compile } from './compiler/compiler.js';

// Encoders
export { encodeV2 } from './encoder/v2.js';
export { encodeV3 } from './encoder/v3.js';

// Types (all public)
export type { Config, ScriptNode, ParseResult, StyledText } from './parser/types.js';
export type { CastHeader, CastEvent, CompiledCast, TypingProfile } from './compiler/types.js';

// Utilities (useful for downstream tools like cast-edit)
export { stripAllEscapes, ScreenBuffer } from './util/terminal.js';
export { parseDuration } from './util/duration.js';
export { modifiersToAnsi, RESET, CLEAR_SCREEN, CRLF } from './util/ansi.js';
```

**Usage after publish:**

```typescript
import { parse, compile, encodeV3 } from '@cast-builder/core';

const src = await fs.readFile('demo.castscript', 'utf8');
const { config, nodes } = parse(src);
config.typingSeed = 42; // deterministic
const cast = compile(config, nodes);
const output = encodeV3(cast);
await fs.writeFile('demo.cast', output);
```

---

### 4.2 `cast-builder` (CLI)

```json
{
  "name": "cast-builder",
  "version": "0.1.0",
  "description": "CLI tool for compiling .castscript files into asciinema .cast recordings",
  "type": "module",
  "bin": { "cast-builder": "./dist/index.js" },
  "files": ["dist", "README.md"],
  "dependencies": {
    "@cast-builder/core": "^0.1.0",
    "commander": "^12.0.0"
  },
  "engines": { "node": ">=18.0.0" }
}
```

The CLI imports **only** from `@cast-builder/core` — no direct imports from
internal parser/compiler paths:

```typescript
// packages/cli/src/commands/compile.ts
import { parse, compile, encodeV3 } from '@cast-builder/core';
```

This means the CLI is a thin wrapper: argument parsing + file I/O. All logic
lives in `@cast-builder/core`.

---

## 5. Workspace Root Configuration

```json
// cast-builder/package.json (root)
{
  "name": "cast-builder-monorepo",
  "private": true,
  "workspaces": ["packages/core", "packages/cli"],
  "scripts": {
    "build":      "npm run build --workspaces",
    "test":       "npm run test --workspaces",
    "lint":       "npm run lint --workspaces",
    "format":     "npm run format --workspaces",
    "dev":        "npm run dev --workspace=packages/cli"
  }
}
```

`npm install` at the root installs all dependencies and symlinks
`@cast-builder/core` into `packages/cli/node_modules` automatically via
npm workspaces. No extra tooling (Turborepo, Nx, Lerna) is needed.

---

## 6. Migration Plan

Phase 0 (current) → Phase 1 (monorepo) is a **non-breaking refactor**:

| Step | Action |
|---|---|
| 1 | Create `packages/core/` and `packages/cli/` directories |
| 2 | Move `src/parser/`, `src/compiler/`, `src/encoder/`, `src/util/` → `packages/core/src/` |
| 3 | Move `src/cli/`, `src/index.ts` → `packages/cli/src/` |
| 4 | Move `tests/` → `packages/core/tests/` |
| 5 | Write `packages/core/src/index.ts` public API re-exports |
| 6 | Update CLI imports to use `@cast-builder/core` |
| 7 | Update root `package.json` to workspace config |
| 8 | Update `tsconfig.json` in each package (separate `rootDir`/`outDir`) |
| 9 | Move `examples/` to monorepo root (shared) |
| 10 | Update golden test paths |
| 11 | `npm install` at root, verify `npm test --workspaces` passes |
| 12 | `npm publish --workspace=packages/core` then `npm publish --workspace=packages/cli` |

Estimated effort: **2–3 hours** — mostly mechanical file moves and import path updates.

---

## 7. Versioning & Publishing Strategy

Both packages are versioned **independently**. Breaking changes to the core API
bump `@cast-builder/core`'s major version; CLI-only changes (new flags, UX
improvements) only bump `cast-builder`'s version.

The CLI uses a **range dependency** on core (`^0.1.0`) so minor core releases
are picked up automatically by existing CLI installs.

```
@cast-builder/core   cast-builder (CLI)
0.1.0           ←── 0.1.0   (initial release)
0.2.0 (new enc) ←── 0.1.1   (bumped for new --flag only)
1.0.0 (stable)  ←── 1.0.0   (both go stable together)
```

Publish order must always be: **core first**, then **CLI**.

---

## 8. Should We Do This Now?

### Do it now if:
- You anticipate building downstream tools soon (e.g. `cast-edit`, a Vite
  plugin, a VS Code extension) that would benefit from importing
  `@cast-builder/core` directly.
- You want a clean public API with stable `exports` before 1.0.0.
- You want to avoid `commander` being a transitive dependency for library
  consumers.

### Defer if:
- The CLI is the only consumer right now and no downstream integrations are
  planned soon.
- You want to keep the setup simple while still pre-1.0.0.
- The monorepo overhead isn't worth it yet.

### Middle ground (recommended for now):
Add an `exports` field to the current single package that exposes a clean
public API, and move to a full monorepo when a second consumer (e.g. `cast-edit`)
actually needs it. This gives library usability today with minimal restructuring:

```json
// package.json addition (minimal, no monorepo needed)
"exports": {
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
  "./parser": { "import": "./dist/parser/parser.js", "types": "./dist/parser/parser.d.ts" },
  "./compiler": { "import": "./dist/compiler/compiler.js", "types": "./dist/compiler/compiler.d.ts" },
  "./encoder/v3": { "import": "./dist/encoder/v3.js", "types": "./dist/encoder/v3.d.ts" },
  "./encoder/v2": { "import": "./dist/encoder/v2.js", "types": "./dist/encoder/v2.d.ts" }
}
```

And add a `src/index.ts` that re-exports the public API, keeping `commander`
out of the library surface (it's already not exported).

---

## 9. Summary

| Dimension | Current (single package) | Monorepo (lib + CLI) |
|---|---|---|
| Library usability | Possible but undocumented | First-class with stable `exports` |
| `commander` in lib consumers | Yes (transitive) | No |
| Setup complexity | Simple | Moderate (npm workspaces) |
| Publish steps | 1 package | 2 packages, in order |
| Downstream tools (cast-edit, plugins) | Must copy code or deep-import | `import from '@cast-builder/core'` |
| Versioning | Coupled | Independent |
| Recommended timing | Now (add `exports` only) | When second consumer exists |
