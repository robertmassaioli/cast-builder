# Phase 5 Spec: Share Links (`?s=...`)

## Overview

Allow a user to share their current `.castscript` as a URL. Anyone who opens
the URL sees the script pre-loaded in the editor and the compiled cast playing
immediately — no account, no server, no upload.

```
https://robertmassaioli.github.io/cast-builder/?s=<encoded-script>
```

---

## 1. Encoding Strategy

### Why not raw base64?

Raw base64 expands data by ~33%. The largest example script is ~2.6KB →
~3.5KB as base64. GitHub Pages is served via GitHub's CDN; the practical URL
length limit varies by browser:

| Browser | Max URL length |
|---|---|
| Chrome | ~2MB (but servers reject >8KB) |
| Firefox | ~64KB |
| Safari | ~80KB |
| GitHub Pages (nginx) | **~8KB** ← the binding constraint |

Scripts with many output lines or long `cat` file dumps can easily exceed 8KB
uncompressed. Raw base64 is insufficient.

### Recommendation: LZ-string compression + URL-safe base64

Use [`lz-string`](https://www.npmjs.com/package/lz-string) — a tiny (3KB
gzip) library designed exactly for this use case. It compresses and
URL-encodes in one step via `LZString.compressToEncodedURIComponent()`.

Typical compression ratios for `.castscript` content (repetitive, ASCII text):

| Script | Raw | Compressed |
|---|---|---|
| `hello-world.castscript` | 52B | ~80B (small penalty for tiny inputs) |
| `git-workflow.castscript` | 838B | ~420B (50% compression) |
| `forge-deploy.castscript` | 1,259B | ~580B (54% compression) |
| `advanced.castscript` | 2,625B | ~1,050B (60% compression) |

Even a 5,000-byte script compresses to ~2,000 bytes — well within the 8KB URL
limit.

### Encoding/decoding

```typescript
import LZString from 'lz-string';

// Encode (script → URL param value)
const encoded = LZString.compressToEncodedURIComponent(script);
const shareUrl = `${location.origin}${location.pathname}?s=${encoded}`;

// Decode (URL param value → script)
const raw = new URLSearchParams(location.search).get('s');
const script = raw ? LZString.decompressFromEncodedURIComponent(raw) : null;
```

The `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`
methods handle all URL encoding — no need for `encodeURIComponent` / `decodeURIComponent`.

### What if the script is still too long?

If the compressed script exceeds **6KB** (leaving 2KB headroom for the base
URL and other params), the Share button should:
1. Still generate the URL
2. Show a warning: _"⚠️ This URL is very long (~Xkb) and may not work in all
   browsers. Consider saving your script and sharing a smaller version."_

---

## 2. URL Behaviour

### 2.1 Loading a share link

When the app loads and `?s=` is present in the URL:

1. **Decode** the script from the param
2. **Do NOT overwrite** the user's localStorage current script automatically
3. **Show a banner** (see §4) with two options:
   - "Use this shared script" — loads it into the editor (and saves to
     localStorage as current)
   - "Dismiss" — ignores the URL param and keeps the user's existing script
4. After the user chooses, **replace the URL** with the base URL (no `?s=`)
   using `history.replaceState()` — keeps the address bar clean

**Rationale for the banner:** silently overwriting localStorage is destructive.
A user who has unsaved work and accidentally opens a share link should not lose
their script.

**Exception:** if localStorage has no current script (first visit), load the
shared script silently without a banner.

### 2.2 URL updates

The URL is **not** updated live as the user types. This would:
- Cause constant `history.pushState` calls
- Make the back button useless
- Feel strange

Instead, the URL is only updated when the user explicitly clicks **Share**.

### 2.3 Shareable URL does not include theme or speed

The share link encodes only the script text. Theme and speed are user
preferences, not content — the recipient should see the script in their own
theme.

---

## 3. Size Limits and Fallback

| Compressed size | Behaviour |
|---|---|
| ≤ 6KB | Normal share link generated |
| 6–8KB | Share link generated + warning shown |
| > 8KB | Share button disabled with tooltip: _"Script too large to share as a URL. Save it and share the file instead."_ |

---

## 4. UI Changes

### 4.1 Share button

Add a **Share** button to the status bar actions (next to the existing
Download/Copy/Saved buttons):

```
⬇ Script  ⬇ .cast  📋 Copy  🔗 Share  💾 Saved Scripts
```

Clicking **Share**:
1. Computes the share URL
2. Copies it to the clipboard automatically
3. Changes the button label to "✓ Copied!" for 2 seconds, then back to
   "🔗 Share"
