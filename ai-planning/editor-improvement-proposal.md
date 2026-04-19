# Proposal: Editor Improvement for `packages/web`

## Current State & Problems

The current editor uses **CodeMirror 6** with `basicSetup` and a
`StreamLanguage` definition. It provides:

- ✅ Syntax highlighting (section-aware, colour-coded directives)
- ✅ Line numbers and active line highlight
- ✅ Basic autocomplete (Ctrl+Space)
- ✅ Error line decoration
- ✅ Ctrl+Enter to compile
- ❌ **No selection-based formatting** — selecting text and pressing Tab,
  quoting it, or wrapping it does nothing useful
- ❌ **No comment toggling** — Ctrl+/ does not comment/uncomment lines
- ❌ **No bracket matching** for `{style: text}` inline tags
- ❌ **No find / replace** (Ctrl+F does nothing)
- ❌ **No multi-cursor** (Alt+click or Ctrl+D for matching word selection)
- ❌ **No indent/unindent** on selection (Tab only indents the cursor line)
- ❌ **No line move** (Alt+Up/Down to swap lines)
- ❌ **No proper Undo history** across external value loads
- ❌ **No fold/collapse** for long output blocks
- ❌ **Theme-switching** recreates the entire editor (causes cursor position loss)

---

## Option A: Upgrade CodeMirror 6 with the Full Extension Set

**What:** Keep CodeMirror 6 but replace `basicSetup` with a carefully chosen
set of `@codemirror/*` extensions that address every missing feature.

### What to add

| Feature | Extension / Package |
|---|---|
| Comment toggling (Ctrl+/) | `toggleComment` from `@codemirror/commands` |
| Find / replace (Ctrl+F) | `@codemirror/search` — `openSearchPanel` |
| Multi-cursor | `@codemirror/commands` — `selectNextOccurrence`, `addCursorDown` |
| Bracket matching for `{}` | `@codemirror/language` — `bracketMatching()` |
| Auto-close `{}` | `@codemirror/autocomplete` — `closeBrackets()` |
| Selection indent/unindent | `@codemirror/commands` — `indentSelection`, `indentLess` |
| Line move (Alt+↑/↓) | `@codemirror/commands` — `moveLineUp`, `moveLineDown` |
| Lezer grammar (better HL) | Write a `@lezer/generator` grammar → replaces `StreamLanguage` |
| Fold output blocks | `@codemirror/language` — `foldGutter`, `foldService` |
| Persistent theme switch | Swap a `Compartment` instead of recreating the editor |
| Full keymap | Replace `defaultKeymap` with `standardKeymap` + `searchKeymap` etc. |

### Implementation sketch

```typescript
import {
  keymap, drawSelection, dropCursor, rectangularSelection,
  crosshairCursor, lineNumbers, highlightActiveLine, EditorView,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import {
  indentOnInput, syntaxHighlighting, defaultHighlightStyle,
  bracketMatching, foldGutter, foldKeymap,
} from '@codemirror/language';
import {
  defaultKeymap, historyKeymap, indentWithTab,
  moveLineUp, moveLineDown, selectNextOccurrence,
  commentKeymap,
} from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';

// Swap theme without rebuilding
const themeCompartment = new Compartment();

const extensions = [
  lineNumbers(),
  highlightActiveLine(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  rectangularSelection(),
  crosshairCursor(),
  indentOnInput(),
  bracketMatching(),       // ← highlights matching { }
  closeBrackets(),         // ← auto-closes { } " '
  foldGutter(),            // ← collapse long blocks
  highlightSelectionMatches(), // ← highlight other occurrences
  castscriptLanguage,
  castscriptAutocomplete,
  errorLineField,
  themeCompartment.of(darkHighlight), // ← swap with .reconfigure()
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,       // ← Ctrl+F find/replace
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...commentKeymap,      // ← Ctrl+/ toggle comment
    indentWithTab,         // ← Tab/Shift+Tab indent/unindent
    { key: 'Alt-ArrowUp',   run: moveLineUp },
    { key: 'Alt-ArrowDown', run: moveLineDown },
    { key: 'Mod-d',         run: selectNextOccurrence },
    { key: 'Mod-Enter',     run: () => { onCompile(); return true; } },
  ]),
];

// Theme switch — no editor rebuild, no cursor loss:
view.dispatch({ effects: themeCompartment.reconfigure(newHighlight) });
```

### Pros & Cons

| Pros | Cons |
|---|---|
| Same library — no new bundle cost | Requires replacing `basicSetup` with explicit setup |
| All missing features addressable | Need a custom `foldService` for `.castscript` output blocks |
| Theme switching without rebuild | Writing a full Lezer grammar is 4–6 hours (optional — `StreamLanguage` can stay) |
| Compartment pattern solves undo loss on theme switch | More explicit wiring than `basicSetup` |

