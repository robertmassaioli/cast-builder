/**
 * CodeMirror 6 editor — full extension set.
 *
 * Features added in Option A upgrade:
 *  - Ctrl+/ comment toggling
 *  - Ctrl+F find/replace panel
 *  - Ctrl+D select next occurrence
 *  - Tab / Shift+Tab indent/unindent selection
 *  - Alt+↑/↓ move lines
 *  - { } bracket matching + auto-close
 *  - Highlight all occurrences of selected text
 *  - Fold gutter
 *  - Theme switching via Compartment (no editor rebuild, no cursor loss)
 */
import { useEffect, useRef } from 'preact/hooks';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from '@codemirror/view';
import {
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import { history, historyKeymap } from '@codemirror/commands';
import {
  defaultKeymap,
  toggleComment,
  toggleBlockComment,
  indentWithTab,
  moveLineUp,
  moveLineDown,
} from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches, selectNextOccurrence } from '@codemirror/search';
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { castscriptLanguage } from '../editor/language.js';
import { darkHighlight, lightHighlight, errorLineTheme } from '../editor/highlight.js';
import { castscriptAutocomplete } from '../editor/autocomplete.js';
import { errorLineField, setErrorLine } from '../editor/errorDecoration.js';
import type { Theme } from '../storage/localStorage.js';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile: () => void;
  errorLine?: number;
  theme: Theme;
}

/** Shared base theme — colours reference Vanilla Extract CSS vars */
const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },
  '.cm-content': {
    caretColor: 'var(--accent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-panel)',
    borderRight: '1px solid var(--border)',
    color: 'var(--text-muted)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'var(--bg-input)' },
  '.cm-activeLine':       { backgroundColor: 'var(--bg-input)' },
  '.cm-cursor':           { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground, .cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--accent-dim) !important',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--accent-dim)',
    borderRadius: '2px',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--accent-dim)',
    color: 'var(--text)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--bg-header)',
    borderTop: '1px solid var(--border)',
  },
  '.cm-search input, .cm-search button, .cm-search label': {
    fontSize: '13px',
  },
  '.cm-foldGutter span': {
    color: 'var(--text-muted)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--accent-dim)',
    color: 'var(--accent) !important',
    fontWeight: 'bold',
  },
});

export function Editor({ value, onChange, onCompile, errorLine, theme }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Compartment lets us swap the highlight extension without rebuilding
  const highlightCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const initialHighlight = theme === 'dark' ? darkHighlight : lightHighlight;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          // ── Line numbers + gutter ─────────────────────────────────────────
          lineNumbers(),
          highlightActiveLineGutter(),
          foldGutter(),

          // ── Core editing behaviour ────────────────────────────────────────
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          rectangularSelection(),
          crosshairCursor(),
          indentOnInput(),

          // ── Bracket handling ──────────────────────────────────────────────
          bracketMatching(),    // highlights matching { } [ ]
          closeBrackets(),      // auto-closes { } [ ] " '

          // ── Search & selection helpers ────────────────────────────────────
          highlightSelectionMatches(),  // highlight other occurrences

          // ── Language + autocomplete ───────────────────────────────────────
          castscriptLanguage,
          autocompletion(),
          castscriptAutocomplete,

          // ── Error decoration ──────────────────────────────────────────────
          errorLineTheme,
          errorLineField,

          // ── Theming (swappable via Compartment) ───────────────────────────
          highlightCompartment.current.of(initialHighlight),
          baseTheme,

          // ── Active line highlight ─────────────────────────────────────────
          highlightActiveLine(),

          // ── Keymap (order matters — first match wins) ─────────────────────
          keymap.of([
            // Custom shortcuts first
            {
              key: 'Mod-Enter',
              run: () => { onCompile(); return true; },
            },
            { key: 'Alt-ArrowUp',   run: moveLineUp },
            { key: 'Alt-ArrowDown', run: moveLineDown },
            { key: 'Mod-d',         run: selectNextOccurrence },

            // Standard keymaps
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,       // Ctrl+F find/replace
            ...historyKeymap,      // Ctrl+Z undo, Ctrl+Y redo
            ...foldKeymap,         // Ctrl+Shift+[ fold, Ctrl+Shift+] unfold
            ...completionKeymap,   // Ctrl+Space autocomplete
            // Comment toggling
            { key: 'Mod-/', run: toggleComment },
            { key: 'Mod-Shift-/', run: toggleBlockComment },
            indentWithTab,         // Tab indent, Shift+Tab unindent
          ]),

          updateListener,
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Create once on mount only

  // ── Sync external value (loading examples / saved scripts) ─────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // ── Swap highlight theme without rebuilding ─────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: highlightCompartment.current.reconfigure(
        theme === 'dark' ? darkHighlight : lightHighlight,
      ),
    });
  }, [theme]);

  // ── Update error line decoration ────────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setErrorLine.of(errorLine ?? null),
    });
  }, [errorLine]);

  return (
    <div ref={containerRef} style={{ height: '100%', overflow: 'hidden' }} />
  );
}