4. If the script is too large (>8KB compressed), shows the error state

### 4.2 Incoming share banner

A dismissible banner shown below the header when a `?s=` param is detected:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📎 A shared script was linked — do you want to load it?           │
│                    [Use shared script]  [Dismiss]                   │
└─────────────────────────────────────────────────────────────────────┘
```

- The banner sits between the header and the main panels
- It is only shown once per page load (if dismissed, it stays dismissed for
  that session — not stored in localStorage)
- After the user clicks either button, the banner disappears and the URL
  is cleaned up with `history.replaceState`

### 4.3 "Script too large" state

When the compressed script exceeds 8KB:
- The Share button is disabled and shows a tooltip explaining why
- No URL is generated

---

## 5. Implementation Steps

### Step 1 — Install `lz-string`

```bash
npm install --save --workspace=packages/web lz-string
npm install --save-dev --workspace=packages/web @types/lz-string
```

### Step 2 — Create `src/share/shareLink.ts`

```typescript
import LZString from 'lz-string';

const WARN_BYTES = 6_000;
const MAX_BYTES  = 8_000;

export type ShareResult =
  | { ok: true;  url: string; warn: false }
  | { ok: true;  url: string; warn: true; bytes: number }
  | { ok: false; reason: 'too-large'; bytes: number };

export function buildShareUrl(script: string): ShareResult {
  const encoded = LZString.compressToEncodedURIComponent(script);
  const url = `${location.origin}${location.pathname}?s=${encoded}`;
  const bytes = encoded.length;

  if (bytes > MAX_BYTES) return { ok: false, reason: 'too-large', bytes };
  if (bytes > WARN_BYTES) return { ok: true, url, warn: true, bytes };
  return { ok: true, url, warn: false };
}

export function extractSharedScript(): string | null {
  const raw = new URLSearchParams(location.search).get('s');
  if (!raw) return null;
  try {
    return LZString.decompressFromEncodedURIComponent(raw) ?? null;
  } catch {
    return null; // Malformed — ignore silently
  }
}

export function clearShareParam(): void {
  const url = new URL(location.href);
  url.searchParams.delete('s');
  history.replaceState(null, '', url.toString());
}
```

### Step 3 — Create `src/components/ShareBanner.tsx`

A simple banner component shown when `extractSharedScript()` returns a script.
Props: `script`, `onAccept(script)`, `onDismiss()`.

### Step 4 — Create `src/components/ShareBanner.css.ts`

Styles for the banner — uses `vars.color.accentDim` as background, accent
border on the left, flex layout with two action buttons.

### Step 5 — Update `StatusBar.tsx`

Add `onShare: () => void` and `shareState: 'idle' | 'copied' | 'too-large'`
props. Render the Share button and its state.

### Step 6 — Update `Footer.tsx`

Pass through the new `onShare` and `shareState` props from App.

### Step 7 — Update `App.tsx`

```typescript
// On mount
const sharedScript = extractSharedScript();
const [showBanner, setShowBanner] = useState(!!sharedScript && !!getCurrentScript());

// If first visit (no saved script), load silently
useEffect(() => {
  if (sharedScript && !getCurrentScript()) {
    setSource(sharedScript);
    clearShareParam();
  }
}, []);