**Estimated effort:** 3–4 hours  
**Bundle impact:** Minimal — already paying for `@codemirror/*` packages  
**Risk:** Low

---

## Option B: Monaco Editor (VS Code's Editor)

**What:** Replace CodeMirror 6 with
[Monaco Editor](https://microsoft.github.io/monaco-editor/) — the editor that
powers VS Code.

### What you get out of the box

| Feature | Status |
|---|---|
| Find / replace | ✅ Ctrl+F, full regex, replace-all |
| Multi-cursor | ✅ Alt+click, Ctrl+D (select next match) |
| Selection indent/unindent | ✅ Tab / Shift+Tab |
| Comment toggling | ✅ Ctrl+/ |
| Bracket matching | ✅ Built-in |
| Auto-close brackets | ✅ Built-in |
| Line move | ✅ Alt+↑/↓ |
| Code folding | ✅ Built-in (fold by indent or custom ranges) |
| Minimap | ✅ Optional |
| Diff view | ✅ Built-in |
| Custom language support | ✅ Via `monaco.languages.register()` + `setMonarchTokensProvider()` |
| TypeScript types | ✅ Full first-class types |
| Theming | ✅ `defineTheme()` / `setTheme()` — no rebuild |

### Custom `.castscript` language

Monaco uses [Monarch](https://microsoft.github.io/monaco-editor/monarch.html)
— a simple JSON/object tokenizer definition. Much easier to write than a Lezer
grammar:

```typescript
monaco.languages.register({ id: 'castscript' });

monaco.languages.setMonarchTokensProvider('castscript', {
  tokenizer: {
    root: [
      [/^--- (config|script) ---/, 'keyword'],
      [/^\s*#.*$/,                 'comment'],
      [/^\$/,                     'operator'],     // $ command
      [/^>>\s/,                   'type'],         // >> file
      [/^>\s/,                    'string'],       // > output
      [/^\[.+\]/,                 'tag'],          // [block]
      [/^(title|width|height|prompt|typing-speed|idle-time|theme|seed|output-format):/, 'attribute.name'],
      [/\{[a-z#][^:]*:/,         'string.escape'], // {style: ...}
    ],
  },
});

monaco.languages.registerCompletionItemProvider('castscript', {
  provideCompletionItems: (model, position) => ({ suggestions: [...] }),
});

// Define a dark theme
monaco.editor.defineTheme('cast-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword',        foreground: '7c6af7', fontStyle: 'bold' },
    { token: 'comment',        foreground: '6e7681', fontStyle: 'italic' },
    { token: 'operator',       foreground: '79c0ff', fontStyle: 'bold' },
    { token: 'string',         foreground: 'a8d8a8' },
    { token: 'type',           foreground: 'ffa657' },
    { token: 'tag',            foreground: 'd2a8ff', fontStyle: 'bold' },
    { token: 'attribute.name', foreground: 'e3b341' },
    { token: 'string.escape',  foreground: 'ff7b72' },
  ],
  colors: { 'editor.background': '#161b22' },
});
```

### Preact integration

Monaco does not have an official Preact/React component. Use it imperatively:

```typescript
import * as monaco from 'monaco-editor';

export function Editor({ value, onChange, theme }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const editor = monaco.editor.create(containerRef.current!, {
      value,
      language: 'castscript',
      theme: theme === 'dark' ? 'cast-dark' : 'cast-light',
      minimap: { enabled: false },
      automaticLayout: true,  // ← handles resize automatically
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    });

    editor.onDidChangeModelContent(() => {
      onChange(editor.getValue());
    });

    editorRef.current = editor;
    return () => editor.dispose();
  }, []);

  // Sync external value, theme
  useEffect(() => {
    if (editorRef.current?.getValue() !== value) {
      editorRef.current?.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'cast-dark' : 'cast-light');
  }, [theme]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}
```

### Web Workers requirement

Monaco requires Web Workers for its language services. Vite needs a plugin:

```bash
npm install vite-plugin-monaco-editor
```

```typescript
// vite.config.ts
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
plugins: [preact(), vanillaExtractPlugin(), monacoEditorPlugin({ languageWorkers: [] })],
```

Since we're using a custom language (not TypeScript/JSON/CSS), we don't need
any language workers — just `languageWorkers: []`.

### Bundle size impact

| | CodeMirror 6 (current) | Monaco |
|---|---|---|
| JS (gzip) | ~127KB | **~300–500KB** |
| CSS (gzip) | ~4KB | ~10KB |
| Workers | None | 1–3 (optional, ~200KB each) |

Monaco is **2–4× larger** than CodeMirror. For a GitHub Pages site this is
significant but not prohibitive — it can be lazy-loaded.

### Lazy loading Monaco

```typescript
// Split Monaco into its own chunk via dynamic import
const EditorLazy = lazy(() => import('./components/MonacoEditor.js'));
```

With this, Monaco only downloads when the user first focuses the editor.

### Pros & Cons

| Pros | Cons |
|---|---|
| VS Code-quality editing experience | 300–500KB JS (2–4× larger) |
| All missing features built-in, no config | Requires `vite-plugin-monaco-editor` |
| Monarch tokeniser is simpler than Lezer grammar | No official Preact component — imperative API |
| `automaticLayout: true` handles resize | Heavier initial load (mitigated by lazy loading) |
| Diff view, minimap, go-to-line built-in | Overengineered for a simple line-oriented format |
| Easy theming with `defineTheme()` | |

**Estimated effort:** 4–5 hours  
**Bundle impact:** +~300KB gzip (or lazy-loaded)  
**Risk:** Medium (Workers config, Vite plugin, no official Preact wrapper)

---

## Option C: Extend the Current CodeMirror with a Full Lezer Grammar

**What:** Write a proper
[Lezer](https://lezer.codemirror.net/) parser grammar for `.castscript` —
replacing the `StreamLanguage` with a full incremental parser — and wire up
all the missing editor commands the same way as Option A, but with
grammatically-aware features:

- **Fold service** based on actual grammar nodes (fold the output block under a
  `$` command, for example)
- **Selection-aware comment toggling** that knows whether the cursor is in
  config vs script section
- **Structural navigation** — jump to next `$` command, next `marker:`, etc.
- **Rename refactor** — rename a `[block-label]` and all its `include:` references

### Lezer grammar sketch (`.castscript.grammar`)

```
@top Script { (ConfigSection | ScriptSection)* }

ConfigSection { ConfigHeader ConfigLine* }
ScriptSection { ScriptHeader Directive* }

ConfigHeader { "--- config ---" newline }
ScriptHeader { "--- script ---" newline }

ConfigLine { ConfigKey ":" ConfigValue newline }

Directive {
  CommandDirective |
  OutputDirective |
  FileOutputDirective |
  PrintDirective |
  WaitDirective |
  MarkerDirective |
  BlockLabel |
  IncludeDirective |
  CommentLine
}

CommandDirective  { "$ " Text newline }
OutputDirective   { "> " StyledText newline }
WaitDirective     { "wait: " Duration newline }
MarkerDirective   { "marker: " Text newline }
BlockLabel        { "[" Identifier "]" newline }
IncludeDirective  { "include: " FilePath ("#" Identifier)? newline }

StyledText { (PlainText | StyleTag)* }
StyleTag   { "{" StyleSpec ":" StyledText "}" }
```

This enables **syntactically correct** folding, refactoring, and navigation.

### Pros & Cons

| Pros | Cons |
|---|---|
| Most powerful long-term solution | Lezer grammar is ~6–10 hours to write and test |
| Enables structural features (fold, rename) | Requires learning Lezer grammar syntax |
| Same bundle size as Option A | Overkill for Phase 1 of editor improvements |
| Grammatically-aware comment toggling, folding | |

**Estimated effort:** 6–10 hours  
**Bundle impact:** Same as Option A  
**Risk:** High (Lezer grammars have a steep learning curve; syntax errors in the
grammar are hard to debug)

---

## Recommendation

| | Option A | Option B | Option C |
|---|---|---|---|
| **Effort** | 3–4 hrs | 4–5 hrs | 6–10 hrs |
| **Bundle impact** | Minimal | +300KB | Minimal |
| **Risk** | Low | Medium | High |
| **Fixes all missing features** | ✅ | ✅ | ✅ |
| **VS Code quality UX** | Partial | ✅ | ✅ |
| **Structural awareness** | ❌ | ❌ | ✅ |

**Recommended: Option A now, Option C later.**

Option A addresses every user-facing complaint (find/replace, comment toggle,
multi-cursor, indent/unindent, line move, bracket matching, theme switch
without rebuild) with minimal bundle impact and low risk. It is the right
next step.

Option B (Monaco) is worth considering if/when the editor becomes the primary
focus of the product — e.g. if a desktop Electron or Tauri app is built.
The bundle size is the main blocker for a GitHub Pages deployment.

Option C (Lezer grammar) is the right long-term foundation if structural
features (fold, rename, go-to-definition for block labels) become important.
It can be implemented after Option A without any rework — the two are
complementary, not competing.
