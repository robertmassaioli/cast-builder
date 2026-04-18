# 10 Improvement Suggestions for cast-builder

Compiled from a full repository review across security, code quality, architecture,
documentation, and developer experience. Ordered roughly by impact.

---

## 1. ✅ ~~Fix Path Traversal in the Node.js FileResolver~~ (DONE)

**Category:** Security  
**File:** `packages/cli/src/resolvers/node.ts`

`createNodeResolver()` uses `resolve(baseDir, path)` to build a full path, but
never checks whether the resolved path is actually inside `baseDir`. A
`.castscript` containing `include: ../../../etc/passwd` would silently read a
file outside the intended directory.

**Fix:** Add a sandbox check before reading:

```typescript
import { relative } from 'node:path';

const fullPath = resolve(baseDir, path);
if (relative(baseDir, fullPath).startsWith('..')) {
  return {
    ok: false,
    code: FileResolverErrorCode.AccessDenied,
    message: `Path "${path}" escapes the sandbox root "${baseDir}"`,
    path,
  };
}
```

This is especially important if `cast-builder` is ever used in a server-side
context (CI runner, web API, VS Code extension) where the input may come from
untrusted sources.

---

## 2. ✅ ~~Wrap JSON.parse in try-catch in the Decompile Command~~ (DONE)

**Category:** Security / Robustness  
**File:** `packages/cli/src/commands/decompile.ts` (lines where events and header are parsed)

The decompile command calls `JSON.parse()` on every line of a user-supplied
`.cast` file with no error handling. A malformed or adversarially crafted file
will throw an unhandled exception and crash the process with a confusing stack
trace instead of a clean error message.

**Fix:** Wrap each parse call:

```typescript
let header: CastHeaderRaw;
try {
  header = JSON.parse(lines[0] ?? '{}') as CastHeaderRaw;
} catch {
  console.error(`Error: invalid cast file — header line is not valid JSON.`);
  process.exit(1);
}
```

Do the same for event lines, skipping (with a warning) any line that fails to
parse rather than crashing.

---

## 3. ✅ ~~Add an Include Recursion Depth Limit~~ (DONE)

**Category:** Security / Robustness  
**File:** `packages/core/src/compiler/compiler.ts`

The `compileNodes()` function is recursive — an `include:` directive causes it
to call itself. There is no depth limit. A circular include (`a.castscript`
includes `b.castscript` which includes `a.castscript`) will cause a stack
overflow, crashing Node.js with no useful error message.

**Fix:** Thread a `depth` counter through `compileNodes()` and throw a
`CompileError('INCLUDE_DEPTH_EXCEEDED', ...)` when it exceeds a reasonable
limit (e.g. 16):

```typescript
async function compileNodes(
  nodes: ScriptNode[],
  ...,
  depth = 0,
): Promise<void> {
  if (depth > 16) {
    throw new CompileError('INCLUDE_DEPTH_EXCEEDED',
      'Maximum include depth (16) exceeded — possible circular include.');
  }
  // ...
  case 'include':
    await compileNodes(nodesToCompile, ..., depth + 1);
```

---

## 4. ~~📌 Pin GitHub Actions to Full Commit SHAs~~ (WON'T DO)

**Category:** Security  
**Files:** `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

Both workflows use `actions/checkout@v4` and `actions/setup-node@v4` without
pinning to full commit SHAs. A compromised `v4` tag could run arbitrary code
in a publish workflow that has `id-token: write` (npm provenance) and
`NPM_TOKEN` access.

**Fix:** Replace floating tags with pinned SHAs:

```yaml
# Before
- uses: actions/checkout@v4
- uses: actions/setup-node@v4