// Share button handler
const handleShare = async () => {
  const result = buildShareUrl(source);
  if (!result.ok) { setShareState('too-large'); return; }
  await navigator.clipboard.writeText(result.url);
  setShareState('copied');
  setTimeout(() => setShareState('idle'), 2000);
  if (result.warn) { /* show warning somehow */ }
};
```

### Step 8 — Add size warning in StatusBar

When `shareState === 'too-large'`, show a brief error message next to the
Share button.

---

## 6. Edge Cases

| Scenario | Behaviour |
|---|---|
| Malformed `?s=` value | `decompressFromEncodedURIComponent` returns `null` → silently ignored; URL cleaned up |
| Script decompresses to empty string | Treated as null — no banner shown |
| User opens share link on mobile | Banner shown; works the same (no special handling needed) |
| Share link opened in an iframe | `location.href` is the iframe URL — share link will point to the iframe URL. Acceptable edge case. |
| Old share link (pre-compression change) | Would fail to decompress → silently ignored |
| `navigator.clipboard` unavailable (insecure context) | Fall back to `prompt('Copy this URL:', url)` |

---

## 7. Testing

- `buildShareUrl(script)` — unit test: small script → ok, large script → too-large
- `extractSharedScript()` — unit test: valid encoded param, malformed param, missing param
- `clearShareParam()` — unit test: URL cleaned correctly
- Banner: renders when `?s=` present; Accept loads script and clears URL; Dismiss clears URL without loading

---

## 8. Dependencies Added

| Package | Version | Size (gzip) | Purpose |
|---|---|---|---|
| `lz-string` | `^1.5.0` | ~3KB | Compression + URL-safe encoding |
| `@types/lz-string` | `^1.5.0` | ~1KB (dev only) | TypeScript types |

**Total bundle impact: ~3KB gzip** — very acceptable.

---

## 9. Include Directives in Shared Scripts

Scripts that use `include:` or `>> file.txt` depend on **named files** that are
stored in the recipient's localStorage. A share link only encodes the main
script — it cannot encode the included files.

### The problem

If a user shares this script:
```
include: login.castscript#login
```

The recipient will see a compile error:
```
✘ File not found: login.castscript [NOT_FOUND]
```

because their localStorage doesn't contain a script named `login.castscript`.

### Options

#### Option A — Detect and warn (minimal, recommended for Phase 5)

Before generating the share URL, scan the script for `include:` and `>>`
directives. If any are found, show a warning in the Share UI:

> ⚠️ This script uses `include:` directives. Recipients will need the following
> scripts saved in their browser to compile it:
> - `login.castscript`
>
> Consider inlining the content or sharing those scripts separately.

No change to encoding — the share link is still generated. The recipient sees
a compile error with a clear `NOT_FOUND` message (already handled by
`onResolveError: 'warn'` mode).

**Pros:** Simple, no extra encoding work  
**Cons:** Recipient gets a broken link unless they manually add the included files

#### Option B — Inline all includes before sharing (recommended for Phase 6+)

Before encoding, recursively resolve all `include:` directives from localStorage
and inline them as `>` output lines or as named blocks embedded in the script.
Essentially a "flatten" operation that produces a self-contained script.

```typescript
export function flattenIncludes(script: string, savedScripts: Map<string, string>): string {
  // Replace each `include: name` with the content of the named saved script
  // Recursively flattens nested includes (with depth limit)
}
```

The share link then encodes the flattened script — fully self-contained, no
dependencies on the recipient's localStorage.

**Pros:** Share links always work, no dependencies  
**Cons:** The flattened script may be larger; the recipient can't see the modular
structure; requires implementing `flattenIncludes()`. Deferred to Phase 6.

#### Option C — Encode all dependencies in the URL

Encode the main script + all included scripts as a JSON bundle, compress and
share as `?s=<bundle>`.

```typescript
interface ShareBundle {
  main: string;
  files: Record<string, string>; // { 'login.castscript': '...' }
}
```

On load, the banner offers to import all included files into the recipient's
saved scripts automatically.

**Pros:** Fully self-contained, preserves modularity, recipient gets the included
files in their saved scripts  
**Cons:** Larger URL (multiple scripts encoded); more complex banner UI;
potential for name collisions with recipient's existing saved scripts

**Deferred to Phase 6.**

### Phase 5 recommendation: Option A

Detect `include:` / `>>` directives and warn the user before sharing. The
compile error on the recipient's end will be clear (`NOT_FOUND`), and the
`--on-resolve-error: warn` mode means the cast will still compile partially
(skipping the missing includes) rather than failing entirely.

Add a pre-share check:

```typescript
export function detectExternalDependencies(script: string): string[] {
  const deps: string[] = [];
  for (const line of script.split('\n')) {
    const includeMatch = line.match(/^include:\s*(\S+?)(?:#\S+)?$/);
    const fileMatch    = line.match(/^>>\s*(\S+)$/);
    if (includeMatch?.[1]) deps.push(includeMatch[1]);
    if (fileMatch?.[1])    deps.push(fileMatch[1]);
  }
  return [...new Set(deps)];
}
```

If `detectExternalDependencies(script).length > 0`, show the warning alongside
the share URL.

---

## 10. Summary

| Decision | Choice | Rationale |
|---|---|---|
| Compression | `lz-string` | Tiny, purpose-built for URL encoding, ~50–60% compression on castscript |
| Max URL size | 8KB (compressed) | GitHub Pages/nginx safe limit |
| Warning threshold | 6KB compressed | 2KB headroom |
| Live URL update | ❌ No | Destructive to back-button, confusing UX |
| Load behaviour | Banner for existing users, silent for first visit | Prevents overwriting unsaved work |
| Includes theme/speed | ❌ No | User preferences, not content |
| Clipboard fallback | `prompt()` | For insecure contexts (non-HTTPS) |