# After
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
- uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
```

Use a tool like [Dependabot](https://docs.github.com/en/code-security/dependabot)
or [Renovate](https://docs.renovatebot.com/) to keep SHAs up to date
automatically.

---

## 5. ~~⚡ Add a Floating-Point Precision Strategy to the v3 Encoder~~ (WON'T DO)

**Category:** Code Quality / Correctness  
**File:** `packages/core/src/encoder/v3.ts`

The v3 encoder converts delta times with `toFixed(6)` (6 decimal places =
1 microsecond precision). For recordings with many events, floating-point
rounding errors can accumulate across the event stream. Additionally, any
event with a delta below 0.0000005 seconds is silently rounded to zero,
potentially collapsing events that were intentionally distinct.

**Fix:** Track accumulated error using a compensated summation (Kahan summation)
in the encoder, or alternatively store and emit timestamps as integer
microseconds (which is lossless and still human-readable):

```typescript
// Emit times as integer microseconds — avoids all floating-point drift
const deltaMicros = Math.round(deltaSeconds * 1_000_000);
return JSON.stringify([deltaMicros / 1_000_000, event.code, event.data]);
```

Add a comment in the encoder explaining the chosen precision and why.

---

## 6. 🧪 Add a `CONTRIBUTING.md` and `CHANGELOG.md`

**Category:** Documentation / DX  
**Location:** Repository root (`cast-builder/`)

Neither file exists. Without them:
- External contributors have no guidance on coding style, branch naming,
  commit message format, or how to run tests.
- There is no record of what changed between versions — which is particularly
  important since two packages are published independently.

**`CONTRIBUTING.md` should cover:**
- Setup: `npm install` at monorepo root, `npm run build`, `npm test`
- Branch naming convention (e.g. `feat/`, `fix/`, `docs/`)
- Commit message format (conventional commits recommended — `feat:`, `fix:`, `docs:`, `chore:`)
- How to add a golden fixture (run `cast-builder compile --seed 42 --now 0`)
- How to publish (create a GitHub Release with a `vX.Y.Z` tag)

**`CHANGELOG.md` should cover:**
- `0.1.0` — initial release, list key features per package

---

## 7. ✅ ~~Update Phase Comments in Source to Reflect Actual State~~ (DONE)

**Category:** Documentation / Code Quality  
**Files:** `packages/core/src/parser/lexer.ts` (line 1), `packages/core/src/parser/parser.ts` (line 1), `packages/core/src/compiler/compiler.ts` (line 1)

Several source files begin with comments like:

```typescript
// Phase 0: structure only. Full implementation in Phase 1.
```

These were accurate during planning, but the implementation is now complete
and deployed. These stale comments are confusing to contributors who don't
know the project history — they suggest the code is unfinished.

**Fix:** Replace phase comments with accurate functional descriptions:

```typescript
/**
 * Lexer — tokenises a raw .castscript string into a flat list of Tokens.
 */
```

---

## 8. ✅ ~~Add Missing Example Scripts for Under-Documented Directives~~ (DONE)

**Category:** Documentation / DX  
**Location:** `packages/core/examples/`

Three directives are implemented and tested but have no example `.castscript`
demonstrating them:

| Directive | Status |
|---|---|
| `raw: \x1b[1mBold\x1b[0m` | Implemented, no example |
| `set typing-speed: fast` (mid-script) | Implemented, no example |
| `include: file.castscript#block-name` | Only in `modular/` — no simple standalone demo |

These are exactly the directives new users are most likely to get wrong. Add a
`examples/advanced.castscript` that exercises all three in a single readable script,
with inline comments explaining each directive.

---

## 9. 🏗️ Add a `prepublishOnly` Script to Prevent Publishing Stale Builds

**Category:** Developer Experience / Correctness  
**Files:** `packages/core/package.json`, `packages/cli/package.json`

Currently nothing prevents someone from running `npm publish` manually with a
stale or missing `dist/` directory — the wrong (or empty) package would be
uploaded to npm. The GitHub Actions workflow builds before publishing, but
manual publishes have no such guard.

**Fix:** Add a `prepublishOnly` lifecycle hook to both packages:

```json
"scripts": {
  "prepublishOnly": "npm run build",
  ...
}
```

`prepublishOnly` runs automatically before `npm publish` (but not before
`npm pack`), ensuring the build is always fresh. This also self-documents
the expected publish flow for contributors.

---

## 10. ✅ ~~Expose `onResolveError` as a CLI Flag~~ (DONE)

**Category:** Functionality / DX  
**Files:** `packages/cli/src/commands/compile.ts`, `packages/cli/README.md`

The `CompileOptions.onResolveError` setting (`'error'` | `'warn'` | `'skip'`)
is a first-class part of the `@cast-builder/core` API but is completely
inaccessible from the CLI. A user who wants to compile a script that has
`include:` directives pointing at optional files they may or may not have
locally has no way to set `'skip'` mode without writing TypeScript code.

**Fix:** Add a `--on-resolve-error` flag to the `compile` command:

```typescript
.option('--on-resolve-error <mode>', 
        'How to handle missing files: error (default) | warn | skip')
```

```bash
# Skip missing includes silently (useful for partial/offline compiles)
cast-builder compile demo.castscript out.cast --on-resolve-error skip

# Warn but continue (useful for debugging include paths)
cast-builder compile demo.castscript out.cast --on-resolve-error warn
```

Document this in the CLI README alongside the other compile flags.

---

## Summary Table

| # | Category | Effort | Impact |
|---|---|---|---|
| 1 | ✅ ~~Path traversal in node resolver~~ | Small | High |
| 2 | ✅ ~~JSON.parse error handling in decompile~~ | Small | Medium |
| 3 | ✅ ~~Include recursion depth limit~~ | Small | High |
| 4 | ~~📌 Pin GitHub Actions to commit SHAs~~ (WON'T DO) | Small | Medium |
| 5 | ~~⚡ Floating-point precision in v3 encoder~~ (WON'T DO) | Medium | Low–Medium |
| 6 | 📝 CONTRIBUTING.md + CHANGELOG.md | Medium | High |
| 7 | ✅ ~~Remove stale phase comments~~ | Tiny | Low |
| 8 | ✅ ~~Missing examples for raw/set/block include~~ | Small | Medium |
| 9 | 🏗️ `prepublishOnly` build guard | Tiny | Medium |
| 10 | ✅ ~~`--on-resolve-error` CLI flag~~ | Small | Medium |
